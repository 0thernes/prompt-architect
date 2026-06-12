# T-002 — Computed tokens — `emit` map for flag-rename cases (e.g. --niji)

## Context

The current template engine does value substitution: `{{version}}` emits the
field's value. This breaks down when an enum option changes not only the value
but the flag name entirely. The known real case is Midjourney's anime mode:
selecting the niji model should emit `--niji 6` instead of `--v 6` — the flag
name flips. Right now this is worked around by shipping a sibling plugin
(`midjourney-niji.yaml`), which duplicates most of the schema and drifts
independently.

The fix is a per-option `emit` map in the meta-schema: when a `version` field
option has `emit: "--niji {{self}}"`, the template engine substitutes the
`emit` pattern instead of the literal value. This keeps the plugin corpus
data-only and eliminates the sibling-plugin workaround.

Relevant ARCHITECTURE.md note: "Planned: computed tokens, an emit map on enum
options (value → emitted text) that stays data-only."

## Acceptance criteria

- [ ] `schemas/generator.schema.json` gains an optional `emit` string field on
      enum/multi option objects; the meta-schema version patch-bumps.
- [ ] `scripts/validate.mjs` validates that any `emit` string containing tokens
      (`{{...}}`) only references `self` (the current field value), not other
      fields (to keep evaluation stateless).
- [ ] The template engine in `app/index.html` evaluates the `emit` pattern when
      present, substituting `{{self}}` with the raw field value.
- [ ] The Midjourney plugin uses `emit` on its `version` field so that niji
      selection produces `--niji 6` and standard selection produces `--v 7`.
- [ ] The `midjourney-niji.yaml` sibling plugin (if created before this card)
      is deleted; one plugin covers both modes.
- [ ] All CI checks pass.

## Definition of Done

- All acceptance criteria checked.
- ARCHITECTURE.md "Known limitations" section updated to reflect this
  capability landing.
- CHANGELOG.md Unreleased section notes the meta-schema bump and the Midjourney
  plugin change.

## Estimate

M (1 day)

## Dependencies

T-001 (loader) is not required for this change — it affects the meta-schema and
the embedded PoC objects; the loader can land before or after. No hard ordering.
