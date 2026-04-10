# NextGen Helpdesk — AI-Powered Campus Complaint Management System

A production-grade helpdesk built with **Next.js 16**, **TypeScript**, **Prisma ORM**, and **SQLite**.

---

## Quick Start

```bash
cd helpdesk-web
npm install
npx prisma db push        # sync database schema
npm run dev               # start dev server → http://localhost:3002
```

On first launch, click **"Seed Demo Data"** on the login page, then sign in:

| Role       | Email                          | Password     |
|------------|-------------------------------|--------------|
| Admin      | arvindh3001@gmail.com         | password123  |
| Technician | arjun.sharma@helpdesk.com     | password123  |
| Customer   | priya.sharma@helpdesk.com     | password123  |

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Framework  | Next.js 16 (App Router)             |
| Language   | TypeScript                          |
| Styling    | Custom CSS (dark theme, responsive) |
| Database   | SQLite via Prisma ORM               |
| Auth       | Cookie-based session (SHA-256)      |
| Email      | Nodemailer (Gmail SMTP)             |

---

## AI Modules Integrated

### Module 1 — LLM Complaint Understanding
- Analyses complaint text on every keystroke (debounced 700 ms)
- Extracts: **category**, **priority**, **location**, **summary**, **troubleshooting steps**
- Auto-fills category and zone selectors in the submission form
- Results stored in `Ticket.aiSummary / aiCategory / aiPriority / aiLocation / aiTroubleshooting`
- Displayed in ticket detail view under "🧠 AI Analysis"

### Module 2 — Image / YOLO Fault Detection
- Upload images in the complaint form
- Keyword-based detection maps filename to fault category (YOLO-ready architecture)
- Returns: `detectedObject`, `confidence`, `predictedCategory`
- Stored in `Ticket.imageDetectedObject / imageConfidence / imagePredictedCategory`
- Displayed in ticket detail view under "📸 Image Detection Result"

### Module 3 — Complaint Summarization
- Auto-generates a short technician-friendly summary from description
- Stored in `Ticket.aiSummary`, visible in ticket detail and dashboards

### Module 4 — Duplicate Detection
- Jaccard keyword similarity check against tickets from the last 24 hours
- Threshold: 55% — shows warning with similarity score
- User can dismiss and submit anyway (`forceSubmit` flag)

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── analyze/route.ts    # Image AI analysis
│   │   │   └── predict/route.ts    # LLM text analysis
│   │   ├── auth/                   # Login / register / logout / me
│   │   ├── tickets/                # CRUD + duplicate detection
│   │   ├── technicians/            # Performance + location
│   │   ├── analytics/route.ts
│   │   └── seed/route.ts
│   ├── tickets/
│   │   ├── new/page.tsx            # Complaint form with AI
│   │   ├── [id]/page.tsx           # Ticket detail with AI results
│   │   └── page.tsx
│   ├── technicians/page.tsx
│   ├── analytics/page.tsx
│   └── page.tsx                    # Dashboard
├── components/
│   ├── AppShell.tsx
│   ├── Sidebar.tsx
│   ├── LoginPage.tsx
│   └── NotificationBell.tsx
├── context/AuthContext.tsx
└── lib/
    ├── ai.ts          # All AI logic (LLM, image, summarize, duplicate)
    ├── auth.ts        # Session, password hashing, SLA helpers
    ├── email.ts       # Nodemailer email notifications
    ├── prisma.ts      # Prisma singleton
    └── seed-data.ts   # Demo seed categories & solutions
```

---

## Environment Variables (`.env`)

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your_secret"
NEXTAUTH_URL="http://localhost:3002"

# Optional email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
```
