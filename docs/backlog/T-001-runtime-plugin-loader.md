# T-001 — Runtime plugin loader (fetch + parse YAML)

## Context

The PoC embeds both reference plugins as JavaScript object literals directly
inside `app/index.html`. This is a deliberate shortcut: it lets the demo run
from `file://` with no CORS, no YAML parser, and no fetch. The architectural
contract states that "the MVP replaces the embedded array with a loader for
`generators/*.yaml`; nothing else in the renderer changes."

This card implements that contract. The loader must:

1. Fetch each YAML file from a relative path (same origin; works both from a
   local dev server and from a static host).
2. Parse YAML in-browser using `js-yaml` loaded as an ES module import or a
   CDN-hosted script tag (the no-build rule forbids bundling).
3. Run the structural validation pass (Ajv) in the browser and surface friendly
   error messages when a plugin fails to load — so plugin authors get immediate
   feedback without running CI locally.
4. Replace the hardcoded `GENERATORS` array in `app/index.html` with the
   dynamically loaded set.

The static embedded mirrors can be removed once this card is done.

## Acceptance criteria

- [ ] Opening `app/index.html` from a local HTTP server (e.g. `npx serve .`)
      shows all `.yaml` files in `generators/` in the generator dropdown with
      zero code changes.
- [ ] Introducing a malformed YAML file causes a visible error banner in the UI
      naming the file and the first validation failure; the rest of the plugins
      still load.
- [ ] A plugin with a structural error (e.g. missing `outputRules.parameterOrder`)
      shows the specific Ajv error message, not a generic crash.
- [ ] The embedded PoC object literals are removed from `app/index.html` and
      the file is smaller.
- [ ] `node scripts/validate.mjs` still exits 0 (the loader does not affect CI).
- [ ] `npx html-validate@8 app/index.html` still exits 0.

## Definition of Done

- All acceptance criteria checked.
- `lastVerified` updated on both reference plugins if any YAML syntax changed.
- CHANGELOG.md Unreleased section notes the loader as a user-visible change.
- ADR updated or new ADR written if the YAML parser choice requires it.

## Estimate

M (1 day)

## Dependencies

None — this is the first MVP unlock; all plugin additions depend on it.
