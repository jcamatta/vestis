# Install Vestis

Vestis lets you save clothes from any online shop with a right-click and see them on photos of yourself. It runs on your own computer, Windows or Mac. Setup takes about 15 minutes, once.

## What you need

- **Google Chrome.**
- A **Claude** account with a **Pro or Max** plan ([claude.ai](https://claude.ai)). Claude writes the image prompts in the background.
- A **Higgsfield** account with credits ([higgsfield.ai](https://higgsfield.ai)). Every try-on spends Higgsfield credits.
- A **GitHub** account, invited to the Vestis repository by its owner (it is private).

## 1. Install Node.js and Git (once)

| | Mac | Windows |
|---|---|---|
| **Node.js** | [nodejs.org](https://nodejs.org) → download the **LTS** installer and run it | [nodejs.org](https://nodejs.org) → download the **LTS** installer and run it |
| **Git** | Nothing to download: step 2 offers to install it | [git-scm.com/download/win](https://git-scm.com/download/win) → run the installer, keep every default |

## 2. Download Vestis

Open a terminal:
- **Mac:** press Cmd + Space, type **Terminal**, press Enter.
- **Windows:** press the Windows key, type **PowerShell**, press Enter.

Type each line below and press Enter after it. The first one downloads Vestis into your home folder. The first time, it asks you to sign in to GitHub (on a Mac it may first offer to install Git: accept, wait, then type the line again).

```bash
git clone https://github.com/jcamatta/vestis.git
```

```bash
cd vestis
```

Keep the `vestis` folder where it is: the desktop icon points to it.

## 3. Run the setup

Still in the terminal:

```bash
npm run setup
```

It goes through 6 steps and stops when you need to do something:

| Step | What you do |
|---|---|
| 3 · Sign in to Claude | A browser page opens: sign in to Claude and approve. |
| 4 · Higgsfield | Press Enter. Claude opens in the terminal: type `/mcp` and press Enter, pick **higgsfield** → **Authenticate**, sign in to Higgsfield in the browser and approve. Back in the terminal, press Esc, type `/exit` and press Enter. |

Everything else is automatic. At the end it puts a **Vestis** icon on your desktop (on Windows also in the Start menu; on a Mac also in the Applications folder of your home folder) and opens the `extension` folder.

If a step fails, run `npm run setup` again: it skips what is already done.

## 4. Add the Chrome extension

1. In Chrome, open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the `extension` folder inside `vestis` (the setup opened it and printed its path).
4. Click the puzzle icon in Chrome's toolbar and pin **Vestis**.

## 5. Open Vestis

Double-click the **Vestis** icon on your desktop. Each time it gets the latest version, builds it (the first time takes a minute, later a few seconds) and opens Vestis in its own Chrome window. On a Mac a notification shows while it starts.

Closing the window doesn't stop Vestis, so opening it again is instant, and you can keep adding items from shops. Restarting the computer stops it. With Vestis running, the Vestis icon in Chrome's toolbar also opens it.

## 6. Use it

1. **Add a photo of yourself:** the **+** at the top left, or drag a photo onto the page. A full-body photo, standing, works best.
2. **In any shop**, right-click a product photo → **Add to Vestis** → pick the section, or **Let Claude decide**. It appears in Vestis a few seconds later.
3. **Back in Vestis**, pick one item per section and press **Try on**. The result takes 1–4 minutes and appears under your photo. Click it to compare before/after with the slider.
4. **Saw an outfit you like on someone?** Right-click the photo → **Extract outfit (Vestis)**, or use the **Extract** tab. Vestis turns each piece into its own item, and **Lens** finds where to buy it.

Each **Try on** and each **Extract** uses Higgsfield credits. Adding items and photos doesn't.

## When something goes wrong

- **A black bar at the top** says what is wrong: Claude is signed out, or Higgsfield is not connected or not answering. **Try on** and **Extract** stay off until it is fixed. Do what the bar says (usually: run `npm run setup` again in the `vestis` folder), then press **Check again**. Vestis also checks on its own every few minutes and after any failed run.
- **"Vestis is not running"** when you right-click in a shop: open Vestis with the desktop icon.
- **A look shows an error** under the photo: it says what failed (for example no Higgsfield credits left). Fix that and press **Try on** again.
- **"Blocked by Higgsfield's safety filter":** some brands (Nike, Jordan) are blocked with FLUX 3. Pick GPT Image 2.5 at the top left and try again.
- **The desktop icon does nothing:** on a Mac, open `data/logs/launch.log` in the `vestis` folder; on Windows, the small window in the taskbar shows the error. If Vestis itself fails to start, see `data/logs/server.log`.
- **"Could not update from GitHub"** while starting: you are offline; Vestis opens with the version you have.
- **`node`, `npm` or `git` "not recognized" / "command not found":** install it (step 1), then open a **new** terminal.

To get to the `vestis` folder in a new terminal, type `cd vestis` first.

## Where your things are

Your photos, saved items and looks stay on your computer, in the `data` folder inside `vestis`. Higgsfield also keeps a copy of each upload and result in your Higgsfield library. Updates never touch `data`.
