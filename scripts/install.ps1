# One-time setup of Vestis on Windows: Node.js, Claude Code, Claude login, Higgsfield, dependencies, build,
# a desktop shortcut, and the Chrome extension steps. Safe to run again: every step skips what is already done.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

function Step($text) { Write-Host "`n=== $text" -ForegroundColor Cyan }
function Say($text) { Write-Host $text -ForegroundColor Yellow }
function Has($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function RefreshPath {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ";$env:USERPROFILE\.local\bin"
}
function Run([scriptblock]$command) {
  & $command
  if ($LASTEXITCODE) { throw "This step failed (exit code $LASTEXITCODE): $command" }
}
function HiggsfieldState { (claude mcp list 2>&1 | Out-String) -split "`n" | Where-Object { $_ -match '^higgsfield' } }

RefreshPath

Step '1/7  Node.js'
if (-not (Has node)) {
  Say 'Installing Node.js...'
  Run { winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements }
  RefreshPath
}
Run { node -v }

Step '2/7  Claude Code'
if (-not (Has claude)) {
  Say 'Installing Claude Code...'
  Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression
  RefreshPath
}
Run { claude --version }

Step '3/7  Sign in to Claude'
$auth = claude auth status 2>$null | Out-String
if ($auth -notmatch '"loggedIn":\s*true') {
  Say 'A browser page opens: sign in with your Claude account (Pro or Max) and approve.'
  Run { claude auth login }
}
Write-Host 'Signed in.'

Step '4/7  Higgsfield'
Push-Location $HOME
if (-not (HiggsfieldState)) {
  Run { claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp }
}
if ((HiggsfieldState) -notmatch 'Connected') {
  Say 'Claude opens in this window. Then:'
  Say '  1. type  /mcp  and press Enter'
  Say '  2. pick  higgsfield  and choose  Authenticate'
  Say '  3. sign in to Higgsfield in the browser page that opens and approve'
  Say '  4. back here, press Esc, type  /exit  and press Enter'
  Read-Host 'Press Enter to open Claude'
  claude
  if ((HiggsfieldState) -notmatch 'Connected') { Pop-Location; throw 'Higgsfield is still not connected. Run Install Vestis again and repeat step 4.' }
}
Pop-Location
Write-Host 'Higgsfield connected.'

Step '5/7  App dependencies (a few minutes the first time)'
Set-Location $root
Run { npm ci --no-fund --no-audit }
Run { npm --prefix server ci --no-fund --no-audit }
Run { npm --prefix web ci --no-fund --no-audit }

Step '6/7  Build'
Run { npm run build }
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Vestis.lnk'))
$shortcut.TargetPath = Join-Path $root 'Start Vestis.cmd'
$shortcut.WorkingDirectory = $root
$shortcut.Save()
Write-Host 'Built. A "Vestis" shortcut is on your desktop.'

Step '7/7  Chrome extension'
Say 'In Chrome:'
Say '  1. open  chrome://extensions  (it opens now)'
Say '  2. turn on  Developer mode  (top right)'
Say '  3. click  Load unpacked  and pick this folder:'
Say "     $root\extension"
Say '  4. click the puzzle icon in the toolbar and pin Vestis'
try { Start-Process chrome 'chrome://extensions' } catch { }
Start-Process explorer.exe "/select,`"$root\extension`""

Write-Host "`nAll set. Open Vestis with the desktop shortcut." -ForegroundColor Green
