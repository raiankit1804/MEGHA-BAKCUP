# 🚀 MEGHA SETU (मेघ सेतु) — Manual Startup Guide
*(Comprehensive Guide for Windows, macOS, and Linux)*

This document provides complete, step-by-step instructions to manually configure, launch, and verify the **MEGHA SETU v2.0** platform on your local machine across **Windows (Command Prompt & PowerShell)**, **macOS**, and **Linux**.

---

## 📋 Table of Contents
1. [Prerequisites & System Setup](#1-prerequisites--system-setup)
2. [Environment Configuration (.env)](#2-environment-configuration-env)
3. [Starting the Backend (FastAPI)](#3-starting-the-backend-fastapi)
   - [Windows (Command Prompt / CMD)](#31-windows-command-prompt--cmd)
   - [Windows (PowerShell)](#32-windows-powershell)
   - [macOS & Linux](#33-macos--linux)
4. [Starting the Frontend (Next.js 14)](#4-starting-the-frontend-nextjs-14)
   - [Windows (CMD / PowerShell)](#41-windows-cmd--powershell)
   - [macOS & Linux](#42-macos--linux)
5. [Alternative: 1-Click Startup via Batch Scripts (Windows)](#5-alternative-1-click-startup-via-batch-scripts-windows)
6. [Alternative: Docker Compose](#6-alternative-docker-compose)
7. [Verification & Health Checks](#7-verification--health-checks)
8. [Windows & Cross-Platform Troubleshooting](#8-windows--cross-platform-troubleshooting)

---

## 1. Prerequisites & System Setup

Ensure the following tools are installed on your system:

| Tool | Recommended Version | Windows Check | macOS / Linux Check | Notes for Windows |
| :--- | :--- | :--- | :--- | :--- |
| **Python** | 3.10 – 3.14 | `python --version` or `py --version` | `python3 --version` | Ensure **"Add python.exe to PATH"** was checked during installation. |
| **Node.js** | v18.x or v20.x+ | `node -v` | `node -v` | Download from [nodejs.org](https://nodejs.org/) (LTS recommended). |
| **npm** | v9.x or v10.x+ | `npm -v` | `npm -v` | Bundled automatically with Node.js. |
| **Git** | Any modern version | `git --version` | `git --version` | Download from [git-scm.com](https://git-scm.com/). |
| **Docker** | *(Optional)* | `docker-compose -v` | `docker-compose -v` | Docker Desktop for Windows (with WSL2). |

> ⚠️ **Windows Python Note**: If typing `python` in Windows opens the Microsoft Store, either:
> 1. Use `py` instead (e.g. `py -m venv venv`), or
> 2. Go to **Windows Settings > Apps > Advanced app settings > App execution aliases** and turn off the aliases for `python.exe` and `python3.exe`.

---

## 2. Environment Configuration (.env)

The application requires an environment file for API credentials.

### Step 2.1: Copy `.env.example` to `.env`

#### 🪟 On Windows (Command Prompt - CMD):
```cmd
cd "C:\path\to\FINAL PROTOYPE"
copy .env.example .env
copy .env.example backend\.env
```

#### 🪟 On Windows (PowerShell):
```powershell
cd "C:\path\to\FINAL PROTOYPE"
Copy-Item .env.example .env
Copy-Item .env.example backend\.env
```

#### 🍎 / 🐧 On macOS & Linux:
```bash
cd "/path/to/FINAL PROTOYPE"
cp .env.example .env
cp .env.example backend/.env
```

---

### Step 2.2: Add Your Gemini API Key
Open the newly created `.env` file in Notepad, VS Code, or any text editor:
```env
# REQUIRED: Google Gemini API Key from https://aistudio.google.com/
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Step 2.3: Optional Integrations (Degrade Gracefully)
- **Google OAuth**: If omitted, the app operates in guest-only mode.
- **Bhashini API**: If omitted, translations fallback to Gemini NMT and voice audio fallbacks to native Web Speech / gTTS.
- **Databases (PostgreSQL, MongoDB, Redis)**: If Docker is not running, the application uses local caching and SQLite/in-memory fallbacks automatically.

---

## 3. Starting the Backend (FastAPI)

The backend runs on Python, FastAPI, and Uvicorn at **`http://localhost:8000`**.

### 3.1 Windows (Command Prompt / CMD)

Open a **Command Prompt** window:

```cmd
:: 1. Navigate to backend
cd "C:\path\to\FINAL PROTOYPE\backend"

:: 2. Create virtual environment
python -m venv venv

:: 3. Activate virtual environment
venv\Scripts\activate

:: 4. Upgrade pip and install requirements
python -m pip install --upgrade pip
pip install -r requirements.txt

:: 5. Start the backend server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 3.2 Windows (PowerShell)

Open a **PowerShell** window:

```powershell
# 1. Navigate to backend
cd "C:\path\to\FINAL PROTOYPE\backend"

# 2. Create virtual environment
python -m venv venv

# 3. If PowerShell blocks script execution, run this once in your session:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 4. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 5. Upgrade pip and install requirements
python -m pip install --upgrade pip
pip install -r requirements.txt

# 6. Start the backend server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 3.3 macOS & Linux

Open a **Terminal** window:

```bash
# 1. Navigate to backend
cd "/path/to/FINAL PROTOYPE/backend"

# 2. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Upgrade pip and install requirements
pip install --upgrade pip
pip install -r requirements.txt

# 4. Start the backend server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

**Expected Backend Output:**
```text
INFO:     WeatherGPT v2.0.0 — SIH26068
INFO:     Verifying Gemini model ID via live API call...
INFO:     ✅ Gemini model verified: gemini-3.5-flash-lite
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 4. Starting the Frontend (Next.js 14)

The frontend runs on Next.js 14 and React 18 at **`http://localhost:3000`**.

### 4.1 Windows (CMD / PowerShell)

Open a **second terminal window**:

```cmd
:: 1. Navigate to frontend
cd "C:\path\to\FINAL PROTOYPE\frontend"

:: 2. Install dependencies
npm install

:: 3. Start Next.js development server
npm run dev
```

---

### 4.2 macOS & Linux

Open a **second terminal window**:

```bash
# 1. Navigate to frontend
cd "/path/to/FINAL PROTOYPE/frontend"

# 2. Install dependencies
npm install

# 3. Start Next.js development server
npm run dev
```

---

**Expected Frontend Output:**
```text
▲ Next.js 14.2.24
- Local:        http://localhost:3000
- Environments: .env
✓ Ready in 1.8s
```

---

## 5. Alternative: 1-Click Startup via Batch Scripts (Windows)

To make starting the app effortless on Windows, two convenient `.bat` scripts are included in the project root:

1. Double-click **`start-backend.bat`**  
   *(Automatically sets up Python venv, installs requirements, and launches Uvicorn on Port 8000)*
2. Double-click **`start-frontend.bat`**  
   *(Automatically runs `npm install` and launches Next.js on Port 3000)*

Or run them from Command Prompt:
```cmd
start-backend.bat
start-frontend.bat
```

---

## 6. Alternative: Docker Compose

If you have **Docker Desktop for Windows** or Docker on Linux/macOS:

```bash
# In the project root:
docker-compose up --build
```

To shut down:
```bash
docker-compose down
```

---

## 7. Verification & Health Checks

Once both servers are running:

| Service | Address | Expected Status |
| :--- | :--- | :--- |
| **Megha Setu Web Application** | [http://localhost:3000](http://localhost:3000) | Interactive weather intelligence dashboard |
| **FastAPI Backend Health Probe** | [http://localhost:8000/health](http://localhost:8000/health) | `{"status": "ok", "version": "2.0.0", ...}` |
| **Interactive API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI for testing endpoints |
| **Frontend Reverse Proxy** | [http://localhost:3000/api/health](http://localhost:3000/api/health) | Direct proxy connection to backend |

---

## 8. Windows & Cross-Platform Troubleshooting

### Issue 1: PowerShell displays `"running scripts is disabled on this system"`
- **Why**: Windows PowerShell restricts running external `.ps1` scripts by default for security.
- **Solution**: Run this command once in your current PowerShell window before activating:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\venv\Scripts\Activate.ps1
  ```

### Issue 2: `python` command opens the Microsoft Store
- **Why**: Windows default execution alias is intercepting `python.exe`.
- **Solution**:
  1. Open Windows Search > type **App Execution Aliases**.
  2. Toggle **OFF** the switches for `python.exe` and `python3.exe`.
  3. Or use the Python launcher: `py -m venv venv`.

### Issue 3: Port 8000 or 3000 is already in use (`Address already in use`)
- **Fix on Windows (Command Prompt)**:
  ```cmd
  netstat -ano | findstr :8000
  taskkill /PID <PID_NUMBER> /F

  netstat -ano | findstr :3000
  taskkill /PID <PID_NUMBER> /F
  ```
- **Fix on Windows (PowerShell)**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
  ```
- **Fix on macOS / Linux**:
  ```bash
  lsof -ti:8000 | xargs kill -9
  lsof -ti:3000 | xargs kill -9
  ```

### Issue 4: `GEMINI_API_KEY is required` error
- **Solution**: Make sure you saved your key in `.env` (and `backend/.env`). Open `.env` and verify:
  ```env
  GEMINI_API_KEY=AIzaSy...
  ```
  *(Replace placeholder `your_gemini_api_key_here` with your actual Google AI Studio API key).*

### Issue 5: Clearing Next.js cache
- **Windows CMD**:
  ```cmd
  cd frontend
  rmdir /s /q .next
  npm run dev
  ```
- **Windows PowerShell**:
  ```powershell
  cd frontend
  Remove-Item -Recurse -Force .next
  npm run dev
  ```
- **macOS / Linux**:
  ```bash
  cd frontend
  rm -rf .next
  npm run dev
  ```

---

*Megha Setu Team — SIH26068 (Ministry of Earth Sciences / India Meteorological Department Aligned)*
