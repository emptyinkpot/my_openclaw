param(
  [string]$ConfigPath = 'E:\Auto\projects\openclaw.json',
  [string]$Token = 'e1647cdb-1b80-4eee-a975-7599160cc89b'
)

$ErrorActionPreference = 'Stop'

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
  $argsList = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $PSCommandPath,
    '-ConfigPath', $ConfigPath,
    '-Token', $Token
  )

  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argsList | Out-Null
  exit 0
}

$env:OPENCLAW_CONFIG_PATH = $ConfigPath
$env:OPENCLAW_GATEWAY_TOKEN = $Token

Start-Process -FilePath (Join-Path $PSScriptRoot 'start-openclaw.bat') -WorkingDirectory $PSScriptRoot
