// Creates a "Vestis" icon that runs scripts/launch.mjs: a .lnk on the Desktop and in the Start menu on Windows, an .app
// in ~/Applications with a Desktop link on macOS. Built on this computer, so macOS opens it without a security prompt.
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { CLAUDE_DIR, DATA_DIR, IS_MAC, IS_WINDOWS, NAME, ROOT } from './common.mjs'

const windows = () => {
  const target = join(ROOT, 'scripts', 'launch.cmd')
  // WindowStyle 7 = minimized: the build output stays in the taskbar instead of on screen.
  const script = `
$shell = New-Object -ComObject WScript.Shell
$folders = @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs'))
foreach ($folder in $folders) {
  $link = $shell.CreateShortcut((Join-Path $folder '${NAME}.lnk'))
  $link.TargetPath = '${target}'
  $link.WorkingDirectory = '${ROOT}'
  $link.WindowStyle = 7
  $link.Description = 'Vestis: try clothes on your photos'
  $link.Save()
  Write-Output "Created $(Join-Path $folder '${NAME}.lnk')"
}`
  const result = spawnSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error('Could not create the Windows shortcut')
}

const mac = () => {
  const app = join(homedir(), 'Applications', `${NAME}.app`)
  const contents = join(app, 'Contents')
  const macos = join(contents, 'MacOS')
  rmSync(app, { recursive: true, force: true })
  mkdirSync(macos, { recursive: true })

  writeFileSync(
    join(contents, 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>${NAME}</string>
  <key>CFBundleDisplayName</key><string>${NAME}</string>
  <key>CFBundleIdentifier</key><string>local.vestis.launcher</string>
  <key>CFBundleExecutable</key><string>${NAME}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
`,
  )

  // Apps opened from Finder get a minimal PATH, so the node used now (and its npm) and Claude Code's folder are baked in.
  const executable = join(macos, NAME)
  const log = join(DATA_DIR, 'logs', 'launch.log')
  writeFileSync(
    executable,
    `#!/bin/bash
export PATH="${dirname(process.execPath)}:${CLAUDE_DIR}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "${ROOT}" || exit 1
mkdir -p "$(dirname "${log}")"
osascript -e 'display notification "Updating and starting…" with title "${NAME}"'
if ! "${process.execPath}" scripts/launch.mjs >> "${log}" 2>&1; then
  osascript -e 'display alert "${NAME} could not start" message "See ${log}"'
fi
`,
  )
  chmodSync(executable, 0o755)

  const desktopLink = join(homedir(), 'Desktop', `${NAME}.app`)
  rmSync(desktopLink, { force: true })
  symlinkSync(app, desktopLink)
  spawnSync('touch', [app])
  console.log(`Created ${app}\nCreated ${desktopLink}`)
}

export const createShortcut = () => {
  if (IS_WINDOWS) windows()
  else if (IS_MAC) mac()
  else console.log('No desktop icon on this system: start Vestis with  npm run app')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href)
  try {
    createShortcut()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
