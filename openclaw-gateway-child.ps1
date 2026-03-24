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
$env:COZE_INTEGRATION_BASE_URL = 'http://127.0.0.1:11434'
$env:COZE_INTEGRATION_MODEL_BASE_URL = 'http://127.0.0.1:11434/v1'
$env:COZE_WORKLOAD_IDENTITY_API_KEY = 'ollama-local'
$env:CONTENT_CRAFT_MODEL = 'qwen2.5:7b'
Set-Location -LiteralPath $Root

if (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1) {
  exit 0
}

openclaw gateway run --port 5000 --force --token $Token *>> $LogPath
