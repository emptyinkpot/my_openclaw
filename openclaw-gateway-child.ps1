param(
  [Parameter(Mandatory = $true)]
  [string]$ConfigPath,
  [Parameter(Mandatory = $true)]
  [string]$Token,
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [Parameter(Mandatory = $true)]
  [int]$Port,
  [Parameter(Mandatory = $true)]
  [string]$LogPath,
  [int]$ReadyTimeoutSec = 20
)

$ErrorActionPreference = 'Stop'

function Ensure-ParentDirectory {
  param([string]$TargetPath)

  $parent = Split-Path -Parent $TargetPath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
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

function Resolve-OpenClawRuntime {
  $openclawCommand = Get-Command openclaw -ErrorAction SilentlyContinue
  if (-not $openclawCommand) {
    $openclawCommand = Get-Command 'openclaw.cmd' -ErrorAction SilentlyContinue
  }

  if (-not $openclawCommand) {
    throw 'OpenClaw command was not found on PATH.'
  }

  $shimDirectory = Split-Path -Parent $openclawCommand.Source
  $entryPath = Join-Path $shimDirectory 'node_modules\openclaw\openclaw.mjs'
  if (-not (Test-Path -LiteralPath $entryPath)) {
    throw "OpenClaw entry file not found: $entryPath"
  }

  $nodePath = Join-Path $shimDirectory 'node.exe'
  if (-not (Test-Path -LiteralPath $nodePath)) {
    $nodeCommand = Get-Command node -ErrorAction Stop
    $nodePath = $nodeCommand.Source
  }

  return @{
    NodePath = $nodePath
    EntryPath = $entryPath
  }
}

function Test-GatewayHealthy {
  param([int]$GatewayPort)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$GatewayPort/health" -TimeoutSec 3
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
  } catch {
    return $false
  }
}

$env:OPENCLAW_CONFIG_PATH = $ConfigPath
$env:OPENCLAW_GATEWAY_TOKEN = $Token

Ensure-ParentDirectory -TargetPath $LogPath
Set-Location -LiteralPath $Root

$runtime = Resolve-OpenClawRuntime
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($LogPath, $true, $utf8NoBom)
$syncRoot = New-Object object
$process = New-Object System.Diagnostics.Process
$process.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
$process.StartInfo.FileName = $runtime.NodePath
$process.StartInfo.WorkingDirectory = $Root
$process.StartInfo.UseShellExecute = $false
$process.StartInfo.RedirectStandardOutput = $true
$process.StartInfo.RedirectStandardError = $true
$process.StartInfo.CreateNoWindow = $true
$process.StartInfo.Environment['OPENCLAW_CONFIG_PATH'] = $ConfigPath
$process.StartInfo.Environment['OPENCLAW_GATEWAY_TOKEN'] = $Token
$process.StartInfo.Arguments = @(
  (Quote-ProcessArgument $runtime.EntryPath),
  'gateway',
  'run',
  '--port',
  [string]$Port,
  '--token',
  (Quote-ProcessArgument $Token)
) -join ' '

$outputHandler = [System.Diagnostics.DataReceivedEventHandler]{
  param($sender, $eventArgs)
  if ($null -ne $eventArgs.Data) {
    [System.Threading.Monitor]::Enter($syncRoot)
    try {
      $writer.WriteLine($eventArgs.Data)
      $writer.Flush()
    } finally {
      [System.Threading.Monitor]::Exit($syncRoot)
    }
  }
}

$process.add_OutputDataReceived($outputHandler)
$process.add_ErrorDataReceived($outputHandler)

try {
  [System.Threading.Monitor]::Enter($syncRoot)
  try {
    $writer.WriteLine(("[{0}] [gateway-child] launching node runtime: {1}" -f (Get-Date).ToString('o'), $runtime.NodePath))
    $writer.WriteLine(("[{0}] [gateway-child] entry: {1}" -f (Get-Date).ToString('o'), $runtime.EntryPath))
    $writer.WriteLine(("[{0}] [gateway-child] port: {1}" -f (Get-Date).ToString('o'), $Port))
    $writer.Flush()
  } finally {
    [System.Threading.Monitor]::Exit($syncRoot)
  }

  $null = $process.Start()
  $process.BeginOutputReadLine()
  $process.BeginErrorReadLine()

  $deadline = (Get-Date).AddSeconds($ReadyTimeoutSec)
  $gatewayHealthy = $false
  while ((Get-Date) -lt $deadline) {
    if (Test-GatewayHealthy -GatewayPort $Port) {
      $gatewayHealthy = $true
      break
    }

    if ($process.HasExited) {
      Start-Sleep -Milliseconds 300
    } else {
      Start-Sleep -Milliseconds 500
    }
  }

  if ($process.HasExited) {
    $process.WaitForExit()
  }

  [System.Threading.Monitor]::Enter($syncRoot)
  try {
    if ($process.HasExited) {
      $writer.WriteLine(("[{0}] [gateway-child] launcher exited with code: {1}" -f (Get-Date).ToString('o'), $process.ExitCode))
    } else {
      $writer.WriteLine(("[{0}] [gateway-child] launcher still running while readiness probe finished." -f (Get-Date).ToString('o')))
    }

    if ($gatewayHealthy) {
      $writer.WriteLine(("[{0}] [gateway-child] gateway health check passed on port: {1}" -f (Get-Date).ToString('o'), $Port))
    } else {
      $writer.WriteLine(("[{0}] [gateway-child] gateway health check timed out after {1}s on port: {2}" -f (Get-Date).ToString('o'), $ReadyTimeoutSec, $Port))
    }

    $writer.Flush()
  } finally {
    [System.Threading.Monitor]::Exit($syncRoot)
  }

  if ($gatewayHealthy) {
    exit 0
  }

  if ($process.HasExited) {
    exit $process.ExitCode
  }

  exit 1
} finally {
  if ($process) {
    $process.Dispose()
  }

  if ($writer) {
    $writer.Dispose()
  }
}
