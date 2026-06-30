@echo off
echo Starting RAG Platform...

for /f "usebackq tokens=1,2 delims==" %%a in (".env") do set %%a=%%b

start "Backend" cmd /k "cd /d C:\Users\swath\rag-platform && venv\Scripts\activate && for /f "usebackq tokens=1,2 delims==" %%a in (".env") do set %%a=%%b && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

start "Frontend" cmd /k "cd /d C:\Users\swath\rag-platform\frontend && npm start"

echo.
echo Backend starting at http://localhost:8000
echo Frontend starting at http://localhost:3000