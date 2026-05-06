Write-Host "Checking for errors in log files after deployment..."

$deployPath = $env:BUTLER_INSIDER_DEPLOY_PATH
$currentDate = Get-Date -Format "yyyy-MM-dd"
$serviceErrorLogPath = Join-Path $deployPath "service-error.log"
$dailyLogPath = Join-Path $deployPath "log\butler.$currentDate.log"

Write-Host "Deploy path: $deployPath"
Write-Host "Current date: $currentDate"
Write-Host "Service error log path: $serviceErrorLogPath"
Write-Host "Daily log path: $dailyLogPath"

# Wait a moment for the service to start and potentially log entries
Write-Host "Waiting 30 seconds for service to initialize and create log entries..."
Start-Sleep -Seconds 30

$errorFound = $false

try {
    # Check service-error.log
    Write-Host "Checking for service-error.log at: $serviceErrorLogPath"
    if (Test-Path $serviceErrorLogPath) {
        Write-Host "[OK] Found service-error.log"
        $serviceErrorContent = Get-Content -Path $serviceErrorLogPath -ErrorAction SilentlyContinue
        if ($serviceErrorContent -and $serviceErrorContent.Count -gt 0) {
            Write-Host "[ERROR] Errors found in service-error.log:" -ForegroundColor Red
            $serviceErrorContent | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
            $errorFound = $true
        } else {
            Write-Host "[OK] service-error.log is empty (no errors)"
        }
    } else {
        Write-Host "[WARN] service-error.log does not exist at: $serviceErrorLogPath"
    }

    # Check daily log file for error or fatal entries
    Write-Host "Checking for daily log file at: $dailyLogPath"
    if (Test-Path $dailyLogPath) {
        Write-Host "[OK] Found daily log file"
        $dailyLogContent = Get-Content -Path $dailyLogPath -ErrorAction SilentlyContinue
        if ($dailyLogContent) {
            # Match both formats: "error:" and "ERROR" (case-insensitive)
            $errorEntries = $dailyLogContent | Where-Object { $_ -match "(?i)\b(error|fatal)[\s:]" }
            if ($errorEntries -and $errorEntries.Count -gt 0) {
                Write-Host "[ERROR] Error/Fatal entries found in butler.$currentDate.log:" -ForegroundColor Red
                $errorEntries | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
                $errorFound = $true
            } else {
                Write-Host "[OK] No error/fatal entries found in butler.$currentDate.log"
            }

            Write-Host "Log file summary:"
            Write-Host "  Total lines: $($dailyLogContent.Count)"
            Write-Host "  info entries: $(($dailyLogContent | Where-Object { $_ -match "(?i)\binfo[\s:]" }).Count)"
            Write-Host "  warn entries: $(($dailyLogContent | Where-Object { $_ -match "(?i)\bwarn[\s:]" }).Count)"
            Write-Host "  error entries: $(($dailyLogContent | Where-Object { $_ -match "(?i)\berror[\s:]" }).Count)"
            Write-Host "  fatal entries: $(($dailyLogContent | Where-Object { $_ -match "(?i)\bfatal[\s:]" }).Count)"
        } else {
            Write-Host "[OK] Daily log file is empty or has no content yet"
        }
    } else {
        Write-Host "[WARN] Daily log file does not exist at: $dailyLogPath"
    }

    if ($errorFound) {
        Write-Host "[ERROR] Errors detected in log files - deployment may have issues" -ForegroundColor Red
        # Don't fail the build, but make it visible
        Write-Host "::warning::Errors found in log files after deployment"
    } else {
        Write-Host "[OK] No errors found in log files - deployment appears successful"
    }

} catch {
    Write-Host "[ERROR] Failed to check log files: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "::warning::Unable to check log files for errors"
}
