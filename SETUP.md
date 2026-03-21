# Clinic Management Platform — Setup Guide

## 1. Firebase / Firestore

1. Create a Firebase project and enable **Firestore** (Native mode) and **Authentication** (Google, etc. as needed).
2. Download a **service account** JSON or set `GOOGLE_APPLICATION_CREDENTIALS` to that file path.
3. In `backend/.env`, point the backend at your project (see `backend/.env` / `app/auth/firebase.py` for variable names your build expects). No `DATABASE_URL` — all app data lives in Firestore.

## 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Select **Web application**
6. Add **Authorized redirect URIs**:
   - `http://localhost:5173/auth/callback`
7. Copy the **Client ID** and **Client Secret**
8. Update `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```
9. Update `frontend/.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   ```

## 3. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start server
uvicorn app.main:app --reload --port 8000
```

## 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 5. Access

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 6. Google OAuth Flow in Auth

The Google OAuth callback in `backend/app/auth/router.py` needs the actual
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` configured. Once you provide
the credentials, update the `.env` files and restart the backend.

## 7. Design Tokens

- Light mode: White (#FFFFFF) background, Black (#000000) text
- Dark mode (AMOLED): Pure Black (#000000) background, White (#FFFFFF) text
- Toggle dark mode by adding `dark` class to `<html>` element
