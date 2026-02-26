@echo off
REM NewsFlash dev runner for Windows
REM Starts the API and the Next.js web app.

setlocal enabledelayedexpansion

set API_PORT=8080
set WEB_PORT=3000
set API_BASE_URL=http://localhost:%API_PORT%

for %%I in ("%~dp0.") do set ROOT_DIR=%%~dpI
cd /d "%ROOT_DIR%"

echo =^> Starting API on %API_BASE_URL%
start "NewsFlash API" cmd /k "gradlew :apps:api:bootRun"

timeout /t 5 /nobreak

echo =^> Starting web on http://localhost:%WEB_PORT%
cd apps\web

if not exist .env.local (
    (
        echo API_BASE_URL=%API_BASE_URL%
    ) > .env.local
)

echo =^> Installing web dependencies...
call npm install

echo =^> Starting web development server...
start "NewsFlash Web" cmd /k "npm run dev -- --port %WEB_PORT%"

echo.
echo =^> Dev is running
echo     Web: http://localhost:%WEB_PORT%
echo     API: %API_BASE_URL%
echo.
echo Open the windows above to see logs. Close either window to stop development.

pause

