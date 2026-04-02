param(
    [string]$Url = "http://127.0.0.1:5000/health",
    [int]$TimeoutSec = 3
)

try {
    $resp = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec $TimeoutSec
    Write-Output ("STATUS=" + $resp.StatusCode)
    Write-Output $resp.Content
    exit 0
}
catch {
    Write-Output ("ERROR=" + $_.Exception.Message)
    exit 1
}