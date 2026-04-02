param()

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$sourceRoot = Join-Path $projectRoot 'shared'
$files = @(
  'nav-bar.html',
  'nav-bar-behavior.js'
)
$targetRoots = @(
  (Join-Path $projectRoot 'control-ui-custom\assets'),
  (Join-Path $projectRoot 'control-ui-custom\shared')
)

Write-Host '======================================'
Write-Host 'OpenClaw 导航栏同步'
Write-Host '======================================'
Write-Host ''
Write-Host "脚本目录: $scriptDir"
Write-Host "项目根目录: $projectRoot"
Write-Host ''

foreach ($file in $files) {
  $source = Join-Path $sourceRoot $file
  if (-not (Test-Path -LiteralPath $source)) {
    throw "源文件不存在：$source"
  }

  Write-Host "源文件：$source"
  foreach ($targetRoot in $targetRoots) {
    if (-not (Test-Path -LiteralPath $targetRoot)) {
      New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
    }

    $target = Join-Path $targetRoot $file
    Copy-Item -LiteralPath $source -Destination $target -Force
    Write-Host "已同步：$target"
  }
  Write-Host ''
}

Write-Host '同步完成。'
