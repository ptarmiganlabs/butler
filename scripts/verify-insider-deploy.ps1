Write-Host "Verifying deployment..."

$serviceName = $env:BUTLER_INSIDER_SERVICE_NAME
$deployPath = $env:BUTLER_INSIDER_DEPLOY_PATH
$verificationFailed = $false

try {
    # Check if deployment directory exists and has files
    if (Test-Path $deployPath) {
        Write-Host "Deployment directory exists: $deployPath"
        $files = Get-ChildItem -Path $deployPath -Recurse
        Write-Host "Number of files in deployment: $($files.Count)"

        # Check for the main executable
        $executable = Get-ChildItem -Path $deployPath -Filter "butler.exe" -Recurse -Name
        if ($executable) {
            Write-Host "[OK] Main executable found: $executable"
        } else {
            Write-Host "[WARN] Main executable not found"
            $verificationFailed = $true
        }
    } else {
        Write-Host "[ERROR] Deployment directory not found"
        $verificationFailed = $true
    }

    # Check service status
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "Service '$serviceName' status: $($service.Status)"
        if ($service.Status -eq 'Running') {
            Write-Host "[OK] Service is running"
        } else {
            Write-Host "[WARN] Service is not running"
            $verificationFailed = $true
        }
    } else {
        Write-Host "[WARN] Service '$serviceName' not found"
        $verificationFailed = $true
    }

} catch {
    Write-Host "[ERROR] Verification failed: $($_.Exception.Message)" -ForegroundColor Red
    $verificationFailed = $true
}

if ($verificationFailed) {
    throw "Deployment verification failed — one or more required conditions were not met."
}
