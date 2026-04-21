@echo off
REM ─────────────────────────────────────────────────────────────────────────
REM Convenience: start MongoDB in Docker (if you don't want to install Mongo
REM natively but DO have Docker installed).
REM
REM This is the only piece of Docker you'd use in the no-docker setup.
REM Skip this if you've installed MongoDB Community Edition natively.
REM ─────────────────────────────────────────────────────────────────────────

docker run -d --name c2-mongo -p 27017:27017 --restart unless-stopped mongo:7
if errorlevel 1 (
    echo.
    echo If the container already exists, start it with:
    echo   docker start c2-mongo
    echo.
)
pause
