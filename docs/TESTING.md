# Testing strategy — Prompt Architect

## Philosophy

The project's testability advantage is its architecture: every generator is
described by inert data, and the core transformation (form state → prompt
string) is a pure function. There are no network calls, no randomness, and no
side effects to mock. The test strategy exploits this by pushing as much
coverage as possible into deterministic, reproducible checks.

---

## Test pyramid

```
           ┌─────────────────────────┐
           │   Manual / exploratory  │  (browser, per release)
           ├─────────────────────────┤
           │   Integration: HTML     │  html-validate in CI
           │   rendering contract    │
           ├─────────────────────────┤
           │   Unit: semantic lint   │  scripts/validate.mjs in CI + local
           │   (plugin correctness)  │  on every push
           ├─────────────────────────┤
           │   Schema: structural    │  Ajv validation in CI + local
           │   (JSON Schema 2020-12) │
           └─────────────────────────┘
```

### Layer 1 — Structural (Ajv)

Every `generators/*.yaml` is validated against `schemas/generator.schema.json`
using Ajv in `strict: false` mode (intentional: the meta-schema uses `unevaluatedProperties: false`
which Ajv handles correctly with `strict: false`). This catches wrong types, missing
required fields, `options` absent on enum fields, and out-of-schema properties.

**When it runs:** every CI push and PR; locally via `make test` or
`node scripts/validate.mjs`.

### Layer 2 — Semantic (scripts/validate.mjs)

What JSON Schema cannot express. This layer verifies:

- Every `{{token}}` and `{{#section}}` in `promptTemplate` names a declared
  field key.
- `outputRules.parameterOrder` lists every field key exactly once.
- Template token first-occurrence order respects `parameterOrder` (prevents
  silent flag reordering).
- Balanced section delimiters (`{{#k}}...{{/k}}`).
- Enum and multi-select defaults exist in their `options` list.
- Number defaults fall within their `range`.
- `dependsOn` references are declared fields and are not self-referential.

**When it runs:** same as Layer 1 (same command: `node scripts/validate.mjs`).

### Layer 3 — HTML validity (html-validate)

`npx html-validate@8 app/index.html` checks that the PoC renders valid HTML5.
This is particularly important for accessibility: html-validate catches missing
`for`/`id` pairings on `<label>` elements, missing `alt` text, and deprecated
attributes that screen readers may mishandle.

**When it runs:** every CI push and PR.

### Layer 4 — Integration: prompt assembly (planned)

A headless browser test (Playwright) that:

1. Opens `app/index.html`.
2. Selects "Midjourney", sets only a subject, and verifies the assembled prompt
   is exactly `<subject> --ar 1:1 --v 7` (PoC acceptance criterion 2).
3. Selects "Stable Diffusion", toggles Hires. fix off and on, and verifies the
   upscaler field appears and its value appears in the prompt.

These tests live in `tests/integration/` (not yet created) and gate Phase 1.

### Layer 5 — Manual / exploratory

Before any release, open the app in Chrome and Firefox and verify:

- Each shipped plugin assembles a paste-ready prompt.
- The character counter switches to warning state at the plugin's `maxLength`.
- The Copy button places exactly the assembled text on the clipboard.
- A new plugin dropped into `generators/` (with the MVP loader) appears in the
  dropdown without code changes.

---

## What is mocked vs real

| Aspect | Approach |
|--------|----------|
| Generator vendor APIs | Never called — Prompt Architect is offline-only |
| File system (YAML reading) | Real files; the validator reads `generators/*.yaml` directly |
| Browser DOM | Real browser (no jsdom) for integration tests; html-validate for structure |
| YAML parser (js-yaml) | Real library, installed ad hoc in CI |
| Ajv | Real library, installed ad hoc in CI |

Nothing is mocked in the validation path because the stack is small and fully
deterministic. Mocking would reduce confidence without reducing test time.

---

## Coverage targets

| Layer | Target |
|-------|--------|
| Structural schema validation | 100% of `generators/*.yaml` files on every CI run |
| Semantic lint | 100% of `generators/*.yaml` files on every CI run |
| HTML validity | 100% of `app/*.html` files on every CI run |
| Prompt assembly integration tests | All canonical "boundary" form states per plugin (planned Phase 1) |

There is no JavaScript code-coverage target for `app/index.html` at this stage:
the file is small enough that the integration tests cover its branches
implicitly.

---

## Determinism and reproducibility

All test inputs are committed source files. `node scripts/validate.mjs` is
hermetic — its only non-committed inputs are the ad hoc npm packages, which are
pinned to major versions. Given the same Node.js version and same major package
version, the output is identical across machines and over time.

Plugin prompt assembly is a pure function of field values and the YAML content,
so integration tests can assert exact string equality (not "contains") for
regression detection.

---

## Running tests locally

```bash
# Install validator deps (one-time):
make setup

# Run all automated layers:
make lint

# Individual layers:
node scripts/validate.mjs          # layers 1+2
npx html-validate@8 app/index.html # layer 3
```

CI gates: the `validate` job in `.github/workflows/ci.yml` runs layers 1–3 on
every push. A failing job blocks merge.
