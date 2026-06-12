# T-004 — Plugin: Suno v4 audio / music generator

## Context

Suno v4 is the audio/music generator listed in ROADMAP.md Phase 1 scope. Its
prompt model differs markedly from image and video: the primary input is either
a lyrics block (line-oriented) or a style prompt describing genre, mood, and
instrumentation. The generator also supports a "custom mode" flag and a
"continuation" mode that attaches to a prior clip ID — both are conditional
fields.

This plugin is the first `modality: audio` entry in the corpus and validates
that line-oriented `promptTemplate` styles (like Stable Diffusion's A1111 paste
format) are correctly handled by the template engine for a completely different
modality.

Vendor docs: https://suno.com/blog/v4 and the Suno prompt guide.

## Acceptance criteria

- [ ] `generators/suno-v4.yaml` passes `node scripts/validate.mjs` exit 0.
- [ ] Plugin `modality` is `audio`.
- [ ] Fields covered: style/vibe prompt (free-text, multiline), custom lyrics
      (multiline, `dependsOn` custom mode being enabled), custom mode toggle
      (boolean), continuation clip ID (string, optional), instrumental-only
      toggle (boolean), exclude styles (negative prompt equivalent).
- [ ] `promptTemplate` produces Suno's expected input format: custom mode output
      is a lyrics block with style tags; simple mode output is a style string.
- [ ] Conditional sections using `dependsOn` correctly show/hide the lyrics
      block when custom mode is toggled.
- [ ] `lastVerified` and `docsUrl` populated correctly.
- [ ] Accuracy-caveat header present.

## Definition of Done

- All acceptance criteria checked.
- Toggling "custom mode" in the browser reveals the lyrics block and the
  assembled prompt changes format accordingly.
- CHANGELOG.md Unreleased section notes the new plugin.

## Estimate

S (half-day)

## Dependencies

T-001 (plugin loader) for automatic discovery. T-002 (computed tokens) is not
required for this plugin — Suno's mode toggle changes presence of a section,
not a flag name.
