# Clinic Management Platform - Frontend

This is the frontend application for the Clinic Management Platform, built with modern web tools for performance and scalability.

## Tech Stack

- **Framework**: [React](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charting**: [Recharts](https://recharts.org/)
- **HTTP Client**: [Axios](https://axios-http.com/)

## Core Features

- **Role-Based Workflows**:
  - **Admin Dashboard**: Real-time analytics, revenue tracking, and complete system oversight (optimized to drastically reduce Firestore read overhead).
  - **Doctor Portal**: Queue management, digital medical records (EHR), and patient appointment management.
  - **Patient App**: Easy appointment scheduling, record history, and profile management.
- **Walk-in & Token Management**: Dedicated screens for front-desk walk-ins and a live TV token display for waiting rooms.
- **Seamless Authentication**: Integrates securely with Google OAuth and custom JWT flow.
- **Sleek AMOLED Design**: High-contrast, completely tailored dark-mode UI with sophisticated Framer Motion animations.

## Development Setup

### 1. Installation

Ensure you have Node.js (v18+) installed, then install the local dependencies:

`ash
cd frontend
npm install
`

### 2. Environment Variables

Create a \.env\ file in the \rontend\ directory based on the configuration required to connect to the backend and Google services:

`env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
`

*(Refer to the project's root \SETUP.md\ for backend setup instructions if you haven't started the FastAPI instance yet).*

### 3. Running the App

Start the Vite development server:

`ash
npm run dev
`

By default, the application will be accessible at [http://localhost:5173](http://localhost:5173).

## Performance Notes ??

This frontend is intricately bound to the Python FastAPI backend interacting with Firebase/Firestore. Recent optimizations have specifically tailored the React query behaviors to help stay well within Firestore constraints:
- Heavy metric components (like the Command Center dashboard graphs) utilize cache keys.
- Bulk queries utilize precise offset/limit logic preventing excessive frontend data pulls.
- \useEffect\ dependency safety nets have been checked to eliminate recursive API loop rendering.


## System Architecture & Pipelines

The application relies on a streamlined client-server model connecting the React Frontend with a FastAPI Backend, all persisted on Firebase Firestore. Below are the core flowcharts detailing the system operations.

### 1. High-Level Architecture Pipeline

\\\mermaid
graph TD
    subgraph Frontend [React Vite SPA]
        A1[Admin Dashboard]
        A2[Doctor Portal]
        A3[Patient App]
        A4[Walk-in TV Display]
    end

    subgraph Backend [FastAPI Server]
        B1[Auth Interceptor]
        B2[Analytics Router]
        B3[Appointments Router]
        B4[Users & Doctors Router]
        
        B1 --> B2
        B1 --> B3
        B1 --> B4
    end

    subgraph Database [Firebase Cloud Firestore]
        C1[(Appointments)]
        C2[(Invoices)]
        C3[(Users & Doctors)]
        C4[(Dashboard SDR)]
    end

    A1 -.->|HTTP/REST| B1
    A2 -.->|HTTP/REST| B1
    A3 -.->|HTTP/REST| B1
    A4 -.->|HTTP/REST| B1

    B2 <==>|Cached JSON Fetch| C4
    B3 <==>|Query/Batched| C1
    B4 <==>|CRUD| C3
    B2 -.->|Fallback Sync| C1
    B2 -.->|Fallback Sync| C2
\\\

### 2. Single Document Retrieval (SDR) Optimization Flow

To prevent Firestore reading limits from being rapidly exceeded by complex dashboard queries, we implemented the **SDR Pattern** for all analytics routes:

\\\mermaid
sequenceDiagram
    participant UI as Admin Dashboard (React)
    participant API as FastAPI Backend
    participant Cache as Memory Dictionary
    participant FS as Firestore (SDR Document)
    participant DB as Firestore (N-Collections)

    UI->>API: GET /api/v1/analytics/dashboard-summary
    API->>Cache: Check 'dashboard_summary' key
    alt Cache Hit (< 1 minute old)
        Cache-->>API: Return Memory Context
        API-->>UI: Instantly Return 200 OK (0.01s)
    else Cache Miss
        API->>FS: Fetch Dashboard Doc
        alt Firestore Doc Valid
            FS-->>API: Return SDR Payload
            API->>Cache: Set Key
            API-->>UI: Return 200 OK (1 DB Read)
        else Missing / Expired (Fallback Job)
            API->>DB: Compile Appts, Patients, Doctors counts
            API->>DB: Pre-calculate doctor availabilities (No N+1)
            DB-->>API: Returns bulk data (~8s operation)
            API->>Cache: Set Key
            API->>FS: Store aggregated JSON to 'dashboard/summary'
            API-->>UI: Return fresh payload
        end
    end
\\\

### 3. Patient Appointment Core Flow

\\\mermaid
stateDiagram-v2
    actor Patient
    participant Frontend
    participant API as FastAPI Middleware
    participant Database as Firestore

    Patient->>Frontend: Select Doctor & Slot
    Frontend->>API: POST /api/v1/appointments/book
    API->>Database: Verify slot availability
    Database-->>API: Slot is free
    API->>Database: Create Appointment (Status: Pending)
    API->>Database: Create Invoice (Status: Unpaid)
    API-->>Frontend: Return Appointment ID
    Frontend-->>Patient: Render Payment Gateway
    Patient->>Frontend: Simulate Payment
    Frontend->>API: POST /api/v1/billing/{id}/pay
    API->>Database: Update Invoice to Paid
    API->>Database: Update Appointment to Confirmed
    API-->>Frontend: Success
    Frontend-->>Patient: Show Confirmation Receipt
\\\

