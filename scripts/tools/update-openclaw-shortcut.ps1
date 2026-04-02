param(
  [string]$ShortcutPath = 'C:\Users\ASUS-KL\Desktop\OpenClaw UI.lnk',
  [string]$TargetPath = 'e:\My Project\Atramenti-Console\start-openclaw.superset.bat',
  [string]$WorkingDirectory = 'e:\My Project\Atramenti-Console',
  [string]$IconPath = 'e:\My Project\Atramenti-Console\projects\assets\favicon.ico'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ShortcutPath)) {
  throw "Shortcut not found: $ShortcutPath"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = $TargetPath
$shortcut.Arguments = ''
$shortcut.WorkingDirectory = $WorkingDirectory

if (Test-Path -LiteralPath $IconPath) {
  $shortcut.IconLocation = $IconPath
}

$shortcut.Save()

$verify = $shell.CreateShortcut($ShortcutPath)
Write-Output ("Shortcut updated: " + $verify.TargetPath)
