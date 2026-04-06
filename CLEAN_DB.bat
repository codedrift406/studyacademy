@echo off
setlocal
echo ==========================================
echo       Cognify AI - Database Cleaner
echo ==========================================

echo [!] WARNING: This will DELETE ALL USERS and ALL COURSES.
echo [!] Are you sure you want to proceed? Press any key to continue, or Ctrl+C to cancel.
pause >nul

echo [1/2] Nuking old data...
cd Cognify\backend
call npx prisma generate
call npx prisma db push --force-reset --accept-data-loss
IF %ERRORLEVEL% NEQ 0 (
    echo [ERR] Failed to reset database.
    echo [TIP] Make sure backend server is stopped first.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/2] Rebuilding tables...
cd ..\..

echo ==========================================
echo       SUCCESS: Database is now EMPTY.
echo ==========================================
echo You can now run START.bat to begin fresh.
pause
