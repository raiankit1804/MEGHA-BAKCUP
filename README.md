# MEGHA SETU (मेघ सेतु) v2.0

> **Autonomous Multi-Domain Meteorological Intelligence, Disaster Preparedness & Hyperlocal Decision Support System**  
> *Aligned with SIH26068 (Ministry of Earth Sciences / India Meteorological Department)*

---

## ⚡ Quick Start

To manually run the application locally in just a few steps, please refer to the dedicated manual startup guide:

👉 **[Read the Full Manual Startup Guide](file:///Users/ankitrai/Documents/FINAL%20PROTOYPE/MANUAL_STARTUP_GUIDE.md)**

### Quick Command Reference:

#### 🪟 Windows (Command Prompt / PowerShell)
```cmd
:: Backend (Terminal 1)
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

:: Frontend (Terminal 2)
cd frontend
npm install
npm run dev

:: Or 1-Click Launch via Batch Scripts:
start-backend.bat
start-frontend.bat
```

#### 🍎 / 🐧 macOS & Linux
```bash
# Backend (Terminal 1)
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev
```

#### 🐳 Docker Compose (All Platforms)
```bash
docker-compose up --build
```

---

## 📚 Documentation
- **[Manual Startup Guide](file:///Users/ankitrai/Documents/FINAL%20PROTOYPE/MANUAL_STARTUP_GUIDE.md)** — Step-by-step local setup, environment variables, dependencies, and troubleshooting.
- **[Master Project Documentation](file:///Users/ankitrai/Documents/FINAL%20PROTOYPE/PROJECT_MASTER_DOCUMENTATION.md)** — Comprehensive architecture, pitch blueprint, 5 domain modes, and technical specifications.
