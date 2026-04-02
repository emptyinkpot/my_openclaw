param(
  [Parameter(Mandatory = $true)]
  [int]$BrowserPid,
  [Parameter(Mandatory = $true)]
  [int]$Port,
  [Parameter(Mandatory = $true)]
  [string]$ConfigPath,
  [Parameter(Mandatory = $true)]
  [string]$Token,
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [string]$ProfileDir,
  [int]$ShutdownGraceSec = 12
)

$ErrorActionPreference = 'Stop'
$env:OPENCLAW_CONFIG_PATH = $ConfigPath
$env:OPENCLAW_GATEWAY_TOKEN = $Token
$Root = $Root.TrimEnd('\', '/')
$RepoRoot = Split-Path -Parent $Root
$SupersetRuntimeScript = Join-Path $RepoRoot 'scripts\superset\openclaw-superset-runtime.ps1'
$StartupStatePath = Join-Path $Root '.runtime\state\gateway-startup.json'

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
    Write-Verbose ("Could not write startup state: {0}" -f $_.Exception.Message)
  }
}

function Get-ProfileProcesses {
  param([string]$TargetDir)

  if (-not $TargetDir) {
    return @()
  }

  $escapedTarget = [regex]::Escape($TargetDir)

  try {
    $processes = Get-CimInstance Win32_Process -ErrorAction Stop |
      Where-Object {
        $_.Name -match 'msedge(.exe)?$' -and
        $_.CommandLine -match $escapedTarget
      }

    return @($processes)
  } catch {
    return @()
  }
}

function Stop-PortListeners {
  param(
    [Parameter(Mandatory = $true)]
    [int]$GatewayPort
  )

  try {
    $listeners = Get-NetTCPConnection -LocalPort $GatewayPort -State Listen -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($listenerPid in $listeners) {
      if ($listenerPid -and $listenerPid -ne $PID) {
        try {
          Stop-Process -Id $listenerPid -Force -ErrorAction Stop
        } catch {
          Write-Verbose ("Could not stop listener process {0} on port {1}: {2}" -f $listenerPid, $GatewayPort, $_.Exception.Message)
        }
      }
    }
  } catch {
    # Port is already clear.
  }
}

function Get-OpenClawGatewayProcesses {
  param(
    [Parameter(Mandatory = $true)]
    [int]$GatewayPort
  )

  $gatewayRunPortPattern = "(^|\\s)--port\\s+$GatewayPort(\\s|$)"
  $gatewayChildPortPattern = "(^|\\s)-Port\\s+$GatewayPort(\\s|$)"

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
    [int]$GatewayPort
  )

  $gatewayProcesses = Get-OpenClawGatewayProcesses -GatewayPort $GatewayPort
  foreach ($gatewayProcess in $gatewayProcesses) {
    if ($gatewayProcess.ProcessId -and $gatewayProcess.ProcessId -ne $PID) {
      try {
        Stop-Process -Id $gatewayProcess.ProcessId -Force -ErrorAction Stop
      } catch {
        Write-Verbose ("Could not stop OpenClaw process {0} on port {1}: {2}" -f $gatewayProcess.ProcessId, $GatewayPort, $_.Exception.Message)
      }
    }
  }
}

function Wait-ForBrowserExit {
  param(
    [Parameter(Mandatory = $true)]
    [int]$PidToWatch
  )

  try {
    Wait-Process -Id $PidToWatch -ErrorAction Stop
    return
  } catch [Microsoft.PowerShell.Commands.ProcessCommandException] {
    return
  }
}

function Wait-ForProfileExit {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TargetDir,
    [int]$TimeoutSec = 600
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if ((Get-ProfileProcesses -TargetDir $TargetDir).Count -eq 0) {
      return
    }

    Start-Sleep -Seconds 1
  }
}

function Remove-ProfileDirectory {
  param([string]$TargetDir)

  if (-not $TargetDir) {
    return
  }

  try {
    if (Test-Path -LiteralPath $TargetDir) {
      Remove-Item -LiteralPath $TargetDir -Recurse -Force -ErrorAction Stop
    }
  } catch {
    Write-Verbose ("Could not remove browser profile directory {0}: {1}" -f $TargetDir, $_.Exception.Message)
  }
}

function Test-TrackedBrowserRootsRemain {
  try {
    $trackedRoots = Get-CimInstance Win32_Process -ErrorAction Stop |
      Where-Object {
        $_.Name -match 'msedge(.exe)?$' -and
        $_.CommandLine -match '\\\.runtime\\browser\\sessions\\openclaw-' -and
        $_.CommandLine -match '--new-window'
      }

    return ($trackedRoots | Measure-Object).Count -gt 0
  } catch {
    return $false
  }
}

function Wait-ForReopenGrace {
  param([int]$GraceSeconds = 12)

  if ($GraceSeconds -le 0) {
    return $false
  }

  $deadline = (Get-Date).AddSeconds($GraceSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-TrackedBrowserRootsRemain) {
      return $true
    }

    Start-Sleep -Seconds 1
  }

  return $false
}

function Stop-SupersetRuntimeIfEnabled {
  if ($env:OPENCLAW_SUPERSET_AUTO_STOP -ne '1') {
    return
  }

  if (-not (Test-Path -LiteralPath $SupersetRuntimeScript)) {
    Write-Verbose ("Superset runtime script not found: {0}" -f $SupersetRuntimeScript)
    return
  }

  try {
    & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $SupersetRuntimeScript -Action stop -Root $RepoRoot | Out-Null
    Write-StartupState -Status 'superset_stopped_after_browser_exit' -Message 'Superset runtime was stopped after browser exit.'
  } catch {
    Write-Verbose ("Could not stop Superset runtime: {0}" -f $_.Exception.Message)
  }
}

Set-Location -LiteralPath $Root
if ($ProfileDir) {
  Wait-ForProfileExit -TargetDir $ProfileDir -TimeoutSec 600
} else {
  Wait-ForBrowserExit -PidToWatch $BrowserPid
}
Start-Sleep -Seconds 2

if ($ProfileDir) {
  Remove-ProfileDirectory -TargetDir $ProfileDir

  if (Test-TrackedBrowserRootsRemain) {
    Write-StartupState -Status 'browser_reopened_skip_stop' -Message 'Detected another tracked OpenClaw browser session. Keeping gateway alive.'
    exit 0
  }
}

if (Wait-ForReopenGrace -GraceSeconds $ShutdownGraceSec) {
  Write-StartupState -Status 'browser_reopened_during_grace' -Message "A new tracked OpenClaw browser session appeared within ${ShutdownGraceSec}s. Keeping gateway alive."
  exit 0
}

Write-StartupState -Status 'stopping_after_browser_exit' -Message 'Tracked OpenClaw browser session closed. Stopping gateway.'
Stop-OpenClawGatewayProcesses -GatewayPort $Port
Stop-PortListeners -GatewayPort $Port
Start-Sleep -Seconds 1

try {
  $portStillListening = [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop)
} catch {
  $portStillListening = $false
}

if ($portStillListening) {
  Write-StartupState -Status 'stop_timeout_after_browser_exit' -Message 'Browser session closed, but the gateway port is still listening.'
} else {
  Write-StartupState -Status 'stopped_after_browser_exit' -Message 'Tracked OpenClaw browser session closed and the gateway was stopped.'
}

Stop-SupersetRuntimeIfEnabled
