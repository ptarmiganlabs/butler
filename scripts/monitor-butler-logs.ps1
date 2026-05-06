$ErrorActionPreference = 'Stop'

Write-Host "Starting Butler log monitoring..."
$currentTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC'
Write-Host "Monitor run time: $currentTime"
Write-Host "Server: $env:SERVER_NAME"
Write-Host "Service: $env:BUTLER_INSIDER_SERVICE_NAME"
Write-Host "Deploy path: $env:BUTLER_INSIDER_DEPLOY_PATH"

# Define paths and variables
$deployPath = $env:BUTLER_INSIDER_DEPLOY_PATH
$serviceName = $env:BUTLER_INSIDER_SERVICE_NAME
$currentDate = Get-Date -Format "yyyy-MM-dd"
$previousDate = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")

# Define log file paths
$serviceErrorLogPath = Join-Path $deployPath "service-error.log"
$currentDayLogPath = Join-Path $deployPath "log\butler.$currentDate.log"
$previousDayLogPath = Join-Path $deployPath "log\butler.$previousDate.log"

Write-Host "Checking log files:"
Write-Host "  Service error log: $serviceErrorLogPath"
Write-Host "  Current day log: $currentDayLogPath"
Write-Host "  Previous day log: $previousDayLogPath"

# Initialize variables
$errorFound = $false
$allErrorEntries = @()

# Check service-error.log
Write-Host "Checking service-error.log..."
if (Test-Path $serviceErrorLogPath) {
    Write-Host "Found service-error.log"
    $serviceErrorContent = Get-Content -Path $serviceErrorLogPath -ErrorAction SilentlyContinue
    if ($serviceErrorContent -and $serviceErrorContent.Count -gt 0) {
        Write-Host "Errors found in service-error.log:" -ForegroundColor Red
        foreach ($line in $serviceErrorContent) {
            Write-Host "  $line" -ForegroundColor Red
            $allErrorEntries += "SERVICE-ERROR: $line"
        }
        $errorFound = $true
    } else {
        Write-Host "service-error.log is empty"
    }
} else {
    Write-Host "service-error.log does not exist"
}

# Check current day log file
Write-Host "Checking current day log file..."
if (Test-Path $currentDayLogPath) {
    Write-Host "Found current day log file"
    $currentDayContent = Get-Content -Path $currentDayLogPath -ErrorAction SilentlyContinue
    if ($currentDayContent) {
        $totalLines = $currentDayContent.Count
        Write-Host "Current day log has $totalLines lines"
        
        # Check for ERROR or FATAL entries (case-insensitive, simple approach)
        $errorLines = @()
        foreach ($line in $currentDayContent) {
            $upperLine = $line.ToUpper()
            if ($upperLine.Contains("ERROR") -or $upperLine.Contains("FATAL")) {
                $errorLines += $line
            }
        }
        
        if ($errorLines.Count -gt 0) {
            Write-Host "Found $($errorLines.Count) error/fatal entries in current day log:" -ForegroundColor Red
            foreach ($errorLine in $errorLines) {
                Write-Host "  $errorLine" -ForegroundColor Red
                $allErrorEntries += "CURRENT-DAY: $errorLine"
            }
            $errorFound = $true
        } else {
            Write-Host "No error/fatal entries in current day log"
        }
    } else {
        Write-Host "Current day log file is empty"
    }
} else {
    Write-Host "Current day log file does not exist"
}

# Check previous day log file  
Write-Host "Checking previous day log file..."
if (Test-Path $previousDayLogPath) {
    Write-Host "Found previous day log file"
    $previousDayContent = Get-Content -Path $previousDayLogPath -ErrorAction SilentlyContinue
    if ($previousDayContent) {
        $totalLines = $previousDayContent.Count
        Write-Host "Previous day log has $totalLines lines"
        
        # Check for ERROR or FATAL entries (case-insensitive, simple approach)
        $errorLines = @()
        foreach ($line in $previousDayContent) {
            $upperLine = $line.ToUpper()
            if ($upperLine.Contains("ERROR") -or $upperLine.Contains("FATAL")) {
                $errorLines += $line
            }
        }
        
        if ($errorLines.Count -gt 0) {
            Write-Host "Found $($errorLines.Count) error/fatal entries in previous day log:" -ForegroundColor Red
            foreach ($errorLine in $errorLines) {
                Write-Host "  $errorLine" -ForegroundColor Red
                $allErrorEntries += "PREVIOUS-DAY: $errorLine"
            }
            $errorFound = $true
        } else {
            Write-Host "No error/fatal entries in previous day log"
        }
    } else {
        Write-Host "Previous day log file is empty"
    }
} else {
    Write-Host "Previous day log file does not exist"
}

# Set outputs based on results
if ($errorFound) {
    Write-Host "[ERROR] ERRORS DETECTED!" -ForegroundColor Red
    $errorCount = $allErrorEntries.Count
    Write-Host "Total errors: $errorCount"
    
    # Prepare error data for email step
    $errorData = @{
        ErrorFound = $true
        ErrorEntries = $allErrorEntries
        CurrentLogPath = $currentDayLogPath
        PreviousLogPath = $previousDayLogPath
        ServiceErrorLogPath = $serviceErrorLogPath
        CurrentTotalLines = 0
        CurrentInfoCount = 0
        CurrentWarnCount = 0
        CurrentErrorCount = 0
        CurrentFatalCount = 0
        PreviousTotalLines = 0
        PreviousInfoCount = 0
        PreviousWarnCount = 0
        PreviousErrorCount = 0
        PreviousFatalCount = 0
    }
    
    # Save error data to file for email step
    $errorDataJson = $errorData | ConvertTo-Json -Depth 10
    $errorDataPath = Join-Path $env:TEMP "butler-error-data.json"
    $errorDataJson | Out-File -FilePath $errorDataPath -Encoding UTF8
    Write-Host "Error data saved to: $errorDataPath"
    
    Add-Content -Path $env:GITHUB_OUTPUT -Value "errors_found=true"
    Add-Content -Path $env:GITHUB_OUTPUT -Value "error_count=$errorCount"
} else {
    Write-Host "No errors found - system appears healthy" -ForegroundColor Green
    Add-Content -Path $env:GITHUB_OUTPUT -Value "errors_found=false"
    Add-Content -Path $env:GITHUB_OUTPUT -Value "error_count=0"
}

Write-Host "Monitoring completed"
