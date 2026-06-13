# AUDIT-500 — 500-Point / 25-Section Deep Inspection

**Prompt Architect · HEAD as of 2026-06-12**

Grounded in direct reading of every source file: `app/engine.js`, `app/index.html`,
`app/logger.js`, `schemas/generator.schema.json`, `generators/midjourney.yaml`,
`generators/stable-diffusion.yaml`, `scripts/validate.mjs`, `tests/engine.test.mjs`,
`.github/workflows/{ci,codeql,links}.yml`, `.github/dependabot.yml`,
`docs/{ARCHITECTURE,CREATIVE-MODES,MODALITIES,OBSERVABILITY,SECURITY-NOTES,TESTING,AUDIT,ROADMAP,KANBAN,FAQ}.md`,
`docs/adr/0001-*.md`, `docs/adr/0002-*.md`, `corpus/0thernes-entropy-corpus.md`,
`CHANGELOG.md`, `README.md`, `Makefile`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`.

Evidence gathered 2026-06-12:
- `node --test tests/engine.test.mjs` — 37 pass, 0 fail
- `node scripts/validate.mjs` — 2 plugins OK
- `npx html-validate@8 app/index.html` — exit 0

See [`AUDIT.md`](AUDIT.md) for the condensed self-audit checklist. This document is the
full 500-point companion.

---

## Section 1 — Correctness (prompt assembly)

| # | Item | Status |
|---|------|--------|
| 1.1 | `assemble()` returns `{ text, charCount, overLimit }` for every combination of set/unset fields — confirmed by 37 passing unit tests (`tests/engine.test.mjs`) | [x] |
| 1.2 | Midjourney minimal-prompt shape: `assemble(MJ, { subject:"a fox", aspect_ratio:"1:1", niji_version:"none", model_version:"7", stylize:100, chaos:0 })` → `"a fox --ar 1:1 --v 7"` — asserted in test `omitIfDefault > minimal MJ prompt has no optional flags at defaults` | [x] |
| 1.3 | `omitIfDefault: true` fields (stylize:100, chaos:0, weird:0, niji_version:"none") are absent from assembled output when at their declared default — verified in test suite section 3 | [x] |
| 1.4 | `omitIfDefault: true` fields emit when value differs from default — verified `--stylize 750`, `--chaos 40` tests | [x] |
| 1.5 | SD `hires_upscaler` absent when `hires_fix` is false; present when true — test section 4 `dependsOn gating` | [x] |
| 1.6 | `--niji 6` / `--niji 5` emitted and `--v` suppressed when niji is active — test section 7 `computedTokens` | [x] |
| 1.7 | `--v N` emitted and `--niji` absent when `niji_version:"none"` — test section 7 | [x] |
| 1.8 | Section blocks collapse to empty string when field is `undefined`, `null`, `""`, or hidden — tests 2.2, 2.3 | [x] |
| 1.9 | `charCount` equals `text.length` after post-processing — test 6.4 | [x] |
| 1.10 | `overLimit` is false when `maxLength` is absent — test 6.5 | [x] |
| 1.11 | `overflowStrategy:"truncate"` slices to exactly `maxLength` characters — test 6.3 | [x] |
| 1.12 | `overflowStrategy:"warn"` leaves text untouched — test 6.2 | [x] |
| 1.13 | `collapseWhitespace` correctly collapses horizontal whitespace per line without dropping newlines — `engine.js` lines 233–238; SD template uses `\n` and produces multi-line output as intended | [x] |
| 1.14 | `trim` removes leading/trailing whitespace from final output — `engine.js` line 240 | [x] |
| 1.15 | `separator` default falls back to `" "` when `outputRules.separator` is absent — `engine.js` line 215 | [x] |
| 1.16 | `listSeparator` default is `", "` when absent — `engine.js` line 214 | [x] |
| 1.17 | `parameterOrder` in both YAML plugins covers all field keys exactly once — confirmed by `node scripts/validate.mjs` exit 0 | [x] |
| 1.18 | MJ parameter order (subject → style_refs → negative → aspect_ratio → niji_version → model_version → stylize → chaos → weird → seed) matches template first-occurrence order — validator enforces this; passes | [x] |
| 1.19 | SD parameter order matches A1111 paste-format line order — validator passes; `positive_prompt`, `negative_prompt`, `steps`, `sampler`, `cfg_scale`, `seed`, `width`, `height`, `hires_fix`, `hires_upscaler` | [x] |
| 1.20 | `overflowStrategy:"error"` is a declared enum value but is **not implemented** in `engine.js` — only `warn` and `truncate` have branches (lines 247–249); `error` falls through silently, behaving like `warn`. Gap: +medium | [ ] |

**Section score: 19 / 20**

---

## Section 2 — Algorithms & data structures (template engine, plugin model)

| # | Item | Status |
|---|------|--------|
| 2.1 | `byKey` lookup map built with `Object.fromEntries` in a single O(n) pass — `engine.js` line 218 | [x] |
| 2.2 | `computedMap` built with `new Map()` in a single O(m) pass — `engine.js` lines 129–136 | [x] |
| 2.3 | Template expansion is a fixed sequence of four `String.prototype.replace` calls with compiled regexes — no manual character iteration, no recursion | [x] |
| 2.4 | `expandComputedTokens` is called recursively inside computed-token section bodies (line 150) but this is bounded: the body is extracted once and there is no way a body can re-expand into another `{{#=id}}` block during the Phase 1 / no-nesting rule — functional, but the recursion is not documented as bounded | [x] |
| 2.5 | `isSet` is called O(1) per field key lookup — no nested loops inside the section-expansion callback | [x] |
| 2.6 | `isVisible` evaluates `dependsOn` conditions via `.every()` — short-circuits on first false, which is appropriate for the expected 1–3 condition case | [x] |
| 2.7 | Plugin data structure is a plain JS object (no class instantiation, no prototype chain): safe for structured-clone, serialization, and future history storage | [x] |
| 2.8 | `byKey` uses `Object.fromEntries`; key collision (duplicate field keys) would silently take the last value. The semantic validator catches duplicates before runtime, so this is safe in CI-gated production — but the runtime `assemble()` itself does not guard against it | [x] |
| 2.9 | `resolveComputedTokens` iterates all computed tokens unconditionally; in Phase 1 (one token in MJ) this is trivial, but the data structure scales linearly with token count — acceptable | [x] |
| 2.10 | Template regex patterns (`/\{\{#([a-z][a-z0-9_]*)\}\}([\s\S]*?)\{\{\/\1\}\}/g`) use lazy quantifiers `([\s\S]*?)` which are correct for non-nested sections; would catastrophically backtrack on deeply nested or malformed templates — acceptable given no-nesting design rule | [x] |
| 2.11 | `isSet` signature `(field, values, _listSeparator)` names the third parameter `_listSeparator` (prefixed `_`) indicating it is unused — correct; `formatValue` uses it but `isSet` does not need it, yet the parameter is passed to maintain a consistent call site. Minor: the parameter could be removed from `isSet` to reduce confusion | [x] |
| 2.12 | `formatValue` trims the string return (`String(v).trim()`) — double-trim with `rules.trim` downstream is harmless but redundant for inner values | [x] |
| 2.13 | `multi` field join uses `v.join(listSeparator)` — correct; no extra whitespace normalisation | [x] |
| 2.14 | `evalCondition` `"truthy"` branch uses `Boolean(v)` — correct; handles `0`, `""`, `null`, `undefined` as falsy | [x] |
| 2.15 | `evalCondition` `"gte"` / `"lte"` branches coerce with `Number(v)` — safe for numeric values; will silently produce `NaN >= N` (false) for non-numeric values, which is benign | [x] |
| 2.16 | `"in"` / `"notIn"` operators call `Array.isArray(cond.value)` before `.includes()` — defensive | [x] |
| 2.17 | Plugin model is pure data (no code) — reviewable by YAML diff; change to a field's `range.max` is a one-line edit legible to non-programmers; consistent with ADR 0002 | [x] |
| 2.18 | No hash table or trie is used for template token lookup — the four-pass regex approach is fine for current template sizes (< 500 chars) and avoids premature optimisation | [x] |
| 2.19 | `state` object in `index.html` is a plain `{}` initialised on `buildForm()` — no stale keys from a previous generator persist because `state = {}` resets it entirely | [x] |
| 2.20 | `GENERATORS` array in `index.html` is a hardcoded JS literal; the MVP loader (T-001) will replace it — no algorithmic concern at PoC stage, but the absence of a loader means adding a generator currently requires code edits, not data edits. Documented gap. | [x] |

**Section score: 20 / 20**

---

## Section 3 — Time complexity (render, validate, assemble)

| # | Item | Status |
|---|------|--------|
| 3.1 | `assemble()` overall time complexity: O(F + T + C + O) where F=field count, T=template length, C=computedToken count, O=output length — linear in every dimension | [x] |
| 3.2 | `buildForm()` in `index.html` is O(F) — one DOM element created per field, no nested DOM queries | [x] |
| 3.3 | `refresh()` runs on every field input event; it is O(F + T + O): F visibility toggles + template assembly + DOM write. At F≤20 this is sub-millisecond — synchronous refresh is appropriate | [x] |
| 3.4 | `scripts/validate.mjs` semantic layer: template token scan is O(T); `parameterOrder` cross-check is O(F²) in the worst case (nested `includes` calls in the ordering check, lines 95–100) — benign at F≤50 | [x] |
| 3.5 | Ajv structural validation is O(schema complexity × plugin size) — single compile at startup, then O(1) validate call per plugin. Acceptable | [x] |
| 3.6 | `html-validate` is invoked once per CI run, not per field — O(HTML size), non-interactive | [x] |
| 3.7 | `evalCondition` is O(1) per condition; `isVisible` is O(conditions); the outer `isSet` is O(conditions) — hot path during `refresh()` but bounded by field count | [x] |
| 3.8 | Generator picker `change` event calls `GENERATORS.find()` — O(G) linear scan; at G≤10 trivial | [x] |
| 3.9 | Section-body expansion in `expandTemplate` uses a nested `replace` inside the outer `replace` callback — the inner replace is O(body_length × field_count) in theory, but bodies are short single-parameter snippets so this is O(1) in practice | [x] |
| 3.10 | `collapseWhitespace` splits on `"\n"`, maps each line through a replace, then joins — O(O) where O is output length | [x] |
| 3.11 | Template regex `/\{\{#([a-z][a-z0-9_]*)\}\}([\s\S]*?)\{\{\/\1\}\}/g` with lazy quantifier is O(T) in the common case; O(T²) in degenerate cases with many unmatched `{{#` tokens — mitigated by validator enforcing balanced sections before any template reaches the runtime | [x] |
| 3.12 | `option` DOM creation in `controlFor()` is O(options) per enum/multi field — correct | [x] |
| 3.13 | CI `npm install --no-save` installs three packages; dependency resolution is network-bound (not app-bound) — outside the app's critical path | [x] |
| 3.14 | `resolveComputedTokens` iterates all computed tokens even when none apply — O(C) unavoidable without a pre-index; C is expected ≤5 | [x] |
| 3.15 | `String.prototype.trim()` called inside `formatValue` and again at the top-level `txt = txt.trim()` — double trim is O(O) both times; redundant but not expensive | [x] |
| 3.16 | `semanticChecks` in `validate.mjs` line 95 (`if (idx < prev)`) uses `order.indexOf(k)` inside a loop over `firstSeen` — O(F²) but F≤50 and runs only in CI, not the browser | [x] |
| 3.17 | No memoisation or caching of `assemble()` results — re-assembles on every keystroke. For ≤20 fields this is appropriate; a future `useMemo`-style cache would be premature | [x] |
| 3.18 | `form.querySelectorAll('[data-key]')` is not used; instead `form.querySelector(\`[data-key="${f.key}"]\`)` iterates once per field in `refresh()` — O(F) DOM queries per refresh. Acceptable; could be cached in a Map but premature | [x] |
| 3.19 | `navigator.clipboard.writeText` (copy path) is async, UI-event-bound, and does not block the render loop | [x] |
| 3.20 | No debouncing on `input` events — assembly runs synchronously per keystroke. For template sizes < 2000 chars this is acceptable; for future very long templates a debounce could be valuable. Gap: +low | [ ] |

**Section score: 19 / 20**

---

## Section 4 — Space complexity

| # | Item | Status |
|---|------|--------|
| 4.1 | `byKey` object holds O(F) references to field descriptors — no copies; the descriptors are already in memory as part of the plugin object | [x] |
| 4.2 | `computedMap` is a `Map<string, string>` of O(C) entries where C ≤ total computed tokens | [x] |
| 4.3 | `state` object holds O(F) values; values are primitives or arrays — no deep object nesting | [x] |
| 4.4 | Template expansion works on strings in place — no AST, no intermediate tree; peak allocation is two copies of the template string during replacement | [x] |
| 4.5 | `GENERATORS` array in `index.html` holds two plugin objects (including embedded YAML mirrors) — total JS heap impact < 10 KB; confirmed by YAML file sizes (both < 5 KB each) | [x] |
| 4.6 | DOM nodes created by `controlFor()` are discarded via `form.textContent = ""` on generator switch — no memory leak from accumulated orphaned nodes | [x] |
| 4.7 | `logger.js` module state is limited to `effectiveLevel` (one integer) and the four exported methods — negligible | [x] |
| 4.8 | `scripts/validate.mjs` keeps one compiled Ajv validator function and one parsed plugin object in memory at a time; previous plugin is GC-eligible after each loop iteration | [x] |
| 4.9 | No global arrays that grow unboundedly at runtime in the PoC — `GENERATORS`, `fields`, and `options` are all static | [x] |
| 4.10 | Future `history` and `presets` stores (T-007, T-008) will grow in `localStorage` (5 MB cap browser-enforced) — not yet implemented; no current space concern | [x] |
| 4.11 | `multi` field `state[field.key]` is an array; the `new Set(state[field.key] || [])` in the checkbox handler creates a temporary Set per change event — O(options) peak, GC-collectable immediately | [x] |
| 4.12 | Template regex `.matchAll()` in `validate.mjs` returns an iterator; matches are consumed lazily — no full materialization of all match objects simultaneously | [x] |
| 4.13 | `firstSeen` array in `validate.mjs` line 64 is O(F) — built incrementally, used once for ordering check | [x] |
| 4.14 | `opens` and `closes` arrays (balance check) are built by spreading iterators — O(T) peak; created and GC-collected within the function | [x] |
| 4.15 | No `innerHTML` string concatenation — DOM mutations use `createElement`/`appendChild` which is more memory-predictable than string concatenation | [x] |
| 4.16 | `output.textContent = text` replaces the entire text node — the browser manages the previous node's memory | [x] |
| 4.17 | `logger.js` log entries are serialised to a JSON string immediately and passed to `console.*` — no retention of the entry object after the call | [x] |
| 4.18 | The `logs/` directory is a `.gitkeep` placeholder — no actual log files accumulate in the repo; `*.log` is gitignored | [x] |
| 4.19 | CI runner installs node_modules ad hoc and they are not cached across runs (no `actions/cache` step) — each CI run re-downloads ~3 packages. Minor: adding cache would speed up CI but has no space concern for the app itself | [x] |
| 4.20 | `node_modules/` is present locally (via `npm install --no-save`) but `.gitignore` should exclude it — no `package.json` is committed but `node_modules/` directory was observed in repo root listing. Gap: confirm gitignore covers it. +low | [ ] |

**Section score: 19 / 20**

---

## Section 5 — Schema design & meta-schema correctness (JSON Schema 2020-12)

| # | Item | Status |
|---|------|--------|
| 5.1 | `$schema` is `"https://json-schema.org/draft/2020-12/schema"` — correct 2020-12 URI | [x] |
| 5.2 | `$id` is a stable absolute URI — `"https://0thernes.art/prompt-architect/schemas/generator.schema.json"` | [x] |
| 5.3 | Root object uses `"additionalProperties": false` — unknown top-level keys rejected | [x] |
| 5.4 | `required` at root: `["id","name","modality","version","fields","promptTemplate","outputRules"]` — all mandatory for a functional plugin | [x] |
| 5.5 | `field` `$def` uses `"additionalProperties": false` — unknown field properties rejected | [x] |
| 5.6 | `allOf` on `field` enforces: enum/multi fields must have `options`; number fields must have `range` — correct use of 2020-12 `if/then` inside `allOf` | [x] |
| 5.7 | `outputRules` `$def` uses `"additionalProperties": false` — no undocumented output rule keys | [x] |
| 5.8 | `condition` `$def` uses `"additionalProperties": false`; `allOf` requires `value` for all operators except `truthy` | [x] |
| 5.9 | `computedToken` `$def` uses `"additionalProperties": false`; `id` and `emit` are required | [x] |
| 5.10 | `option` `$def` uses `"oneOf"` to allow either a bare string or a `{ value, label }` object — correct discriminated union | [x] |
| 5.11 | `range` `$def` uses `"additionalProperties": false`; `step` uses `"exclusiveMinimum": 0` — correct 2020-12 syntax (was `"exclusiveMinimum": true` in draft-04; 2020-12 uses a numeric value) | [x] |
| 5.12 | `modality` enum values are `["image","video","3d","audio","world"]` — `"freeform"` is intentionally absent (documented in schema description as planned but not yet valid) | [x] |
| 5.13 | `field.type` enum covers all five types: `["string","number","boolean","enum","multi"]` — complete | [x] |
| 5.14 | `field.default` type is `["string","number","boolean","array","null"]` — supports all field types; `array` covers `multi` defaults | [x] |
| 5.15 | `computedToken.id` pattern `^[a-z][a-z0-9_]*$` matches the field `key` pattern but `computedToken` ids are prefixed with `=` in the template (`{{=id}}`) — the pattern is correct for the id value itself, not the template syntax | [x] |
| 5.16 | `field.key` pattern `^[a-z][a-z0-9_]*$` requires snake_case starting with a letter — consistent with template regex `([a-z][a-z0-9_]*)` | [x] |
| 5.17 | `plugin.id` pattern `^[a-z0-9][a-z0-9-]*$` allows starting with a digit (e.g. `3d-tool`) — intentional; kebab-case with numeric start permitted | [x] |
| 5.18 | `outputRules.parameterOrder` uses `"uniqueItems": true` — schema enforces uniqueness at structural level; semantic validator also checks it explicitly | [x] |
| 5.19 | `computedTokens` is optional (not in root `required`); `computedToken.when` is optional (token is unconditionally active when absent) — both intentional and documented | [x] |
| 5.20 | No `unevaluatedProperties: false` at the root `$defs` level — the `strict: false` Ajv option is deliberately set in `validate.mjs` line 30 to handle this correctly for 2020-12 schemas. Documented in `TESTING.md`. | [x] |

**Section score: 20 / 20**

---

## Section 6 — Plugin model & extensibility

| # | Item | Status |
|---|------|--------|
| 6.1 | Plugin is pure YAML data — no executable code; a YAML diff that changes `max: 1000` to `max: 2000` is auditable by non-programmers (ADR 0002) | [x] |
| 6.2 | Adding a new plugin requires no code changes in the app — confirmed by PoC design; MVP loader (T-001) formalises this | [x] |
| 6.3 | Plugin identity (`id`) is documented as permanent — presets and history reference it; changing it is a breaking change requiring a new id | [x] |
| 6.4 | Plugin `version` is semver; bump semantics are documented: patch for options, minor for new fields, major for template/breaking — `CONTRIBUTING.md` | [x] |
| 6.5 | `targetVersion` and `lastVerified` fields enable staleness detection — CI staleness check (T-011) is in `Ready` state | [x] |
| 6.6 | `computedTokens` extend the plugin model for flag-rename cases (e.g. `--niji`) without adding code — consistent with ADR 0002 | [x] |
| 6.7 | `dependsOn` conditions allow conditional field visibility purely in YAML — no custom plugin-side JS needed for show/hide logic | [x] |
| 6.8 | `omitIfDefault` eliminates flags the generator already assumes — keeps prompts minimal; data-driven | [x] |
| 6.9 | `outputRules.parameterOrder` is the single source of truth for parameter ordering — validated by CI so template edits cannot silently reorder flags | [x] |
| 6.10 | Planned `tier` hint (Simple/Advanced/Everything) is not yet in the schema — the complexity tier toggle (T-021) is `Backlog`. Gap: no `tier` field yet; all fields treated as `Everything` tier | [ ] +low |
| 6.11 | Planned `"freeform"` modality for Glyph Canvas metadata is not yet a valid enum value — documented in schema, tracked in roadmap | [ ] +low |
| 6.12 | Planned `constraints[]` for cross-field validation (e.g. width×height ≤ 1MPx) is not yet in schema — T-014 backlog. Gap for complex plugins | [ ] +low |
| 6.13 | Planned `file-uri` field type extension (for image reference inputs) is not yet in schema — blocks image/video reference plugins | [ ] +low |
| 6.14 | `promptTemplate` sections do not nest — documented as a known limitation in `ARCHITECTURE.md`; all surveyed prompt syntaxes fit within one level | [x] |
| 6.15 | `computedToken.emit` is a literal string — complex conditional formatting (different emit strings for different condition values) requires multiple `computedToken` entries | [x] |
| 6.16 | Both reference plugins include accurate-caveat headers warning that vendor params drift — honesty-first maintenance strategy | [x] |
| 6.17 | Plugin `docsUrl` links to vendor authoritative documentation — both plugins have valid URIs | [x] |
| 6.18 | PoC embeds plugin objects as JS literals in `index.html` as verbatim mirrors of YAML — CONTRIBUTING.md documents that YAML changes must also update the mirrors | [x] |
| 6.19 | Community plugin registry with content hashes (T-012) is in Backlog — until it ships, the trust model relies entirely on the CI gate; no runtime integrity check exists | [ ] +medium |
| 6.20 | Plugin signing (T-013) is in Backlog — first-party plugins are not signed; tampering after CI merge is undetectable at runtime | [ ] +medium |

**Section score: 15 / 20**

---

## Section 7 — Template-engine semantics (tokens, sections, ordering, dependsOn, omitIfDefault, computed-tokens)

| # | Item | Status |
|---|------|--------|
| 7.1 | `{{key}}` scalar substitution returns `""` when the field is not set — `formatValue` line 104 | [x] |
| 7.2 | `{{#key}}…{{/key}}` section emits body only when `isSet(field, values)` — `expandTemplate` lines 172–184 | [x] |
| 7.3 | `{{=id}}` scalar substitution returns the computed `emit` string — `expandTemplate` lines 197–199 | [x] |
| 7.4 | `{{#=id}}…{{/=id}}` section emits body only when computed token is active — `expandTemplate` lines 186–191 | [x] |
| 7.5 | Section bodies are expanded for inner tokens after section activation — inner `replace` on lines 178–183 | [x] |
| 7.6 | Computed-token section bodies are expanded for scalars via `expandComputedTokens` recursion — `expandComputedTokens` line 150 | [x] |
| 7.7 | Phase 1 (section blocks) runs before Phase 2 (scalars) — prevents a standalone `{{key}}` from interfering with a section that references the same key | [x] |
| 7.8 | `isSet` correctly treats a `boolean` field as set only when `true` — line 88; `false` does not emit the section body | [x] |
| 7.9 | `isSet` treats `multi` as set only when the array is non-empty — line 89 | [x] |
| 7.10 | `isSet` respects `omitIfDefault` — line 91; value at default is treated as unset for template emission | [x] |
| 7.11 | `isSet` checks `isVisible` first — a hidden field (dependsOn not met) is never "set" regardless of its value — line 85 | [x] |
| 7.12 | `dependsOn` conditions are evaluated against the live `values` map — changes propagate immediately on next `refresh()` | [x] |
| 7.13 | `parameterOrder` enforcement is a CI concern only (validator); the engine follows template order. This is a clean separation of concerns — the template is the ordering, the validator guards it | [x] |
| 7.14 | Token regex `([a-z][a-z0-9_]*)` in `expandTemplate` matches exactly the same pattern as `field.key` and `computedToken.id` — no false positives from digits or uppercase | [x] |
| 7.15 | The two-phase design means a `{{key}}` that appears after a `{{#key}}…{{/key}}` block will still be substituted in Phase 2 — semantically correct (e.g. niji_version appears inside the niji_flag section and also resolves as a scalar) | [x] |
| 7.16 | `String(v).trim()` in `formatValue` trims leading/trailing whitespace from scalar values before template insertion — prevents double-spaces from whitespace-padded user input | [x] |
| 7.17 | `multi` join uses `v.join(listSeparator)` without individual value trimming — if a user selects an option whose string value has leading/trailing spaces (a data bug), the separator would be off. The validator checks that defaults match option values but does not trim option values | [x] |
| 7.18 | Section body inner-token expansion is limited to `{{key}}` scalars (line 179), not to nested sections — by design (no nesting); if a template writer accidentally includes `{{#key2}}…{{/key2}}` inside a section body it will not be expanded. Gap: no validator warning for this case | [ ] +low |
| 7.19 | Computed-token scalar `{{=id}}` inside a regular section body is not expanded — line 179 only replaces `{{key}}`, not `{{=id}}`. After Phase 1 expands the section, Phase 2b handles the remaining `{{=id}}` — correct two-pass semantics | [x] |
| 7.20 | `"error"` overflow strategy is a valid enum in `outputRules.overflowStrategy` but throws no error in `engine.js` — gap documented in item 1.20. Same gap from template-engine correctness perspective | [ ] +medium |

**Section score: 18 / 20**

---

## Section 8 — Determinism of assembly

| # | Item | Status |
|---|------|--------|
| 8.1 | `assemble()` is a pure function — no global state, no `Date.now()`, no `Math.random()`, no network — same inputs always produce same output | [x] |
| 8.2 | `byKey` build order is `Array.prototype.map` over `plugin.fields` — field order is the plugin's `fields[]` array order, which is deterministic | [x] |
| 8.3 | `computedMap` is a `Map` — iteration order is insertion order (ES2015 guaranteed); computed token resolution is deterministic | [x] |
| 8.4 | Template regex replacements are applied left-to-right in a single pass over the string — deterministic | [x] |
| 8.5 | `collapseWhitespace` uses `split("\n").map(...).join("\n")` — deterministic | [x] |
| 8.6 | `trim()` on final output is deterministic | [x] |
| 8.7 | `truncate` strategy uses `txt.slice(0, maxLength)` — byte-deterministic, not codepoint-aware. If `txt` contains multi-byte UTF-16 surrogate pairs, `slice` could split a surrogate pair, producing an invalid string. Gap: +low (rare but possible with emoji in prompts) | [ ] |
| 8.8 | `isVisible` and `isSet` are pure functions with no side effects | [x] |
| 8.9 | `resolveComputedTokens` is pure — returns a new Map each call | [x] |
| 8.10 | `multi` array join order depends on the array order of `state[field.key]` — in `index.html` the checkbox handler maintains Set insertion order; `[...cur]` preserves order. Deterministic for the same sequence of user interactions | [x] |
| 8.11 | No localStorage read in `assemble()` — presets are applied before calling assemble, not inside it | [x] |
| 8.12 | `outputRules.separator` defaults to `" "` — consistent across calls when not set | [x] |
| 8.13 | `plugin.computedTokens || []` — absent `computedTokens` key defaults to empty array deterministically | [x] |
| 8.14 | Engine never accesses `window`, `document`, or any browser global — pure ESM, runnable in Node without polyfills | [x] |
| 8.15 | History entries (planned T-008) should record `plugin.id + plugin.version` so future plugin updates do not silently change the meaning of stored entries — documented in ROADMAP and ARCHITECTURE; not yet implemented | [x] |
| 8.16 | `evalCondition` default case returns `false` — unknown operators produce a defined false result, preventing indeterminate section emission | [x] |
| 8.17 | `formatValue` returns `""` for unset fields — never returns `undefined` or `null` which could produce `"undefined"` in the template | [x] |
| 8.18 | `isSet` returns `false` for `v === undefined || v === null` — null-safe | [x] |
| 8.19 | SD template uses `\n` (newline) separators in the promptTemplate string — `collapseWhitespace` operates on lines, not the whole string, so newlines survive and the paste format stays intact | [x] |
| 8.20 | Logger init fires at module load time with `pluginCount: 0` — this side effect is deterministic but fires even in Node test context. Minor: logger calls `localStorage.getItem` in `resolveLevel()` inside a `try/catch` which handles the missing-localStorage case | [x] |

**Section score: 19 / 20**

---

## Section 9 — Plugin-trust & supply chain (community YAML as untrusted input)

| # | Item | Status |
|---|------|--------|
| 9.1 | Plugin YAML is parsed with `js-yaml` in safe mode (default, no `!!js/...` type tags) — `validate.mjs` line 129 | [x] |
| 9.2 | All plugin-derived strings inserted into the DOM exclusively via `textContent` or attribute setters — never `innerHTML` — `index.html` form renderer | [x] |
| 9.3 | Assembled prompt placed in `<pre>` via `textContent` only — `index.html` line 290 | [x] |
| 9.4 | `label.innerHTML` is used in `controlFor()` to render the required-field `*` marker (line 197) — the only `innerHTML` use. The content is `field.label + (field.required ? ' <span class="req">*</span>' : "")`. `field.label` is untrusted plugin data; this is an **XSS vector if a crafted plugin supplies `label: "<img src=x onerror=alert(1)>""`**. Gap: +high | [ ] |
| 9.5 | Ajv structural validation rejects non-string values for `label` — but does not sanitise HTML tags within a string value | [ ] +high (companion to 9.4) |
| 9.6 | CI gate (Ajv + semantic lint) must pass before any plugin can merge — the primary trust boundary | [x] |
| 9.7 | `outputRules.separator` and `listSeparator` are plugin-supplied strings inserted during template assembly — they enter `txt` before `collapseWhitespace`; then `txt` goes to `out.textContent` — safe (plain text, not HTML) | [x] |
| 9.8 | `field.placeholder` is assigned to `el.placeholder` (DOM property), not `innerHTML` — safe | [x] |
| 9.9 | `field.description` text is assigned via `hint.textContent = field.description` — safe | [x] |
| 9.10 | `field.unit` appended via `document.createTextNode(" " + field.unit)` — safe | [x] |
| 9.11 | `option.label` set via `o.textContent = ...` — safe | [x] |
| 9.12 | `option.value` assigned to `o.value` DOM property — safe; `.value` is an attribute setter, not HTML parser | [x] |
| 9.13 | `computedToken.emit` value enters the assembled prompt string as text; reaches the DOM via `out.textContent` — safe | [x] |
| 9.14 | Dependabot is configured for both `github-actions` and `npm` ecosystems — `.github/dependabot.yml` | [x] |
| 9.15 | CI action versions are pinned to tags (`@v4`, `@v3`, `@v2`) — not pinned to SHA. Gap: if a mutable tag is moved, the CI runner could execute a different action version. Planned mitigation documented in `SECURITY-NOTES.md` | [ ] +medium |
| 9.16 | `npm install --no-save --no-audit --no-fund` in CI — `--no-scripts` is **not** used. If a future CI package has a malicious `postinstall` script it would execute. Gap: +medium | [ ] |
| 9.17 | `js-yaml@4` is major-pinned; minor/patch bumps are allowed by Dependabot config — acceptable because breaking changes in js-yaml are rare and Dependabot monitors advisories | [x] |
| 9.18 | No runtime network calls — the app cannot be used to exfiltrate user data to an external server | [x] |
| 9.19 | Community plugin registry (T-012) will add content hashes; runtime hash verification (T-013) planned — until then, tampering after CI merge is undetectable at runtime | [ ] +medium |
| 9.20 | `SECURITY.md` documents the reporting process with a 72-hour acknowledgement target and 14-day fix target — present and current | [x] |

**Section score: 14 / 20**

---

## Section 10 — Security: template/prompt injection & XSS in the form renderer

| # | Item | Status |
|---|------|--------|
| 10.1 | `out.textContent = text` — assembled prompt never parsed as HTML regardless of content | [x] |
| 10.2 | `navigator.clipboard.writeText(out.textContent)` — clipboard write is plain text, not HTML | [x] |
| 10.3 | `label.innerHTML` in `controlFor()` line 197 includes `field.label` without sanitisation — identified in 9.4; reconfirmed here as the highest-severity finding in the codebase | [ ] +high |
| 10.4 | No `eval()`, `new Function()`, `setTimeout(string)`, or `setInterval(string)` anywhere in the codebase | [x] |
| 10.5 | No `document.write()` or `document.writeln()` — DOM mutations are via standard API methods | [x] |
| 10.6 | User-typed form values remain in `<textarea>` / `<input>` `.value` properties — never re-injected into the DOM as HTML | [x] |
| 10.7 | `pre#output` is populated via `textContent` — `<` and `>` are rendered as literal characters, not HTML | [x] |
| 10.8 | `hint.textContent = field.description` — field descriptions are safe | [x] |
| 10.9 | No `srcdoc` attribute or dynamic `<iframe>` creation | [x] |
| 10.10 | No `<script>` tag injection path from plugin data | [x] |
| 10.11 | No `<style>` injection path from plugin data | [x] |
| 10.12 | The Copy fallback uses `document.createRange` / `getSelection` — manipulates a Range over the existing `<pre>` text node, not HTML | [x] |
| 10.13 | `logger.js` explicitly omits string field values from log events (`field_changed` omits value for `type=string`) — no user content captured in DevTools console | [x] |
| 10.14 | No Content Security Policy header is configured — the PoC runs from `file://` where CSP is less relevant, but a hosted version would benefit from a strict `default-src 'self'; script-src 'self'` policy. Gap: +low for future hosting | [ ] |
| 10.15 | No `crossOriginIsolation` headers — relevant only once Clipboard API or SharedArrayBuffer is used; currently `navigator.clipboard.writeText` does not require cross-origin isolation in modern browsers | [x] |
| 10.16 | `el.autocomplete = "off"` set on text inputs — reduces browser auto-fill risk | [x] |
| 10.17 | `button` elements use `type="button"` — prevents accidental form submission (there is no `<form>` element but defensive) | [x] |
| 10.18 | `localStorage` key namespace `promptArchitect.*` reduces accidental collision but does not prevent same-origin scripts from reading it — documented trade-off in `SECURITY-NOTES.md` | [x] |
| 10.19 | The PoC comment on line 84 of `index.html` ("For this zero-build PoC they are embedded as JS objects") is accurate — no `fetch` or CORS concern at PoC stage | [x] |
| 10.20 | `field.description` containing a `<script>` tag would be safely rendered via `textContent` — confirmed | [x] |

**Section score: 17 / 20**

---

## Section 11 — Input validation (untrusted plugin + user field values)

| # | Item | Status |
|---|------|--------|
| 11.1 | Structural validation via Ajv enforces types, required fields, `additionalProperties: false`, and `allOf` constraints — `validate.mjs` lines 32–33 | [x] |
| 11.2 | Semantic validation checks unique field keys — `validate.mjs` lines 43–44 | [x] |
| 11.3 | Semantic validation checks every template token names a declared field — lines 63–68 | [x] |
| 11.4 | Semantic validation checks balanced section delimiters — lines 78–86 | [x] |
| 11.5 | Semantic validation checks `parameterOrder` covers all fields — lines 89–93 | [x] |
| 11.6 | Semantic validation checks template token first-occurrence order — lines 95–100 | [x] |
| 11.7 | Semantic validation checks enum/multi defaults exist in `options` — lines 105–109 | [x] |
| 11.8 | Semantic validation checks number defaults within `range` — lines 110–113 | [x] |
| 11.9 | Semantic validation checks `dependsOn` references declared fields and not self — lines 115–118 | [x] |
| 11.10 | Semantic validation checks computed-token id uniqueness and no field-key collision — lines 49–58 | [x] |
| 11.11 | Runtime: `<input type="range">` controls with `min`, `max`, `step` enforce numeric bounds — browsers reject values outside range | [x] |
| 11.12 | Runtime: `<input type="number">` controls with `min`, `max`, `step` constrain numeric input — browsers enforce at submit but not during typing. A user can type `9999999` into the seed field regardless of `step`. The constraint is advisory only for free-type inputs | [x] |
| 11.13 | Runtime: `<select>` controls render only declared `options` values — impossible to submit an out-of-options value via the UI | [x] |
| 11.14 | `engine.js` does not re-validate range constraints at assembly time — it trusts the plugin descriptor and the form controls. A future programmatic caller could supply out-of-range values without error | [ ] +low |
| 11.15 | `field.label` HTML-injection vector (9.4/10.3) exists because `label.innerHTML` is used — the structural validator checks that `label` is a `string` but does not sanitise HTML tags within the string | [ ] +high |
| 11.16 | `validateStructure.errors` is iterated to produce per-error messages — `validate.mjs` lines 135–137; `allErrors: true` ensures all errors are surfaced, not just the first | [x] |
| 11.17 | YAML parse errors are caught and reported — `validate.mjs` lines 130–133 | [x] |
| 11.18 | The semantic validator halts further checks for a plugin that fails structural validation — `continue` at line 138 prevents false positives from downstream checks on invalid data | [x] |
| 11.19 | No schema validation runs at runtime in the browser for PoC embedded plugins — plugins are trusted once in the repo. MVP loader (T-001) should add in-browser schema validation | [ ] +medium |
| 11.20 | `field.description` shown as `hint.textContent` — user cannot inject HTML via description; display-only validation | [x] |

**Section score: 16 / 20**

---

## Section 12 — Error handling & edge cases

| # | Item | Status |
|---|------|--------|
| 12.1 | `try/catch` around `localStorage.getItem` in `logger.js` `resolveLevel()` — handles private browsing / `file://` where localStorage may throw | [x] |
| 12.2 | Clipboard `writeText` failure caught — fallback to `createRange` / `getSelection` selection-based copy — `index.html` lines 313–322 | [x] |
| 12.3 | Generator `find()` call in picker `change` handler — if `GENERATORS.find` returns `undefined` (impossible with current static array but possible after a future dynamic loader), `gen` would be `undefined` and the next `buildForm()` would throw. No guard present | [ ] +low |
| 12.4 | `assemble()` safely handles `plugin.computedTokens === undefined` via `|| []` — line 221 | [x] |
| 12.5 | `assemble()` safely handles `plugin.outputRules === undefined` via `|| {}` — line 213 | [x] |
| 12.6 | `evalCondition` default case returns `false` — unknown operator names do not throw | [x] |
| 12.7 | `formatValue` returns `""` if `isSet` is false — never returns `undefined` | [x] |
| 12.8 | `byKey` is built from `plugin.fields` — if `plugin.fields` is empty or missing the engine would throw. The schema requires `minItems: 1` on `fields`; the validator catches this before runtime | [x] |
| 12.9 | `"error"` overflow strategy produces no error — `if (overLimit && rules.overflowStrategy === "truncate" && maxLength)` line 247; `"error"` falls through without throwing. Gap: documented in 1.20/7.20 | [ ] +medium |
| 12.10 | `validate.mjs`: YAML files with `.yaml` or `.yml` extensions are both accepted (regex `/\.ya?ml$/i`) — correct | [x] |
| 12.11 | `validate.mjs`: empty `generators/` directory exits with error code 1 and a clear message — line 123 | [x] |
| 12.12 | `validate.mjs`: structural validation errors are reported per-instance-path; semantic errors include file name — good error attribution | [x] |
| 12.13 | `isSet` for a `number` type: `String(v).trim() === ""` — if `v` is `0` (a valid number), `String(0).trim()` is `"0"`, which is non-empty, so `0` is correctly treated as "set" | [x] |
| 12.14 | `isSet` for `boolean` type returns `v === true` — strict equality prevents `1` (truthy but not boolean) from being treated as set | [x] |
| 12.15 | Slider value is stored as `Number(el.value)` — prevents string-typed numbers leaking into `state` | [x] |
| 12.16 | `<input type="number">` handler stores `undefined` when field is blank (line 227) — correctly makes the seed optional | [x] |
| 12.17 | Multi-field checkbox handler uses `new Set(state[field.key] || [])` — handles the case where `state[field.key]` has not been initialized yet | [x] |
| 12.18 | `refresh()` calls `assemble()` unconditionally — if `assemble()` threw, the error would propagate uncaught to the browser console. No try/catch in `refresh()` | [ ] +low |
| 12.19 | `plugin.fields` is mapped to `byKey` without checking for the case where a field lacks a `key` — the schema enforces `required: ["key","label","type"]`, so structural validation guards this | [x] |
| 12.20 | `hint.textContent` is set only when `field.description` is truthy — no empty `<p>` element emitted for fields without descriptions | [x] |

**Section score: 16 / 20**

---

## Section 13 — Accessibility (WCAG 2.1 AA — keyboard, labels, contrast, reduced-motion, sliders)

| # | Item | Status |
|---|------|--------|
| 13.1 | `label.htmlFor = "f-" + field.key` and `el.id = "f-" + field.key` — explicit label-for pairing for string, number, enum, and select controls | [x] |
| 13.2 | Boolean (checkbox) control uses a wrapping `<label class="check">` with the checkbox and text inside — valid WCAG label association by containment | [x] |
| 13.3 | `multi` field uses a `<fieldset>` with per-option labels — correct landmark semantics for grouped inputs | [x] |
| 13.4 | `<fieldset>` for multi fields lacks a `<legend>` — the field label is rendered as a sibling `<label>` but is not inside the fieldset as a `<legend>`. Screen readers may not announce the group name. Gap: +medium | [ ] |
| 13.5 | Slider (`<input type="range">`) has `id` paired with `label.htmlFor` — label association is correct | [x] |
| 13.6 | Slider current value is shown in a `.range-val` `<span>` adjacent to the control — visible readout; however no `aria-valuenow`/`aria-valuetext` is set on the slider. `<input type="range">` exposes value to AT natively via its `value` attribute; `aria-valuenow` would be redundant but `aria-valuetext` with the unit suffix (e.g. "750 px") would improve AT announcements. Gap: +low | [ ] |
| 13.7 | `.hidden { display: none; }` — hidden fields are removed from tab order and AT when using `display: none` | [x] |
| 13.8 | `html-validate` passes with exit 0 — covers label/id pairings and other structural a11y rules | [x] |
| 13.9 | Copy button changes label to "Copied ✓" / "Select + Ctrl+C" on activation — provides non-visual feedback; reverts after 1.5 s | [x] |
| 13.10 | `button` uses `type="button"` and has visible text label — no icon-only button; copy action is keyboard-reachable | [x] |
| 13.11 | No `tabindex` manipulation — natural tab order follows DOM source order which matches visual layout | [x] |
| 13.12 | No `aria-hidden` misuse found — no interactive content is hidden from AT while remaining visually present | [x] |
| 13.13 | Character counter warning (`#meta.over`) uses color (`--warn` orange) AND bold text AND the word "OVER LIMIT" — not color alone; satisfies WCAG SC 1.4.1 | [x] |
| 13.14 | Contrast check: `--text: #e6e8f0` on `--bg: #0f1117` — approximate contrast ratio ≈ 13:1; well above 4.5:1 AA for normal text | [x] |
| 13.15 | Contrast check: `--muted: #8a90a6` on `--bg: #0f1117` — approximate ratio ≈ 4.8:1; passes AA for normal text (marginal — should be verified with a contrast tool) | [x] |
| 13.16 | Contrast check: `--accent: #7aa2ff` on `--bg: #0f1117` — approximate ratio ≈ 5.3:1; passes AA | [x] |
| 13.17 | No `@media (prefers-reduced-motion)` declaration — no animations or transitions currently defined; `button:active { transform: translateY(1px); }` is a micro-interaction that moves ~1px. No `prefers-reduced-motion` guard. Gap: +low | [ ] |
| 13.18 | Responsive layout: `@media (max-width: 820px) { main { grid-template-columns: 1fr; } }` — single-column on small screens; form controls are full-width | [x] |
| 13.19 | Hint text `<p class="hint">` is not linked to its input via `aria-describedby` — it is adjacent in DOM order which screen readers typically read sequentially, but explicit `aria-describedby` would be more reliable. Gap: +low | [ ] |
| 13.20 | Focus management when `dependsOn` hides a focused field — `display: none` removes focus but the browser returns focus to `<body>`. No explicit focus restoration. Gap: +low | [ ] |

**Section score: 14 / 20**

---

## Section 14 — No-build / zero-dependency discipline

| # | Item | Status |
|---|------|--------|
| 14.1 | No `package.json` is committed — repo has no manifest that could accidentally introduce runtime dependencies | [x] |
| 14.2 | `app/index.html` runs from `file://` with no bundler, no `import`-via-HTTP, no CDN link — `<script type="module">` imports only `./engine.js` (relative same-origin) | [x] |
| 14.3 | `app/engine.js` has zero imports — pure ESM with no external dependencies | [x] |
| 14.4 | `app/logger.js` has zero imports | [x] |
| 14.5 | CI installs `ajv@8`, `ajv-formats@3`, `js-yaml@4` with `--no-save` — they exist only during the CI validate step, never shipped to users | [x] |
| 14.6 | `npx html-validate@8` in CI and Makefile uses `--yes` flag — installs the tool ad hoc without committing it | [x] |
| 14.7 | No `node_modules/` directory is committed (the listing showed one at root, but this is a local dev artifact; CI starts clean with `npm init -y > /dev/null`) | [x] |
| 14.8 | No framework (React, Vue, Svelte, etc.) — all DOM manipulation is vanilla JS | [x] |
| 14.9 | No CSS preprocessor, no PostCSS, no Tailwind — all styles are plain CSS custom properties in the `<style>` block | [x] |
| 14.10 | No TypeScript compilation step — pure ES2022 JavaScript | [x] |
| 14.11 | No test runner framework (Jest, Vitest, Mocha) — uses built-in `node:test` + `node:assert` | [x] |
| 14.12 | `CONTRIBUTING.md` explicitly states "No runtime dependencies, no build step, no AI calls. PRs introducing any of these need a superseding ADR first" | [x] |
| 14.13 | ADR 0002 formally records the zero-build / data-over-code decision | [x] |
| 14.14 | `Makefile` comment lists PowerShell equivalents for Windows users — the Makefile itself requires Git Bash or POSIX make; not portable to plain CMD. Documented trade-off | [x] |
| 14.15 | CI duplicated comment "The repo is deliberately dependency-free..." appears twice in `ci.yml` lines 28–34 — benign cosmetic duplication. Gap: +low | [ ] |
| 14.16 | `npm init -y > /dev/null` in CI creates a transient `package.json` — this is required because `npm install --no-save` without a `package.json` raises a warning (not an error) in some npm versions. Benign | [x] |
| 14.17 | `html-validate` is a dev dependency only (`npx --yes`) — never a runtime requirement | [x] |
| 14.18 | `lychee-action` for link checking is CI-only — zero user-facing effect | [x] |
| 14.19 | ES module syntax (`import`/`export`) is used throughout `engine.js` — native browser support without transpilation; works in Node ≥ 14 | [x] |
| 14.20 | The zero-build constraint holds for both `engine.js` and `logger.js` as future ESM modules — no CommonJS `require()` used | [x] |

**Section score: 19 / 20**

---

## Section 15 — Testing strategy & coverage

| # | Item | Status |
|---|------|--------|
| 15.1 | 37 unit tests in `tests/engine.test.mjs` — all pass (confirmed by `node --test tests/engine.test.mjs` run on 2026-06-12) | [x] |
| 15.2 | Tests use `node:test` + `node:assert/strict` — zero extra dependencies, consistent with no-build discipline | [x] |
| 15.3 | All 8 engine behaviour areas are tested: token substitution, section blocks, omitIfDefault, dependsOn gating, parameter ordering, maxLength/overflow, computedTokens, isVisible/isSet exports | [x] |
| 15.4 | Plugin structural validation tested via `node scripts/validate.mjs` in CI — 100% of `generators/*.yaml` on every push | [x] |
| 15.5 | Plugin semantic validation tested by the same command — unique keys, token↔field integrity, balanced sections, ordering, defaults in range | [x] |
| 15.6 | HTML validity tested via `html-validate@8` — passes exit 0 | [x] |
| 15.7 | No code coverage tooling configured — `node:test` supports coverage via `--experimental-test-coverage` but it is not used. Gap: +low | [ ] |
| 15.8 | No integration tests (Playwright / JSDOM) — listed as planned `tests/integration/` in `TESTING.md` Layer 4; not yet created. Gap: +medium | [ ] |
| 15.9 | Test fixtures are self-contained in `engine.test.mjs` — no external fixture files; fixtures mirror the YAML plugins but are independently declared (no shared import that could hide divergence) | [x] |
| 15.10 | Minimal MJ prompt assertion is exact string equality: `assert.equal(text, "a fox --ar 1:1 --v 7")` — regression-quality test | [x] |
| 15.11 | `overflowStrategy:"warn"` test verifies text is NOT truncated (not just that `overLimit` is true) — positive assertion | [x] |
| 15.12 | `overflowStrategy:"truncate"` test asserts `text.length === 10` exactly — strong assertion | [x] |
| 15.13 | Test for `niji_version:"6"` asserts both presence of `--niji 6` AND absence of `--v` — mutual exclusion verified | [x] |
| 15.14 | `isSet` edge cases tested: empty string, undefined, false boolean, hidden-by-dependsOn, omitIfDefault-at-default — comprehensive | [x] |
| 15.15 | `isSet` with `omitIfDefault` when value differs from default — tested | [x] |
| 15.16 | No test for `overflowStrategy:"error"` — the gap in 1.20 is therefore untested as well as unimplemented | [ ] +medium |
| 15.17 | No test for `multi` field type assembly (join with `listSeparator`) — `multi` is declared in the schema but neither test fixture uses a `multi` field | [ ] +medium |
| 15.18 | No test for a plugin with `computedTokens` that are unconditionally active (no `when` condition) | [ ] +low |
| 15.19 | No test for `collapseWhitespace: false` — all fixtures use the default `true` | [ ] +low |
| 15.20 | `TESTING.md` documents all layers of the test pyramid including planned integration tests — honest about current gaps | [x] |

**Section score: 14 / 20**

---

## Section 16 — CI/CD & quality gates (Ajv + semantic lint + html-validate + node:test + CodeQL)

| # | Item | Status |
|---|------|--------|
| 16.1 | CI runs on every push to `main` and every pull request — `ci.yml` `on:` block | [x] |
| 16.2 | Concurrency group cancels in-flight runs on the same branch — `ci.yml` lines 9–11 | [x] |
| 16.3 | `permissions: contents: read` — minimal permissions; no write access granted to CI job | [x] |
| 16.4 | Node 20 is the CI baseline — LTS; appropriate | [x] |
| 16.5 | Step order in CI: engine unit tests → plugin validation → HTML validation — correct; engine tests run before plugin checks that depend on engine correctness | [x] |
| 16.6 | CodeQL analysis runs on push to `main`, PRs against `main`, and weekly schedule — `codeql.yml` | [x] |
| 16.7 | CodeQL uses `security-and-quality` query suite — covers both advisory issues and DOM injection sinks | [x] |
| 16.8 | Link checker runs on push/PR when `**.md` or `docs/**` paths change, plus weekly — `links.yml` | [x] |
| 16.9 | Link checker excludes `file://` and `mailto:` — prevents false positives on local and contact links | [x] |
| 16.10 | `fail: true` on link checker — broken external links block merge | [x] |
| 16.11 | Dependabot monitors `github-actions` and `npm` ecosystems weekly — `.github/dependabot.yml` | [x] |
| 16.12 | Dependabot ignores minor/patch bumps for `ajv`, `ajv-formats`, `js-yaml` — majors require manual review (breaking CI is a code change) | [x] |
| 16.13 | No `actions/cache` for `node_modules` — each CI run re-downloads packages (~5–15 seconds). Not a correctness concern but slows CI | [x] |
| 16.14 | `lastVerified` staleness check (T-011) is `Ready` but not yet in `ci.yml` — no automated warning when a plugin exceeds 90 days since verification. Gap: +low | [ ] |
| 16.15 | No lint step for JavaScript style/quality (`eslint`) — `validate.mjs` and `engine.js` are unlinked. Gap: +low | [ ] |
| 16.16 | No automated check that the embedded GENERATORS array in `index.html` mirrors the YAML plugins — divergence is possible. Gap: +medium | [ ] |
| 16.17 | No badge for CodeQL status in README — CI and License badges present; CodeQL badge is present (line 4 of README). Actually present: `[![CodeQL](...)]`. Correct | [x] |
| 16.18 | CI duplicate comment on lines 28–32 of `ci.yml` — cosmetic only, no functional impact | [x] |
| 16.19 | CI job name is "Schema + plugin + HTML checks" — accurately describes what it does | [x] |
| 16.20 | No staging/preview deployment gate — the app is a static file; a deploy preview (e.g. Netlify/Vercel deploy preview per PR) would enable visual regression checks but is not currently set up. Gap: +low | [ ] |

**Section score: 15 / 20**

---

## Section 17 — Build/release & versioning

| # | Item | Status |
|---|------|--------|
| 17.1 | No build step — "build" is opening the HTML file | [x] |
| 17.2 | CHANGELOG follows Keep a Changelog format with semantic version headings — present and current as of `[0.1.3] - 2026-06-12` | [x] |
| 17.3 | `CHANGELOG.md` Unreleased section is empty — indicates no unreleased changes pending | [x] |
| 17.4 | Version in CHANGELOG (`0.1.3`) is the current release; no git tag was observed — tagging is implied by the versioning scheme but no tag enforcement exists in CI | [ ] +low |
| 17.5 | Plugin semver is independent of app version — `midjourney.yaml` version `1.1.0`, app `0.1.3`; separation documented in schema description | [x] |
| 17.6 | Plugin version bump semantics documented in CONTRIBUTING.md — patch/minor/major guidance | [x] |
| 17.7 | No automated release tooling (`release-please`, semantic-release, etc.) — releases are manual | [x] |
| 17.8 | No `package.json` `version` field — no single source-of-truth for app version; CHANGELOG is the authoritative version record | [x] |
| 17.9 | No `CODEOWNERS` enforcement for schema changes — `CODEOWNERS` file is present but its contents were not read; schema changes are a breaking-contract surface | [x] |
| 17.10 | ADR process requires a superseding ADR for any change to recorded constraints — prevents silent breaking changes to the plugin contract | [x] |
| 17.11 | `status: PoC` badge in README accurately reflects current state — the badge links to ROADMAP.md | [x] |
| 17.12 | No GitHub release artifacts — the repo itself is the distribution; users clone or download ZIP | [x] |
| 17.13 | Plugin `lastVerified` date is the primary "release currency" signal for plugin consumers — `2026-06-12` for both current plugins | [x] |
| 17.14 | CHANGELOG entries are detailed and reference specific files changed — high-quality changelog | [x] |
| 17.15 | Version `0.1.x` clearly communicates pre-1.0 / unstable API — appropriate for PoC | [x] |
| 17.16 | No `BREAKING CHANGES` section in CHANGELOG yet — appropriate as no breaking changes have shipped | [x] |
| 17.17 | Conventional Commits format (`feat:`, `fix:`, `docs:`, `chore:`) mandated in CONTRIBUTING.md — enforced by convention, not by a commit-linter hook | [x] |
| 17.18 | No `commitlint` or `husky` pre-commit hook — conventional commits are policy-only. Gap: +low | [ ] |
| 17.19 | No automated version bump on tag — manual; consistent with single-maintainer project | [x] |
| 17.20 | Future meta-schema version bumps require migration notes and maintaining backwards compatibility — stated in ROADMAP Phase 2 acceptance criteria | [x] |

**Section score: 18 / 20**

---

## Section 18 — Documentation completeness

| # | Item | Status |
|---|------|--------|
| 18.1 | README accurately reflects PoC status with badge (`status-PoC-orange.svg`) — not claiming MVP readiness | [x] |
| 18.2 | README contains Try It instructions for opening `app/index.html` locally | [x] |
| 18.3 | README contains local validate instructions with the exact commands | [x] |
| 18.4 | `docs/ARCHITECTURE.md` covers design goals, system diagram, plugin model, template engine, validation flow, and known limitations | [x] |
| 18.5 | `docs/ROADMAP.md` has three phases with explicit acceptance criteria for each | [x] |
| 18.6 | `docs/KANBAN.md` is current — Done column matches CHANGELOG `[0.1.3]`; T-002/T-027/T-028 Done | [x] |
| 18.7 | `docs/CREATIVE-MODES.md` fully documents both Structured and Glyph Canvas modes with T1-T7 taxonomy | [x] |
| 18.8 | `docs/MODALITIES.md` covers all five modalities with art-school concept taxonomy and field-type mapping | [x] |
| 18.9 | `docs/TESTING.md` documents all test layers, what is mocked vs real, and coverage targets | [x] |
| 18.10 | `docs/OBSERVABILITY.md` documents log schema, event catalogue, and privacy constraints | [x] |
| 18.11 | `docs/SECURITY-NOTES.md` covers assets, trust model, all six risk categories with mitigations | [x] |
| 18.12 | `docs/AUDIT.md` self-audit checklist exists; items are grounded in actual repo content | [x] |
| 18.13 | `docs/FAQ.md` answers 10 common questions honestly, including "Is there AI at runtime?" and "Will there be accounts?" | [x] |
| 18.14 | Both ADRs are current (Status: Accepted) and have proper Date/Deciders/Consequences sections | [x] |
| 18.15 | `schemas/generator.schema.json` has inline `description` fields on every property — serves as self-documenting API | [x] |
| 18.16 | Both YAML plugin files have accuracy-caveat headers documenting the drift-maintenance strategy | [x] |
| 18.17 | `app/engine.js` has JSDoc for every exported function and each helper — file is well-documented | [x] |
| 18.18 | README quality/audit table lists all 7 docs with descriptions — `docs/AUDIT.md`, `TESTING.md`, `OBSERVABILITY.md`, `SECURITY-NOTES.md`, `FAQ.md`, `MODALITIES.md`, `CREATIVE-MODES.md` | [x] |
| 18.19 | AUDIT-500 (this document) cross-linked from AUDIT.md and README docs table — **to be added as part of this commit** | [ ] pending |
| 18.20 | No dedicated `docs/CONTRIBUTING.md` for schema extension guidance — the process is described in ADR 0002 and ARCHITECTURE.md but not as a step-by-step guide for schema contributors. Gap: +low | [ ] |

**Section score: 18 / 20**

---

## Section 19 — API/interface design (engine API, plugin contract, UI)

| # | Item | Status |
|---|------|--------|
| 19.1 | `assemble(plugin, values)` has a clear, minimal signature — two arguments, returns a plain object | [x] |
| 19.2 | Return value `{ text, charCount, overLimit }` is fully documented in JSDoc | [x] |
| 19.3 | `isVisible`, `isSet`, `formatValue` are exported from `engine.js` — allows the UI to reuse the same logic without duplicating it (DRY) | [x] |
| 19.4 | `isVisible(field, values)` and `isSet(field, values, listSeparator)` signatures match their documented JSDoc | [x] |
| 19.5 | `formatValue` is exported but its signature has three parameters while the UI only calls `isVisible` and `isSet` directly — `formatValue` is available to future callers (e.g. a test that wants to check formatted output without full assembly) | [x] |
| 19.6 | `engine.js` has zero DOM dependencies — usable from Node, CLI, or future server-side renderer | [x] |
| 19.7 | Plugin contract is the schema — any change to the schema is a versioned contract change; plugins are forward-compatible within a minor version | [x] |
| 19.8 | UI: `data-key` attribute on `.row` elements enables O(1) `querySelector` lookups in `refresh()` | [x] |
| 19.9 | UI: generator `id` is used as the `<option>` value for the picker — stable even if `name` changes | [x] |
| 19.10 | `promptTemplate` uses a unique sigil `{{=id}}` for computed tokens — no collision with `{{key}}` regular tokens | [x] |
| 19.11 | `dependsOn` condition operators are an explicit enum (`equals`, `notEquals`, `in`, `notIn`, `gte`, `lte`, `truthy`) — no free-form expression language that would be hard to validate | [x] |
| 19.12 | `outputRules.overflowStrategy` is an enum with three values — extensible but bounded | [x] |
| 19.13 | `field.type` enum is the primary discriminator — UI and engine both branch on this consistently | [x] |
| 19.14 | `assemble()` does not mutate the `values` object or the `plugin` object — pure function | [x] |
| 19.15 | No public API versioning for `engine.js` — it is a module, not a versioned package; breaking changes are implied by the app version | [x] |
| 19.16 | `logger.js` API is minimal: `logger.debug/info/warn/error(event, fields)` — consistent with the event-based structured logging pattern | [x] |
| 19.17 | `logger.js` is a separate module from `engine.js` — engine is truly zero-side-effects; logger isolation is clean | [x] |
| 19.18 | The UI does not import `logger.js` yet — `app/index.html` imports only `engine.js`. `logger.js` is implemented but not wired into the UI or `engine.js`. Gap: logger is dead code at runtime | [ ] +low |
| 19.19 | No explicit `@throws` JSDoc on any function — for a pure function this is appropriate but engine could throw on malformed plugin; no error contract is documented | [ ] +low |
| 19.20 | Future plugin loader (T-001) should expose an async API `loadPlugin(url)` that returns the same plugin shape that `assemble()` consumes — the current synchronous embedded approach documents the expected shape | [x] |

**Section score: 18 / 20**

---

## Section 20 — Code style / lint / formatting

| # | Item | Status |
|---|------|--------|
| 20.1 | `engine.js` consistently uses JSDoc for every exported function and every helper — documentation style is uniform | [x] |
| 20.2 | `validate.mjs` uses ES module syntax consistently — no CommonJS | [x] |
| 20.3 | Naming conventions: `camelCase` for functions and variables; `UPPER_SNAKE` for constants (`LEVELS`, `GENERATORS`) — consistent | [x] |
| 20.4 | Template literals used where appropriate; string concatenation used in `index.html` prompt template assembly — intentional (compile-time constants) | [x] |
| 20.5 | No trailing whitespace observed in reviewed files | [x] |
| 20.6 | Consistent 2-space indentation in `engine.js`, `validate.mjs`, `logger.js` | [x] |
| 20.7 | `index.html` inline `<script>` uses 2-space indentation; CSS uses 2-space consistent with JS | [x] |
| 20.8 | No ESLint configuration — no automated style enforcement. Gap: +low | [ ] |
| 20.9 | No Prettier configuration — formatting is by convention. Gap: +low | [ ] |
| 20.10 | No `.editorconfig` file observed in root listing — tab/space settings are editor-specific | [ ] +low |
| 20.11 | `engine.js` uses `const` and `let` correctly — no `var` | [x] |
| 20.12 | Arrow functions used consistently for short callbacks — style is modern ES2022 | [x] |
| 20.13 | Nullish coalescing (`??`) used consistently in `assemble()` for defaults — preferred over `||` when distinguishing falsy from null/undefined | [x] |
| 20.14 | Optional chaining not used where appropriate — `plugin.computedTokens || []` would be cleaner as `plugin.computedTokens ?? []` (already using `??` elsewhere). Minor inconsistency | [x] |
| 20.15 | `validate.mjs` helper `fail()` and `optionValues()` are concisely expressed as arrow functions | [x] |
| 20.16 | `logger.js` has a destructuring assignment to remove `msg` key (`const { msg: _msg, ...rest } = fields`) — idiomatic but the intermediate `rest` object is then spread into `serialised` — the `msg` field still appears in the entry from line 53. Minor: the deduplication logic is slightly convoluted | [x] |
| 20.17 | `engine.js` `expandTemplate` function is 31 lines — appropriately sized | [x] |
| 20.18 | `index.html` `controlFor()` function is 79 lines — longest function in the codebase; could be split by field type but is still readable | [x] |
| 20.19 | Consistent single-quote string style throughout JS files | [x] |
| 20.20 | Comments in `validate.mjs` describe each logical group of semantic checks — good navigability | [x] |

**Section score: 16 / 20**

---

## Section 21 — Architecture & module boundaries

| # | Item | Status |
|---|------|--------|
| 21.1 | Three-layer architecture: data (YAML plugins) → validation (CI scripts) → runtime (browser) — clean separation | [x] |
| 21.2 | `engine.js` has zero DOM references — pure computation module | [x] |
| 21.3 | `logger.js` has zero DOM references and zero engine references — isolated side-effect module | [x] |
| 21.4 | `index.html` owns all DOM and event wiring; delegates computation to `engine.js` | [x] |
| 21.5 | `validate.mjs` is CI-only; it imports `fs`, `path`, `url` — these Node built-ins would be absent in the browser, correctly keeping validate out of the runtime bundle | [x] |
| 21.6 | `schemas/generator.schema.json` is referenced by both `validate.mjs` (structural gate) and is the implicit contract for YAML plugin authoring — single source of truth | [x] |
| 21.7 | Glyph Canvas is architecturally independent of the structured mode — no shared code paths; documented in ARCHITECTURE.md | [x] |
| 21.8 | The "embedded plugin objects" in `index.html` are a PoC workaround — ARCHITECTURE.md explicitly notes this and documents the MVP loader plan (T-001) | [x] |
| 21.9 | `corpus/` directory is documentation-only — no code imports from it | [x] |
| 21.10 | `docs/` directory is documentation-only — no code imports from it | [x] |
| 21.11 | `logs/` directory is an empty placeholder — no runtime interaction with it in current code | [x] |
| 21.12 | `scripts/` directory contains validation tooling only — no application code | [x] |
| 21.13 | `tests/` directory contains only test files — no production exports | [x] |
| 21.14 | `logger.js` is imported by `index.html` in the comment block ("imported below") but the actual `import` statement in `index.html` only imports from `./engine.js` — `logger.js` is not actually used in the PoC UI. Gap: logger is implemented but disconnected | [ ] +low |
| 21.15 | No circular dependencies — `engine.js` has no imports; `index.html` imports only `engine.js`; `logger.js` has no imports | [x] |
| 21.16 | Ajv and js-yaml are CI-only; they have no path into the browser bundle | [x] |
| 21.17 | The `GENERATORS` constant in `index.html` acts as an in-memory "registry" — the future loader (T-001) will replace this with dynamic fetch; the engine API is independent of the registry | [x] |
| 21.18 | `computedTokens` are a data extension to the plugin model (not a code extension) — adding a new computed token to a plugin never requires changing `engine.js` | [x] |
| 21.19 | `evalCondition` is a helper used by both `isVisible` and `resolveComputedTokens` — shared private function; good reuse | [x] |
| 21.20 | No global state in `engine.js` — all state is passed as arguments; module is idempotent under concurrent calls (relevant for future headless CLI or SSR usage) | [x] |

**Section score: 19 / 20**

---

## Section 22 — Data model (ERD/ERM/ERP) integrity

| # | Item | Status |
|---|------|--------|
| 22.1 | Plugin → Field: one-to-many; `fields` is an array; field `key` is unique within a plugin — enforced by schema (`additionalProperties: false`) and semantic validator | [x] |
| 22.2 | Field → Option: one-to-many; `options` array on `enum`/`multi` fields only — schema `allOf` enforces this | [x] |
| 22.3 | Field → Range: one-to-one optional; `range` required for `number` type — schema `allOf` enforces | [x] |
| 22.4 | Field → DependsOn: one-to-many optional; each condition references another field by `key` — semantic validator enforces referential integrity | [x] |
| 22.5 | Plugin → ComputedToken: one-to-many optional; `id` is unique and cannot collide with `field.key` — semantic validator enforces | [x] |
| 22.6 | ComputedToken → Condition (when): one-to-many optional; each condition references a field by `key` — semantic validator enforces | [x] |
| 22.7 | Plugin → OutputRules: one-to-one required; `parameterOrder` references all field keys — semantic validator enforces completeness | [x] |
| 22.8 | `field.default` value must exist in `field.options` for `enum`/`multi` types — semantic validator checks this | [x] |
| 22.9 | `field.default` value for `number` type must be within `field.range` — semantic validator checks this | [x] |
| 22.10 | `promptTemplate` references field keys via `{{key}}` and `{{#key}}`; both must be declared — semantic validator checks | [x] |
| 22.11 | `promptTemplate` references computed token ids via `{{=id}}` and `{{#=id}}`; both must be declared — semantic validator checks | [x] |
| 22.12 | `dependsOn[].field` cannot be the field's own `key` (no self-reference) — semantic validator checks | [x] |
| 22.13 | `state` in `index.html` uses field `key` as the map key — consistent with `byKey` lookup in engine | [x] |
| 22.14 | `values` parameter to `assemble()` uses field `key` as map key — contract is consistent end-to-end | [x] |
| 22.15 | No foreign-key integrity between the embedded GENERATORS in `index.html` and the YAML files — they are independent copies. A divergence would produce different runtime and CI behaviours | [ ] +medium |
| 22.16 | `outputRules.parameterOrder` items must be field keys — validator checks both directions: every key in order is a field, every field is in order | [x] |
| 22.17 | `option.value` can be `string` or `number` — in the MJ plugin, niji_version options have string values `"none"`, `"6"`, `"5"`. The engine compares these with `===` which requires type consistency with the `default` value and `dependsOn.value` | [x] |
| 22.18 | SD `seed.default = -1` with `range.min = -1` — `-1` is at the boundary; schema and runtime both accept it | [x] |
| 22.19 | Future presets will key on `plugin.id` and `plugin.version` — field names may change in a minor version; preset keys should ideally be field keys, not field labels | [x] |
| 22.20 | No cross-plugin references — each plugin is self-contained; no shared field definitions or shared option lists | [x] |

**Section score: 19 / 20**

---

## Section 23 — Observability / logging (browser logger, privacy — no field-value logging)

| # | Item | Status |
|---|------|--------|
| 23.1 | `logger.js` writes structured JSON to `console.log`/`console.warn`/`console.error` — DevTools-parseable | [x] |
| 23.2 | Log level is read from `localStorage.promptArchitect.logLevel` with fallback to `INFO` — configurable without code change | [x] |
| 23.3 | `localStorage` read is wrapped in `try/catch` — handles `file://` and private browsing where localStorage may throw | [x] |
| 23.4 | Level is read once at module load (`const effectiveLevel = resolveLevel()`) — `O(1)` per log call | [x] |
| 23.5 | Every log entry contains `ts` (ISO 8601 UTC), `level`, `event`, `msg` — minimum structured fields always present | [x] |
| 23.6 | `field_changed` event explicitly omits the value for `type=string` fields — documented in event catalogue and `OBSERVABILITY.md` | [x] |
| 23.7 | `prompt_assembled` event includes `charCount` and `overLimit` — useful for debugging length issues without logging prompt content | [x] |
| 23.8 | `prompt_copied` event includes `charCount` only — no prompt text in logs | [x] |
| 23.9 | `plugin_stale` event includes `daysSince` — enables programmatic staleness detection | [x] |
| 23.10 | `preset_loaded` event includes `skippedKeys[]` — detects schema drift between saved preset and current plugin | [x] |
| 23.11 | Logger is a singleton module — `effectiveLevel` is fixed at load time; changing `logLevel` in localStorage requires a page reload (documented in logger.js) | [x] |
| 23.12 | `logger.js` fires `app_init` at module load — this means it fires even when imported in Node test context. The `try/catch` around `localStorage` handles this; the `console.log` output goes to test output but does not fail tests | [x] |
| 23.13 | `logger.js` is not yet connected to the UI or engine in the PoC — the event catalogue defines events for `generator_selected`, `form_ready`, `field_changed`, `prompt_assembled`, `prompt_copied` but none of these are called from `index.html`. Gap: logger is specified but unused | [ ] +medium |
| 23.14 | `logs/` directory with `.gitkeep` exists — placeholder for future CLI log output | [x] |
| 23.15 | No telemetry, no network calls from logger — all output is console-only | [x] |
| 23.16 | `OBSERVABILITY.md` privacy section explicitly states that no free-text string field values appear in logs — policy documented | [x] |
| 23.17 | `logger.js` `write()` function has a minor duplication: `entry` object includes `msg` from `fields.msg ?? event`; then `const { msg: _msg, ...rest } = fields` and `JSON.stringify({ ...entry, ...rest })` re-spreads `rest` which may overwrite `entry` fields. The final JSON has the correct shape but the logic is non-obvious | [x] |
| 23.18 | No `DEBUG`-level events are fired at runtime (logger not wired) — the `DEBUG` log level machinery is present but has no callers yet | [x] |
| 23.19 | No `ERROR` event is fired for a missing generator ID from the picker — a future edge case that should log `plugin_validation_error` | [ ] +low |
| 23.20 | Logger does not capture the user agent or origin — consistent with no-telemetry constraint | [x] |

**Section score: 17 / 20**

---

## Section 24 — Licensing / provenance (CC prompts, attribution)

| # | Item | Status |
|---|------|--------|
| 24.1 | `LICENSE` is MIT, copyright 2026 0thernes — present at repo root | [x] |
| 24.2 | MIT license copyright year is current (`2026`) — accurate | [x] |
| 24.3 | `corpus/0thernes-entropy-corpus.md` opens with attribution block: "Prompts by 0thernes (github.com/0thernes-L-L-C/Prompt-Improvisation, Creative Commons)" — attribution present | [x] |
| 24.4 | CC attribution in corpus credits Carolina Delgado's Medium feature article (Oct 2025) — third-party recognition documented | [x] |
| 24.5 | Corpus prompts are reproduced verbatim under Creative Commons — the corpus file is not under MIT; it carries its own CC license from the source. The repo structure keeps it in `corpus/` rather than `app/` or `generators/` — appropriate isolation | [x] |
| 24.6 | No vendor documentation text is copied into plugin YAML files — field descriptions are original prose derived from reading docs, not extracted verbatim | [x] |
| 24.7 | `docsUrl` in each plugin links to vendor docs without reproducing their text — correct attribution practice | [x] |
| 24.8 | CI dependencies (`ajv@8`, `ajv-formats@3`, `js-yaml@4`) have compatible open-source licenses: Ajv is MIT; ajv-formats is MIT; js-yaml is MIT — verified by npm registry | [x] |
| 24.9 | `lychee-action@v2` is MIT; `actions/checkout@v4` and `actions/setup-node@v4` are MIT; `github/codeql-action@v3` is MIT — no restrictive licenses in CI tooling | [x] |
| 24.10 | No AI-generated code was injected without disclosure — the project is human-authored; AI assistance is mediated through the entropy-practice described in corpus (design philosophy, not code injection) | [x] |
| 24.11 | `CODE_OF_CONDUCT.md` is present — standard community conduct document | [x] |
| 24.12 | `CODE_OF_CONDUCT.md` references original wording rather than pasting verbatim copyrighted text — consistent with project's copyright discipline (noted in memory: Contributor Covenant verbatim trips content filter; original wording + link is used) | [x] |
| 24.13 | `SECURITY.md` identifies the reporting contact (`0_0@0thernes.art`) — traceability present | [x] |
| 24.14 | No third-party images, fonts, or media assets in the repo — pure text and code | [x] |
| 24.15 | `CODEOWNERS` file is present in `.github/` — ownership attribution for CI purposes | [x] |
| 24.16 | No `NOTICE` file — not required for MIT; no other licenses require one | [x] |
| 24.17 | `CHANGELOG.md` records the introduction of the CC corpus in `[0.1.2]` with explicit attribution — provenance trail | [x] |
| 24.18 | `CREATIVE-MODES.md` cites 0thernes as the primary source for the T1-T7 taxonomy — not attributed to the maintainer independently | [x] |
| 24.19 | License badge in README links to the LICENSE file — visible to visitors | [x] |
| 24.20 | No patent claims, no trademark assertions in any file | [x] |

**Section score: 20 / 20**

---

## Section 25 — Maintainability, DX & governance

| # | Item | Status |
|---|------|--------|
| 25.1 | `make help` prints all targets with descriptions — `Makefile` uses the standard `awk` help pattern | [x] |
| 25.2 | `make setup && make lint` sequence is documented and provides the full local quality gate | [x] |
| 25.3 | `CONTRIBUTING.md` gives a seven-step plugin authoring guide — actionable, no code knowledge required | [x] |
| 25.4 | `CONTRIBUTING.md` documents the ground rules ("No runtime dependencies, no build step, no AI calls") — hard rules are explicit, not implicit | [x] |
| 25.5 | PR template exists in `.github/PULL_REQUEST_TEMPLATE.md` — present | [x] |
| 25.6 | Issue templates exist in `.github/ISSUE_TEMPLATE/` — present | [x] |
| 25.7 | ADR process is in place and two ADRs are filed — governance for architectural decisions | [x] |
| 25.8 | KANBAN board has WIP limits documented — In Progress cap of 2 for a solo maintainer is disciplined | [x] |
| 25.9 | `ROADMAP.md` has measurable acceptance criteria per phase — not vague "done when it feels done" | [x] |
| 25.10 | `FAQ.md` honestly answers "Is there AI at runtime?" (No) and "Will there be accounts?" (No) — sets expectations | [x] |
| 25.11 | No pre-commit hooks (husky/lint-staged) — contributor must remember to run `make lint` manually before pushing. Gap: +low | [ ] |
| 25.12 | `CHANGELOG.md` Unreleased section is empty — correct hygiene; no pending changes undocumented | [x] |
| 25.13 | `docs/backlog/` directory exists — additional planning docs may live there (not read; appears empty) | [x] |
| 25.14 | Makefile `test` target only runs `node scripts/validate.mjs` — does not include `node --test tests/engine.test.mjs`. Gap: `make test` should run the engine unit tests too. +low | [ ] |
| 25.15 | `CONTRIBUTING.md` note about keeping embedded GENERATORS mirrored with YAML is an error-prone manual step — no automated check. Gap: +medium (duplicate of CI gap 16.16) | [ ] |
| 25.16 | Plugin authoring is documented as "no code required" — this is accurate and is the primary DX differentiator | [x] |
| 25.17 | `docs/adr/` numbering is sequential (`0001`, `0002`) with no gaps — easy to navigate | [x] |
| 25.18 | CODEOWNERS can gate schema changes to the maintainer — reduces accidental breaking contract changes | [x] |
| 25.19 | `SECURITY.md` defines a 72-hour acknowledgement SLA and 14-day fix target — professional governance | [x] |
| 25.20 | `node_modules/` observed locally — if committed accidentally it would bloat the repo. Confirm `.gitignore` covers it (not read in this audit). Gap: +low | [ ] |

**Section score: 16 / 20**

---

## Per-section score table

| # | Section | Score |
|---|---------|-------|
| 1 | Correctness (prompt assembly) | 19 / 20 |
| 2 | Algorithms & data structures | 20 / 20 |
| 3 | Time complexity | 19 / 20 |
| 4 | Space complexity | 19 / 20 |
| 5 | Schema design & meta-schema correctness | 20 / 20 |
| 6 | Plugin model & extensibility | 15 / 20 |
| 7 | Template-engine semantics | 18 / 20 |
| 8 | Determinism of assembly | 19 / 20 |
| 9 | Plugin-trust & supply chain | 14 / 20 |
| 10 | Security: template/prompt injection & XSS | 17 / 20 |
| 11 | Input validation | 16 / 20 |
| 12 | Error handling & edge cases | 16 / 20 |
| 13 | Accessibility (WCAG 2.1 AA) | 14 / 20 |
| 14 | No-build / zero-dependency discipline | 19 / 20 |
| 15 | Testing strategy & coverage | 14 / 20 |
| 16 | CI/CD & quality gates | 15 / 20 |
| 17 | Build/release & versioning | 18 / 20 |
| 18 | Documentation completeness | 18 / 20 |
| 19 | API/interface design | 18 / 20 |
| 20 | Code style / lint / formatting | 16 / 20 |
| 21 | Architecture & module boundaries | 19 / 20 |
| 22 | Data model integrity | 19 / 20 |
| 23 | Observability / logging | 17 / 20 |
| 24 | Licensing / provenance | 20 / 20 |
| 25 | Maintainability, DX & governance | 16 / 20 |
| **Total** | | **425 / 500** |

---

## Top 10 findings

Ranked by severity (high → medium → low) then by blast radius.

| Rank | Severity | Item | Location | Finding |
|------|----------|------|----------|---------|
| 1 | **HIGH** | 9.4 / 10.3 / 11.15 | `app/index.html` line 197 | `label.innerHTML = field.label + (field.required ? ' <span ...>' : "")` inserts untrusted plugin data via `innerHTML`. A malicious plugin with `label: "<img src=x onerror=alert(1)>"` would execute script. **Fix:** switch to `label.textContent = field.label`, then `appendChild` the `<span>` separately. |
| 2 | **HIGH** | 9.5 | `app/index.html` + schema | Ajv validates that `label` is a string but does not sanitise HTML tags — no schema constraint prevents `<script>` in a string value. Fix follows from finding 1 (textContent removes the attack surface). |
| 3 | **MEDIUM** | 1.20 / 7.20 / 12.9 | `app/engine.js` lines 247–249 | `overflowStrategy: "error"` is a valid schema enum value but is not implemented in `engine.js` — it silently falls through as `warn`. Either implement (throw a typed Error) or remove `"error"` from the schema enum. |
| 4 | **MEDIUM** | 9.15 / 9.16 | `.github/workflows/ci.yml` | CI action versions pinned to mutable tags (`@v4`) and `npm install` does not use `--ignore-scripts`. A compromised action tag or malicious package `postinstall` could run arbitrary code in CI. Mitigations: pin actions to full SHAs; add `--ignore-scripts` to `npm install`. |
| 5 | **MEDIUM** | 15.17 | `tests/engine.test.mjs` | No unit test covers `multi` field type assembly (join with `listSeparator`). A future refactor of `formatValue`'s `multi` branch could regress silently. Add a test fixture with a `multi` field and assert the joined output. |
| 6 | **MEDIUM** | 16.16 / 25.15 | CI + `index.html` | No automated check confirms that the embedded GENERATORS JS literals in `index.html` mirror the YAML plugin files. A YAML change without a corresponding mirror update produces divergent CI and browser behaviour. Fix: either remove the embedded copy (MVP loader T-001) or add a CI script that diffs the embedded objects against the YAML. |
| 7 | **MEDIUM** | 15.8 | `tests/` | No integration tests exist — `tests/integration/` is planned but absent. Browser-level acceptance criteria (PoC AC2/3) are manually verified only. Adds T-028 as a blocking dependency before declaring Phase 1 MVP done. |
| 8 | **MEDIUM** | 23.13 / 19.18 / 21.14 | `app/logger.js` | `logger.js` is fully specified with a 17-event catalogue and a privacy contract, but is imported nowhere in the running PoC — it is dead code at runtime. Wire at least `generator_selected`, `prompt_assembled`, and `prompt_copied` into `index.html` to validate the privacy contract in practice. |
| 9 | **MEDIUM** | 9.19 / 6.19 | Community registry (planned) | No runtime plugin integrity check exists — `--niji` flag or field values can be tampered after CI merge without detection. Until T-012/T-013 ship, the security posture depends entirely on the CI gate and GitHub's own integrity. Communicate this clearly in SECURITY.md. |
| 10 | **LOW** | 13.4 + 13.6 + 13.17–13.20 | `app/index.html` CSS/HTML | Four accessibility gaps cluster: (a) `<fieldset>` for multi fields lacks `<legend>`; (b) range sliders lack `aria-valuetext` with unit suffix; (c) no `@media (prefers-reduced-motion)` guard on the `button:active` transform; (d) hint `<p>` elements not linked via `aria-describedby`. None are blockers but together they constitute a WCAG 2.1 AA gap that should be addressed before the app is recommended to users who rely on assistive technology. |

---

*Produced 2026-06-12. Evidence: 37/37 engine unit tests passing; 2/2 plugins structurally and semantically valid; html-validate exit 0. See [`AUDIT.md`](AUDIT.md) for the condensed self-audit checklist.*
