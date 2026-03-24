param()

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$script:Root = $PSScriptRoot
$script:GatewayUrl = 'ws://127.0.0.1:5000'
$script:BrowserUrlBase = 'http://127.0.0.1:5000/control-ui-custom/launch.html'
$script:GatewayLog = Join-Path $script:Root 'gateway-start.log'
$script:LocalConfigPath = Join-Path $script:Root 'start-openclaw.local.bat'
$script:LocalExamplePath = Join-Path $script:Root 'start-openclaw.local.example.bat'
$script:DefaultConfigPath = Join-Path $script:Root '.local\openclaw\openclaw.json'
$script:FallbackConfigPath = Join-Path $script:Root 'projects\openclaw.json'
$script:StartState = 'idle'
$script:LastStatus = ''
$script:LaunchedBrowser = $false
$script:PendingHealthCheck = $false
$script:HealthJob = $null

function Resolve-ConfigPath {
  if (Test-Path $script:DefaultConfigPath) {
    return $script:DefaultConfigPath
  }

  if (Test-Path $script:FallbackConfigPath) {
    return $script:FallbackConfigPath
  }

  return $script:DefaultConfigPath
}

function Read-LocalSetting {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if (-not (Test-Path $script:LocalConfigPath)) {
    return ''
  }

  $match = Select-String -Path $script:LocalConfigPath -Pattern "^\s*set\s+""$Name=(.*)""\s*$" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($match) {
    return $match.Matches[0].Groups[1].Value.Trim()
  }

  return ''
}

function Write-LocalConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath,
    [Parameter(Mandatory = $true)]
    [string]$Token
  )

  $content = @(
    '@echo off'
    'rem Copy this file to start-openclaw.local.bat and edit the values below.'
    ''
    ('set "OPENCLAW_CONFIG_PATH={0}"' -f $ConfigPath)
    ('set "OPENCLAW_GATEWAY_TOKEN={0}"' -f $Token)
  ) -join "`r`n"

  Set-Content -Path $script:LocalConfigPath -Value $content -Encoding UTF8
}

function Get-TokenForBrowser {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Token
  )

  return [uri]::EscapeDataString($Token)
}

function Test-GatewayHealthy {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Token
  )

  try {
    & openclaw gateway status --require-rpc --timeout 3000 --url $script:GatewayUrl --token $Token *> $null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Start-GatewayBackground {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ConfigPath,
    [Parameter(Mandatory = $true)]
    [string]$Token
  )

  $env:OPENCLAW_CONFIG_PATH = $ConfigPath
  $env:OPENCLAW_GATEWAY_TOKEN = $Token

  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    (Join-Path $script:Root 'openclaw-gateway-child.ps1'),
    '-ConfigPath',
    $ConfigPath,
    '-Token',
    $Token,
    '-Root',
    $script:Root,
    '-LogPath',
    $script:GatewayLog
  ) | Out-Null
}

function Stop-Gateway {
  try {
    & openclaw gateway stop *> $null
  } catch {
    # Stale gateway processes can ignore a stop request; the UI will re-check health.
  }
}

function Open-ControlUi {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Token
  )

  $browserUrl = '{0}#token={1}&gatewayUrl={2}' -f $script:BrowserUrlBase, (Get-TokenForBrowser -Token $Token), ([uri]::EscapeDataString($script:GatewayUrl))

  try {
    Start-Process $browserUrl | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Open-ControlUiOnce {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Token
  )

  if ($script:LaunchedBrowser) {
    return
  }

  if (Open-ControlUi -Token $Token) {
    $script:LaunchedBrowser = $true
    Append-Log 'Opened Control UI in the browser.'
  } else {
    Append-Log 'Failed to open Control UI.'
  }
}

function Append-Log {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text
  )

  $timestamp = (Get-Date).ToString('HH:mm:ss')
  $line = "[$timestamp] $Text"
  $script:LogBox.AppendText($line + [Environment]::NewLine)
  $script:LogBox.SelectionStart = $script:LogBox.TextLength
  $script:LogBox.ScrollToCaret()
}

function Set-Status {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Text,
    [Parameter(Mandatory = $true)]
    [System.Drawing.Color]$Color
  )

  $script:StatusLabel.Text = $Text
  $script:StatusLabel.ForeColor = $Color
  $script:StatusDot.BackColor = $Color
  $script:LastStatus = $Text
}

function Invoke-Ui {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  if ($form.IsHandleCreated -and $form.InvokeRequired) {
    [void]$form.BeginInvoke($Action)
  } else {
    & $Action
  }
}

function Start-HealthCheckAsync {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Token
  )

  if ($script:PendingHealthCheck) {
    return
  }

  $script:PendingHealthCheck = $true
  $startButton.Enabled = $false
  $refreshButton.Enabled = $false
  $progress.Visible = $true
  Set-Status -Text 'Checking' -Color ([System.Drawing.Color]::FromArgb(245, 158, 11))
  $healthValue.Text = 'Checking gateway health...'
  Append-Log 'Checking gateway health in background.'

  if ($script:HealthJob -and $script:HealthJob.State -in @('Running', 'NotStarted')) {
    return
  }

  $script:HealthJob = Start-Job -ScriptBlock {
    param($token, $gatewayUrl)
    $resultText = & openclaw gateway status --require-rpc --timeout 3000 --url $gatewayUrl --token $token 2>&1
    [pscustomobject]@{
      Healthy = ($LASTEXITCODE -eq 0)
      Output = ($resultText | Out-String)
    }
  } -ArgumentList $Token, $script:GatewayUrl
}

$configPath = Read-LocalSetting -Name 'OPENCLAW_CONFIG_PATH'
if (-not $configPath) {
  $configPath = Resolve-ConfigPath
}

$token = Read-LocalSetting -Name 'OPENCLAW_GATEWAY_TOKEN'
if (-not $token -or $token -eq 'PUT_YOUR_TOKEN_HERE') {
  $token = ''
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'OpenClaw Launcher'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object System.Drawing.Size(1080, 720)
$form.MinimumSize = New-Object System.Drawing.Size(980, 640)
$form.BackColor = [System.Drawing.Color]::FromArgb(12, 17, 28)
$form.ForeColor = [System.Drawing.Color]::FromArgb(231, 238, 251)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$header = New-Object System.Windows.Forms.Panel
$header.Dock = 'Top'
$header.Height = 112
$header.BackColor = [System.Drawing.Color]::FromArgb(17, 24, 39)
$form.Controls.Add($header)

$accent = New-Object System.Windows.Forms.Panel
$accent.Dock = 'Left'
$accent.Width = 10
$accent.BackColor = [System.Drawing.Color]::FromArgb(125, 211, 252)
$header.Controls.Add($accent)

$title = New-Object System.Windows.Forms.Label
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(28, 20)
$title.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 20, [System.Drawing.FontStyle]::Bold)
$title.Text = 'OpenClaw Launcher'
$header.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.AutoSize = $true
$subtitle.Location = New-Object System.Drawing.Point(30, 58)
$subtitle.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
$subtitle.Text = 'Start the gateway, watch health, and open the control UI from one native window.'
$header.Controls.Add($subtitle)

$statusDot = New-Object System.Windows.Forms.Panel
$statusDot.Name = 'StatusDot'
$statusDot.Size = New-Object System.Drawing.Size(12, 12)
$statusDot.Location = New-Object System.Drawing.Point(30, 83)
$statusDot.BackColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
$header.Controls.Add($statusDot)
$script:StatusDot = $statusDot

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Name = 'StatusLabel'
$statusLabel.AutoSize = $true
$statusLabel.Location = New-Object System.Drawing.Point(52, 78)
$statusLabel.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 11, [System.Drawing.FontStyle]::Bold)
$statusLabel.Text = 'Idle'
$header.Controls.Add($statusLabel)
$script:StatusLabel = $statusLabel

$badge = New-Object System.Windows.Forms.Label
$badge.AutoSize = $true
$badge.Anchor = 'Top,Right'
$badge.Location = New-Object System.Drawing.Point(850, 22)
$badge.Padding = New-Object System.Windows.Forms.Padding(12, 5, 12, 5)
$badge.BackColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$badge.ForeColor = [System.Drawing.Color]::FromArgb(191, 219, 254)
$badge.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$badge.Text = 'local launcher'
$header.Controls.Add($badge)

function New-Card {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TitleText,
    [Parameter(Mandatory = $true)]
    [int]$Left,
    [Parameter(Mandatory = $true)]
    [int]$Top,
    [Parameter(Mandatory = $true)]
    [int]$Width,
    [Parameter(Mandatory = $true)]
    [int]$Height
  )

  $card = New-Object System.Windows.Forms.Panel
  $card.Location = New-Object System.Drawing.Point($Left, $Top)
  $card.Size = New-Object System.Drawing.Size($Width, $Height)
  $card.BackColor = [System.Drawing.Color]::FromArgb(17, 24, 39)
  $card.Padding = New-Object System.Windows.Forms.Padding(18)
  $card.BorderStyle = 'FixedSingle'

  $label = New-Object System.Windows.Forms.Label
  $label.AutoSize = $true
  $label.Location = New-Object System.Drawing.Point(18, 14)
  $label.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 11, [System.Drawing.FontStyle]::Bold)
  $label.Text = $TitleText
  $card.Controls.Add($label)

  return [pscustomobject]@{ Panel = $card; Title = $label }
}

$leftCard = New-Card -TitleText 'Startup Settings' -Left 22 -Top 136 -Width 470 -Height 206
$form.Controls.Add($leftCard.Panel)

$rightCard = New-Card -TitleText 'Gateway Status' -Left 512 -Top 136 -Width 542 -Height 206
$form.Controls.Add($rightCard.Panel)

$bottomCard = New-Card -TitleText 'Live Log' -Left 22 -Top 360 -Width 1032 -Height 312
$form.Controls.Add($bottomCard.Panel)

$cfgLabel = New-Object System.Windows.Forms.Label
$cfgLabel.AutoSize = $true
$cfgLabel.Location = New-Object System.Drawing.Point(18, 52)
$cfgLabel.Text = 'Config path'
$leftCard.Panel.Controls.Add($cfgLabel)

$cfgBox = New-Object System.Windows.Forms.TextBox
$cfgBox.Location = New-Object System.Drawing.Point(18, 74)
$cfgBox.Size = New-Object System.Drawing.Size(402, 27)
$cfgBox.ReadOnly = $false
$cfgBox.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$cfgBox.ForeColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
$cfgBox.BorderStyle = 'FixedSingle'
$cfgBox.Text = $configPath
$leftCard.Panel.Controls.Add($cfgBox)

$browseConfig = New-Object System.Windows.Forms.Button
$browseConfig.Text = 'Browse'
$browseConfig.Location = New-Object System.Drawing.Point(330, 108)
$browseConfig.Size = New-Object System.Drawing.Size(90, 30)
$browseConfig.FlatStyle = 'Flat'
$browseConfig.BackColor = [System.Drawing.Color]::FromArgb(37, 99, 235)
$browseConfig.ForeColor = [System.Drawing.Color]::White
$leftCard.Panel.Controls.Add($browseConfig)

$tokenLabel = New-Object System.Windows.Forms.Label
$tokenLabel.AutoSize = $true
$tokenLabel.Location = New-Object System.Drawing.Point(18, 112)
$tokenLabel.Text = 'Gateway token'
$leftCard.Panel.Controls.Add($tokenLabel)

$tokenBox = New-Object System.Windows.Forms.TextBox
$tokenBox.Location = New-Object System.Drawing.Point(18, 134)
$tokenBox.Size = New-Object System.Drawing.Size(402, 27)
$tokenBox.UseSystemPasswordChar = $true
$tokenBox.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$tokenBox.ForeColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
$tokenBox.BorderStyle = 'FixedSingle'
$tokenBox.Text = $token
$leftCard.Panel.Controls.Add($tokenBox)

$rememberCheck = New-Object System.Windows.Forms.CheckBox
$rememberCheck.AutoSize = $true
$rememberCheck.Location = New-Object System.Drawing.Point(18, 168)
$rememberCheck.Text = 'Save to start-openclaw.local.bat'
$rememberCheck.Checked = [bool]$token
$rememberCheck.ForeColor = [System.Drawing.Color]::FromArgb(203, 213, 225)
$leftCard.Panel.Controls.Add($rememberCheck)

$gatewayLabel = New-Object System.Windows.Forms.Label
$gatewayLabel.AutoSize = $true
$gatewayLabel.Location = New-Object System.Drawing.Point(18, 52)
$gatewayLabel.Text = 'Gateway URL'
$rightCard.Panel.Controls.Add($gatewayLabel)

$gatewayValue = New-Object System.Windows.Forms.Label
$gatewayValue.AutoSize = $false
$gatewayValue.Location = New-Object System.Drawing.Point(18, 74)
$gatewayValue.Size = New-Object System.Drawing.Size(490, 24)
$gatewayValue.Font = New-Object System.Drawing.Font('Consolas', 11)
$gatewayValue.Text = $script:GatewayUrl
$gatewayValue.ForeColor = [System.Drawing.Color]::FromArgb(125, 211, 252)
$rightCard.Panel.Controls.Add($gatewayValue)

$healthLabel = New-Object System.Windows.Forms.Label
$healthLabel.AutoSize = $true
$healthLabel.Location = New-Object System.Drawing.Point(18, 110)
$healthLabel.Text = 'Health'
$rightCard.Panel.Controls.Add($healthLabel)

$healthValue = New-Object System.Windows.Forms.Label
$healthValue.AutoSize = $true
$healthValue.Location = New-Object System.Drawing.Point(18, 132)
$healthValue.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 15, [System.Drawing.FontStyle]::Bold)
$healthValue.Text = 'Not started'
$healthValue.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
$rightCard.Panel.Controls.Add($healthValue)

$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location = New-Object System.Drawing.Point(18, 170)
$progress.Size = New-Object System.Drawing.Size(490, 16)
$progress.Style = 'Marquee'
$progress.MarqueeAnimationSpeed = 30
$progress.Visible = $false
$rightCard.Panel.Controls.Add($progress)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Text = 'Start Gateway'
$startButton.Location = New-Object System.Drawing.Point(18, 206)
$startButton.Size = New-Object System.Drawing.Size(132, 34)
$startButton.FlatStyle = 'Flat'
$startButton.BackColor = [System.Drawing.Color]::FromArgb(37, 99, 235)
$startButton.ForeColor = [System.Drawing.Color]::White
$rightCard.Panel.Controls.Add($startButton)

$openUiButton = New-Object System.Windows.Forms.Button
$openUiButton.Text = 'Open Control UI'
$openUiButton.Location = New-Object System.Drawing.Point(162, 206)
$openUiButton.Size = New-Object System.Drawing.Size(140, 34)
$openUiButton.FlatStyle = 'Flat'
$openUiButton.BackColor = [System.Drawing.Color]::FromArgb(15, 118, 110)
$openUiButton.ForeColor = [System.Drawing.Color]::White
$openUiButton.Enabled = $false
$rightCard.Panel.Controls.Add($openUiButton)

$stopButton = New-Object System.Windows.Forms.Button
$stopButton.Text = 'Stop Gateway'
$stopButton.Location = New-Object System.Drawing.Point(314, 206)
$stopButton.Size = New-Object System.Drawing.Size(122, 34)
$stopButton.FlatStyle = 'Flat'
$stopButton.BackColor = [System.Drawing.Color]::FromArgb(127, 29, 29)
$stopButton.ForeColor = [System.Drawing.Color]::White
$rightCard.Panel.Controls.Add($stopButton)

$refreshButton = New-Object System.Windows.Forms.Button
$refreshButton.Text = 'Refresh'
$refreshButton.Location = New-Object System.Drawing.Point(448, 206)
$refreshButton.Size = New-Object System.Drawing.Size(60, 34)
$refreshButton.FlatStyle = 'Flat'
$refreshButton.BackColor = [System.Drawing.Color]::FromArgb(51, 65, 85)
$refreshButton.ForeColor = [System.Drawing.Color]::White
$rightCard.Panel.Controls.Add($refreshButton)

$logBox = New-Object System.Windows.Forms.RichTextBox
$logBox.Name = 'LogBox'
$logBox.Location = New-Object System.Drawing.Point(18, 52)
$logBox.Size = New-Object System.Drawing.Size(996, 236)
$logBox.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
$logBox.BorderStyle = 'FixedSingle'
$logBox.ReadOnly = $true
$logBox.Font = New-Object System.Drawing.Font('Consolas', 9)
$bottomCard.Panel.Controls.Add($logBox)
$script:LogBox = $logBox

$footer = New-Object System.Windows.Forms.Label
$footer.AutoSize = $true
$footer.Location = New-Object System.Drawing.Point(24, 680)
$footer.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
$footer.Text = 'Native launcher window. The browser control UI is opened only when you click Open Control UI.'
$form.Controls.Add($footer)

$openUiButton.Add_Click({
  $currentToken = $tokenBox.Text.Trim()
  if (-not $currentToken) {
    [System.Windows.Forms.MessageBox]::Show('Enter a gateway token first.', 'OpenClaw Launcher')
    return
  }

  Open-ControlUiOnce -Token $currentToken
})

$browseConfig.Add_Click({
  $dialog = New-Object System.Windows.Forms.OpenFileDialog
  $dialog.Filter = 'OpenClaw config (openclaw.json)|openclaw.json|JSON files (*.json)|*.json|All files (*.*)|*.*'
  $dialog.InitialDirectory = Split-Path $cfgBox.Text -Parent
  if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    $cfgBox.Text = $dialog.FileName
    Append-Log "Selected config: $($dialog.FileName)"
  }
})

$refreshButton.Add_Click({
  $currentToken = $tokenBox.Text.Trim()
  if ($currentToken) {
    Start-HealthCheckAsync -Token $currentToken
  }
})

$stopButton.Add_Click({
  Stop-Gateway
  $progress.Visible = $false
  $openUiButton.Enabled = $false
  Set-Status -Text 'Stopping' -Color ([System.Drawing.Color]::FromArgb(245, 158, 11))
  $healthValue.Text = 'Stopping gateway...'
  Append-Log 'Sent stop request to gateway.'
})

$startButton.Add_Click({
  $currentToken = $tokenBox.Text.Trim()
  $currentConfig = $cfgBox.Text.Trim()

  if (-not $currentConfig -or -not (Test-Path $currentConfig)) {
    [System.Windows.Forms.MessageBox]::Show('Config file not found.', 'OpenClaw Launcher')
    return
  }

  if (-not $currentToken) {
    [System.Windows.Forms.MessageBox]::Show('Enter a gateway token first.', 'OpenClaw Launcher')
    return
  }

  if ($rememberCheck.Checked) {
    Write-LocalConfig -ConfigPath $currentConfig -Token $currentToken
    Append-Log 'Saved local token and config to start-openclaw.local.bat.'
  }

  $env:OPENCLAW_CONFIG_PATH = $currentConfig
  $env:OPENCLAW_GATEWAY_TOKEN = $currentToken

  $startButton.Enabled = $false
  $stopButton.Enabled = $true
  $openUiButton.Enabled = $false
  $progress.Visible = $true
  $healthValue.Text = 'Starting gateway...'
  Set-Status -Text 'Starting' -Color ([System.Drawing.Color]::FromArgb(245, 158, 11))
  Append-Log 'Starting gateway background process.'

  Start-GatewayBackground -ConfigPath $currentConfig -Token $currentToken
  $script:StartState = 'starting'
  Start-HealthCheckAsync -Token $currentToken
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000
$timer.Add_Tick({
  $currentToken = $tokenBox.Text.Trim()

  if ($script:HealthJob) {
    switch ($script:HealthJob.State) {
      'Completed' {
        $result = $null
        try {
          $result = Receive-Job -Job $script:HealthJob -ErrorAction SilentlyContinue | Select-Object -First 1
        } finally {
          Remove-Job -Job $script:HealthJob -Force -ErrorAction SilentlyContinue
          $script:HealthJob = $null
        }

        $script:PendingHealthCheck = $false
        $refreshButton.Enabled = $true
        $startButton.Enabled = $true
        $progress.Visible = $false

        if ($result -and $result.Healthy) {
          $script:StartState = 'running'
          Set-Status -Text 'Healthy' -Color ([System.Drawing.Color]::FromArgb(34, 197, 94))
          $healthValue.Text = 'Gateway healthy'
          $openUiButton.Enabled = $true
          Append-Log 'Gateway health check passed.'
          Open-ControlUiOnce -Token $tokenBox.Text.Trim()
        } else {
          $script:StartState = 'idle'
          Set-Status -Text 'Not running' -Color ([System.Drawing.Color]::FromArgb(148, 163, 184))
          $healthValue.Text = 'Gateway not running'
          $openUiButton.Enabled = $false
          if ($result -and $result.Output) {
            Append-Log $result.Output.Trim()
          }
          Append-Log 'Gateway health check failed.'
        }
      }
      'Failed' {
        Remove-Job -Job $script:HealthJob -Force -ErrorAction SilentlyContinue
        $script:HealthJob = $null
        $script:PendingHealthCheck = $false
        $refreshButton.Enabled = $true
        $startButton.Enabled = $true
        $progress.Visible = $false
        $script:StartState = 'idle'
        Set-Status -Text 'Not running' -Color ([System.Drawing.Color]::FromArgb(148, 163, 184))
        $healthValue.Text = 'Gateway health check failed'
        $openUiButton.Enabled = $false
      }
    }
  }

  if ($script:StartState -eq 'starting') {
    if ($currentToken -and -not $script:PendingHealthCheck) {
      $script:StartState = 'running'
      $progress.Visible = $false
      $startButton.Enabled = $true
      $openUiButton.Enabled = $true
    } else {
      $healthValue.Text = 'Waiting for RPC probe...'
    }
  } elseif ($script:StartState -eq 'running') {
    if (-not $script:PendingHealthCheck -and $currentToken) {
      $openUiButton.Enabled = $true
    }
  }
})
$timer.Start()

if ($token) {
  Append-Log 'Loaded token from local config.'
}

if (Test-Path $configPath) {
  Append-Log "Config: $configPath"
} else {
  Append-Log "Config missing: $configPath"
}

Set-Status -Text 'Ready' -Color ([System.Drawing.Color]::FromArgb(148, 163, 184))
$healthValue.Text = 'Idle'

if ($token) {
  Start-HealthCheckAsync -Token $token
} else {
  Append-Log 'No local token configured yet.'
}

[System.Windows.Forms.Application]::Run($form)
