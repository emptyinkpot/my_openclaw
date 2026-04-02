param(
  [string]$Root = 'e:\My Project\Atramenti-Console',
  [string]$ShortcutPath = 'C:\Users\ASUS-KL\Desktop\OpenClaw UI.lnk'
)

$ErrorActionPreference = 'Stop'

$checks = @()

function Add-Check {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Detail
  )

  $script:checks += [pscustomobject]@{
    Name = $Name
    Passed = $Passed
    Detail = $Detail
  }
}

$startScript = Join-Path $Root 'scripts\superset\start-openclaw.superset.bat'
$stopScript = Join-Path $Root 'scripts\superset\stop-openclaw.superset.bat'
$runtimeScript = Join-Path $Root 'scripts\superset\openclaw-superset-runtime.ps1'
$navFile = Join-Path $Root 'projects\shared\nav-bar.html'

Add-Check -Name 'Start script exists' -Passed (Test-Path -LiteralPath $startScript) -Detail $startScript
Add-Check -Name 'Stop script exists' -Passed (Test-Path -LiteralPath $stopScript) -Detail $stopScript
Add-Check -Name 'Runtime script exists' -Passed (Test-Path -LiteralPath $runtimeScript) -Detail $runtimeScript

if (Test-Path -LiteralPath $navFile) {
  $navContent = Get-Content -LiteralPath $navFile -Raw
  $hasSupersetLink = $navContent -match 'href="/superset/"'
  Add-Check -Name 'Navbar contains Superset entry' -Passed $hasSupersetLink -Detail $navFile
} else {
  Add-Check -Name 'Navbar contains Superset entry' -Passed $false -Detail ('Missing file: ' + $navFile)
}

if (Test-Path -LiteralPath $ShortcutPath) {
  try {
    $ws = New-Object -ComObject WScript.Shell
    $shortcut = $ws.CreateShortcut($ShortcutPath)
    $targetOk = [string]::Equals($shortcut.TargetPath, $startScript, [System.StringComparison]::OrdinalIgnoreCase)
    Add-Check -Name 'Desktop shortcut points to start-openclaw.superset.bat' -Passed $targetOk -Detail $shortcut.TargetPath
  } catch {
    Add-Check -Name 'Desktop shortcut points to start-openclaw.superset.bat' -Passed $false -Detail $_.Exception.Message
  }
} else {
  Add-Check -Name 'Desktop shortcut points to start-openclaw.superset.bat' -Passed $false -Detail ('Missing shortcut: ' + $ShortcutPath)
}

try {
  $statusJson = & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $runtimeScript -Action status -Root $Root
  $statusObj = $statusJson | ConvertFrom-Json
  $statusOk = $null -ne $statusObj
  Add-Check -Name 'Runtime status command executable' -Passed $statusOk -Detail ($statusJson -join "")
} catch {
  Add-Check -Name 'Runtime status command executable' -Passed $false -Detail $_.Exception.Message
}

$checks | ForEach-Object {
  $flag = if ($_.Passed) { '[OK]' } else { '[FAIL]' }
  Write-Output ("{0} {1} -> {2}" -f $flag, $_.Name, $_.Detail)
}

$failed = @($checks | Where-Object { -not $_.Passed })
if ($failed.Count -gt 0) {
  throw ("Superset integration verification failed: {0} check(s) failed." -f $failed.Count)
}

Write-Output 'All Superset integration checks passed.'
