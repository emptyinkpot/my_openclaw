param(
    [string]$Url = "http://127.0.0.1:5000/health",
    [int]$TimeoutSec = 45,
    [int]$IntervalMs = 1200
)

$deadline = (Get-Date).AddSeconds($TimeoutSec)

do {
    Start-Sleep -Milliseconds $IntervalMs
    try {
        $resp = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 3
        Write-Output ("STATUS=" + $resp.StatusCode)
        if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
            exit 0
        }
    }
    catch {
        Write-Output ("WAITING=" + $_.Exception.Message)
    }
}
while ((Get-Date) -lt $deadline)

Write-Output "TIMEOUT"
exit 1