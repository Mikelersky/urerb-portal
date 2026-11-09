@echo off
title Cloudflare Tunnel - URERB Portal Remote Access
cls

echo ====================================================================
echo        MMSU URERB PORTAL - CLOUDFLARE REMOTE ACCESS LAUNCHER
echo ====================================================================
echo.
echo [1/3] Checking XAMPP Apache and MySQL services...

:: Check Apache port 80
netstat -ano | findstr /R ":80 " >nul
if %errorlevel% neq 0 (
    echo [!] WARNING: Apache (Port 80) does not appear to be running.
    echo     Please open XAMPP Control Panel and start Apache and MySQL.
    echo.
) else (
    echo [*] Apache is running on Port 80.
)

:: Check MySQL port 3306
netstat -ano | findstr /R ":3306 " >nul
if %errorlevel% neq 0 (
    echo [!] WARNING: MySQL (Port 3306) does not appear to be running.
    echo.
) else (
    echo [*] MySQL is running on Port 3306.
)

echo.
echo [2/3] Checking Vite dev server (Port 5173)...
netstat -ano | findstr /R ":5173 " >nul
if %errorlevel% neq 0 (
    echo [*] Starting Vite development server in background...
    start "Vite Dev Server" cmd /k "npm run dev"
    timeout /t 3 >nul
) else (
    echo [*] Vite dev server is running on Port 5173.
)

echo.
echo [3/3] Starting Cloudflare Quick Tunnel...
echo.
echo ====================================================================
echo  LOOK BELOW for your public HTTPS link (e.g. https://xxx.trycloudflare.com)
echo  Copy and share that link with your collaborator!
echo  To STOP remote access anytime, close this window or press Ctrl + C.
echo ====================================================================
echo.

"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5173 --http-host-header localhost

