// Creates a "Vestis" icon that runs scripts/launch.mjs: a .lnk on the Desktop and in the Start menu on Windows, an .app
// in ~/Applications with a Desktop link on macOS. Built on this computer, so macOS opens it without a security prompt.
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { CLAUDE_DIR, DATA_DIR, IS_MAC, IS_WINDOWS, NAME, ROOT } from './common.mjs'

const PNG_ICON = join(ROOT, 'scripts', 'vestis.png')

const windows = () => {
  const target = join(ROOT, 'scripts', 'launch.cmd')
  const icon = join(ROOT, 'scripts', 'vestis.ico')
  // WindowStyle 7 = minimized: the build output stays in the taskbar instead of on screen.
  const script = `
$shell = New-Object -ComObject WScript.Shell
$folders = @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs'))
foreach ($folder in $folders) {
  $link = $shell.CreateShortcut((Join-Path $folder '${NAME}.lnk'))
  $link.TargetPath = '${target}'
  $link.WorkingDirectory = '${ROOT}'
  $link.IconLocation = '${icon}'
  $link.WindowStyle = 7
  $link.Description = 'Vestis: try clothes on your photos'
  $link.Save()
  Write-Output "Created $(Join-Path $folder '${NAME}.lnk')"
}`
  const result = spawnSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error('Could not create the Windows shortcut')
}

/** The app icon, made from vestis.png with the tools every Mac has. */
const macIcon = ({ resources }) => {
  const iconset = join(mkdtempSync(join(tmpdir(), 'vestis-')), 'vestis.iconset')
  mkdirSync(iconset)
  for (const size of [16, 32, 128, 256, 512])
    for (const [scale, suffix] of [
      [1, ''],
      [2, '@2x'],
    ]) {
      const pixels = String(Math.min(size * scale, 512))
      spawnSync('sips', ['-z', pixels, pixels, PNG_ICON, '--out', join(iconset, `icon_${size}x${size}${suffix}.png`)], { stdio: 'ignore' })
    }
  const ok = spawnSync('iconutil', ['-c', 'icns', iconset, '-o', join(resources, 'vestis.icns')], { stdio: 'ignore' }).status === 0
  rmSync(dirname(iconset), { recursive: true, force: true })
  if (!ok) console.log('Could not build the app icon, the shortcut will use the default icon')
}

const mac = () => {
  const app = join(homedir(), 'Applications', `${NAME}.app`)
  const contents = join(app, 'Contents')
  const macos = join(contents, 'MacOS')
  const resources = join(contents, 'Resources')
  rmSync(app, { recursive: true, force: true })
  mkdirSync(macos, { recursive: true })
  mkdirSync(resources, { recursive: true })

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
  <key>CFBundleIconFile</key><string>vestis</string>
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
  macIcon({ resources })

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
