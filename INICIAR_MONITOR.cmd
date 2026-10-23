@echo off
cd /d "%~dp0"
start "Monitor COAPH" /min cmd /c "npm run dev -- --host 127.0.0.1 > monitor-local.log 2>&1"
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:5173"
