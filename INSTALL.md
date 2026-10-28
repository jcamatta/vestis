# Install Vestis

Vestis lets you save clothes from any online shop with a right-click and see them on photos of yourself. Setup takes about 15 minutes, once.

## What you need

- A computer with **Windows 10/11** or a **Mac**, and **Google Chrome**.
- A **Claude** account with a **Pro or Max** plan ([claude.ai](https://claude.ai)). Claude writes the image prompts in the background.
- A **Higgsfield** account with credits ([higgsfield.ai](https://higgsfield.ai)). Every try-on spends Higgsfield credits.

## 1. Get the folder

On the [Vestis page on GitHub](https://github.com/jcamatta/vestis), click the green **Code** button → **Download ZIP**. Unzip it somewhere you'll keep it, for example `Documents\vestis`. (If someone sent you the folder directly, just put it there.)

## 2. Run the installer

**Windows:** open the folder and double-click **Install Vestis.cmd**.
If Windows shows "Windows protected your PC", click **More info** → **Run anyway**.

**Mac:** first install Node.js: [nodejs.org/en/download](https://nodejs.org/en/download) → the **LTS** macOS installer. Then right-click **Install Vestis.command** → **Open** → **Open** (the right-click is needed the first time).

A window opens and goes through 7 steps. It stops and tells you when you need to do something:

| Step | What you do |
|---|---|
| 3 · Sign in to Claude | A browser page opens: sign in to Claude and approve. |
| 4 · Higgsfield | Press Enter. Claude opens in the window: type `/mcp` and press Enter, pick **higgsfield** → **Authenticate**, sign in to Higgsfield in the browser and approve. Back in the window, press Esc, type `/exit` and press Enter. |
| 7 · Chrome extension | Chrome opens `chrome://extensions`: turn on **Developer mode** (top right) → **Load unpacked** → pick the `extension` folder inside the Vestis folder (the window shows the exact path). Then click the puzzle icon in Chrome's toolbar and pin **Vestis**. |

Everything else is automatic. If a step fails, just run the installer again: it skips what is already done.

## 3. Open Vestis

**Windows:** double-click the **Vestis** shortcut on your desktop.
**Mac:** double-click **Start Vestis.command** in the folder.

A small window opens and Vestis opens in your browser. **Keep that window open** while you use Vestis; closing it stops Vestis. With Vestis running, the Vestis icon in Chrome's toolbar also opens it.

## 4. Use it

1. **Add a photo of yourself:** the **+** at the top left, or drag a photo onto the page. A full-body photo, standing, works best.
2. **In any shop**, right-click a product photo → **Add to Vestis** → pick the section, or **Let Claude decide**. It appears in Vestis a few seconds later.
3. **Back in Vestis**, pick one item per section and press **Try on**. The result takes 1–4 minutes and appears under your photo. Click it to compare before/after with the slider.
4. **Saw an outfit you like on someone?** Right-click the photo → **Extract outfit (Vestis)**, or use the **Extract** tab. Vestis turns each piece into its own item, and **Lens** finds where to buy it.

Each **Try on** and each **Extract** uses Higgsfield credits. Adding items and photos doesn't.

## When something goes wrong

- **A black bar at the top** says what is wrong: Claude is signed out, or Higgsfield is not connected or not answering. **Try on** and **Extract** stay off until it is fixed. Do what the bar says (usually: close the Vestis window, run **Install Vestis** again, start Vestis), then press **Check again**. Vestis checks on its own every few minutes and after any failed run.
- **"Vestis is not running"** when you right-click in a shop: open Vestis first (step 3).
- **A look shows an error** under the photo: it says what failed (for example no Higgsfield credits left). Fix that and press **Try on** again.
- **"Blocked by Higgsfield's safety filter":** some brands (Nike, Jordan) are blocked with FLUX 3. Pick GPT Image 2.5 at the top left and try again.

## Updating

Download the new ZIP, unzip it, and copy your old **`data`** folder into the new one (it holds your photos, items and looks). Run **Install Vestis** again, then remove and re-add the extension in `chrome://extensions` (or press its reload arrow if the folder is in the same place).

Your photos stay on your computer, in the `data` folder. Higgsfield also keeps a copy of each upload and result in your Higgsfield library.
