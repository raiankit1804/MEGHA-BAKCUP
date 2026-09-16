@echo off
title MEGHA SETU - Frontend (Port 3000)
echo ============================================================
echo   MEGHA SETU v2.0 - Starting Frontend Server
echo ============================================================

cd /d "%~dp0frontend"

if not exist "node_modules\" (
    echo Installing node dependencies...
    call npm install
)

echo Starting Next.js development server on http://localhost:3000 ...
call npm run dev

pause
