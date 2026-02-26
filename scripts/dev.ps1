# NewsFlash dev runner for Windows
# Starts the API and the Next.js web app.

param(
    [string]$ApiPort = "8080",
    [string]$WebPort = "3000"
)

$ErrorActionPreference = "Stop"

$ROOT_DIR = (Resolve-Path "$PSScriptRoot/..").Path
$API_BASE_URL = "http://localhost:$ApiPort"

Write-Host "==> Starting API on $API_BASE_URL"
$apiProcess = Start-Process `
    -WorkingDirectory $ROOT_DIR `
    -FilePath ".\gradlew" `
    -ArgumentList ":apps:api:bootRun" `
    -PassThru `
    -NoNewWindow

Write-Host "    API PID: $($apiProcess.Id)"

# Wait for API to be healthy
Write-Host "==> Waiting for API health..."
$apiHealthy = $false
for ($i = 1; $i -le 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$API_BASE_URL/actuator/health" -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "    API is up."
            $apiHealthy = $true
            break
        }
    }
    catch {
        # API not ready yet
    }

    Start-Sleep -Seconds 1

    if ($apiProcess.HasExited) {
        Write-Host "ERROR: API process exited unexpectedly"
        exit 1
    }

    if ($i -eq 60) {
        Write-Host "ERROR: Timed out waiting for API"
        exit 1
    }
}

if (-not $apiHealthy) {
    Write-Host "ERROR: API failed to become healthy"
    exit 1
}

Write-Host "==> Starting web on http://localhost:$WebPort (proxying API_BASE_URL=$API_BASE_URL)"
$webDir = Join-Path $ROOT_DIR "apps" "web"
Push-Location $webDir

# Create .env.local if it doesn't exist
$envLocalPath = Join-Path $webDir ".env.local"
if (-not (Test-Path $envLocalPath)) {
    @"
API_BASE_URL=$API_BASE_URL
"@ | Out-File -FilePath $envLocalPath -Encoding UTF8
}

Write-Host "==> Installing web dependencies..."
npm install

Write-Host "==> Starting web development server..."
$webProcess = Start-Process `
    -FilePath "npm" `
    -ArgumentList "run", "dev", "--", "--port", $WebPort `
    -PassThru `
    -NoNewWindow

Write-Host "    Web PID: $($webProcess.Id)"

Pop-Location

Write-Host "`n==> Dev is running"
Write-Host "    Web: http://localhost:$WebPort"
Write-Host "    API: $API_BASE_URL"
Write-Host "`nPress Ctrl+C to stop both.`n"

# Wait and handle cleanup
try {
    while ($true) {
        if ($apiProcess.HasExited -or $webProcess.HasExited) {
            Write-Host "ERROR: One of the processes has exited"
            break
        }
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "`n==> Shutting down..."

    if ($webProcess -and -not $webProcess.HasExited) {
        Stop-Process -Id $webProcess.Id -ErrorAction SilentlyContinue
    }

    if ($apiProcess -and -not $apiProcess.HasExited) {
        Stop-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue
    }

    Write-Host "Done."
}

