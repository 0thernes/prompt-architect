# Architecture

Prompt Architect is a deterministic form-to-prompt compiler with two first-class
creative modes. This document records the design decisions behind the meta-schema /
plugin / engine layering, the template engine semantics, the validation flow, the
untrusted-plugin trust boundary, and the constraints that shaped all of them.

Cross-links: data model → [`docs/ERD.md`](ERD.md) · complexity analysis →
[`docs/COMPLEXITY.md`](COMPLEXITY.md) · 500-point audit → [`docs/AUDIT-500.md`](AUDIT-500.md).

---

## Design goals

1. **No AI at runtime.** The output of the app is a function of the form state
   and the plugin file — nothing else. Same inputs, same prompt, forever.
   (Glyph Canvas: the output is the raw composed text, verbatim — equally
   model-free at build time.)
2. **Data absorbs drift, code stays still.** Vendor option sets change weekly.
   Every fact about a generator lives in a YAML plugin; the app knows nothing
   about Midjourney or Stable Diffusion specifically.
3. **Zero build.** The PoC and MVP are plain HTML + vanilla JS opened from disk
   or served statically as a PWA. No bundler, no framework, no npm runtime
   dependency. (CI installs Ajv/js-yaml ad hoc for validation only.)
4. **The schema is the product.** The meta-schema is the stable public contract.
   UIs, validators, even competing renderers can be rebuilt against it; the
   plugin corpus retains its value through all of them.
5. **Two first-class creative modes.** Structured mode (schema-driven form →
   template engine → deterministic prompt) and Glyph Canvas mode (freeform
   Unicode composition → verbatim prompt) share the same application shell but
   are architecturally independent subsystems. Switching between them never
   discards work in the other mode.
6. **Plugin trust boundary.** Plugins are inert data; the renderer executes no
   plugin-supplied code. This is the architectural precondition for a community
   registry: third-party plugins can be accepted without executing third-party
   code.

---

## System overview

```
            authors edit                CI gate                   runtime
 vendor docs ───────────▶ generators/*.yaml ──▶ scripts/validate.mjs ──▶ app
                               ▲                         │                  │
                               │ structural contract     │ semantic lint     │
                   schemas/generator.schema.json ◀───────┘                  │
                                                                             │
                                          app/engine.js ◀───────────────────┤
                                          (ESM, browser+Node)               │
                                                  │                         │
                                    Structured mode ◀───── engine ──────────┤
                                    (form → template → prompt)              │
                                                                             │
                                    Glyph Canvas ◀──────────────────────────┘
                                    (Unicode text area, no schema, no engine)
```

### Layer responsibilities

| Layer | File(s) | Responsibility |
|-------|---------|----------------|
| Meta-schema | `schemas/generator.schema.json` | Defines what a valid plugin IS. Stable public contract. JSON Schema draft 2020-12. |
| Plugins | `generators/*.yaml` | Describe one generator's parameter set as inert data. Validated against meta-schema in CI. |
| Engine | `app/engine.js` | ESM module: `assemble(plugin, values)`, `isVisible`, `isSet`, `formatValue`. Runs in browser and Node. Zero runtime deps. |
| App shell | `app/index.html` | Imports engine. Renders form from plugin. Hosts mode toggle. Glyph Canvas surface. |
| Logger | `app/logger.js` | Structured event log. Emits typed events; see `docs/OBSERVABILITY.md`. |
| CI validator | `scripts/validate.mjs` | Structural (Ajv) + semantic lint. Run on every push/PR. |

---

## The plugin model

A plugin is one YAML document conforming to
[`schemas/generator.schema.json`](../schemas/generator.schema.json). Its parts:

| Part | Role |
|------|------|
| `id`, `name`, `modality`, `version` | Identity. `id` is permanent (presets and history will reference it); `version` is the plugin's own semver, independent of the vendor's release numbering. |
| `targetVersion`, `docsUrl`, `lastVerified` | Drift management. Tooling can flag plugins whose `lastVerified` is older than 90 days; reviewers re-check against `docsUrl`. |
| `fields[]` | The form. Each field is a typed control: `string`, `number` (+`range`), `boolean`, `enum`/`multi` (+`options`), with `default`, `placeholder`, `dependsOn` visibility conditions, `omitIfDefault`, and a `tier` hint for the complexity-tier system. Field order = form layout order. |
| `promptTemplate` | The assembly recipe. Mustache-style `{{token}}` substitution and `{{#token}}…{{/token}}` conditional sections. May reference `{{=id}}` computed tokens. |
| `outputRules` | Post-processing contract: canonical `parameterOrder`, `separator`, `listSeparator`, `collapseWhitespace`, `trim`, `maxLength`, `overflowStrategy`. |
| `computedTokens[]` | Declarative flag-rename rules. Each entry has an `id`, an `emit` string, and `when[]` conditions. Referenced in templates as `{{=id}}` or `{{#=id}}…{{/=id}}`. |

The full entity-relationship model — including cardinalities, DAG invariants,
and the `parameterOrder` single-source-of-truth rule — is in [`docs/ERD.md`](ERD.md).

### Why plugins are data, not code

- **Reviewability:** a YAML diff that changes `max: 1000` to `max: 2000` is
  auditable by anyone; a JS plugin diff is not. This is the precondition for a
  community registry (v1) — we can accept third-party contributions without
  executing third-party code. See [`docs/adr/0002-plugins-as-data.md`](adr/0002-plugins-as-data.md).
- **Update latency:** when a vendor renames a flag, the fix is a one-line data
  edit shippable in minutes. That is the entire maintenance strategy, stated
  in a caveat header inside every plugin file.
- **Multi-renderer future:** the same plugin can drive a web form, a CLI
  wizard, or an export to other tools, because it carries no rendering logic.

---

## The engine — `app/engine.js`

The engine is extracted into a standalone ES module so it can be unit-tested
with `node --test` independently of the browser. It exports:

```
assemble(plugin, values) → { text, charCount, overLimit }
isVisible(field, values) → boolean
isSet(field, values) → boolean
formatValue(field, value) → string
```

### Template language — two constructs, no recursion

- `{{key}}` — substitute the field's formatted value; empty string when unset.
- `{{#key}} … {{/key}}` — conditional section, emitted only when `key` is *set*.
  Sections may contain tokens but **do not nest**; every real prompt syntax
  surveyed (Midjourney flags, A1111 paste format) is expressible with one level.
- `{{=id}}` — computed-token scalar: substitute the `emit` string of the
  matched `when[]` condition, or empty string.
- `{{#=id}} … {{/=id}}` — computed-token conditional section.

### Set-ness rules (the heart of correct flag omission)

1. A field hidden by `dependsOn` is unset, whatever its stored value.
2. `undefined` / `null` / whitespace-only strings are unset; `boolean` is set
   only when `true`; `multi` only when non-empty.
3. If `omitIfDefault: true` and the value equals `default`, the field is unset —
   so `--chaos 0` never clutters a Midjourney prompt, while `--ar 1:1` (no
   `omitIfDefault`) is always emitted for reproducibility.

### Post-processing pipeline (driven by `outputRules`, in order)

1. Resolve computed tokens → build `computedMap`.
2. Expand computed-token conditional sections (`{{#=id}}…{{/=id}}`).
3. Expand conditional sections (`{{#key}}…{{/key}}`).
4. Substitute scalar tokens (`{{key}}`, `{{=id}}`).
5. `collapseWhitespace` — runs of spaces/tabs collapse to `separator`.
   Horizontal only: newlines survive, because line-oriented targets (A1111
   paste format) carry meaning in line structure.
6. `trim`.
7. `maxLength` check with `overflowStrategy` (`warn` / `truncate` / `error`).

### Known limitations (and the plan)

- **`overflowStrategy:"error"` is not yet implemented** — falls through to `warn`
  behaviour silently. Tracked as AUDIT-500 finding 1.20.
- **No cross-field validation** (e.g. "width×height ≤ 1 MPx"). Planned as
  declarative `constraints[]` in a future meta-schema minor version (T-014).
- **Sections key on one field.** Compound conditions reuse `dependsOn` on a
  hidden derived field if ever needed; one-key sections have sufficed so far.

---

## Validation flow — three layers

1. **Structural (CI + local):** Ajv validates every `generators/*.yaml` against
   the meta-schema. Wrong types, missing `options` on an enum, unknown
   properties — all rejected before merge.
2. **Semantic (CI + local, `scripts/validate.mjs`):** what JSON Schema cannot
   express: unique field keys; every template token names a declared field;
   balanced sections; `parameterOrder` covers all fields exactly once;
   **template token order must respect `parameterOrder`** (the single source
   of truth — a template edit cannot silently reorder generator flags); enum
   defaults exist in `options`; number defaults inside `range`; `dependsOn`
   references exist and are not self-referential; `computedTokens` ids are
   unique, do not collide with field keys, `when` condition references resolve,
   `{{=id}}` / `{{#=id}}` template references match declared ids, and computed
   sections are balanced.
3. **Runtime (browser):** the form itself constrains input — sliders carry the
   real `min/max/step`, dropdowns the real enum values, hidden fields drop out
   of the prompt. The renderer never needs to re-validate ranges because the
   controls make invalid states unrepresentable.

---

## Untrusted-plugin trust boundary

The single most important security property of the architecture is that **plugins
are pure data — the renderer evaluates no plugin-supplied code at any point**.
The trust boundary is enforced at three levels:

1. **Schema structural validation** rejects any plugin with properties outside
   the meta-schema's `additionalProperties: false` constraint.
2. **Semantic lint** rejects tokens that reference undeclared fields, ensuring
   no template injection can occur.
3. **The renderer** reads field values from the plugin to build DOM controls,
   but never `eval()`s, `new Function()`s, or `innerHTML`-injects any
   plugin-supplied string into the document without sanitisation.

This boundary is what makes a community plugin registry tractable: accepting a
third-party plugin is equivalent to accepting a JSON data file — the blast radius
of a malicious or broken plugin is confined to producing a wrong prompt string,
not to executing code in the user's browser.

Full security analysis: [`docs/SECURITY-NOTES.md`](SECURITY-NOTES.md).
Full audit (including supply-chain and XSS sections): [`docs/AUDIT-500.md`](AUDIT-500.md).

---

## Glyph Canvas subsystem

The Glyph Canvas is a parallel mode whose architecture is intentionally minimal:
it has no plugin loader, no schema validator, and no template engine. Its
components are:

- **Text area** — large, Unicode-aware, monospace-tolerant. Handles combining
  characters, bidirectional text, and emoji variation selectors correctly.
- **Symbol/emoji palette** — searchable picker organised by Unicode block.
  Inserts at cursor position. Tracks recents and favourites in localStorage.
- **Colour / weight tagger** — inline markup syntax (`[text|#hex]`) rendered
  as coloured text in the canvas, stripped on copy-raw.
- **Save/curate store** — flat JSON array in localStorage; each entry has a
  name, tags, and the raw Unicode text. Separate from structured presets.
- **Copy actions** — "Copy raw" (strips markup) and "Copy styled" (preserves
  markup for interfaces that support it).

The Glyph Canvas shares only the application shell (mode toggle, layout,
localStorage key namespace) with structured mode. No schema validation runs
against its content; that is intentional by design.

The Glyph Canvas is grounded in 0thernes's seven-technique (T1-T7) primary
corpus. Planned v1 UI affordances — negative-constraint stack builder,
keyword-avalanche palette, contradiction toggle, inverse-dual flip — map each
technique to a concrete interaction. Full specification: [`docs/CREATIVE-MODES.md`](CREATIVE-MODES.md).

---

## All-modality coverage

The plugin schema's `modality` enum covers `image`, `video`, `3d`, `audio`, and
`world`. The art-school concept taxonomy for each modality — which maps generator
option surfaces (Midjourney `--stylize`, Runway camera movement, Suno BPM, Meshy
topology) to plugin field types — is documented in [`docs/MODALITIES.md`](MODALITIES.md).

---

## PoC embedding note

`app/index.html` embeds the two reference plugins as JS object literals
(verbatim mirrors of the YAML) so the demo runs from `file://` with no fetch,
no CORS, and no YAML parser. The MVP replaces the embedded array with a loader
for `generators/*.yaml`; nothing else in the renderer changes — which is itself a
test of the contract.

---

## Future work

- **Preset library** — named, per-generator form states in `localStorage`;
  export as JSON.
- **Prompt history** — append-only log of assembled prompts with the plugin
  `id`+`version` that produced them, so old prompts remain reproducible even
  after plugins update.
- **Export/import** — share presets and history as a single JSON file; no
  accounts, no server.
- **Community plugin registry** — a static index (JSON) of vetted plugins with
  content hashes; the CI gate in this repo becomes the review process. Because
  plugins are inert data, accepting community plugins never means executing
  community code.
- **`constraints[]`** — declarative cross-field validation (e.g. "width×height
  must be ≤ 1 MPx") as a meta-schema minor version addition.
- **Complexity-tier toggle** — field `tier` hint (`simple` / `advanced` /
  `everything`) added to the meta-schema; renderer hides fields above the active
  tier. Full spec in [`docs/MODALITIES.md`](MODALITIES.md).
- **Glyph Canvas colour/weight export** — styled HTML fragment output for
  sharing glyph-prompt compositions as visual artefacts.
- **Per-modality plugin packs** — curated bundles (e.g. "video pack": Runway +
  Luma + Pika + Kling) installable as a unit from the community registry.
- **`"freeform"` plugin type** — lightweight metadata for Glyph Canvas
  (useful Unicode blocks, typical effective length, responsive model notes)
  carrying no field structure.
