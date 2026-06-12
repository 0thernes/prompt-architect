# T-003 — Plugin: Runway Gen-3 Alpha video generator

## Context

Runway Gen-3 Alpha is one of the generators "actually in rotation" per the MVP
scope in ROADMAP.md Phase 1. It takes a text prompt and optional image reference
and produces short video clips (up to ~10 seconds). Its parameter set differs
fundamentally from image generators: the key knobs are motion intensity, camera
motion (tilt, pan, roll, zoom), and aspect ratio (16:9 or 9:16). Negative
prompting is supported but functions differently from Stable Diffusion.

The plugin demonstrates that the meta-schema can express a video-modality
generator; this is the first `modality: video` plugin in the corpus.

Vendor docs: https://help.runwayml.com/hc/en-us/articles/27145920459027

## Acceptance criteria

- [ ] `generators/runway-gen3.yaml` passes `node scripts/validate.mjs` with
      exit 0, including all semantic checks.
- [ ] The plugin `modality` field is set to `video`.
- [ ] Fields covered: subject/prompt, image reference URL (optional, shown only
      when an image ref is provided), camera motion type (enum), camera motion
      intensity (0–10), aspect ratio (16:9 / 9:16), motion intensity (1–10),
      negative prompt (optional).
- [ ] `promptTemplate` produces a string matching Runway's accepted format.
- [ ] `outputRules.parameterOrder` lists every field exactly once in the order
      Runway expects parameters.
- [ ] `lastVerified` is set to today's date; `docsUrl` points to official docs.
- [ ] The accuracy-caveat header is present at the top of the file.

## Definition of Done

- All acceptance criteria checked.
- Plugin renders correctly in the browser (fields appear, prompt assembles).
- CHANGELOG.md Unreleased section notes the new plugin.

## Estimate

S (half-day)

## Dependencies

T-001 (runtime plugin loader) for the loader to pick it up automatically;
otherwise it can be previewed by adding the plugin object to the PoC embed.
