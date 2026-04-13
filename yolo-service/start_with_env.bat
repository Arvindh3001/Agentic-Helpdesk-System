@echo off
echo Starting YOLO Image Analysis Service with Groq API...

set GROQ_API_KEY=your_groq_api_key_here

echo Groq API Key loaded: %GROQ_API_KEY:~0,10%...
echo.
echo YOLO service starting on http://localhost:8000
echo Press Ctrl+C to stop.
echo.

uvicorn main:app --host 0.0.0.0 --port 8000