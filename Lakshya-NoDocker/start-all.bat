@echo off
REM ─────────────────────────────────────────────────────────────────────────
REM CrowdShield C2 — opens 3 terminal windows, one per service.
REM Close any window to stop that service. Close all to fully shut down.
REM ─────────────────────────────────────────────────────────────────────────

cd /d "%~dp0"

echo.
echo Launching CrowdShield C2 services in separate windows...
echo   - ml-service    -> http://localhost:5000
echo   - core-api      -> http://localhost:4000
echo   - frontend      -> http://localhost:5173
echo.
echo Press Ctrl+C in each window to stop, or close the windows.
echo Make sure MongoDB is running on localhost:27017 first.
echo.

start "CrowdShield ml-service"  cmd /k "cd /d %~dp0ml-service && python main.py"
timeout /t 3 >nul

start "CrowdShield core-api"    cmd /k "cd /d %~dp0core-api && node src/index.js"
timeout /t 4 >nul

start "CrowdShield frontend"    cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All services launching. Open http://localhost:5173 in your browser
echo (frontend dev server takes ~10 sec to start).
echo.
pause
