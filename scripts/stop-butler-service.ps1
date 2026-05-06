$ErrorActionPreference = 'Stop'

Write-Host "Stopping Butler service due to detected errors..."

$serviceName = $env:BUTLER_INSIDER_SERVICE_NAME
Write-Host "Service name: $serviceName"

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($service) {
    Write-Host "Service found"
    if ($service.Status -eq 'Running') {
        Write-Host "Service is running, stopping it..."
        try {
            Stop-Service -Name $serviceName -Force -ErrorAction Stop
            Write-Host "Service stop command issued"
            
            # Simple wait
            Start-Sleep -Seconds 5
            $service = Get-Service -Name $serviceName
            
            if ($service.Status -eq 'Stopped') {
                Write-Host "Service stopped successfully"
                Add-Content -Path $env:GITHUB_OUTPUT -Value "service_stopped=true"
            } else {
                Write-Host "Service may not have stopped completely"
                Add-Content -Path $env:GITHUB_OUTPUT -Value "service_stopped=partial"
            }
        } catch {
            Write-Host "Failed to stop service: $($_.Exception.Message)"
            Add-Content -Path $env:GITHUB_OUTPUT -Value "service_stopped=failed"
        }
    } else {
        Write-Host "Service was not running"
        Add-Content -Path $env:GITHUB_OUTPUT -Value "service_stopped=not_running"
    }
} else {
    Write-Host "Service not found"
    Add-Content -Path $env:GITHUB_OUTPUT -Value "service_stopped=not_found"
}

Write-Host "Service stop step completed"
