# Agentic AI Campus Helpdesk
## Complete Product & User Manual

---

## 1. Introduction Structure

Welcome to the **Agentic AI Campus Helpdesk System**. This product is a modern, intelligent web application designed exclusively for university/campus environments. It unifies the ticketing system, technician management, and automated troubleshooting into a single dynamic platform.

By augmenting traditional IT Helpdesk practices with advanced simulated AI capabilities, the software dynamically predicts resolution paths, balances technician workloads, and tracks issue Service Level Agreements (SLAs) accurately.

---

## 2. How the Product is Made

The product's architecture is built on a scalable and modern web development stack designed for peak performance and easy maintainability. 

### **Technology Stack**
- **Frontend Framework:** Next.js (App Router enabled), built on React.
- **Styling:** Tailwind CSS for a premium and highly responsive user interface without traditional bulky CSS files.
- **Database & ORM:** SQLite database strictly managed and strictly typed using Prisma ORM.
- **Language:** TypeScript for end-to-end type safety, eliminating countless runtime errors.
- **Simulated AI Engine:** Designed with built-in API routes structured for seamless integration into broader predictive-AI fault detection models.

### **Database Models (Prisma)**
The underlying database accurately tracks the campus helpdesk lifecycle:
1. **User:** Manages Customers, Technicians, and Admins via role-based authentication.
2. **TechnicianProfile:** Tracks the real-time availability and current workload of support staff.
3. **Ticket:** The core entity representing a campus issue, complete with descriptions, images, priority markers, assignment tracking, and SLA deadlines.
4. **Category & TroubleshootingSolution:** Forms a smart knowledge base mapping specific problems to step-by-step resolution guides.
5. **Feedback:** Allows users to rate technician responses on resolved tickets.

---

## 3. Core Features & Capabilities

- **Intelligent Ticketing:** Customers submit fully documented issues, including optional images of faults. The system tags the urgency and category.
- **Technician Load Balancing:** Tickets aren't simply dumped into a queue; the system evaluates current technician workloads and capacities before assignment.
- **Knowledge Base (Smart Solutions):** Known issues pull existing troubleshooting guides so customers might even resolve minor faults themselves without waiting on a technician.
- **Agentic AI Integration:** Built to connect seamlessly with "Future" scopes like automated image-based fault detection, GPS-based location tracking for nearest-technician dispatch, and predictive maintenance schedules based on analytics.
- **Priority & SLA Engine:** Issues are categorized from Low to High priority, with calculated SLA (Service Level Agreement) deadlines to guarantee timely responses.

---

## 4. How to Use the Product (User Guide)

### **A. For Customers (Students & Campus Staff)**
1. **Creating a Ticket:** Navigate to your portal. Enter the details of your issue, attach an image of the fault (e.g., a broken projector or computer error), and select the most relevant Category.
2. **Reviewing Solutions:** Before creating your ticket, you may be presented with an automated troubleshooting guide to try and fix the issue immediately.
3. **Tracking & Feedback:** View your pending tickets from your dashboard. Once a technician marks your issue as "Resolved", you can leave feedback and a rating about the service.

### **B. For Technicians**
1. **Viewing Workload:** Log in to view your personalized Technician Dashboard. The dashboard reflects active assignees.
2. **Managing Tickets:** Open an assigned ticket to see the customer's description and images. 
3. **Updating Status:** As you begin work, transition the ticket from "Pending" to "Assigned" or "In Progress." Once the hardware or software issue is fixed, update the status to "Resolved." 
4. **Monitoring Availability:** Ensure your workload hasn't exceeded limits to prevent automated ticket-bouncing.

### **C. For Administrators**
1. **System Oversight:** Use the Analytics dashboard to track ticket resolution times, the volume of active defects across the campus, and technician performance.
2. **Knowledge Base Management:** Update the Category lists and Troubleshooting Solutions as new technologies are added to the campus.

---

## 5. Deployment and Setup Guide

If you are a developer or IT administrator looking to set up the system locally:

1. **Pre-requisites:** Ensure you have Node.js and `npm` installed.
2. **Environment Variables:** Create a `.env` file in the root directory providing your local configuration (e.g., `DATABASE_URL="file:./dev.db"`).
3. **Database Setup:** 
   Run `npx prisma db push` or `npx prisma migrate dev` to instantiate the SQLite tables.
   Optionally, run a seed script to populate testing data.
4. **Start the Application:**
   Run `npm run dev` in the terminal to launch the Next.js development server.
5. **Access:** Open a web browser and navigate to `http://localhost:3000`.

---
*Document Generated for the Agentic AI Campus Project*
