import os
import io
import re
import json
import httpx
import base64
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image

app = FastAPI(title="YOLO Image Analysis Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv8 nano model once at startup (auto-downloads ~6MB on first run)
print("Loading YOLOv8 model...")
model = YOLO("yolov8n.pt")
print("YOLOv8 ready.")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

CATEGORIES = [
    "Electrical",
    "Plumbing",
    "Furniture",
    "Classroom Equipment",
    "Network / Internet",
    "Cleaning / Housekeeping",
    "Security",
    "Infrastructure / Building Maintenance",
]

# Direct COCO label → helpdesk category (fast path, no LLM needed)
LABEL_MAP: dict[str, tuple[str, str]] = {
    # Furniture
    "chair":        ("Furniture", "Damaged Chair"),
    "couch":        ("Furniture", "Damaged Sofa"),
    "dining table": ("Furniture", "Damaged Table"),
    "bed":          ("Furniture", "Damaged Furniture"),
    "bench":        ("Furniture", "Damaged Bench"),
    # Plumbing
    "toilet":       ("Plumbing", "Toilet Issue"),
    "sink":         ("Plumbing", "Sink / Basin Issue"),
    "fire hydrant": ("Plumbing", "Fire Hydrant Issue"),
    # Classroom Equipment
    "laptop":       ("Classroom Equipment", "Laptop / Computer Issue"),
    "tv":           ("Classroom Equipment", "Display / TV Issue"),
    "keyboard":     ("Classroom Equipment", "Keyboard Issue"),
    "mouse":        ("Classroom Equipment", "Computer Mouse"),
    "remote":       ("Classroom Equipment", "Remote Control"),
    "cell phone":   ("Classroom Equipment", "Device Issue"),
    "clock":        ("Classroom Equipment", "Clock Issue"),
    # Electrical
    "microwave":    ("Electrical", "Electrical Appliance"),
    "oven":         ("Electrical", "Electrical Appliance"),
    "refrigerator": ("Electrical", "Electrical Appliance"),
    "toaster":      ("Electrical", "Electrical Appliance"),
    "hair drier":   ("Electrical", "Electrical Appliance"),
    # Cleaning
    "bottle":       ("Cleaning / Housekeeping", "Waste / Hygiene Issue"),
    "cup":          ("Cleaning / Housekeeping", "Waste / Hygiene Issue"),
    # Security
    "backpack":     ("Security", "Unattended Bag"),
    "handbag":      ("Security", "Unattended Bag"),
    "suitcase":     ("Security", "Unattended Luggage"),
    # Infrastructure
    "scissors":     ("Infrastructure / Building Maintenance", "Sharp Object Hazard"),
    "umbrella":     ("Infrastructure / Building Maintenance", "General Issue"),
    "book":         ("Classroom Equipment", "Study Material"),
}


async def ask_groq(detected_labels: list[str], filename: str, base64_image: str) -> dict | None:
    """Send image and YOLO objects to Groq Vision model for smart campus category interpretation."""
    if not GROQ_API_KEY:
        return None

    objects_str = ", ".join(detected_labels) if detected_labels else "no obvious objects"
    cats_str = ", ".join(CATEGORIES)

    prompt = f"""You are a campus facility management AI analyzing an uploaded image.
Image filename: {filename}
(YOLO fast-pass detected: {objects_str})

Look directly at the image and determine the maintenance issue. It might be something YOLO couldn't classify (like a broken window, leak, or mess).

Return ONLY this structured JSON (no other text or markdown block):
{{
  "detectedObject": "<main object or issue visible>",
  "detectedLabel": "<brief label like 'Broken Window Detected' or 'Water Leakage Detected'>",
  "category": "<one of: {cats_str}>",
  "confidence": 0.95,
  "suggestions": ["<issue type 1>", "<issue type 2>", "<issue type 3>"]
}}"""

    try:
        print(f"[GROQ] Calling Groq Vision API with {len(detected_labels)} YOLO detections...")
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}"
                                    }
                                }
                            ]
                        }
                    ],
                    "temperature": 0.1,
                    "max_tokens": 300,
                },
            )
        print(f"[GROQ] Response status: {res.status_code}")
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"]
            print(f"[GROQ] Raw response: {content[:200]}...")
            match = re.search(r"\{[\s\S]*\}", content)
            if match:
                parsed = json.loads(match.group())
                if parsed.get("category") and parsed.get("detectedLabel"):
                    print(f"[GROQ] ✓ Detected: {parsed.get('detectedLabel')}")
                    return parsed
                else:
                    print(f"[GROQ] ✗ Missing required fields in response")
            else:
                print(f"[GROQ] ✗ No JSON found in response")
        else:
            print(f"[GROQ] ✗ API Error {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[GROQ] ✗ Exception: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
    return None


@app.get("/")
def health():
    return {"status": "YOLO service running", "model": "YOLOv8n", "groq": bool(GROQ_API_KEY)}


@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    # Read and open image
    contents = await image.read()
    pil_img = Image.open(io.BytesIO(contents)).convert("RGB")

    # Run YOLO inference
    results = model(pil_img, verbose=False)

    # Collect detections
    detections: list[dict] = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            label = model.names[cls_id]
            conf = float(box.conf[0])
            detections.append({"label": label, "confidence": round(conf, 3)})

    # Sort by confidence descending
    detections.sort(key=lambda x: x["confidence"], reverse=True)
    detected_labels = [d["label"] for d in detections[:5]]

    print(f"YOLO detected: {detected_labels} in '{image.filename}'")

    # Encode image to pass to Vision LLM
    base64_image = base64.b64encode(contents).decode("utf-8")

    # ── Step 1: ALWAYS try Groq Vision LLM (especially when YOLO finds nothing!) ─────
    groq_result = await ask_groq(detected_labels, image.filename or "unknown", base64_image)
    if groq_result and groq_result.get("category"):
        groq_result["allDetections"] = detections[:10]
        groq_result["source"] = "yolo+groq" if detections else "groq-vision-only"
        return groq_result

    # ── Step 2: Direct COCO label → category mapping ─────────────────────────
    for det in detections:
        if det["label"] in LABEL_MAP:
            cat, obj = LABEL_MAP[det["label"]]
            return {
                "detectedObject": obj,
                "detectedLabel": f"{obj} Detected",
                "category": cat,
                "confidence": det["confidence"],
                "suggestions": detected_labels[:3],
                "allDetections": detections[:10],
                "source": "yolo",
            }

    # ── Step 3: Return best detection even without category ──────────────────
    if detections:
        top = detections[0]
        return {
            "detectedObject": top["label"].title(),
            "detectedLabel": f"{top['label'].title()} Detected",
            "category": "",
            "confidence": top["confidence"],
            "suggestions": detected_labels,
            "allDetections": detections[:10],
            "source": "yolo",
        }

    # ── Step 4: Nothing detected ─────────────────────────────────────────────
    return {
        "detectedObject": "Unknown Object",
        "detectedLabel": "No clear objects detected",
        "category": "",
        "confidence": 0.0,
        "suggestions": [],
        "allDetections": [],
        "source": "yolo",
    }
