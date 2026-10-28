// One-time setup, the same on Windows and macOS: Claude Code, Claude sign-in, Higgsfield, dependencies, build, the
// desktop icon, and the Chrome extension steps. Safe to run again: every step skips what is already done.
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { IS_MAC, IS_WINDOWS, ROOT, claudeSignedIn, commandExists, higgsfieldState, installAll, run } from './common.mjs'
import { createShortcut } from './create-shortcut.mjs'

const step = (text) => console.log(`\n\x1b[36m=== ${text}\x1b[0m`)
const say = (text) => console.log(`\x1b[33m${text}\x1b[0m`)

const pause = async (text) => {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  await prompt.question(text)
  prompt.close()
}

const installClaude = () =>
  IS_WINDOWS
    ? run({ command: 'powershell', args: ['-NoProfile', '-Command', 'irm https://claude.ai/install.ps1 | iex'] })
    : run({ command: 'bash', args: ['-c', 'curl -fsSL https://claude.ai/install.sh | bash'] })

const connectHiggsfield = async () => {
  if (!higgsfieldState().added)
    run({ command: 'claude', args: ['mcp', 'add', '--transport', 'http', '--scope', 'user', 'higgsfield', 'https://mcp.higgsfield.ai/mcp'] })
  if (higgsfieldState().connected) return
  say('Claude opens in this window. Then:')
  say('  1. type  /mcp  and press Enter')
  say('  2. pick  higgsfield  and choose  Authenticate')
  say('  3. sign in to Higgsfield in the browser page that opens and approve')
  say('  4. back here, press Esc, type  /exit  and press Enter')
  await pause('Press Enter to open Claude ')
  run({ command: 'claude', cwd: homedir(), allowFailure: true })
  if (!higgsfieldState().connected) throw new Error('Higgsfield is still not connected. Run  npm run setup  again and repeat step 4.')
}

/** Shows the extension folder in Explorer or Finder, ready for Chrome's Load unpacked. */
const revealExtension = () => {
  const folder = join(ROOT, 'extension')
  const [command, args] = IS_WINDOWS ? ['explorer.exe', [`/select,${folder}`]] : IS_MAC ? ['open', ['-R', folder]] : ['xdg-open', [ROOT]]
  spawn(command, args, { detached: true, stdio: 'ignore' }).on('error', () => {}).unref()
}

const setup = async () => {
  step('1/6  Node.js')
  const major = Number(process.versions.node.split('.')[0])
  if (major < 22) throw new Error(`Node.js ${process.versions.node} is too old. Install the LTS version from nodejs.org, then run  npm run setup  again.`)
  console.log(`Node.js ${process.versions.node}`)

  step('2/6  Claude Code')
  if (!commandExists('claude')) {
    say('Installing Claude Code...')
    installClaude()
  }
  run({ command: 'claude', args: ['--version'] })

  step('3/6  Sign in to Claude')
  if (!claudeSignedIn()) {
    say('A browser page opens: sign in with your Claude account (Pro or Max) and approve.')
    run({ command: 'claude', args: ['auth', 'login'] })
  }
  console.log('Signed in.')

  step('4/6  Higgsfield')
  await connectHiggsfield()
  console.log('Higgsfield connected.')

  step('5/6  Install and build (a few minutes the first time)')
  installAll()
  run({ command: 'npm', args: ['run', 'build'] })

  step('6/6  Desktop icon')
  createShortcut()

  say('\nLast step, in Chrome:')
  say('  1. open  chrome://extensions')
  say('  2. turn on  Developer mode  (top right)')
  say('  3. click  Load unpacked  and pick this folder (it is open now):')
  say(`     ${join(ROOT, 'extension')}`)
  say('  4. click the puzzle icon in the toolbar and pin Vestis')
  revealExtension()
  console.log('\n\x1b[32mAll set. Open Vestis with the Vestis icon on your desktop.\x1b[0m')
}

await setup().catch((error) => {
  console.error(`\n\x1b[31m${error.message}\x1b[0m`)
  process.exit(1)
})
