@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo          MMSU URERB PORTAL - SAVE CHECKPOINT
echo =======================================================
echo.

:: 1. Generate Timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%%datetime:~12,2%

:: 2. Prompt for checkpoint note
set /p "NOTE=Enter a note for this checkpoint (e.g. before modifying rubrics) [Press Enter for default]: "
if "%NOTE%"=="" set NOTE=Manual Snapshot

echo.
echo [1/3] Backing up MySQL database (urerb_db)...
if not exist "backups" mkdir "backups"

set MYSQLDUMP="C:\xampp\mysql\bin\mysqldump.exe"
if exist %MYSQLDUMP% (
    %MYSQLDUMP% -h 127.0.0.1 -u root urerb_db -r "backups\db_backup_%TIMESTAMP%.sql" >nul 2>&1
    if exist "backups\db_backup_%TIMESTAMP%.sql" (
        echo      - Database backup saved to: backups\db_backup_%TIMESTAMP%.sql
    ) else (
        echo      [!] MySQL dump skipped (Ensure MySQL is running in XAMPP)
    )
) else (
    echo      [!] mysqldump not found at C:\xampp\mysql\bin\mysqldump.exe
)

echo.
echo [2/3] Creating Git code checkpoint...
git add .
git commit -m "Checkpoint: %NOTE% (%TIMESTAMP%)"
if %errorlevel% neq 0 (
    echo      - No code changes detected since last checkpoint.
) else (
    echo      - Code snapshot created successfully!
)

echo.
echo [3/3] Syncing with GitHub (main branch)...
git push origin main
if %errorlevel% equ 0 (
    echo      - Pushed to GitHub (Mikelersky/urerb-portal) successfully!
) else (
    echo      [!] Remote push had an error or was offline. Local checkpoint is saved safely!
)

echo.
echo =======================================================
echo   CHECKPOINT SAVED! You can safely experiment now.
echo   To roll back anytime, run: restore-checkpoint.bat
echo =======================================================
echo.
pause

