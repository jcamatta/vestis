// Shared by setup.mjs, launch.mjs and create-shortcut.mjs: paths, running commands, and the Claude checks.
import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const NAME = 'Vestis'
export const URL = 'http://127.0.0.1:3100'
export const DATA_DIR = join(ROOT, 'data')
export const IS_WINDOWS = process.platform === 'win32'
export const IS_MAC = process.platform === 'darwin'

/** Where the Claude Code installer puts `claude`. On PATH for every child, so a fresh install is found without a new terminal. */
export const CLAUDE_DIR = join(homedir(), '.local', 'bin')
export const ENV = { ...process.env, PATH: [CLAUDE_DIR, process.env.PATH].join(delimiter) }

const quote = (arg) => (/\s/.test(arg) ? `"${arg}"` : arg)

/**
 * Runs a command and waits. npm is a .cmd script on Windows, which only runs through a shell; the args here are fixed
 * literals or paths, quoted when they hold spaces. `capture` returns stdout instead of showing it.
 */
export const run = ({ command, args = [], cwd = ROOT, allowFailure = false, capture = false }) => {
  const options = { cwd, env: ENV, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' }
  const result = IS_WINDOWS
    ? spawnSync([command, ...args].map(quote).join(' '), { ...options, shell: true })
    : spawnSync(command, args, options)
  const ok = result.status === 0
  if (!ok && !allowFailure) throw new Error(`${command} ${args.join(' ')} failed`)
  return { ok, stdout: result.stdout ?? '' }
}

export const commandExists = (command) =>
  spawnSync(IS_WINDOWS ? 'where' : 'which', [command], { env: ENV, stdio: 'ignore' }).status === 0

/** npm install in one package folder, only when its lock file changed since the last install. */
const installIn = (folder) => {
  const dir = join(ROOT, folder)
  const installed = join(dir, 'node_modules', '.package-lock.json')
  const lock = join(dir, 'package-lock.json')
  if (!existsSync(installed) || statSync(lock).mtimeMs > statSync(installed).mtimeMs)
    run({ command: 'npm', args: ['install', '--no-fund', '--no-audit'], cwd: dir })
}

/** The root scripts, the server and the web app each have their own dependencies. */
export const installAll = () => ['.', 'server', 'web'].forEach(installIn)

export const claudeSignedIn = () =>
  /"loggedIn"\s*:\s*true/.test(run({ command: 'claude', args: ['auth', 'status'], capture: true, allowFailure: true }).stdout)

/** `claude mcp get higgsfield`, from the home folder so no project MCP config applies. */
export const higgsfieldState = () => {
  const result = run({ command: 'claude', args: ['mcp', 'get', 'higgsfield'], cwd: homedir(), capture: true, allowFailure: true })
  const status = result.stdout.split(/\r?\n/).find((line) => /^\s*Status:/i.test(line)) ?? ''
  return { added: result.ok, connected: /connected/i.test(status) && !/fail|not/i.test(status) }
}
