@echo off
title MEGHA SETU - Backend (Port 8000)
echo ============================================================
echo   MEGHA SETU v2.0 - Starting Backend Server
echo ============================================================

cd /d "%~dp0backend"

if not exist "..\.env" (
    if exist "..\.env.example" (
        echo Copying .env.example to .env ...
        copy "..\.env.example" "..\.env"
        copy "..\.env.example" ".env"
        echo [!] Please ensure GEMINI_API_KEY is configured in .env!
    )
)

if not exist ".env" (
    if exist "..\.env" (
        copy "..\.env" ".env"
    )
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
) else (
    set PYTHON_CMD=python
)

if not exist "venv\Scripts\activate.bat" (
    echo Creating Python virtual environment in backend\venv ...
    %PYTHON_CMD% -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing/updating requirements...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo Starting Uvicorn server on http://localhost:8000 ...
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
