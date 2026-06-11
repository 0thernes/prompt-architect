# Architecture

Prompt Architect is a deterministic form-to-prompt compiler. This document
records the design decisions behind the plugin model, the template engine and
the validation flow, and the constraints that shaped them.

## Design goals

1. **No AI at runtime.** The output of the app is a function of the form state
   and the plugin file — nothing else. Same inputs, same prompt, forever.
2. **Data absorbs drift, code stays still.** Vendor option sets change weekly.
   Every fact about a generator lives in a YAML plugin; the app knows nothing
   about Midjourney or Stable Diffusion specifically.
3. **Zero build.** The PoC and MVP are plain HTML + vanilla JS opened from disk
   or served statically as a PWA. No bundler, no framework, no npm runtime
   dependency. (CI installs Ajv/js-yaml ad hoc for validation only.)
4. **The schema is the product.** The meta-schema is the stable public
   contract. UIs, validators, even competing renderers can be rebuilt against
   it; the plugin corpus retains its value through all of them.

## System overview

```
            authors edit                CI gate                runtime
 vendor docs ───────────▶ generators/*.yaml ──▶ scripts/validate.mjs ──▶ app
                              ▲                        │
                              │ structural contract    │ semantic lint
                  schemas/generator.schema.json ◀──────┘
```

## The plugin model

A plugin is one YAML document conforming to
[`schemas/generator.schema.json`](../schemas/generator.schema.json). Its parts:

| Part | Role |
|------|------|
| `id`, `name`, `modality`, `version` | Identity. `id` is permanent (presets and history will reference it); `version` is the plugin's own semver, independent of the vendor's release numbering. |
| `targetVersion`, `docsUrl`, `lastVerified` | Drift management. Tooling can flag plugins whose `lastVerified` is older than 90 days; reviewers re-check against `docsUrl`. |
| `fields[]` | The form. Each field is a typed control: `string`, `number` (+`range`), `boolean`, `enum`/`multi` (+`options`), with `default`, `placeholder`, `dependsOn` visibility conditions and `omitIfDefault`. Field order = form layout order. |
| `promptTemplate` | The assembly recipe (see Template engine). |
| `outputRules` | Post-processing contract + the canonical `parameterOrder`. |

### Why plugins are data, not code

- **Reviewability:** a YAML diff that changes `max: 1000` to `max: 2000` is
  auditable by anyone; a JS plugin diff is not. This is the precondition for a
  community registry (v1) — we can accept third-party contributions without
  executing third-party code.
- **Update latency:** when a vendor renames a flag, the fix is a one-line data
  edit shippable in minutes. That is the entire maintenance strategy, stated
  in a caveat header inside every plugin file.
- **Multi-renderer future:** the same plugin can drive a web form, a CLI
  wizard, or an export to other tools, because it carries no rendering logic.

## Template engine

Deliberately minimal — two constructs, ~30 lines of code, no recursion:

- `{{key}}` — substitute the field's formatted value (empty string when unset).
- `{{#key}} … {{/key}}` — conditional section, emitted only when `key` is
  *set*. Sections may contain tokens but **do not nest**; every real prompt
  syntax surveyed (Midjourney flags, A1111 paste format) is expressible with
  one level.

**Set-ness rules** (the heart of correct flag omission):

1. A field hidden by `dependsOn` is unset, whatever its stored value.
2. `undefined`/`null`/whitespace-only strings are unset; `boolean` is set only
   when `true`; `multi` only when non-empty.
3. If `omitIfDefault: true` and the value equals `default`, the field is unset
   — so `--chaos 0` never clutters a Midjourney prompt, while `--ar 1:1`
   (no `omitIfDefault`) is always emitted for reproducibility.

**Post-processing pipeline** (driven by `outputRules`, in order):

1. Render sections, then tokens.
2. `collapseWhitespace` — runs of spaces/tabs collapse to `separator`.
   Horizontal only: newlines always survive, because line-oriented targets
   (A1111 paste format) carry meaning in line structure.
3. `trim`.
4. `maxLength` check with `overflowStrategy` (`warn` in the PoC UI: live
   character counter that flips to a warning state).

### Known limitations (and the plan)

- **Token substitution cannot rename flags.** Midjourney's anime mode swaps
  `--v 7` for `--niji 6` — a different flag, not a different value. Planned:
  *computed tokens*, an `emit` map on enum options (`value → emitted text`)
  that stays data-only. Until then, such modes ship as sibling plugins.
- **No cross-field validation** (e.g. "width×height must be ≤ 1 MPx"). Planned
  as declarative `constraints[]` in a future meta-schema minor version.
- **Sections key on one field.** Compound conditions reuse `dependsOn` on a
  hidden derived field if ever needed; so far one-key sections have sufficed.

## Validation flow — three layers

1. **Structural (CI + local):** Ajv validates every `generators/*.yaml` against
   the meta-schema. Wrong types, missing `options` on an enum, unknown
   properties — all rejected before merge.
2. **Semantic (CI + local, `scripts/validate.mjs`):** what JSON Schema cannot
   express: unique keys; every template token names a declared field; balanced
   sections; `parameterOrder` covers all fields exactly once; **template token
   order must respect `parameterOrder`** (the single source of truth — a
   template edit cannot silently reorder generator flags); enum defaults exist
   in `options`; number defaults inside `range`; `dependsOn` references exist
   and are not self-referential.
3. **Runtime (browser):** the form itself constrains input — sliders carry the
   real `min/max/step`, dropdowns the real enum values, hidden fields drop out
   of the prompt. The renderer never needs to re-validate ranges because the
   controls make invalid states unrepresentable.

## PoC embedding note

`app/index.html` embeds the two reference plugins as JS object literals
(verbatim mirrors of the YAML) so the demo runs from `file://` with no fetch,
no CORS and no YAML parser. The MVP replaces the embedded array with a loader
for `generators/*.yaml`; nothing else in the renderer changes — which is
itself a test of the contract.

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
- **Computed tokens / constraints** — see Known limitations.
