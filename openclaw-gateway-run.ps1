param(
  [Parameter(Mandatory = $true)]
  [string]$ConfigPath,
  [Parameter(Mandatory = $true)]
  [string]$Token,
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [Parameter(Mandatory = $true)]
  [string]$LogPath,
  [int]$PreferredPort = 5000,
  [switch]$ForceRestart
)

$ErrorActionPreference = 'Stop'
$env:OPENCLAW_CONFIG_PATH = $ConfigPath
$env:OPENCLAW_GATEWAY_TOKEN = $Token
$Root = $Root.TrimEnd('\', '/')
$WatcherScriptPath = Join-Path $PSScriptRoot 'openclaw-browser-watch.ps1'
$BrowserLauncherScriptPath = Join-Path $PSScriptRoot 'openclaw-browser-launch.ps1'
$StartupStatePath = Join-Path $Root '.runtime\state\gateway-startup.json'
$LaunchMutexName = 'Global\OpenClawGatewayLauncher'
$LaunchMutex = $null
$LaunchMutexHeld = $false

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

function Write-StartupState {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Status,
    [string]$Message,
    [int]$Port = 0
  )

  try {
    Ensure-ParentDirectory -TargetPath $StartupStatePath

    $payload = [ordered]@{
      updatedAt = (Get-Date).ToString('o')
      status = $Status
      message = $Message
      port = $Port
      forceRestart = [bool]$ForceRestart
    }

    $payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $StartupStatePath -Encoding UTF8
  } catch {
    Write-Verbose ("Could not write startup state: {0}" -f $_.Exception.Message)
  }
}

function Acquire-LaunchMutex {
  param([int]$TimeoutMs = 1500)

  $script:LaunchMutex = New-Object System.Threading.Mutex($false, $LaunchMutexName)
  $script:LaunchMutexHeld = $script:LaunchMutex.WaitOne($TimeoutMs)
  return $script:LaunchMutexHeld
}

function Release-LaunchMutex {
  if ($script:LaunchMutexHeld -and $script:LaunchMutex) {
    try {
      $script:LaunchMutex.ReleaseMutex()
    } catch {
      Write-Verbose ("Could not release launch mutex: {0}" -f $_.Exception.Message)
    }
  }

  if ($script:LaunchMutex) {
    $script:LaunchMutex.Dispose()
  }

  $script:LaunchMutexHeld = $false
  $script:LaunchMutex = $null
}

function Test-GatewayHealthy {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 5
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300 -and $response.Content.Length -gt 0)
  } catch {
    return $false
  }
}

function Test-ControlUiReady {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/control-ui-custom/index.html" -TimeoutSec 5
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
  } catch {
    return $false
  }
}

function Test-GatewayReady {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  return (Test-GatewayHealthy -Port $Port)
}

function Stop-Port5000Listeners {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  try {
    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($listenerPid in $listeners) {
      if ($listenerPid -and $listenerPid -ne $PID) {
        try {
          Stop-Process -Id $listenerPid -Force -ErrorAction Stop
        } catch {
          Write-Verbose ("Could not stop process {0} bound to port {1}: {2}" -f $listenerPid, $Port, $_.Exception.Message)
        }
      }
    }
  } catch {
    # Ignore missing cmdlets or missing listeners.
  }
}

function Get-OpenClawGatewayProcesses {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $gatewayRunPortPattern = "(^|\\s)--port\\s+$Port(\\s|$)"
  $gatewayChildPortPattern = "(^|\\s)-Port\\s+$Port(\\s|$)"

  try {
    $processes = Get-CimInstance Win32_Process -ErrorAction Stop |
      Where-Object {
        (
          $_.Name -match 'node(.exe)?$' -and
          $_.CommandLine -match 'openclaw' -and
          $_.CommandLine -match 'gateway\\s+run' -and
          $_.CommandLine -match $gatewayRunPortPattern
        ) -or (
          $_.Name -match 'powershell(.exe)?$' -and
          $_.CommandLine -match 'openclaw-gateway-child\\.ps1' -and
          $_.CommandLine -match $gatewayChildPortPattern
        )
      }

    return @($processes)
  } catch {
    return @()
  }
}

function Stop-OpenClawGatewayProcesses {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $gatewayProcesses = Get-OpenClawGatewayProcesses -Port $Port
  foreach ($gatewayProcess in $gatewayProcesses) {
    if ($gatewayProcess.ProcessId -and $gatewayProcess.ProcessId -ne $PID) {
      try {
        Stop-Process -Id $gatewayProcess.ProcessId -Force -ErrorAction Stop
      } catch {
        Write-Verbose ("Could not stop OpenClaw process {0} on port {1}: {2}" -f $gatewayProcess.ProcessId, $Port, $_.Exception.Message)
      }
    }
  }
}

function Test-PortListening {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  try {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop)
  } catch {
    return $false
  }
}

function Wait-ForGatewayHealthy {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$TimeoutSec = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (Test-GatewayHealthy -Port $Port) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Wait-ForPortRelease {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$TimeoutSec = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (-not (Test-PortListening -Port $Port)) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Read-LogTail {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TargetPath,
    [int]$LineCount = 40
  )

  try {
    if (Test-Path -LiteralPath $TargetPath) {
      return (Get-Content -LiteralPath $TargetPath -Tail $LineCount -ErrorAction Stop) -join [Environment]::NewLine
    }
  } catch {
    return "Unable to read log tail from ${TargetPath}: $($_.Exception.Message)"
  }

  return "Log file not found: ${TargetPath}"
}

function Invoke-GatewayStop {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$TimeoutSec = 20
  )

  Stop-OpenClawGatewayProcesses -Port $Port
  Stop-Port5000Listeners -Port $Port
  return (Wait-ForPortRelease -Port $Port -TimeoutSec $TimeoutSec)
}

function Get-LaunchPort {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  Stop-OpenClawGatewayProcesses -Port $Port
  Stop-Port5000Listeners -Port $Port
  if (-not (Wait-ForPortRelease -Port $Port -TimeoutSec 10)) {
    throw "Preferred OpenClaw port 127.0.0.1:$Port did not clear in time."
  }

  return $Port
}

function Open-Browser {
  param(
    [Parameter(Mandatory = $true)]
    [string]$GatewayToken,
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $gatewayUrl = "ws://127.0.0.1:$Port"
  $browserUrl = "http://127.0.0.1:$Port/control-ui-custom/index.html#token=$([uri]::EscapeDataString($GatewayToken))&gatewayUrl=$([uri]::EscapeDataString($gatewayUrl))"

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

    try {
      $edgeArgs = @(
        '--new-window',
        '--no-first-run',
        '--no-default-browser-check',
        ('--user-data-dir=' + (Quote-ProcessArgument $edgeProfile)),
        '--window-size=1920,1080',
        (Quote-ProcessArgument $browserUrl)
      ) -join ' '
      $browserProcess = Start-Process -FilePath $edgeExe -ArgumentList $edgeArgs -PassThru
      Start-BrowserWatcher -BrowserPid $browserProcess.Id -Port $Port -ProfileDir $edgeProfile
    } catch {
      Write-Warning "Gateway is ready, but the browser could not be opened: $($_.Exception.Message)"
    }
  } else {
    try {
      $browserProcess = Start-Process $browserUrl -PassThru
      if ($browserProcess -and $browserProcess.Id) {
        Start-BrowserWatcher -BrowserPid $browserProcess.Id -Port $Port
      } else {
        Write-Warning 'Gateway is ready, but automatic shutdown is unavailable because the default browser process could not be tracked.'
      }
    } catch {
      Write-Warning "Gateway is ready, but the default browser could not be opened: $($_.Exception.Message)"
    }
  }
}

function Start-BrowserWatcher {
  param(
    [Parameter(Mandatory = $true)]
    [int]$BrowserPid,
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [string]$ProfileDir
  )

  if (-not (Test-Path -LiteralPath $WatcherScriptPath)) {
    Write-Warning "Gateway is ready, but auto-stop watcher is missing: $WatcherScriptPath"
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
    $Port,
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

function Start-BrowserLauncher {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [int]$TimeoutSec = 60
  )

  if (-not (Test-Path -LiteralPath $BrowserLauncherScriptPath)) {
    Write-Warning "Gateway is starting, but browser launcher is missing: $BrowserLauncherScriptPath"
    return
  }

  $launcherArgs = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-WindowStyle',
    'Hidden',
    '-File',
    (Quote-ProcessArgument $BrowserLauncherScriptPath),
    '-ConfigPath',
    (Quote-ProcessArgument $ConfigPath),
    '-Token',
    (Quote-ProcessArgument $Token),
    '-Root',
    (Quote-ProcessArgument $Root),
    '-Port',
    $Port,
    '-TimeoutSec',
    $TimeoutSec
  )

  Start-Process -FilePath 'powershell.exe' -ArgumentList ($launcherArgs -join ' ') | Out-Null
}

try {
  $launchPort = $PreferredPort

  if (-not (Acquire-LaunchMutex -TimeoutMs 1500)) {
    Write-StartupState -Status 'launcher_busy' -Message 'Another OpenClaw launcher is already running. Waiting in the background.' -Port $launchPort
    Start-BrowserLauncher -Port $launchPort -TimeoutSec 60
    Write-Output "Another OpenClaw start is already in progress. The browser will open automatically when that launcher finishes."
    exit 0
  }

  if (-not $ForceRestart) {
    if (Test-GatewayReady -Port $launchPort) {
      Write-StartupState -Status 'healthy_reused' -Message 'Reused existing healthy gateway instance.' -Port $launchPort
      Open-Browser -GatewayToken $Token -Port $launchPort
      exit 0
    }

    if (Test-PortListening -Port $launchPort) {
      if (Wait-ForGatewayHealthy -Port $launchPort -TimeoutSec 20) {
        Write-StartupState -Status 'healthy_after_wait' -Message 'Existing gateway became healthy during startup wait.' -Port $launchPort
        Open-Browser -GatewayToken $Token -Port $launchPort
        exit 0
      }
    }
  }

  $shouldStopExistingGateway = $ForceRestart -or (Test-PortListening -Port $launchPort)
  if ($shouldStopExistingGateway) {
    Write-StartupState -Status 'stopping_existing' -Message 'Stopping existing gateway instance before launch.' -Port $launchPort
    if (-not (Invoke-GatewayStop -Port $launchPort -TimeoutSec 20)) {
      Write-StartupState -Status 'stop_failed' -Message "Existing gateway instance on 127.0.0.1:$launchPort did not stop cleanly." -Port $launchPort
      throw "Existing gateway instance on 127.0.0.1:$launchPort did not stop cleanly."
    }
  }

  # On Windows, `openclaw gateway run --force` depends on Unix tools like fuser/lsof.
  # We proactively clear the preferred port ourselves and fall back to the next free local port.
  $launchPort = Get-LaunchPort -Port $launchPort
  Write-StartupState -Status 'launching' -Message 'Starting new gateway child process.' -Port $launchPort

  Start-Sleep -Milliseconds 500
  Set-Location -LiteralPath $Root

  $logPathForPort = $LogPath
  if ($launchPort -ne $PreferredPort) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($LogPath)
    $extension = [System.IO.Path]::GetExtension($LogPath)
    $directory = Split-Path -Parent $LogPath
    $logPathForPort = Join-Path $directory "$baseName-$launchPort$extension"
  }

  $logDirectory = Split-Path -Parent $logPathForPort
  if ($logDirectory -and -not (Test-Path -LiteralPath $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
  }

  $gatewayChild = Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -PassThru -ArgumentList (@(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    (Quote-ProcessArgument (Join-Path $PSScriptRoot 'openclaw-gateway-child.ps1')),
    '-ConfigPath',
    (Quote-ProcessArgument $ConfigPath),
    '-Token',
    (Quote-ProcessArgument $Token),
    '-Root',
    (Quote-ProcessArgument $Root),
    '-Port',
    $launchPort,
    '-LogPath',
    (Quote-ProcessArgument $logPathForPort)
  ) -join ' ')

  $deadline = (Get-Date).AddSeconds(8)
  while ((Get-Date) -lt $deadline) {
    if (Test-GatewayReady -Port $launchPort) {
      Write-StartupState -Status 'healthy_started' -Message 'Gateway became healthy during foreground probe window.' -Port $launchPort
      Open-Browser -GatewayToken $Token -Port $launchPort
      exit 0
    }

    Start-Sleep -Milliseconds 500
  }

  $gatewayStillLaunching = (Test-PortListening -Port $launchPort) -or ((Get-OpenClawGatewayProcesses -Port $launchPort).Count -gt 0)
  if ($gatewayStillLaunching) {
    Write-StartupState -Status 'warming_up' -Message 'Gateway is still warming up; browser launcher will continue waiting in the background.' -Port $launchPort
  } else {
    Write-StartupState -Status 'warming_up_pending_health' -Message 'Foreground probe did not see /health yet; browser launcher will continue waiting before declaring failure.' -Port $launchPort
  }

  Start-BrowserLauncher -Port $launchPort -TimeoutSec 60
  Write-Output "Gateway is still warming up on 127.0.0.1:$launchPort. The browser will open automatically when /health is ready."
  exit 0
} finally {
  Release-LaunchMutex
}
