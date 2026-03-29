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
