@echo off
echo Starting CASNOS Display Screen with Embedded Server...
echo.
echo 🚀 Initializing server...
timeout /t 2 /nobreak > nul

rem Check if server directory exists
if not exist "server" (
    echo ❌ Server files not found in this directory!
    echo Please ensure you're running from the Display build folder.
    pause
    exit /b 1
)

echo ✅ Server files found
echo 🖥️ Starting Display application...

rem Start the display executable
start "" "CASNOS Display.exe"

echo.
echo 📱 Display screen is starting...
echo 📝 Server will start automatically within the application
echo.
echo To stop the application, close the Display window
echo.
