# Prompt skill — FLUX 3 (`flux_3_image`) for virtual try-on

Source: Black Forest Labs, FLUX VTO guide (docs.bfl.ai/flux_tools/flux_vto). FLUX VTO itself is not on Higgsfield; FLUX 3 takes the same two-image setup and the same prompt shape.

## Inputs

- **Image 1** — the person. Always the first reference.
- **Image 2** — one canvas with every garment to try on, laid out in the order of the garment list.

## The prompt

Exactly one sentence, built on this template:

> The person of image 1, maintaining exactly their face and pose, wearing the {GARMENTS} of image 2.

`{GARMENTS}` = the garment descriptions in the given order (head → eyewear → top → bottom → shoes), joined with commas and a final "and".

For each garment:

1. Start from its description as given.
2. If the user chose a fit, it replaces any fit words in the description, and goes right before the garment type: "oversized cream knit sweater", "baggy black cargo trousers", "slim dark denim jeans". A "regular" fit is written as "regular-fit". If the user chose no fit, keep the fit the description already gives, as the shop shows it.
3. Keep visible text in quotes: "cap with 'Keep FLUXing' text".
4. Keep it concise. No articles inside the list beyond the template's "the", no adjectives about quality or style, nothing about the person, the background, the light or the camera.

## Examples

One garment:

> The person of image 1, maintaining exactly their face and pose, wearing the olive green bomber jacket with 'Black Forest Labs' branding of image 2.

Several garments:

> The person of image 1, maintaining exactly their face and pose, wearing the beige cap with 'Keep FLUXing' text, oversized cream knit sweater with 'Black Forest Labs' text, black logo shorts, and brown suede two-strap slide sandals with black outsoles of image 2.

## Do not

- Do not describe clothes the person already wears or garments that are not in the list.
- Do not add a second sentence, negative wording, or style words ("photorealistic", "8k", "fashion shoot").
- Do not put aspect ratio or resolution in the prompt — they are call parameters.
