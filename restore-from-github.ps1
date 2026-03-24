param(
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoBase = "https://raw.githubusercontent.com/emptyinkpot/my_openclaw/$Branch"

$textFiles = @(
  'AGENTS.md',
  'BOOTSTRAP.md',
  'HEARTBEAT.md',
  'IDENTITY.md',
  'SOUL.md',
  'TOOLS.md',
  'USER.md',
  'package.json'
)

foreach ($name in $textFiles) {
  $uri = "$repoBase/$name"
  $dest = Join-Path $root $name
  Invoke-WebRequest -Headers @{ 'User-Agent' = 'Codex' } -Uri $uri -UseBasicParsing -OutFile $dest
}

New-Item -ItemType Directory -Force -Path `
  (Join-Path $root '.openclaw'), `
  (Join-Path $root 'workspace'), `
  (Join-Path $root 'skills'), `
  (Join-Path $root 'usr\bin'), `
  (Join-Path $root 'usr\lib'), `
  (Join-Path $root 'usr\lib64'), `
  (Join-Path $root 'usr\sbin') | Out-Null

Invoke-WebRequest -Headers @{ 'User-Agent' = 'Codex' } -Uri "$repoBase/.openclaw/workspace-state.json" -UseBasicParsing -OutFile (Join-Path $root '.openclaw\workspace-state.json')
Invoke-WebRequest -Headers @{ 'User-Agent' = 'Codex' } -Uri "$repoBase/pnpm-lock.yaml" -UseBasicParsing -OutFile (Join-Path $root 'pnpm-lock.yaml')

Set-Content -LiteralPath (Join-Path $root 'bin') -Value 'usr/bin' -NoNewline
Set-Content -LiteralPath (Join-Path $root 'lib') -Value 'usr/lib' -NoNewline
Set-Content -LiteralPath (Join-Path $root 'lib64') -Value 'usr/lib64' -NoNewline
Set-Content -LiteralPath (Join-Path $root 'sbin') -Value 'usr/sbin' -NoNewline

Write-Host "Restored GitHub layout files under $root from branch $Branch"