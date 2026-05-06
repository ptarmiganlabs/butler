$ErrorActionPreference = 'Stop'

Write-Host "Starting deployment of Butler insiders build..."
Write-Host "Using configuration:"
Write-Host "  Runner: $env:RUNNER_NAME"
Write-Host "  Service Name: $env:BUTLER_INSIDER_SERVICE_NAME"
Write-Host "  Deploy Path: $env:BUTLER_INSIDER_DEPLOY_PATH"
Write-Host "  Service Timeout: $env:BUTLER_INSIDER_SERVICE_TIMEOUT seconds"
Write-Host "  Download Path: $env:BUTLER_INSIDER_DOWNLOAD_PATH"

# Define variables from environment
$serviceName = $env:BUTLER_INSIDER_SERVICE_NAME
$artifactPath = "$env:BUTLER_INSIDER_DOWNLOAD_PATH\butler--win-x64--$env:GITHUB_SHA.zip"
$deployPath = $env:BUTLER_INSIDER_DEPLOY_PATH
$serviceTimeout = [System.Convert]::ToInt32($env:BUTLER_INSIDER_SERVICE_TIMEOUT)

try {
    # Check if artifact exists
    if (-not (Test-Path $artifactPath)) {
        throw "Artifact not found at path: $artifactPath"
    }

    Write-Host "Artifact found: $artifactPath"

    # Stop the service if it exists
    Write-Host "Checking if service '$serviceName' exists..."
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

    if ($service) {
        Write-Host "Service found. Current status: $($service.Status)"

        if ($service.Status -eq 'Running') {
            Write-Host "Stopping service '$serviceName'..."
            Stop-Service -Name $serviceName -Force -ErrorAction Stop

            # Wait for service to stop
            $timer = 0
            do {
                Start-Sleep -Seconds 1
                $timer++
                $service = Get-Service -Name $serviceName
            } while ($service.Status -ne 'Stopped' -and $timer -lt $serviceTimeout)

            if ($service.Status -ne 'Stopped') {
                throw "Failed to stop service within $serviceTimeout seconds"
            }

            Write-Host "Service stopped successfully"
        } else {
            Write-Host "Service is already stopped"
        }
    } else {
        Write-Host "Service '$serviceName' not found. Will continue with deployment."
    }

    # Create deployment directory if it doesn't exist
    if (-not (Test-Path $deployPath)) {
        Write-Host "Creating deployment directory: $deployPath"
        New-Item -ItemType Directory -Path $deployPath -Force
    }

    # Clear log files before deployment to ensure fresh logs
    Write-Host "Clearing log files before deployment..."
    $currentDate = Get-Date -Format "yyyy-MM-dd"
    $serviceErrorLogPath = Join-Path $deployPath "service-error.log"
    $dailyLogPath = Join-Path $deployPath "log\butler.$currentDate.log"

    Write-Host "Deploy path: $deployPath"
    Write-Host "Current date: $currentDate"
    Write-Host "Service error log path: $serviceErrorLogPath"
    Write-Host "Daily log path: $dailyLogPath"

    # Check if log directory exists
    $logDirectory = Join-Path $deployPath "log"
    Write-Host "Log directory path: $logDirectory"
    if (Test-Path $logDirectory) {
        Write-Host "[OK] log directory exists"
        Write-Host "Contents of log directory:"
        Get-ChildItem -Path $logDirectory -Force | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Host "[WARN] log directory does not exist"
    }

    if (Test-Path $serviceErrorLogPath) {
        Write-Host "[OK] Found service-error.log at: $serviceErrorLogPath"
        Write-Host "Clearing service-error.log..."
        Clear-Content -Path $serviceErrorLogPath -Force
        Write-Host "[OK] service-error.log cleared"
    } else {
        Write-Host "[WARN] service-error.log not found at: $serviceErrorLogPath"
        Write-Host "Will be created if needed by the service"
    }

    if (Test-Path $dailyLogPath) {
        Write-Host "[OK] Found daily log file at: $dailyLogPath"
        Write-Host "Clearing butler.$currentDate.log..."
        Clear-Content -Path $dailyLogPath -Force
        Write-Host "[OK] butler.$currentDate.log cleared"
    } else {
        Write-Host "[WARN] Daily log file not found at: $dailyLogPath"
        Write-Host "Will be created if needed by the service"
    }

    # Extract the zip file
    Write-Host "Extracting artifact to $deployPath..."
    Expand-Archive -Path $artifactPath -DestinationPath $deployPath -Force

    Write-Host "Deployment files extracted successfully"

    # List extracted contents
    Write-Host "Extracted files:"
    Get-ChildItem -Path $deployPath -Recurse | Format-Table Name, Length, LastWriteTime

    # Start the service if it exists
    if ($service) {
        Write-Host "Starting service '$serviceName'..."
        Start-Service -Name $serviceName -ErrorAction Stop

        # Wait for service to start
        $timer = 0
        do {
            Start-Sleep -Seconds 1
            $timer++
            $service = Get-Service -Name $serviceName
        } while ($service.Status -ne 'Running' -and $timer -lt $serviceTimeout)

        if ($service.Status -eq 'Running') {
            Write-Host "Service started successfully"
        } else {
            throw "Failed to start service within $serviceTimeout seconds. Service status: $($service.Status)"
        }
    } else {
        Write-Host "Service not found. Binary deployed but service needs to be configured manually."
    }

    Write-Host "[OK] Deployment completed successfully!"

} catch {
    Write-Host "[ERROR] Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
    exit 1
}
