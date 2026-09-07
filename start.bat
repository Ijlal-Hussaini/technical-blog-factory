@echo off
echo ========================================
echo Technical Blog Post Factory v2.0
echo ========================================
echo.
echo Starting server and opening browser...
echo.

REM Start the server in background
start /B python api/main_new.py

REM Wait 3 seconds for server to start
timeout /t 3 /nobreak >nul

REM Open browser
start http://localhost:8000

echo.
echo Server is running at: http://localhost:8000
echo Browser should open automatically
echo.
echo Press Ctrl+C to stop the server
echo.

REM Keep the window open
pause
