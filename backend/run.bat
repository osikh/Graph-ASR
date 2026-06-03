@echo off

echo.
echo Starting ARS backend...
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
