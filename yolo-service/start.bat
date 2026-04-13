@echo off
echo Starting YOLO Image Analysis Service...

:: Set Groq API key (reads from parent .env if available)
for /f "tokens=1,2 delims==" %%a in ('findstr GROQ_API_KEY ..\.env 2^>nul') do set GROQ_API_KEY=%%b
set GROQ_API_KEY=%GROQ_API_KEY:"=%

echo Groq API Key loaded: %GROQ_API_KEY:~0,10%...



:: Start the service
echo.
echo YOLO service starting on http://localhost:8000
echo Press Ctrl+C to stop.
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
