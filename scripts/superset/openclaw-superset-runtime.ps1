param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('start', 'stop', 'status', 'emit-openclaw-env')]
  [string]$Action,
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [string]$BunExe
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
# Normalize potential quoted/trailing-slash root input from cmd/bat invocations.
$Root = $Root.Trim().Trim('"').TrimEnd('\', '/')
$RuntimeMutexName = 'Global\OpenClawSupersetRuntimeManager'
$ConfigPath = Join-Path $Root 'scripts\superset\openclaw-superset.config.json'
$StateDir = Join-Path $Root 'projects\.runtime\state'
$LogDir = Join-Path $Root 'projects\.runtime\logs'
$ApiPidPath = Join-Path $StateDir 'superset-api.pid'
$WebPidPath = Join-Path $StateDir 'superset-web.pid'
$ApiLogPath = Join-Path $LogDir 'superset-api.log'
$WebLogPath = Join-Path $LogDir 'superset-web.log'

function Get-DefaultSupersetConfig {
  return [ordered]@{
    openclaw = [ordered]@{
      startPath = '/superset/'
      skipEnvValidation = '1'
      supersetAutoStop = '1'
      configPath = 'projects/openclaw.json'
    }
    superset = [ordered]@{
      root = 'projects/apps/superset'
      apiPort = 3001
      webPort = 3000
    }
    env = [ordered]@{
      shared = [ordered]@{
        SKIP_ENV_VALIDATION = '1'
        DATABASE_URL = 'postgres://dev:dev@127.0.0.1:5432/superset'
        DATABASE_URL_UNPOOLED = 'postgres://dev:dev@127.0.0.1:5432/superset'
        NEXT_PUBLIC_API_URL = 'http://127.0.0.1:3001'
        NEXT_PUBLIC_WEB_URL = 'http://127.0.0.1:3000'
        NEXT_PUBLIC_POSTHOG_KEY = 'dev-local'
        NEXT_PUBLIC_POSTHOG_HOST = 'http://127.0.0.1:3000'
        NEXT_PUBLIC_SENTRY_ENVIRONMENT = 'development'
        BETTER_AUTH_SECRET = 'dev-better-auth-secret-2026-03-31-long'
        RESEND_API_KEY = 're_dev_local'
        KV_REST_API_URL = 'https://example.com'
        KV_REST_API_TOKEN = 'dev-token'
        STRIPE_SECRET_KEY = 'sk_test_dev'
        STRIPE_WEBHOOK_SECRET = 'whsec_dev'
        STRIPE_PRO_MONTHLY_PRICE_ID = 'price_dev_monthly'
        STRIPE_PRO_YEARLY_PRICE_ID = 'price_dev_yearly'
        SLACK_BILLING_WEBHOOK_URL = 'https://example.com/slack'
        ANTHROPIC_API_KEY = 'dev-anthropic-key'
      }
      api = [ordered]@{
        NEXT_PUBLIC_ADMIN_URL = 'http://127.0.0.1:3000'
        KV_URL = 'https://example.com'
        QSTASH_TOKEN = 'dev-qstash-token'
        QSTASH_CURRENT_SIGNING_KEY = 'dev-signing-key-current'
        QSTASH_NEXT_SIGNING_KEY = 'dev-signing-key-next'
      }
      web = [ordered]@{
        NEXT_PUBLIC_MARKETING_URL = 'http://127.0.0.1:3000'
        NEXT_PUBLIC_DOCS_URL = 'http://127.0.0.1:3000'
      }
    }
  }
}

function Merge-Hashtable {
  param(
    [hashtable]$Base,
    [hashtable]$Overlay
  )

  $merged = @{}
  foreach ($key in $Base.Keys) {
    $merged[$key] = $Base[$key]
  }

  foreach ($key in $Overlay.Keys) {
    if ($merged[$key] -is [hashtable] -and $Overlay[$key] -is [hashtable]) {
      $merged[$key] = Merge-Hashtable -Base $merged[$key] -Overlay $Overlay[$key]
    } else {
      $merged[$key] = $Overlay[$key]
    }
  }

  return $merged
}

function ConvertTo-Hashtable {
  param($Object)

  if ($null -eq $Object) {
    return @{}
  }

  if ($Object -is [hashtable]) {
    return $Object
  }

  $result = @{}
  foreach ($prop in $Object.PSObject.Properties) {
    $value = $prop.Value
    if ($value -and ($value -isnot [string]) -and $value.PSObject -and $value.PSObject.Properties.Count -gt 0) {
      $result[$prop.Name] = ConvertTo-Hashtable -Object $value
    } else {
      $result[$prop.Name] = $value
    }
  }

  return $result
}

function Get-SupersetConfig {
  $defaults = Get-DefaultSupersetConfig
  if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Missing config file: $ConfigPath"
  }

  try {
    $userConfig = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
  } catch {
    throw "Invalid config JSON: $ConfigPath"
  }

  $merged = Merge-Hashtable -Base $defaults -Overlay (ConvertTo-Hashtable -Object $userConfig)

  if (-not $merged.openclaw.startPath) { throw 'Config missing openclaw.startPath' }
  if (-not $merged.openclaw.configPath) { throw 'Config missing openclaw.configPath' }
  if (-not $merged.superset.root) { throw 'Config missing superset.root' }
  if (-not $merged.superset.apiPort) { throw 'Config missing superset.apiPort' }
  if (-not $merged.superset.webPort) { throw 'Config missing superset.webPort' }

  return $merged
}

$Config = Get-SupersetConfig
$SupersetApiPort = [int]$Config.superset.apiPort
$SupersetWebPort = [int]$Config.superset.webPort
$SupersetRoot = Join-Path $Root ($Config.superset.root -replace '/', '\\')

function Invoke-WithRuntimeLock {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Script,
    [int]$TimeoutMs = 4000
  )

  $mutex = New-Object System.Threading.Mutex($false, $RuntimeMutexName)
  $acquired = $false

  try {
    $acquired = $mutex.WaitOne($TimeoutMs)
    if (-not $acquired) {
      throw 'Superset runtime manager is busy. Please retry in a few seconds.'
    }

    & $Script
  } finally {
    if ($acquired) {
      try {
        $mutex.ReleaseMutex()
      } catch {
        # ignore
      }
    }

    $mutex.Dispose()
  }
}

function Ensure-Directory {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Resolve-BunExe {
  param([string]$Candidate)

  if ($Candidate -and (Test-Path -LiteralPath $Candidate)) {
    return $Candidate
  }

  $cmd = Get-Command bun -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) {
    return $cmd.Source
  }

  $fallbacks = @(
    (Join-Path $env:USERPROFILE '.bun\bin\bun.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\bun\bun.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Oven-sh.Bun.Baseline_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64-baseline\bun.exe')
  )

  foreach ($path in $fallbacks) {
    if ($path -and (Test-Path -LiteralPath $path)) {
      return $path
    }
  }

  return $null
}

function Test-PortListening {
  param([int]$Port)

  try {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop)
  } catch {
    return $false
  }
}

function Test-HttpReady {
  param(
    [int]$Port,
    [int]$TimeoutSec = 5
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri ("http://127.0.0.1:{0}/" -f $Port) -TimeoutSec $TimeoutSec
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Wait-ForReady {
  param(
    [int]$Port,
    [int]$TimeoutSec = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (Test-HttpReady -Port $Port -TimeoutSec 4) {
      return $true
    }

    Start-Sleep -Milliseconds 600
  }

  return $false
}

function Wait-ForPortListening {
  param(
    [int]$Port,
    [int]$TimeoutSec = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening -Port $Port) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Read-ProcessId {
  param([string]$PidPath)

  try {
    if (Test-Path -LiteralPath $PidPath) {
      $text = (Get-Content -LiteralPath $PidPath -Raw).Trim()
      if ($text) {
        return [int]$text
      }
    }
  } catch {
    return $null
  }

  return $null
}

function Write-ProcessId {
  param(
    [string]$PidPath,
    [int]$ProcessId
  )

  Set-Content -LiteralPath $PidPath -Value $ProcessId -Encoding ASCII
}

function Stop-ProcessIdByFile {
  param([string]$PidPath)

  $targetProcessId = Read-ProcessId -PidPath $PidPath
  if (-not $targetProcessId) {
    return
  }

  try {
    Stop-Process -Id $targetProcessId -Force -ErrorAction Stop
  } catch {
    # ignore
  }

  try {
    Remove-Item -LiteralPath $PidPath -Force -ErrorAction Stop
  } catch {
    # ignore
  }
}

function Stop-PortListeners {
  param([int]$Port)

  try {
    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($listenerPid in $listeners) {
      if ($listenerPid -and $listenerPid -ne $PID) {
        try {
          Stop-Process -Id $listenerPid -Force -ErrorAction Stop
        } catch {
          # ignore
        }
      }
    }
  } catch {
    # ignore
  }
}

function Start-SupersetService {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$WorkingDir,
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    [string]$PidPath,
    [Parameter(Mandatory = $true)]
    [string]$LogPath,
    [Parameter(Mandatory = $true)]
    [string]$Bun,
    [Parameter(Mandatory = $true)]
    [hashtable]$EnvVars,
    [string[]]$ExtraArgs = @()
  )

  if (Test-PortListening -Port $Port) {
    Write-Output "$Name already listening on 127.0.0.1:$Port"
    return
  }

  $envAssign = ($EnvVars.GetEnumerator() | Sort-Object Name | ForEach-Object {
      '$env:{0}="{1}"' -f $_.Key, ($_.Value -replace '"', '""')
    }) -join '; '

  $argLine = @('x', 'next', 'dev', '--port', [string]$Port) + $ExtraArgs
  $quotedArgs = $argLine | ForEach-Object {
    "'" + ($_ -replace "'", "''") + "'"
  }

  $cmd = @(
    "Set-Location -LiteralPath '$($WorkingDir -replace "'", "''")'",
    $envAssign,
    "& '$($Bun -replace "'", "''")' $($quotedArgs -join ' ') *>> '$($LogPath -replace "'", "''")'"
  ) -join '; '

  $process = Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -PassThru -ArgumentList @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    $cmd
  )

  Write-ProcessId -PidPath $PidPath -ProcessId $process.Id
  Write-Output "$Name started with pid $($process.Id), waiting for readiness..."
}

if (-not (Test-Path -LiteralPath $SupersetRoot)) {
  throw "Superset source not found: $SupersetRoot"
}

Ensure-Directory -Path $StateDir
Ensure-Directory -Path $LogDir

$resolvedBun = Resolve-BunExe -Candidate $BunExe

$sharedEnv = ConvertTo-Hashtable -Object $Config.env.shared

$apiEnv = @{}
$sharedEnv.GetEnumerator() | ForEach-Object { $apiEnv[$_.Key] = $_.Value }
(ConvertTo-Hashtable -Object $Config.env.api).GetEnumerator() | ForEach-Object { $apiEnv[$_.Key] = $_.Value }

$webEnv = @{}
$sharedEnv.GetEnumerator() | ForEach-Object { $webEnv[$_.Key] = $_.Value }
(ConvertTo-Hashtable -Object $Config.env.web).GetEnumerator() | ForEach-Object { $webEnv[$_.Key] = $_.Value }

switch ($Action) {
  'start' {
    Invoke-WithRuntimeLock {
      if (-not $resolvedBun) {
        throw 'Bun is not installed. Please install bun first.'
      }

      # API app also needs webpack mode on Windows to avoid Turbopack filesystem panic in this fork.
      Start-SupersetService -Name 'Superset API' -WorkingDir (Join-Path $SupersetRoot 'apps\api') -Port $SupersetApiPort -PidPath $ApiPidPath -LogPath $ApiLogPath -Bun $resolvedBun -EnvVars $apiEnv -ExtraArgs @('--webpack')
      # Next.js 16 Turbopack + sentry instrumentation can crash in this fork on Windows.
      # Force webpack dev mode to keep web service stable for OpenClaw embedding.
      Start-SupersetService -Name 'Superset Web' -WorkingDir (Join-Path $SupersetRoot 'apps\web') -Port $SupersetWebPort -PidPath $WebPidPath -LogPath $WebLogPath -Bun $resolvedBun -EnvVars $webEnv -ExtraArgs @('--webpack')

      $apiReady = Wait-ForPortListening -Port $SupersetApiPort -TimeoutSec 80
      # In local integration mode, web can briefly return 500 while still being reachable.
      # Gate startup on port binding so OpenClaw can come up and surface bridge diagnostics.
      $webReady = Wait-ForPortListening -Port $SupersetWebPort -TimeoutSec 80

      if (-not $apiReady -or -not $webReady) {
        throw ("Superset readiness check failed. apiReady={0}, webReady={1}. Check logs: {2}, {3}" -f $apiReady, $webReady, $ApiLogPath, $WebLogPath)
      }

      Write-Output 'Superset services are ready.'
    }
    break
  }

  'stop' {
    Invoke-WithRuntimeLock {
      Stop-ProcessIdByFile -PidPath $ApiPidPath
      Stop-ProcessIdByFile -PidPath $WebPidPath

      Stop-PortListeners -Port $SupersetApiPort
      Stop-PortListeners -Port $SupersetWebPort
      Write-Output 'Superset services stopped.'
    }
    break
  }

  'status' {
    Invoke-WithRuntimeLock {
      $payload = [ordered]@{
        apiPortListening = (Test-PortListening -Port $SupersetApiPort)
        webPortListening = (Test-PortListening -Port $SupersetWebPort)
        apiPid = (Read-ProcessId -PidPath $ApiPidPath)
        webPid = (Read-ProcessId -PidPath $WebPidPath)
        apiLogPath = $ApiLogPath
        webLogPath = $WebLogPath
      }

      $payload | ConvertTo-Json -Depth 4
    }
    break
  }

  'emit-openclaw-env' {
    Write-Output ('OPENCLAW_START_PATH={0}' -f $Config.openclaw.startPath)
    Write-Output ('SKIP_ENV_VALIDATION={0}' -f $Config.openclaw.skipEnvValidation)
    Write-Output ('OPENCLAW_SUPERSET_AUTO_STOP={0}' -f $Config.openclaw.supersetAutoStop)
    $resolvedConfigPath = Join-Path $Root ($Config.openclaw.configPath -replace '/', '\\')
    Write-Output ('OPENCLAW_CONFIG_PATH={0}' -f $resolvedConfigPath)
    break
  }
}
