param(
  [Parameter(Mandatory = $true)]
  [string]$ConfigPath,
  [Parameter(Mandatory = $true)]
  [string]$Token,
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [Parameter(Mandatory = $true)]
  [int]$Port,
  [string]$StartPath,
  [int]$TimeoutSec = 180
)

$ErrorActionPreference = 'Stop'
$env:OPENCLAW_CONFIG_PATH = $ConfigPath
$env:OPENCLAW_GATEWAY_TOKEN = $Token
$Root = $Root.TrimEnd('\', '/')
$WatcherScriptPath = Join-Path $PSScriptRoot 'openclaw-browser-watch.ps1'
$LauncherLogPath = Join-Path $Root '.runtime\logs\gateway-browser-launch.log'
$StartupStatePath = Join-Path $Root '.runtime\state\gateway-startup.json'
$BrowserLaunchMutexName = 'Global\OpenClawGatewayBrowserLauncher'
$BrowserLaunchMutex = $null
$BrowserLaunchMutexHeld = $false

function Quote-ProcessArgument {
  param([string]$Value)

  if ($null -eq $Value) {
    return '""'
  }

  if ($Value -match '[\s"]') {
    return '"' + ($Value -replace '"', '\"') + '"'
  }

  return $Value
}

function Ensure-ParentDirectory {
  param([string]$TargetPath)

  $parent = Split-Path -Parent $TargetPath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
}

function Write-LaunchLog {
  param([string]$Message)

  try {
    $logDir = Split-Path -Parent $LauncherLogPath
    if ($logDir -and -not (Test-Path -LiteralPath $logDir)) {
      New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    Add-Content -LiteralPath $LauncherLogPath -Value ("{0} {1}" -f (Get-Date).ToString('s'), $Message)
  } catch {
    # Ignore log write failures.
  }
}

function Write-StartupState {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Status,
    [string]$Message
  )

  try {
    Ensure-ParentDirectory -TargetPath $StartupStatePath
    $payload = [ordered]@{
      updatedAt = (Get-Date).ToString('o')
      status = $Status
      message = $Message
      port = $Port
    }
    $payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $StartupStatePath -Encoding UTF8
  } catch {
    Write-LaunchLog "Could not write startup state: $($_.Exception.Message)"
  }
}

function Acquire-BrowserLaunchMutex {
  param([int]$TimeoutMs = 500)

  $script:BrowserLaunchMutex = New-Object System.Threading.Mutex($false, $BrowserLaunchMutexName)
  $script:BrowserLaunchMutexHeld = $script:BrowserLaunchMutex.WaitOne($TimeoutMs)
  return $script:BrowserLaunchMutexHeld
}

function Release-BrowserLaunchMutex {
  if ($script:BrowserLaunchMutexHeld -and $script:BrowserLaunchMutex) {
    try {
      $script:BrowserLaunchMutex.ReleaseMutex()
    } catch {
      Write-LaunchLog "Could not release browser launch mutex: $($_.Exception.Message)"
    }
  }

  if ($script:BrowserLaunchMutex) {
    $script:BrowserLaunchMutex.Dispose()
  }

  $script:BrowserLaunchMutexHeld = $false
  $script:BrowserLaunchMutex = $null
}

function Test-GatewayHealthy {
  param([int]$GatewayPort)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$GatewayPort/health" -TimeoutSec 5
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $response.Content.Length -gt 0)
  } catch {
    return $false
  }
}

function Wait-ForGatewayHealthy {
  param(
    [int]$GatewayPort,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-GatewayHealthy -GatewayPort $GatewayPort) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Start-BrowserWatcher {
  param(
    [int]$BrowserPid,
    [int]$GatewayPort,
    [string]$ProfileDir
  )

  if (-not (Test-Path -LiteralPath $WatcherScriptPath)) {
    Write-LaunchLog "Watcher script missing: $WatcherScriptPath"
    return
  }

  $watcherArgs = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-WindowStyle',
    'Hidden',
    '-File',
    (Quote-ProcessArgument $WatcherScriptPath),
    '-BrowserPid',
    $BrowserPid,
    '-Port',
    $GatewayPort,
    '-ConfigPath',
    (Quote-ProcessArgument $ConfigPath),
    '-Token',
    (Quote-ProcessArgument $Token),
    '-Root',
    (Quote-ProcessArgument $Root)
  )

  if ($ProfileDir) {
    $watcherArgs += @('-ProfileDir', (Quote-ProcessArgument $ProfileDir))
  }

  Start-Process -FilePath 'powershell.exe' -ArgumentList ($watcherArgs -join ' ') | Out-Null
}

function Open-Browser {
  if ($env:OPENCLAW_SKIP_BROWSER -eq '1') {
    Write-LaunchLog "Gateway on port $Port is healthy, but browser launch was skipped because OPENCLAW_SKIP_BROWSER=1."
    return
  }

  $gatewayUrl = "ws://127.0.0.1:$Port"
  $startPath = $StartPath
  if ([string]::IsNullOrWhiteSpace($startPath)) {
    $startPath = $env:OPENCLAW_START_PATH
  }
  if ([string]::IsNullOrWhiteSpace($startPath)) {
    $startPath = '/control-ui-custom/index.html'
  }

  if (-not $startPath.StartsWith('/')) {
    $startPath = "/$startPath"
  }

  if ($startPath -eq '/control-ui-custom/index.html') {
    $browserUrl = "http://127.0.0.1:$Port$startPath#token=$([uri]::EscapeDataString($Token))&gatewayUrl=$([uri]::EscapeDataString($gatewayUrl))"
  } else {
    $browserUrl = "http://127.0.0.1:$Port$startPath"
  }
  Write-LaunchLog "Resolved browser start path: $startPath"

  $edgeCandidates = @(
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  $edgeExe = $edgeCandidates | Select-Object -First 1
  if ($edgeExe) {
    $browserSessionId = [guid]::NewGuid().ToString('N')
    $edgeProfile = Join-Path $Root ".runtime\browser\sessions\openclaw-$browserSessionId"
    if (-not (Test-Path -LiteralPath $edgeProfile)) {
      New-Item -ItemType Directory -Path $edgeProfile -Force | Out-Null
    }

    $edgeArgs = @(
      '--new-window',
      '--no-first-run',
      '--no-default-browser-check',
      ('--user-data-dir=' + (Quote-ProcessArgument $edgeProfile)),
      '--window-size=1920,1080',
      (Quote-ProcessArgument $browserUrl)
    ) -join ' '
    $browserProcess = Start-Process -FilePath $edgeExe -ArgumentList $edgeArgs -PassThru
    Start-BrowserWatcher -BrowserPid $browserProcess.Id -GatewayPort $Port -ProfileDir $edgeProfile
    Write-LaunchLog "Opened tracked Edge window for gateway on port $Port with browser pid $($browserProcess.Id)."
    return
  }

  $browserProcess = Start-Process $browserUrl -PassThru
  if ($browserProcess -and $browserProcess.Id) {
    Start-BrowserWatcher -BrowserPid $browserProcess.Id -GatewayPort $Port
    Write-LaunchLog "Opened default browser for gateway on port $Port with browser pid $($browserProcess.Id)."
    return
  }

  Write-LaunchLog "Browser opened without process handle; auto-stop watcher unavailable."
}

Set-Location -LiteralPath $Root
try {
  if (-not (Acquire-BrowserLaunchMutex -TimeoutMs 500)) {
    Write-LaunchLog "Skipped duplicate browser launcher for port $Port because another launcher is already waiting."
    exit 0
  }

  Write-StartupState -Status 'waiting_for_health' -Message "Waiting for gateway on port $Port to become healthy before opening the browser."

  if (-not (Wait-ForGatewayHealthy -GatewayPort $Port -TimeoutSeconds $TimeoutSec)) {
    Write-StartupState -Status 'health_timeout' -Message "Gateway on port $Port did not become healthy within $TimeoutSec seconds."
    Write-LaunchLog "Gateway on port $Port did not become healthy within $TimeoutSec seconds."
    exit 1
  }

  Write-StartupState -Status 'healthy_browser_open' -Message "Gateway on port $Port is healthy. Opening tracked browser session."
  Open-Browser
} finally {
  Release-BrowserLaunchMutex
}
