import requests
import base64
import sys

# Test the YOLO service with a simple image
def test_yolo_service():
    # Create a simple test - just check if service responds
    url = "http://localhost:8000/"
    response = requests.get(url)
    print(f"Service status: {response.json()}")
    
    # If you have the broken window image, provide the path
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        print(f"\nTesting with image: {image_path}")
        
        with open(image_path, 'rb') as f:
            files = {'image': f}
            response = requests.post('http://localhost:8000/analyze', files=files)
            
        print(f"\nResponse status: {response.status_code}")
        print(f"Response: {response.json()}")
    else:
        print("\nTo test with an image, run: python test_detection.py <path_to_image>")

if __name__ == "__main__":
    test_yolo_service()