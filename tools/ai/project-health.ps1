param(
    [string]$Url = "http://127.0.0.1:5000/health"
)

try {
    $resp = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 3
    Write-Output "STATUS=$($resp.StatusCode)"
    Write-Output $resp.Content
    exit 0
}
catch {
    Write-Output "ERROR=$($_.Exception.Message)"
    exit 1
}