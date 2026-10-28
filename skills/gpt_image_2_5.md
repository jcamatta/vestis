# Prompt skill — GPT Image 2.5 (`gpt_image_2_5`) for virtual try-on

Sources (checked 2026-10-01): GPT Image 2.5 guides from fuser.studio and pixverse.ai. GPT Image 2.5 takes several reference images; each must be given a role, the change must be named, and everything that must not change must be listed. Higgsfield call: variant `sunburst` (the editing-precision variant), set by the app.

## Inputs

- **Image 1** — the person. Always the first reference.
- **Image 2** — one canvas with every garment to try on, laid out in the order of the garment list. Some cells may show a shop model wearing the garment: only the garment counts.

## The prompt

Four short sentences, in this order:

1. **Roles.** "Image 1 is the person. Image 2 shows the garments to put on them."
2. **The change.** "Dress the person from image 1 in the {GARMENTS} from image 2."
3. **What stays.** "Keep the person's face, hair, skin, body shape, pose, hands, background, lighting, framing and camera angle exactly as in image 1."
4. **Fit.** "Each garment keeps its colour, material, logos, text and proportions from image 2, worn naturally with realistic folds and contact shadows."

`{GARMENTS}` = the garment descriptions in the given order (head → eyewear → top → bottom → shoes), joined with commas and a final "and".

For each garment:

1. Start from its description as given.
2. If the user chose a fit, it replaces any fit words in the description and goes right before the garment type: "oversized cream knit sweater", "regular-fit dark denim jeans". If no fit was chosen, keep the fit the description already gives.
3. Keep visible text in quotes: "cap with 'Keep FLUXing' text".
4. Concise noun phrases, no style words.

If a garment replaces something the person already wears in the same place (a top over their top, shoes over their shoes), add to sentence 2: "replacing what they wear there". Items not in the list stay as they are in image 1.

## Example

> Image 1 is the person. Image 2 shows the garments to put on them. Dress the person from image 1 in the white wide-brim bucket hat with a black three-bar logo, black square sunglasses with dark grey lenses and navy quilted puffer jacket from image 2, replacing what they wear there. Keep the person's face, hair, skin, body shape, pose, hands, background, lighting, framing and camera angle exactly as in image 1. Each garment keeps its colour, material, logos, text and proportions from image 2, worn naturally with realistic folds and contact shadows.

## Do not

- Do not describe the shop model in image 2, or any of their clothes that are not in the list.
- Do not add style words ("photorealistic", "8k", "fashion shoot").
- Do not put aspect ratio or resolution in the prompt — they are call parameters.
