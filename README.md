# MEGHA SETU (मेघ सेतु) v2.0

> **Autonomous Multi-Domain Meteorological Intelligence, Disaster Preparedness & Hyperlocal Decision Support System**  
> *Aligned with SIH26068 (Ministry of Earth Sciences / India Meteorological Department)*

---

## ⚡ Quick Start

To manually run the application locally in just a few steps, please refer to the dedicated manual startup guide:

👉 **[Read the Full Manual Startup Guide](file:///Users/ankitrai/Documents/FINAL%20PROTOYPE/MANUAL_STARTUP_GUIDE.md)**

### Quick Command Reference:

#### 1. Backend (FastAPI - Port 8000)
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend (Next.js 14 - Port 3000)
```bash
cd frontend
npm install
npm run dev
```

#### 3. Or With Docker Compose:
```bash
docker-compose up --build
```

---

## 📚 Documentation
- **[Manual Startup Guide](file:///Users/ankitrai/Documents/FINAL%20PROTOYPE/MANUAL_STARTUP_GUIDE.md)** — Step-by-step local setup, environment variables, dependencies, and troubleshooting.
- **[Master Project Documentation](file:///Users/ankitrai/Documents/FINAL%20PROTOYPE/PROJECT_MASTER_DOCUMENTATION.md)** — Comprehensive architecture, pitch blueprint, 5 domain modes, and technical specifications.
