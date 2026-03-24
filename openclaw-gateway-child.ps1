param(
  [Parameter(Mandatory = $true)]
  [string]$ConfigPath,
  [Parameter(Mandatory = $true)]
  [string]$Token,
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [Parameter(Mandatory = $true)]
  [string]$LogPath
)

$env:OPENCLAW_CONFIG_PATH = $ConfigPath
$env:OPENCLAW_GATEWAY_TOKEN = $Token
Set-Location -LiteralPath $Root

try {
  & openclaw gateway status --require-rpc --timeout 3000 --url "ws://127.0.0.1:5000" --token $Token *> $null
  if ($LASTEXITCODE -eq 0) {
    exit 0
  }
} catch {
  # Fall through to a foreground start if nothing is already healthy.
}

openclaw gateway run --port 5000 --force --token $Token *>> $LogPath
