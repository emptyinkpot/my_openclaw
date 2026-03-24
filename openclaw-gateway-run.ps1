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

$ErrorActionPreference = "Stop"
$env:OPENCLAW_CONFIG_PATH = $ConfigPath
$env:OPENCLAW_GATEWAY_TOKEN = $Token

function Test-GatewayHealthy {
  param(
    [Parameter(Mandatory = $true)]
    [string]$GatewayToken
  )

  try {
    & openclaw gateway status --require-rpc --timeout 3000 --url "ws://127.0.0.1:5000" --token $GatewayToken *> $null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Open-Browser {
  param(
    [Parameter(Mandatory = $true)]
    [string]$GatewayToken
  )

  $bootstrapPath = Join-Path $PSScriptRoot "openclaw-bootstrap.html"
  $bootstrapUri = (New-Object System.Uri($bootstrapPath)).AbsoluteUri
  $browserUrl = "$bootstrapUri?token=$([uri]::EscapeDataString($GatewayToken))&gatewayUrl=$([uri]::EscapeDataString('ws://127.0.0.1:5000'))"

  $edgeCandidates = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
  ) | Where-Object { $_ -and (Test-Path $_) }

  $edgeExe = $edgeCandidates | Select-Object -First 1
  if ($edgeExe) {
    $edgeProfile = Join-Path $PSScriptRoot ".local\edge-openclaw-fresh"
    if (-not (Test-Path $edgeProfile)) {
      New-Item -ItemType Directory -Path $edgeProfile -Force | Out-Null
    }
    try {
      Start-Process -FilePath $edgeExe -ArgumentList @(
        "--new-window",
        "--no-first-run",
        "--no-default-browser-check",
        "--user-data-dir=$edgeProfile",
        $browserUrl
      ) | Out-Null
    } catch {
      Write-Warning "Gateway is ready, but the browser could not be opened: $($_.Exception.Message)"
    }
  } else {
    try {
      Start-Process $browserUrl | Out-Null
    } catch {
      Write-Warning "Gateway is ready, but the default browser could not be opened: $($_.Exception.Message)"
    }
  }
}

if (Test-GatewayHealthy -GatewayToken $Token) {
  Open-Browser -GatewayToken $Token
  exit 0
}

try {
  & openclaw gateway stop *> $null
} catch {
  # A stale scheduled task may not always stop cleanly; continue with a fresh run.
}

Start-Sleep -Seconds 2
Set-Location -LiteralPath $Root

Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList @(
  "-NoLogo",
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  (Join-Path $PSScriptRoot "openclaw-gateway-child.ps1"),
  "-ConfigPath",
  $ConfigPath,
  "-Token",
  $Token,
  "-Root",
  $Root,
  "-LogPath",
  $LogPath
) | Out-Null

$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
    if (Test-GatewayHealthy -GatewayToken $Token) {
      Open-Browser -GatewayToken $Token
      exit 0
    }
  Start-Sleep -Seconds 1
}

throw "Gateway did not start on 127.0.0.1:5000."
