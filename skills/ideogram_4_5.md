# Prompt skill — Ideogram 4.5 (`ideogram_4_5`) for virtual try-on

Sources (checked 2026-10-01): Higgsfield model card (up to five source images, roles `image_references` and `mask`), Replicate's Ideogram 4.5 page (edits up to five source images; reference images steer an edit with a product, material or style). There is no published try-on guide, so the prompt follows the plain edit pattern: name the source, name the products, list what stays. The app sends `magic_prompt: "off"`, so the prompt is used exactly as written.

## Inputs

- **Image 1** — the person: the photo being edited. Always the first reference.
- **Image 2** — one canvas with every garment to try on, laid out in the order of the garment list. Some cells may show a shop model wearing the garment: only the garment counts.

## The prompt

Three short sentences, in this order:

1. **The edit.** "Edit the photo of the person in the first image so they wear the {GARMENTS} shown in the second image."
2. **What stays.** "Their face, hair, body, pose, hands, background, lighting and framing stay exactly as in the first image."
3. **Fidelity.** "Copy each garment's colour, material, logos and text exactly from the second image, worn naturally with realistic folds and shadows."

`{GARMENTS}` = the garment descriptions in the given order (head → eyewear → top → bottom → shoes), joined with commas and a final "and".

For each garment:

1. Start from its description as given.
2. If the user chose a fit, it replaces any fit words in the description and goes right before the garment type: "baggy black cargo trousers". If no fit was chosen, keep the fit the description already gives.
3. Keep visible text in quotes — Ideogram renders quoted text well, so logos with words should be quoted exactly as they appear.
4. Concise noun phrases, no style words.

## Example

> Edit the photo of the person in the first image so they wear the navy quilted puffer jacket with a 'NORTH' chest patch and black wide-leg track pants with three red side stripes shown in the second image. Their face, hair, body, pose, hands, background, lighting and framing stay exactly as in the first image. Copy each garment's colour, material, logos and text exactly from the second image, worn naturally with realistic folds and shadows.

## Do not

- Do not describe the shop model in image 2, or any of their clothes that are not in the list.
- Do not add style words, art styles or camera terms.
- Do not put aspect ratio or resolution in the prompt — they are call parameters.
