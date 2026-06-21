@echo off
echo Starting RAG Platform...

for /f "tokens=1,2 delims==" %%a in (.env) do set %%a=%%b

start "Backend" cmd /k "cd /d C:\Users\swath\rag-platform && venv\Scripts\activate && for /f "tokens=1,2 delims==" %%a in (.env) do set %%a=%%b && uvicorn backend.main:app --reload"

start "Frontend" cmd /k "cd /d C:\Users\swath\rag-platform\frontend && npm start"

echo Backend starting at http://127.0.0.1:8000
echo Frontend starting at http://localhost:3000