# Vestis — plan

A personal virtual try-on. A Chrome extension saves product photos from any shop; a local app puts them on photos of you, using the Higgsfield credits through a background Claude.
Every agent that works on this **reads this file first and updates the Status section before it stops**.

## Definition of done

The user loads the extension, saves a product from a shop with a right-click, sees it appear in the local app under the right section, picks a photo of himself, presses **Try on**, and the result appears with a before/after split view. Two looks can be compared side by side.

## How it works

```
extension (right-click "Add to Vestis")
   └─ POST /api/garments (image bytes + page info)
        └─ server: normalise image (sharp) → wardrobe.json → background Claude analyses it (slot, name, description)
app (localhost)
   └─ pick photo + one garment per visible slot + fit + model → POST /api/looks
        └─ server: compose garments into one canvas (sharp) → background Claude:
             reads the model's prompt skill → writes the prompt → uploads both images to Higgsfield
             → generate_image → waits → returns the result URL → server downloads it
```

- **Background Claude** = `claude -p` (Claude Code CLI, the user's subscription) with the Higgsfield MCP added to the CLI. No Claude API key, no Higgsfield API key. Only the server spawns it.
- **No prompt review.** The user explicitly asked for one-click try-on; the prompt is stored with each look so it can be read afterwards.

## Decisions (fixed)

- **Folder:** `D:/code/vestis`, its own git repo at github.com/jcamatta/vestis (private; moved out of `filmmaking/` as `tryon/` and renamed 2026-10-28). No commits — the user commits. npm, **no tests**.
- **Packages:** `server/` (Node + TS + Express + sharp), `web/` (Vite + React + TS + Tailwind 4 + Base UI), `extension/` (Chrome MV3, plain JS, no build), root `package.json` scripts only.
- **Ports:** server `3100`, Vite dev `5174` proxying `/api`. Bound to `127.0.0.1`.
- **Data:** `data/wardrobe.json` (index) + `data/media/{people,garments,canvases,looks,outfits,extractions}/` (files). Only the server writes. Both are **gitignored** (photos of the user).
- **Slots:** `head` (hats), `eyewear` (glasses), `top`, `bottom`, `shoes`. One garment per slot per look. A photo's `visibleSlots` (from Claude) decide which sections can be picked: no feet visible → no shoes.
- **Fit:** top `slim | regular | oversized`, bottom `slim | regular | baggy`, optional, added to the prompt.
- **Images:** every input is re-encoded to JPEG with EXIF rotation applied and transparency flattened on white. Person ≤ 4 MP, garment ≤ 2 MP (FLUX VTO guidance: ≤ 4 MP as-is, ~1 MP sweet spot). Several garments are merged into **one canvas** (image 2), as BFL recommends.
- **Aspect ratio** of the output = the model's supported ratio nearest to the person photo. Resolution per model in `data/models.ts`.
- **Models:** `flux_3_image` (FLUX 3), `gpt_image_2_5` (GPT Image 2.5, variant sunburst, medium, 2k), `ideogram_4_5` (Ideogram 4.5, high, 2k, magic prompt off). FLUX VTO itself is **not** on Higgsfield (checked 2026-10-01); FLUX 3 uses the VTO prompt template. Each model has a prompt skill in `skills/<model>.md`; adding a model = an entry in `data/models.ts` + a skill file.
- **Design and code:** same as `board/` — black and white, square, 1px lines, Geist / Geist Mono, Base UI only, FP, one typed argument per function, data / pure / actions, controller → view → components.

## Extract (approved 2026-10-02)

The reverse of a try-on: a photo of someone wearing an outfit becomes separate product photos in the wardrobe, one per item, ready to mix in any look.

**Definition of done:** the user drops a photo of a dressed person into the **Extract** tab (or right-clicks it in a shop → **Extract outfit (Vestis)**), unticks the items they don't want, presses **Extract**, and after one generation the ticked items appear as product photos in their sections, marked "from photo", next to the original and the generated sheet. **Try these on** opens the Try on tab with those items picked.

### Flow

```
outfit photo (drop / + in the Extract tab, or extension right-click "Extract outfit (Vestis)")
 → POST /api/extractions → saved like a person photo (JPEG, ≤ 4 MP) in media/outfits/
 → background Claude reads it (free): items worn → [{ slot, name, brand, description }], ≤ 6, head → shoes, all ticked
 → the user unticks what they don't want, presses Extract (POST /:id/run)
 → shared generation queue (with looks) → background Claude reads skills/extract_gpt_image_2_5.md, writes the prompt,
   uploads the photo → one generate_image: the ticked items as product shots on white, one per grid cell
 → server downloads the sheet to media/extractions/
 → background Claude reads the sheet (free): one box per item, as fractions of the image
 → server cuts each item (sharp): box → trim the white → centre in a 4:5 white frame → new garment, status ready
```

- **Model:** GPT Image 2.5 only (`EXTRACT_MODEL` in `data/models.ts`, same params as try-on, own skill). No model select on this tab.
- **Grid** (`pure/extract-grid.ts`): 1 item → 1×1 at 4:5; 2 → 2×1 at 3:2; 3–4 → 2×2 at 4:5; 5–6 → 3×2 at 5:4. Ratios are ones GPT Image 2.5 supports.
- **Cropping:** Claude's box is used when it lies inside the image and is ≥ 5 % per side; otherwise that item's grid cell. If any two boxes overlap by > 30 % of the smaller, all items fall back to their cells. Trimming makes loose boxes and cells come out tight. An item that cannot be cut is skipped and the outfit says how many.
- Items: up to 6, more than one per section allowed. **Try these on** picks the first item of each section.
- Descriptions from the first read become the garments' descriptions: no second analysis.
- Garments get `source.site = "extracted"` and `source.extractionId`; their cards show "from photo". Deleting an outfit keeps its garments.
- Items can be ticked only before extracting (or after a failed generation, then **Extract again**). A failed read shows **Read the photo again** (`/retry`, free).
- Wardrobe version 3 adds `extractions` (`data/extraction.ts`); each item keeps the `garmentId` cut for it.

### Not in this version

Regenerating a single item; using the whole sheet directly as a try-on canvas.

## Where to buy with Claude web search (built 2026-10-02, replaced by Lens the same day)

In the Extract tab, one button searches the web for every item of an outfit and shows, under each item, where to buy it and roughly for how much, plus a rough total for the outfit. Free: a background Claude run with web search, no Higgsfield credits.

**Definition of done:** on an outfit whose items Claude has listed, the user presses **Find where to buy**; while it searches, the panel shows "Searching the web ■"; when it finishes, under each item row there is a one-line summary and up to 3 shop links (shop, price, exact or similar), and at the top of the items panel a rough total such as "≈ ARS 420.000–510.000 · 3 of 3 items · searched 2 Oct". Each link opens the shop in a new tab. **Search again** replaces the results; the earlier ones stay visible until the new ones arrive.

### Flow

```
Find where to buy (Extract tab, items panel footer, next to Try these on)
 → POST /api/extractions/:id/shop → shopping.status "searching"
 → shop queue (one search at a time, separate from Higgsfield jobs) → background Claude with WebSearch + WebFetch:
   for each item (brand + name + description) find where it is sold; Argentine shops first, then international
 → structured answer per item: summary + up to 3 offers { shop, title, url, price, currency, match: exact | similar }
 → server validates (http(s) URLs only, prices ≥ 0), computes the total, saves it on the extraction → live update
```

- **Which items:** every item in the list, ticked or not, so it also works before extracting. Available when the outfit is `ready`, `done`, or `error` with items; not while reading or generating.
- **Search rules for Claude** (in `pure/tasks.ts`, `shoppingTask`): use the brand and visible text first; prefer the brand's own Argentine site and big Argentine shops (e.g. Mercado Libre, Dexter, Moov, Grid), then the brand's international site; "exact" only when the product page shows the same item (same colour, logo, details), else "similar"; price as shown on the page with its currency (ARS, USD…), null if not shown; never invent a URL — only pages it actually found; a summary line per item, e.g. "Jordan Sherpa jacket, sold at nike.com.ar and Mercado Libre; exact match ARS 189.999". If nothing is found, an empty list and a summary saying so.
- **Total** (`pure/shopping.ts`): per item, the lowest and highest price in the most common currency of the results (ARS when present); the total is the sum of those ranges over items that have a price, shown with "n of m items". Mixed currencies are not converted.
- **Data:** `extraction.shopping: { status: "searching" | "done" | "error", error, searchedAt, items: [{ summary, offers: [...] }] (one per item, same order), total: { currency, min, max, priced, of } | null } | null`. A server restart turns "searching" into error. Wardrobe stays version 3 (optional field, null when absent).
- **Web:** the button sits in the items panel footer (**Find where to buy** / **Search again**, disabled while searching). Under each item row, a block: the summary in small text, then up to 3 lines `shop · price · EXACT|SIMILAR ↗` as links (`target="_blank" rel="noreferrer"`). The total sits under the panel header. Errors show in the footer.
- Google Lens stays the manual backup (right-click a cut-out → Search image with Google); nothing to build for it.

### Not in this version

Converting currencies; matching against garments already saved from shops; searching from Try on.

### Verification

Free (Claude subscription, no credits): run one real search on an existing outfit and check the links open real product pages; guards (search while reading → 409, unknown outfit → 404); restart during a search → error; total math on hand-made results (one currency, mixed, items without price).

## Where to buy with Google Lens (built 2026-10-02)

The Claude text search above finds few exact items (it never sees the photo; first real run: 7 links, all "similar"). Google Lens, tried by hand on the same cut-outs, found the exact adidas hat on adidas.com.ar in seconds. Lens becomes the source; the Claude text search goes.

**Definition of done:** on an extracted outfit the user presses **Find where to buy**; the extension opens one Google Lens tab per cut-out in the user's Chrome, reads each results page, and under each item the app shows up to 3 products found by Lens (shop · price · link) with the rough total at the top. The Lens tabs stay open to browse more. No Claude run, no credits, no third-party service.

### Flow

```
Find where to buy (Extract tab) → the web page asks the extension (window.postMessage → content.js → background.js)
 → background fetches each cut-out from the local server and opens a Lens tab per item:
   the same upload Chrome's "Search image with Google" makes (POST lens.google.com/v3/upload, field encoded_image)
 → content.js on the Lens results page reads the product cards: title, price with currency, shop, link
 → background posts them to POST /api/extractions/:id/shop-results → saved as extraction.shopping (same shape as now) → live update
```

- Needs the extension (0.3.0). Without it, the button says to install or reload it.
- Only items with a cut-out (after extracting). Before extracting there is no clean image to search.
- **Per item** (user, 2026-10-02): a Lens button on each item row searches that item; "Find where to buy: all items" in the footer searches them all. Once Lens found products the button reads "N found" and shows them in a popover on hover or click, with Search again; nothing found shows the plain button again. Each item keeps its own state (`shopping.items[i].status`: none / searching / done / error, up to 5 offers). The total stays under the panel header.
- No prompts in the UI (user, 2026-10-02): removed from Extract and from the Try on caption. The Photo / Extracted names are chips on the images, like Before / After, and the two images line up at the top.
- **Risk:** the reader depends on Google's page layout, which changes without notice; when it breaks, the Lens tabs still open and the app says "Lens results could not be read".
- **First step:** check by hand in the user's Chrome that the upload and the reading work (Spanish page, sponsored product cards) before building the rest.

## Try on default model (built 2026-10-02)

GPT Image 2.5 becomes the default model in Try on: move it first in `MODELS` (`server/src/data/models.ts`); the web app already defaults to the first model. The select keeps all three.

## Setup check (built 2026-10-28)

For people who did not set Vestis up themselves: the app says when Claude or Higgsfield is not ready, and how to fix it, instead of failing on the first Try on.

- Server: `claude auth status` (JSON `loggedIn`) and `claude mcp get <name from VESTIS_HF_TOOLS_PREFIX>` (its `Status:` line), run from the home folder. At start, when the last check is over five minutes old, and after any failed Claude run. `GET /api/setup`, `POST /api/setup/check`.
- Web: polls every 30 s; a black bar under the header with the problem and **Check again**; Try on and Extract are disabled while it shows. Nothing is blocked before the first answer.
- Plain errors: Claude Code missing or signed out → "… Run npm run setup again in the Vestis folder (see the README), then reopen Vestis."
- Verified 2026-10-28: with a wrong Higgsfield name the bar shows, Check again works and Try on stays off with an item picked; with the real config there is no bar and Try on is on. Signed-out, needs-auth and failed parsing checked on sample outputs, not on a real signed-out CLI.

## Install and launch for others (built 2026-10-28)

Same pattern as Inspiratio (`D:/code/inspiratio/scripts`): Node scripts, identical on Windows and macOS.

- `npm run setup` (`scripts/setup.mjs`): Node ≥ 22 check, installs Claude Code if missing, `claude auth login`, adds Higgsfield and walks through `/mcp` → Authenticate, installs, builds, creates the icon, shows the extension folder.
- Desktop icon (`scripts/launch.mjs`, also `npm run app`): `git pull --ff-only`, install when a lock changed, build, start the server detached on 3100 (restart only when no job runs), open a Chrome `--app` window (Chrome only: the extension must be on the page). `npm run stop`. Logs and pid in `data/`.
- `scripts/create-shortcut.mjs`: `.lnk` on the Desktop and Start menu (Windows); `~/Applications/Vestis.app` + Desktop link (macOS). The `.app` is built on her Mac, so Gatekeeper does not block it, unlike a downloaded `.command`.
- Replaced the earlier `Install Vestis` / `Start Vestis` `.cmd` / `.command` / `.ps1` scripts.
- Verified on Windows 2026-10-28 from a fresh clone: setup ran through (already signed in), icon created, launch opened the "Vestis" Chrome app window, a second launch restarted the server, `npm run stop` stopped it. Not run on a Mac.

## Status

- [x] 1 — scaffold, server, web, extension, skills (main session, 2026-10-01)
- [x] 2 — first real try-on run by the user (2026-10-01: jacket + track pants, both from photos worn by a model, ~3 min 45 s, good result)
- [x] 3 — live step under the photo while generating (stream-json from the CLI, `pure/claude-stream.ts`)
- [x] 4 — Extract tab, server and extension menu built (2026-10-02). Verified without credits: upload as raw bytes and as extension JSON, Claude's item list (3 items from a real photo, in slot order), ticking from the UI, guards (run while reading → 409, nothing ticked → 422, bad patch → 400), delete removes the files, migration to version 3, and cutting on a hand-made 2×2 sheet (cells, clashing boxes, good boxes). **Not verified:** a real generation, the boxes Claude gives on a real sheet, the done view and Try these on, the extension menu inside Chrome.
- [x] 5 — Where to buy and GPT Image 2.5 as the Try on default (2026-10-02). Verified: one real search on the bucket-hat outfit (4 items, about 8 min, free): 7 links, all real product pages (nike.com, Moov and Solo Urbano answer 200; adidas blocks curl with 403; Trip Store was down with 502, which Claude itself noted). All 7 were "similar", none "exact"; the total was ARS 289.998–299.998 for 2 of 4 items. Panel, links (new tab), total and "Searching the web" checked in the browser. Guards: unknown outfit → 404, while reading → 409, a second search → 409. Total math (one currency, ARS winning over USD, no ARS, no prices) and offer cleaning (bad URLs dropped, negative prices nulled, max 3) tested on hand-made results. A restart during a search becomes an error, and old outfits load with `shopping: null`; both tested on the pure functions, not with a real restart. /api/models lists GPT Image 2.5 first.
- [x] 6 — Where to buy with Google Lens built (2026-10-02, extension 0.3.0). Verified without Google: /shop returns the cut-outs, second start → 409, results saved with the right summaries (duplicates and bad links dropped, missing item, closed tab, nothing found), results when not searching → 409, unknown outfit → 404, no answer from the extension → error after 3 min with earlier results kept, price parsing ($ 74.999,00 → 74999 ARS, US$, €), the reader on a mock Lens page (4 products, including ad and redirect links, nothing invented), and the app's message when the extension is missing. **Not verified:** the upload to Lens and the reader on a real Lens page — my test upload was blocked by the permission system, so the first real run is the user's, in Chrome. **First real run (user, 2026-10-02):** upload and reading work — the sherpa jacket gave the exact Jordan Flight Mountainside Sherpa on nike.com.ar, ARS 149.999. The shop name had picked up Google's details line ("ARS 149,999.00 · In stock"); now it is the link's site. The sneakers' page gave nothing: all its priced results were "Sponsored Products" cards, whose several Google ad links per card the first reader rejected. The reader now starts from each price (instalment lines like "6x ARS 31,667.00" skipped), takes the smallest box around it with an image as the card, the longest line as the title and the line after the price as the shop; when a page shows prices but nothing is read, the item says so instead of "no products". Checked on a mock of that page.

### Notes

- Run: `npm run dev` (or `vestis` in `.claude/launch.json`). Setup steps for the user are in `README.md`.
- Background Claude: `claude -p --output-format stream-json --verbose --json-schema … --permission-mode dontAsk --allowedTools …`, task on stdin, `cwd` = `data/media`. Tool names use `VESTIS_HF_TOOLS_PREFIX` (default `mcp__higgsfield__`, the MCP added as `higgsfield` in the CLI). Model: `VESTIS_CLAUDE_MODEL` (default `sonnet`). `CLAUDECODE` / `CLAUDE_CODE_*` env vars are stripped so a server started from a Claude session can still spawn it.
- The CLI's stdout can carry stray MCP log lines; `pure/claude-output.ts` takes the last line with a `result`. Each tool call in the stream moves the look's `step` forward (never back).
- Fit: no fit chosen = the fit the shop photo shows, already in the garment description. A chosen fit replaces it.
- Verified 2026-10-01 without credits: person upload, garment via base64 (transparent WebP → white JPEG) and via URL, too-small image rejected, Host guard 403, canvas of 2 garments, look runs to "generating" then fails cleanly ("Claude Code is not logged in…"), before/after split view and drag, Looks tab compare, live SSE updates, deletes remove files. **Not verified:** a real Higgsfield generation (CLI not logged in) and the extension inside Chrome.
- Per person, the Higgsfield media id is cached after the first upload (`higgsfieldMediaId`); the skill tells Claude to re-upload if it is rejected.
- Each garment card has Remove and Move (Base UI Menu → `PATCH /api/garments/:id`). A section picked in the right-click menu always wins over Claude's choice.
- Moderation ("nsfw") is not retried. The same outfit on the same photo cannot be queued twice (button disabled, server answers 409).
- FLUX 3 on Higgsfield blocks Jordan/Nike garments as "nsfw" (2026-10-01: hoodie, track pants and AJ1 blocked on two photos; adidas and unbranded outfits with hat + sunglasses pass). Untested on GPT Image 2.5 and Ideogram 4.5.
- Deleting a look that is still waiting stops it before it spends anything.
- Open: manual override of a photo's visible sections.
