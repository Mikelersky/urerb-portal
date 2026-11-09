@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo        MMSU URERB PORTAL - RESTORE / ROLLBACK TOOL
echo =======================================================
echo.
echo Select an option:
echo   [1] Undo all recent unsaved code changes (Return to last checkpoint)
echo   [2] View list of previous checkpoints (Commit history)
echo   [3] Restore database from backups folder
echo   [4] Pull fresh copy from GitHub (Discard local broken files)
echo   [5] Exit
echo.

set /p "CHOICE=Enter choice (1-5): "

if "%CHOICE%"=="1" (
    echo.
    echo [!] Discarding uncommitted modifications and returning to last saved state...
    git restore .
    git clean -fd
    echo.
    echo [*] Done! Code has been restored to your last checkpoint.
    pause
    exit /b
)

if "%CHOICE%"=="2" (
    echo.
    echo === PREVIOUS SAVED CHECKPOINTS ===
    git log --oneline -10
    echo.
    pause
    exit /b
)

if "%CHOICE%"=="3" (
    echo.
    echo === AVAILABLE DATABASE BACKUPS ===
    if not exist "backups" (
        echo [!] No backups directory found.
        pause
        exit /b
    )
    dir /b backups\*.sql
    echo.
    set /p "SQLFILE=Enter backup filename (e.g. db_backup_2026-11-09.sql): "
    if exist "backups\%SQLFILE%" (
        echo Restoring urerb_db from backups\%SQLFILE%...
        C:\xampp\mysql\bin\mysql.exe -h 127.0.0.1 -u root urerb_db < "backups\%SQLFILE%"
        if !errorlevel! equ 0 (
            echo [*] Database successfully restored!
        ) else (
            echo [!] Failed to import SQL backup. Ensure MySQL is running in XAMPP.
        )
    ) else (
        echo [!] File backups\%SQLFILE% does not exist.
    )
    pause
    exit /b
)

if "%CHOICE%"=="4" (
    echo.
    echo [!] Resetting local code to match GitHub main branch...
    git fetch origin
    git reset --hard origin/main
    echo [*] Done! Your codebase now exactly matches the GitHub repository.
    pause
    exit /b
)

if "%CHOICE%"=="5" (
    exit /b
)

echo Invalid choice.
pause

