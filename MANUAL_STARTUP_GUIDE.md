# 🚀 MEGHA SETU (मेघ सेतु) — Manual Startup Guide

This document provides step-by-step instructions to manually configure, launch, and verify the **MEGHA SETU v2.0** platform on your local machine without relying on automated scripts or Docker (unless desired).

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Environment Configuration (.env)](#2-environment-configuration-env)
3. [Starting the Backend (FastAPI)](#3-starting-the-backend-fastapi)
4. [Starting the Frontend (Next.js 14)](#4-starting-the-frontend-nextjs-14)
5. [Alternative: Starting via Docker Compose](#5-alternative-starting-via-docker-compose)
6. [Verification & Health Checks](#6-verification--health-checks)
7. [Troubleshooting & FAQs](#7-troubleshooting--faqs)

---

## 1. Prerequisites

Ensure the following tools are installed on your system:

| Tool | Recommended Version | Command to Check |
| :--- | :--- | :--- |
| **Python** | 3.10, 3.11, 3.12, or 3.14 | `python3 --version` |
| **Node.js** | v18.x or v20.x+ | `node -v` |
| **npm** | v9.x or v10.x+ | `npm -v` |
| **Git** | Any modern version | `git --version` |
| **Docker & Docker Compose** | *(Optional)* | `docker-compose -v` |

---

## 2. Environment Configuration (.env)

The application requires an environment file containing API credentials and configuration settings.

### Step 2.1: Create `.env` file
In the project root directory, copy the provided `.env.example` template:

```bash
cp .env.example .env
```
*(Also ensure a copy exists in the `backend/` directory or run from root)*:
```bash
cp .env.example backend/.env
```

### Step 2.2: Add Your Gemini API Key
Open `.env` and configure the **strictly required** variable:
```env
# REQUIRED: Google Gemini API Key from https://aistudio.google.com/
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Step 2.3: Optional Integrations (Graceful Degradation)
If any of these are left blank, the app will degrade gracefully without crashing:
- **Google OAuth**: If omitted, the app operates in guest mode.
- **Bhashini API**: If omitted, translations fallback to Gemini NMT and voice audio fallbacks to native Web Speech / gTTS.
- **Databases (PostgreSQL, MongoDB, Redis)**: If Docker is not running, the application uses local caching and SQLite/in-memory fallbacks automatically.

---

## 3. Starting the Backend (FastAPI)

The backend is built with Python, FastAPI, and Uvicorn.

### Step 3.1: Open Terminal 1 & Navigate to Backend
```bash
cd "/path/to/FINAL PROTOYPE/backend"
```

### Step 3.2: Create and Activate Virtual Environment *(Recommended)*
- **macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```
- **Windows (Command Prompt / PowerShell)**:
  ```cmd
  python -m venv venv
  venv\Scripts\activate
  ```

### Step 3.3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3.4: Launch the Uvicorn Server
Run the backend with hot-reload enabled:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see logs indicating:
```text
INFO:     WeatherGPT v2.0.0 — SIH26068
INFO:     Verifying Gemini model ID via live API call...
INFO:     ✅ Gemini model verified: gemini-3.5-flash-lite
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 4. Starting the Frontend (Next.js 14)

The frontend is built with Next.js 14, React 18, and modern CSS modules with glassmorphism.

### Step 4.1: Open Terminal 2 & Navigate to Frontend
```bash
cd "/path/to/FINAL PROTOYPE/frontend"
```

### Step 4.2: Install Node Dependencies
```bash
npm install
```

### Step 4.3: Start Next.js Development Server
```bash
npm run dev
```

You should see output similar to:
```text
▲ Next.js 14.2.24
- Local:        http://localhost:3000
- Environments: .env
✓ Ready in 1.8s
```

---

## 5. Alternative: Starting via Docker Compose

If you have Docker installed and prefer running all services (Postgres, MongoDB, Redis, FastAPI Backend, Next.js Frontend) in unified containers:

```bash
# In the project root:
docker-compose up --build
```

To stop all containers:
```bash
docker-compose down
```

---

## 6. Verification & Health Checks

Once both servers are running, verify the setup in your browser or terminal:

| Service / Component | URL | Expected Response / UI |
| :--- | :--- | :--- |
| **Web Interface** | [http://localhost:3000](http://localhost:3000) | Megha Setu modern dashboard & interactive chat |
| **Backend Health Endpoint** | [http://localhost:8000/health](http://localhost:8000/health) | `{"status": "ok", "version": "2.0.0", ...}` |
| **Interactive API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI with all API routes |
| **Frontend Reverse Proxy** | [http://localhost:3000/api/health](http://localhost:3000/api/health) | Proxies request directly to FastAPI backend |

---

## 7. Troubleshooting & FAQs

### Q1: `Error: Address already in use` (Port 8000 or 3000)
**Cause**: An existing instance of uvicorn or next dev is already running.  
**Fix**:
- **macOS / Linux**:
  ```bash
  # Check what process is occupying port 8000 or 3000:
  lsof -i :8000
  lsof -i :3000

  # Kill the process by PID:
  kill -9 <PID>
  ```
- **Windows**:
  ```cmd
  netstat -ano | findstr :8000
  taskkill /PID <PID> /F
  ```

### Q2: `GEMINI_API_KEY is required` Validation Error
**Cause**: The `.env` file is missing or still contains the placeholder `your_gemini_api_key_here`.  
**Fix**: 
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Open `.env` and set `GEMINI_API_KEY=<your_actual_key>`.
3. Restart the backend process.

### Q3: Frontend shows network errors when communicating with backend
**Cause**: Next.js proxy rewrites expect the backend on `http://localhost:8000`.  
**Fix**: Ensure your backend is running on port 8000, or verify the environment variable `NEXT_PUBLIC_API_BASE_URL` in `frontend/next.config.mjs`.

### Q4: Clearing Next.js Build Cache
If you encounter unexpected build artifacts or module resolution glitches:
```bash
cd frontend
rm -rf .next
npm run dev
```

---

*Megha Setu Team — SIH26068 (Ministry of Earth Sciences / India Meteorological Department Aligned)*
