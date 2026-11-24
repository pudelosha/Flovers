@echo off
cd /d "C:\Projekty\Python\Flovers\translations"
echo ========================================
echo MANUAL STEP: Launch Chrome (debug mode)
echo ========================================
echo.
echo 1. Close ALL Chrome windows
echo 2. Script will start Chrome with remote debugging
echo 3. Log into ChatGPT manually
echo.
pause

taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="C:\Projekty\Python\Flovers\translations\ChromeProfile" ^
  --start-maximized

echo.
echo Chrome started.
echo 1. Go to: https://chatgpt.com
echo 2. Log in fully
echo 3. Keep this Chrome window OPEN
echo.
pause
