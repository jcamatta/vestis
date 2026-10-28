# Prompt skill — GPT Image 2.5 (`gpt_image_2_5`) for outfit extraction

Turns a photo of a dressed person into one sheet of product photos, one item per grid cell, so the app can cut each item out.

Sources (checked 2026-10-02): OpenAI's image-prompting guide; GPT Image 2.5 guides from felo.ai, photogptai.com and fuser.studio; ghost-mannequin and product-extraction prompt examples. What carries over: give the reference image a role, state the output layout plainly, say what must be preserved exactly (colour, logos, text, proportions), and describe the background and light. Higgsfield call: variant `sunburst`, set by the app, as are aspect ratio and resolution.

## Inputs

- **Image 1** — a person wearing the outfit. The only reference.
- **The grid** — columns × rows, filled left to right, top to bottom.
- **The items** — in cell order, each a slot and a description.

## The prompt

Five short parts, in this order:

1. **Role.** "Image 1 shows a person wearing an outfit."
2. **The sheet.** "Create a clean e-commerce product sheet on a pure white background, laid out as an even grid of {COLS} columns and {ROWS} rows of equal cells with generous white space between them."
3. **The cells.** "Cell 1 (top left): {ITEM 1}. Cell 2 (top right): {ITEM 2}. …" Name each cell's position in words (top left, top middle, top right, bottom left…; for one row: left, right; for one cell: centre). If there are more cells than items, say "The remaining cell stays plain white."
4. **How each item looks.** "Each item appears alone, whole and uncropped, centred in its cell and filling about three quarters of it, front view, as a ghost-mannequin shot for clothing (holding its worn shape, hollow where the body was), a pair side by side for shoes, and a single front-facing piece for hats and glasses. Each keeps the exact colour, material, logos, text, prints and proportions it has in image 1; parts hidden in image 1 are completed in the same style."
5. **Light.** "Soft, even studio light with a faint shadow under each item; the background is the same pure white everywhere."

`{ITEM n}` = the item's description as given, as a noun phrase. Keep visible text in quotes: "black cap with 'NYC' embroidered on the front". Add nothing the description does not say.

## Example (3 items, 2 × 2)

> Image 1 shows a person wearing an outfit. Create a clean e-commerce product sheet on a pure white background, laid out as an even grid of 2 columns and 2 rows of equal cells with generous white space between them. Cell 1 (top left): black wool beanie with a small white rectangular front patch. Cell 2 (top right): olive cotton oversized hoodie with a white 'ESSENTIALS' chest print. Cell 3 (bottom left): light-wash straight-leg denim jeans. The remaining cell stays plain white. Each item appears alone, whole and uncropped, centred in its cell and filling about three quarters of it, front view, as a ghost-mannequin shot for clothing (holding its worn shape, hollow where the body was), a pair side by side for shoes, and a single front-facing piece for hats and glasses. Each keeps the exact colour, material, logos, text, prints and proportions it has in image 1; parts hidden in image 1 are completed in the same style. Soft, even studio light with a faint shadow under each item; the background is the same pure white everywhere.

## Rules

- State what the sheet shows; do not list what to leave out. The person, the scene and grid lines are absent simply because the prompt never asks for them.
- No labels, numbers or captions in the image: the cell numbers are only in the prompt.
- No style words ("8k", "hyperrealistic", "award-winning").
- Do not put aspect ratio or resolution in the prompt: they are call parameters.
