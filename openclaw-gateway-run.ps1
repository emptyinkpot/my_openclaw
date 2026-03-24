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

function Test-GatewayPortListening {
  return [bool](Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Open-Browser {
  param(
    [Parameter(Mandatory = $true)]
    [string]$GatewayToken
  )

  $browserUrl = "http://127.0.0.1:5000/control-ui-custom/launch.html#token=$([uri]::EscapeDataString($GatewayToken))&gatewayUrl=$([uri]::EscapeDataString('ws://127.0.0.1:5000'))"

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

function Stop-StaleGatewayListener {
  $listener = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $listener) {
    return
  }

  $pid = $listener.OwningProcess
  try {
    Stop-Process -Id $pid -Force -ErrorAction Stop
  } catch {
    try {
      & taskkill /PID $pid /T /F *> $null
    } catch {
      # If the listener cannot be stopped here, let the normal startup path try again.
    }
  }

  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $deadline) {
    $stillListening = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $stillListening) {
      break
    }
    Start-Sleep -Milliseconds 250
  }
}

if (Test-GatewayPortListening) {
  Open-Browser -GatewayToken $Token
  exit 0
}

try {
  & schtasks /End /TN "OpenClaw Gateway" *> $null
} catch {
  # Ignore: if the task is already stopped or not registered, continue with the fresh launch.
}

Stop-StaleGatewayListener
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

Start-Sleep -Seconds 2
Open-Browser -GatewayToken $Token
exit 0

throw "Gateway did not start listening on 127.0.0.1:5000."
