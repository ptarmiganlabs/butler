$ErrorActionPreference = 'Stop'

Write-Host "Sending error alert email..."

try {
    # Load error data from previous step
    $errorDataPath = Join-Path $env:TEMP "butler-error-data.json"
    if (-not (Test-Path $errorDataPath)) {
        throw "Error data file not found: $errorDataPath"
    }
    
    $errorDataJson = Get-Content -Path $errorDataPath -Raw
    $errorData = $errorDataJson | ConvertFrom-Json
    
    # Check if email script exists on server
    $scriptDir = $env:BUTLER_MONITOR_SCRIPT_DIR
    if (-not $scriptDir) {
        $scriptDir = "D:\tools\scripts\insiders-build-monitor"
    }
    $emailScript = Join-Path $scriptDir "Send-ErrorAlert.ps1"
    
    if (-not (Test-Path $emailScript)) {
        Write-Host "WARNING: Email script not found at: $emailScript" -ForegroundColor Yellow
        Write-Host "Cannot send email alert - script deployment needed"
        Write-Host "::warning::Email script not found on server"
        exit 0
    }
    
    # Prepare email parameters
    $emailParams = @{
        SmtpServer = $env:SMTP_SERVER
        SmtpPort = [int]$env:SMTP_PORT
        From = $env:EMAIL_FROM
        To = $env:EMAIL_TO
        ServerName = $env:SERVER_NAME
        ServiceName = $env:BUTLER_INSIDER_SERVICE_NAME
        ErrorEntries = $errorData.ErrorEntries
        CurrentLogPath = $errorData.CurrentLogPath
        PreviousLogPath = $errorData.PreviousLogPath
        ServiceErrorLogPath = $errorData.ServiceErrorLogPath
        CurrentTotalLines = $errorData.CurrentTotalLines
        CurrentInfoCount = $errorData.CurrentInfoCount
        CurrentWarnCount = $errorData.CurrentWarnCount
        CurrentErrorCount = $errorData.CurrentErrorCount
        CurrentFatalCount = $errorData.CurrentFatalCount
        PreviousTotalLines = $errorData.PreviousTotalLines
        PreviousInfoCount = $errorData.PreviousInfoCount
        PreviousWarnCount = $errorData.PreviousWarnCount
        PreviousErrorCount = $errorData.PreviousErrorCount
        PreviousFatalCount = $errorData.PreviousFatalCount
        TemplatePath = (Join-Path $scriptDir "butler-email-template-error-alert.html")
        UseSSL = $true
    }
    
    # Add credentials if available (PowerShell 5.1 compatible)
    if ($env:SMTP_USERNAME) {
        $emailParams.Username = $env:SMTP_USERNAME
        Write-Host "SMTP Username configured: [SET]"
        if ($env:SMTP_PASSWORD) {
            # Use plain text password for PS 5.1 compatibility
            $emailParams.Password = $env:SMTP_PASSWORD
            Write-Host "SMTP Password configured: [HIDDEN]"
        } else {
            Write-Host "WARNING: SMTP_PASSWORD not set"
        }
    } else {
        Write-Host "WARNING: SMTP_USERNAME not set"
    }
    
    # Debug email parameters
    Write-Host "Email Parameters:"
    Write-Host "  SMTP Server: $($emailParams.SmtpServer)"
    Write-Host "  SMTP Port: $($emailParams.SmtpPort)"
    Write-Host "  From: $($emailParams.From)"
    Write-Host "  To: $($emailParams.To)"
    Write-Host "  Server Name: $($emailParams.ServerName)"
    Write-Host "  Service Name: $($emailParams.ServiceName)"
    Write-Host "  Use SSL: $($emailParams.UseSSL)"
    Write-Host "  Error Entries Count: $($emailParams.ErrorEntries.Count)"
    
    Write-Host "Calling Send-ErrorAlert.ps1..."
    Write-Host "Email script path: $emailScript"
    Write-Host "Template path: $($emailParams.TemplatePath)"
    
    # Create log files for debugging
    $logDir = Join-Path $scriptDir "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    }
    $outputLogPath = Join-Path $logDir "email-output.log"
    $errorLogPath = Join-Path $logDir "email-error.log"
    
    # Execute script and capture all output
    Write-Host "Executing email script with output capture..."
    try {
        $output = & $emailScript @emailParams 2>&1
        $output | Out-File -FilePath $outputLogPath -Encoding UTF8
        
        Write-Host "Email script completed. Output captured to: $outputLogPath"
        Write-Host "--- Script Output ---"
        Write-Host $output
        Write-Host "--- End Script Output ---"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SUCCESS: Error alert email sent successfully!"
            Add-Content -Path $env:GITHUB_OUTPUT -Value "email_sent=true"
        } else {
            Write-Host "ERROR: Email script returned exit code: $LASTEXITCODE"
            Add-Content -Path $env:GITHUB_OUTPUT -Value "email_sent=false"
        }
    } catch {
        $_.Exception.Message | Out-File -FilePath $errorLogPath -Encoding UTF8
        Write-Host "ERROR: Exception while running email script: $($_.Exception.Message)"
        Write-Host "Error details saved to: $errorLogPath"
        Add-Content -Path $env:GITHUB_OUTPUT -Value "email_sent=error"
    }
    
    # Clean up
    Remove-Item -Path $errorDataPath -Force -ErrorAction SilentlyContinue
    
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host ("ERROR: Failed to send error alert email: " + $errorMsg) -ForegroundColor Red
    Write-Host ("::warning::Email alert failed - " + $errorMsg)
}

Write-Host "Email alert step completed"
