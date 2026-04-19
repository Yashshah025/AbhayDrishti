@echo off
REM ─────────────────────────────────────────────────────────────────────────
REM CrowdShield C2 — one-time install script (no Docker)
REM Installs Python deps for ml-service, npm deps for core-api & frontend.
REM ─────────────────────────────────────────────────────────────────────────

echo.
echo ===========================================
echo   CrowdShield C2 — Installing dependencies
echo ===========================================
echo.

cd /d "%~dp0"

echo [1/3] Installing ml-service Python deps...
cd ml-service
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Python deps install failed. Make sure Python 3.11+ is installed.
    pause
    exit /b 1
)
cd ..

echo.
echo [2/3] Installing core-api npm deps...
cd core-api
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed in core-api. Make sure Node.js 20+ is installed.
    pause
    exit /b 1
)
cd ..

echo.
echo [3/3] Installing frontend npm deps...
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed in frontend.
    pause
    exit /b 1
)
cd ..

echo.
echo ===========================================
echo   Install complete!
echo ===========================================
echo.
echo Next steps:
echo   1. Make sure MongoDB is running on localhost:27017
echo   2. Run start-all.bat to launch all 3 services
echo.
pause
