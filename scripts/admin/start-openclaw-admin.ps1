param(
  [string]$ConfigPath,
  [string]$Token = 'e1647cdb-1b80-4eee-a975-7599160cc89b',
  [switch]$ForceRestart
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

if (-not $ConfigPath) {
  $ConfigPath = Join-Path $RepoRoot 'projects\openclaw.json'
}

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

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

function Set-LauncherEnvironment {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ResolvedConfigPath,
    [Parameter(Mandatory = $true)]
    [string]$ResolvedToken,
    [switch]$RequestedForceRestart
  )

  $env:OPENCLAW_CONFIG_PATH = $ResolvedConfigPath
  $env:OPENCLAW_GATEWAY_TOKEN = $ResolvedToken

  if ($RequestedForceRestart) {
    $env:OPENCLAW_FORCE_RESTART = '1'
    return
  }

  Remove-Item Env:OPENCLAW_FORCE_RESTART -ErrorAction SilentlyContinue
}

function Invoke-MainLauncher {
  Set-Location -LiteralPath $RepoRoot
  & (Join-Path $RepoRoot 'start-openclaw.bat')
  exit $LASTEXITCODE
}

if ((-not $ForceRestart) -and (-not (Test-Administrator))) {
  Set-LauncherEnvironment -ResolvedConfigPath $ConfigPath -ResolvedToken $Token
  Invoke-MainLauncher
}

if (-not (Test-Administrator)) {
  $argsList = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', (Quote-ProcessArgument $PSCommandPath),
    '-ConfigPath', (Quote-ProcessArgument $ConfigPath),
    '-Token', (Quote-ProcessArgument $Token)
  )

  if ($ForceRestart) {
    $argsList += '-ForceRestart'
  }

  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList ($argsList -join ' ') | Out-Null
  exit 0
}

Set-LauncherEnvironment -ResolvedConfigPath $ConfigPath -ResolvedToken $Token -RequestedForceRestart:$ForceRestart
Invoke-MainLauncher
