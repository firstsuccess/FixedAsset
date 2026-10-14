param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('preinstall','postinstall','uninstall')]
  [string]$Action,
  [Parameter(Mandatory=$true)]
  [string]$AppDir
)
$ErrorActionPreference = 'Stop'
$serviceName = 'MonjaFixedAsset'
$winsw = Join-Path $AppDir 'service\MonjaFixedAsset.exe'
$stateDir = Join-Path $env:ProgramData 'MonjaFixedAsset'
$stateFile = Join-Path $stateDir 'installer-service-state.json'
function Get-MonjaService { Get-Service -Name $serviceName -ErrorAction SilentlyContinue }
function Wait-Stopped {
  $svc = Get-MonjaService
  if ($svc -and $svc.Status -ne 'Stopped') {
    Stop-Service -Name $serviceName -Force -ErrorAction Stop
    (Get-Service -Name $serviceName).WaitForStatus('Stopped',[TimeSpan]::FromSeconds(45))
  }
}
function Invoke-WinSW([string]$command) {
  if (!(Test-Path -LiteralPath $winsw)) { throw "WinSW executable missing: $winsw" }
  & $winsw $command
  if ($LASTEXITCODE -ne 0) { throw "WinSW $command failed with exit code $LASTEXITCODE" }
}
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
switch ($Action) {
  'preinstall' {
    $svc = Get-MonjaService
    $record = @{ Existed = [bool]$svc; WasRunning = [bool]($svc -and $svc.Status -eq 'Running') }
    $record | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
    if ($svc) { Wait-Stopped }
  }
  'postinstall' {
    $svc = Get-MonjaService
    if (!$svc) { Invoke-WinSW 'install' }
    $record = @{ Existed = $false; WasRunning = $false }
    if (Test-Path -LiteralPath $stateFile) {
      $record = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    }
    $envFile = Join-Path $AppDir '.env'
    if (!$record.Existed) {
      Set-Service -Name $serviceName -StartupType Manual
      Write-Host 'Service registered. Create .env and start it manually after configuring SQL Server.'
    } elseif ($record.WasRunning -and (Test-Path -LiteralPath $envFile)) {
      Start-Service -Name $serviceName
      Write-Host 'Existing running service restarted.'
    } else {
      Write-Host 'Existing service left stopped; configuration/startup type preserved.'
    }
    Remove-Item -LiteralPath $stateFile -Force -ErrorAction SilentlyContinue
  }
  'uninstall' {
    $svc = Get-MonjaService
    if ($svc) {
      Wait-Stopped
      Invoke-WinSW 'uninstall'
    }
    Remove-Item -LiteralPath $stateFile -Force -ErrorAction SilentlyContinue
    Write-Host 'Service removed. Database and .env were not deleted.'
  }
}
