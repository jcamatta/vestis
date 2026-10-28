# Vestis

Save clothes from any online shop with a right-click, then see them on photos of yourself. Pick a photo, one item per section, a model, press **Try on**, and the result appears next to your original with a before/after slider.

Saw an outfit you like on someone? The **Extract** tab turns a photo of a dressed person into separate product photos of each item, ready to try on.

Generation spends your **Higgsfield subscription credits**, through a background Claude Code that writes the prompt for the chosen model. There is no prompt review: one click does everything.

**Just want to use it?** Follow [INSTALL.md](INSTALL.md): one installer, one shortcut. The rest of this page is for developers.

## How it works

```
Chrome extension                        local app (127.0.0.1)
────────────────                        ─────────────────────
right-click a product photo             web page (React)  ⇄  server (Node)
→ "Add to Vestis" → section                                     │
→ image bytes + page title ───────────────────────────────────► │ saves the image (JPEG, white background)
                                                                │ background Claude reads it: section, name, description
                                                                │
you press Try on ──────────────────────────────────────────────►│ puts the garments on one canvas image
                                                                │ background Claude:
                                                                │   reads the model's prompt skill → writes the prompt
                                                                │   uploads your photo + the canvas to Higgsfield
                                                                │   starts the generation, waits, returns the result URL
                                                                │ downloads the result → the page updates live
```

- **Background Claude** = `claude -p` (the Claude Code CLI, on your Claude subscription) with the Higgsfield MCP added to the CLI. No API keys anywhere. Only the server starts it, one look at a time.
- **Sections:** Head (hats), Glasses, Tops, Pants, Shoes. One item per section per look, up to 5. When a photo is added, Claude decides which sections it can show: no feet visible → no Shoes.
- **Models** (pick at the top left): GPT Image 2.5 (default), FLUX 3, Ideogram 4.5. Each has its own prompt skill in `skills/`. Every look shows which model made it.
- **While generating**, the label under the photo shows the real step: writing the prompt, uploading, Higgsfield is generating, downloading.

## One-time setup

`Install Vestis.cmd` (Windows) or `Install Vestis.command` (macOS) does all of this, plus the build and a desktop shortcut; `Start Vestis` runs the built app on port 3100. By hand:

1. **Log the Claude Code CLI in.** In a terminal:

   ```bash
   claude
   ```

   Then type `/login`, finish in the browser, and quit with `/exit`.

2. **Add Higgsfield to the CLI** under the name `higgsfield`:

   ```bash
   claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp
   ```

   Then run `claude`, type `/mcp`, pick `higgsfield`, choose **Authenticate**, and approve in the browser. Quit with `/exit`.

3. **Install the dependencies:**

   ```bash
   npm install
   ```

   ```bash
   npm --prefix server install
   ```

   ```bash
   npm --prefix web install
   ```

4. **Install the extension** in Chrome:
   - Open `chrome://extensions`.
   - Turn on **Developer mode** (top right).
   - Click **Load unpacked** and pick the folder `extension`.
   - After any change to the extension, click its reload arrow there, then reload the shop tabs.

## Every time

```bash
npm run dev
```

Open http://127.0.0.1:5174, or click the extension's icon.

## Use

1. **Add a photo of yourself**: the `+` at the top left of the stage, or drop the photo on the stage. JPEG, PNG, WebP or AVIF. Claude reads it (about 20 s) and decides which sections it can show.
2. **In a shop**, right-click the product photo → **Add to Vestis** → pick the section, or let Claude decide. A toast confirms it, and the item appears in the app with a name and description written by Claude. A photo of the product alone works best; a photo of a model wearing it also works.
3. **Wrong section?** Hover the item → **Move** → pick the right one. **Remove** deletes it.
4. **In the app**, pick one item per section, a fit if you want one (Tops, Pants), and press **Try on**. It takes 1–4 minutes. Without a fit, the item keeps the fit shown in the shop photo.
5. **Results**: each look appears in the strip under the photo, labelled with its model. Click it to see it with the before/after slider; **Result only** hides the slider. Hover a look for its **×** to delete it.
6. **Looks** tab: every result. Pick one to compare it with your photo, or two to compare them with each other.
7. **Extract** tab: add a photo of someone wearing an outfit (`+`, drop it, or in a shop right-click the photo → **Extract outfit (Vestis)**). Claude lists what they wear (about 20 s, free). Untick what you don't want and press **Extract**: one GPT Image 2.5 generation draws every ticked item as a product photo on one sheet, and the app cuts them apart into your sections, marked "from photo". **Try these on** takes you to Try on with them picked (one per section).
8. **Where to buy** (Extract tab, after extracting): each item has a **Lens** button; **Find where to buy: all items** does them all. The extension opens a Google Lens tab per cut-out in your Chrome and reads the products Lens shows. When Lens found something, the button turns into **N found**: hover or click it for up to 5 products (title, shop, price, link) and **Search again**. Nothing found leaves the plain Lens button. At the top of the items, a rough total in one currency (no conversion). Free, no Claude run, no credits. The Lens tabs stay open to browse more. Needs the extension 0.3: reload it in `chrome://extensions` after updating. If Google changes the Lens page, the reader may find nothing; the tabs still open.

Good to know:
- **FLUX 3 blocks Jordan and Nike items** ("Blocked by Higgsfield's safety filter"). Use Ideogram 4.5 or GPT Image 2.5 for those.
- A blocked look is not retried. The same outfit on the same photo can't be queued twice.
- Looks and extractions share one queue: one Higgsfield job at a time.
- Deleting a look that is still waiting cancels it. One already generating finishes on Higgsfield (credits spent); only the result is discarded.

## Where things are stored

`data/wardrobe.json` holds the list of photos, items and looks. The images are in `data/media/` (`people`, `garments`, `canvases`, `looks`, `outfits`, `extractions`). Both are gitignored. Higgsfield also keeps a copy of each upload and result in your Higgsfield library.

## Tech

| Part | Stack |
|---|---|
| `server/` | Node 24, TypeScript, Express 5, sharp (images), zod (validation). Run with `tsx watch`. |
| `web/` | Vite, React 19, TypeScript, Tailwind CSS 4, Base UI (all controls), Geist and Geist Mono fonts. |
| `extension/` | Chrome Manifest V3, plain JavaScript, no build step. |
| Generation | Claude Code CLI (`claude -p`, model Sonnet) + Higgsfield MCP. |
| Data | One JSON file and image files on disk. No database. |

Ports: server `3100`, web `5174` (Vite proxies `/api` to the server). Both listen only on `127.0.0.1`, and the server refuses requests whose Host is not local.

## Code

Functional style: data types, pure functions and side effects live in separate folders; every function takes one typed argument. The web app goes controller → view → components.

```
vestis/
├── extension/            background.js (right-click menus Add to Vestis / Extract outfit, fetches the image, posts it; opens the Lens tabs) · content.js (finds the image under the pointer; passes the app's Lens request on; reads Lens results) · lens.html/lens.js (sends a cut-out to Google Lens)
├── skills/               one prompt skill per model: flux_3_image.md · gpt_image_2_5.md · ideogram_4_5.md · extract_gpt_image_2_5.md (Extract)
├── server/src/
│   ├── data/             types and constants: slots, models (models.ts), wardrobe, zod schemas
│   ├── pure/             no side effects: Claude task prompts (tasks.ts), canvas layout, extract grid and crop boxes, shopping total, aspect ratio, output parsing, wardrobe updates
│   ├── actions/          side effects: run Claude (claude.ts), queues, try-on jobs (jobs.ts), extraction jobs (extract.ts), Lens results (shop.ts), images (sharp), store, live events
│   ├── http/             Express routes: /api/garments, /api/people, /api/looks, /api/extractions, /api/wardrobe, /api/events, /api/files
│   └── main.ts
└── web/src/
    ├── data/             types and constants
    ├── pure/             no side effects: wardrobe helpers, split-view math
    ├── actions/          API calls, live updates (server-sent events), file picker
    ├── controllers/      hooks holding state: use-app-controller, use-try-on, use-extract, use-looks, use-wardrobe; split view
    ├── views/            the three tabs: try-on-view, extract-view, looks-view
    └── components/       cards, strips, menus, buttons
```

**Image handling:** every input is re-encoded to JPEG, with EXIF rotation applied and transparency flattened on white. Photos are kept up to 4 MP, items up to 2 MP. The items of a look are merged into one canvas (2 MP–3.4 MP). The output aspect ratio is the one the model supports that is closest to your photo.

**Adding a model:** add an entry to `server/src/data/models.ts` (Higgsfield id, aspect ratios, parameters) and write `skills/<model id>.md`. Check the model on Higgsfield first; its limits change.

## Settings

Environment variables for the server:

| Variable | Default | What |
|---|---|---|
| `VESTIS_HF_TOOLS_PREFIX` | `mcp__higgsfield__` | Tool-name prefix of the Higgsfield MCP in the CLI. Change it if the MCP was added under another name. |
| `VESTIS_CLAUDE_MODEL` | `sonnet` | Claude model for the background runs |
| `VESTIS_CLAUDE_BIN` | `claude` | Path to the Claude Code executable |

## More

`PLAN.md` holds the decisions, the status and what was verified.
