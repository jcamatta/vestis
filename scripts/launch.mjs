// What the desktop icon runs: update, install, build, (re)start the server in the background and open the app window.
// `node scripts/launch.mjs --stop` stops the server.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR, ENV, IS_MAC, IS_WINDOWS, ROOT, URL, commandExists, installAll, run } from './common.mjs'

const PID_FILE = join(DATA_DIR, 'server.pid')
const SERVER_LOG = join(DATA_DIR, 'logs', 'server.log')
const PORT = new globalThis.URL(URL).port

const isUp = () =>
  fetch(`${URL}/api/health`, { signal: AbortSignal.timeout(2000) }).then(
    (response) => response.ok,
    () => false,
  )

/** A look, extraction or photo analysis in progress: restarting now would cut it off. */
const isBusy = () =>
  fetch(`${URL}/api/wardrobe`, { signal: AbortSignal.timeout(2000) })
    .then((response) => response.text())
    .then(
      (body) => /"status":"(queued|preparing|generating|analyzing|extracting)"/.test(body),
      () => false,
    )

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

const update = () => {
  if (!existsSync(join(ROOT, '.git')) || !commandExists('git')) return
  if (!run({ command: 'git', args: ['pull', '--ff-only', '--quiet'], allowFailure: true }).ok)
    console.log('Could not update from GitHub, starting the local version')
}

const pidsOnPort = () => {
  if (IS_WINDOWS) {
    const out = spawnSync('netstat', ['-ano'], { encoding: 'utf8' }).stdout ?? ''
    return out
      .split(/\r?\n/)
      .filter((line) => line.includes('LISTENING') && line.includes(`:${PORT} `))
      .map((line) => line.trim().split(/\s+/).at(-1))
  }
  const out = spawnSync('lsof', ['-ti', `tcp:${PORT}`, '-sTCP:LISTEN'], { encoding: 'utf8' })
  return (out.stdout ?? '').split(/\s+/).filter(Boolean)
}

const kill = (pid) => {
  if (IS_WINDOWS) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  else
    for (const target of [-Number(pid), Number(pid)])
      try {
        process.kill(target, 'SIGTERM')
      } catch {
        // already gone
      }
}

const stopServer = async () => {
  if (existsSync(PID_FILE)) kill(readFileSync(PID_FILE, 'utf8').trim())
  for (const pid of pidsOnPort()) kill(pid)
  rmSync(PID_FILE, { force: true })
  for (let i = 0; i < 20 && (await isUp()); i++) await sleep(250)
}

const startServer = async () => {
  mkdirSync(join(DATA_DIR, 'logs'), { recursive: true })
  const log = openSync(SERVER_LOG, 'a')
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: join(ROOT, 'server'),
    env: ENV,
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
  })
  writeFileSync(PID_FILE, String(child.pid))
  child.unref()
  for (let i = 0; i < 60; i++) {
    if (await isUp()) return
    await sleep(1000)
  }
  throw new Error(`The Vestis server did not start, see ${SERVER_LOG}`)
}

const detached = ({ command, args }) =>
  spawn(command, args, { detached: true, stdio: 'ignore' })
    .on('error', (error) => console.error(error.message))
    .unref()

// Chrome only: the Vestis extension lives there, and "Find where to buy" needs it on the app's page.
const WINDOWS_CHROME = [
  join(process.env.ProgramFiles ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  join(process.env['ProgramFiles(x86)'] ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
]

/** Opens Vestis in its own Chrome window, or in the default browser when Chrome is not found. */
const openApp = () => {
  const app = `--app=${URL}`
  if (IS_WINDOWS) {
    const chrome = WINDOWS_CHROME.find((path) => existsSync(path))
    if (chrome) detached({ command: chrome, args: [app] })
    else detached({ command: 'cmd', args: ['/c', 'start', '', URL] })
  } else if (IS_MAC) {
    if (existsSync('/Applications/Google Chrome.app')) detached({ command: 'open', args: ['-na', 'Google Chrome', '--args', app] })
    else detached({ command: 'open', args: [URL] })
  } else {
    const chrome = ['google-chrome', 'chromium'].find(commandExists)
    detached(chrome ? { command: chrome, args: [app] } : { command: 'xdg-open', args: [URL] })
  }
}

const launch = async () => {
  update()
  installAll()
  run({ command: 'npm', args: ['run', 'build'] })
  if (await isUp()) {
    // Restart so updates apply, unless that would interrupt a generation.
    if (!(await isBusy())) {
      await stopServer()
      await startServer()
    }
  } else await startServer()
  openApp()
}

await (process.argv.includes('--stop') ? stopServer() : launch()).catch((error) => {
  console.error(error.message)
  process.exit(1)
})
