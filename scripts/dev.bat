@echo off
:: NewsFlash dev runner for Windows
:: Usage: scripts\dev.bat

set ROOT_DIR=%~dp0..
set API_PORT=8080
set WEB_PORT=3000

cd /d "%ROOT_DIR%"

echo ==> Starting API and Web...

powershell -ExecutionPolicy Bypass -Command ^
  "$api = Start-Job { Set-Location '%ROOT_DIR%'; .\gradlew.bat :apps:api:bootRun };" ^
  "$web = Start-Job { Set-Location '%ROOT_DIR%\apps\web'; npm install; npm run dev -- --port %WEB_PORT% };" ^
  "Write-Host '  Web: http://localhost:%WEB_PORT%';" ^
  "Write-Host '  API: http://localhost:%API_PORT%';" ^
  "Write-Host '  Press Ctrl+C to stop.';" ^
  "Write-Host '';" ^
  "try { while ($true) { Receive-Job $api; Receive-Job $web; Start-Sleep -Milliseconds 500 } }" ^
  "finally { Stop-Job $api; Stop-Job $web; Remove-Job $api $web -Force }"


