@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%Cognify\backend"
set "FRONTEND_DIR=%ROOT%Cognify\frontend"

echo ==========================================
echo        Cognify AI - Stable Launcher
echo ==========================================

echo [0/5] Releasing ports 3000 and 5173...
for %%P in (3000 5173) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%A >nul 2>&1
  )
)
echo [OK] Port check done.

echo [1/5] Checking dependencies...
if not exist "%BACKEND_DIR%\node_modules" (
  echo [..] Installing backend dependencies...
  call npm --prefix "%BACKEND_DIR%" install
  if errorlevel 1 goto :fail
)

echo [..] Syncing Database Schema (Phase 2)...
cmd /c "cd /d %BACKEND_DIR% && npx prisma db push"

echo [..] Installing frontend dependencies and UI Libraries...
call npm --prefix "%FRONTEND_DIR%" install
call npm --prefix "%FRONTEND_DIR%" install recharts sonner framer-motion
if errorlevel 1 goto :fail

echo [2/4] Starting backend...
start "Cognify API" cmd /k "cd /d %BACKEND_DIR% && npm run dev"

echo [3/4] Starting frontend...
start "Cognify WEB" cmd /k "cd /d %FRONTEND_DIR% && npm run dev -- --host 127.0.0.1 --port 5173"

echo [4/4] Waiting for services...
set "HEALTH_OK=0"
for /L %%I in (1,1,30) do (
  powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
  if not errorlevel 1 (
    set "HEALTH_OK=1"
    goto :health_done
  )
  timeout /t 1 >nul
)
:health_done

set "WEB_OK=0"
for /L %%I in (1,1,30) do (
  powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
  if not errorlevel 1 (
    set "WEB_OK=1"
    goto :web_done
  )
  timeout /t 1 >nul
)
:web_done

if "%HEALTH_OK%"=="1" (
  echo [OK] Backend is live: http://127.0.0.1:3000/api/health
) else (
  echo [WARN] Backend did not respond in time. Check "Cognify API" window.
)

if "%WEB_OK%"=="1" (
  echo [OK] Frontend is live: http://127.0.0.1:5173
) else (
  echo [WARN] Frontend did not respond in time. Check "Cognify WEB" window.
)

echo [DONE] Start completed.
exit /b 0

:fail
echo [ERR] Startup failed. See logs above.
pause
exit /b 1
