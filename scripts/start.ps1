# Starts Vestis (the built app, served by the server on 127.0.0.1:3100) and opens it in the browser.
# The window must stay open while Vestis is used; closing it stops Vestis.
$root = Split-Path $PSScriptRoot -Parent
$url = 'http://127.0.0.1:3100'
$env:Path += ";$env:USERPROFILE\.local\bin"
Set-Location $root

function IsUp {
  try { Invoke-WebRequest "$url/api/health" -UseBasicParsing -TimeoutSec 2 | Out-Null; $true } catch { $false }
}

if (IsUp) {
  Start-Process $url
  exit
}
if (-not (Test-Path 'web\dist') -or -not (Test-Path 'server\dist')) {
  Write-Host 'Building Vestis...'
  npm run build
  if ($LASTEXITCODE) { Read-Host 'Build failed. Press Enter to close'; exit 1 }
}

Write-Host 'Vestis is running. Keep this window open; close it to stop Vestis.' -ForegroundColor Green
$server = Start-Process npm.cmd -ArgumentList '--prefix', 'server', 'run', 'start' -NoNewWindow -PassThru
foreach ($i in 1..30) {
  if (IsUp) { Start-Process $url; break }
  Start-Sleep -Seconds 1
}
$server.WaitForExit()
Read-Host 'Vestis stopped. Press Enter to close'
