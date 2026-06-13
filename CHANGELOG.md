# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.6] - 2026-06-12

### Changed

- `README.md` — extensive professional-grade rewrite: precise product description
  covering both creative modes and all modalities; plugin-as-data architecture
  section; engine section documenting `assemble()` API and pipeline; Mermaid
  architecture diagram; status badges updated to reflect PoC→MVP state and
  37-test count; quickstart section (open app, author plugin, run tests); complete
  repository layout tree with every file annotated; status/roadmap summary table
  (PoC done, MVP next, v1 planned); complete documentation index linking every
  doc (MODALITIES, CREATIVE-MODES, corpus, ERD, COMPLEXITY, AUDIT-500, AUDIT,
  TESTING, OBSERVABILITY, SECURITY-NOTES, ARCHITECTURE, ROADMAP, KANBAN, FAQ);
  quality-gates summary with evidence; tech-stack section; CC-prompt attribution
  for corpus.
- `docs/ARCHITECTURE.md` — deepened: added layer-responsibility table covering
  meta-schema / plugins / engine / app shell / logger / CI validator; documented
  engine public API (`assemble`, `isVisible`, `isSet`, `formatValue`); extended
  template language section to cover `{{=id}}` and `{{#=id}}` computed-token
  syntax; untrusted-plugin trust boundary section (three enforcement levels,
  blast-radius rationale for community registry); cross-links to ERD, COMPLEXITY,
  AUDIT-500, SECURITY-NOTES, ADRs; `constraints[]` and `overflowStrategy:"error"`
  added to known limitations; `computedTokens` added to plugin model table.
- `docs/KANBAN.md` — refreshed to reflect all landed work: T-029 (AUDIT-500),
  T-030 (ERD), T-031 (COMPLEXITY) moved to Done; T-032 (fix
  `overflowStrategy:"error"`) added to Backlog as a tracked AUDIT-500 finding;
  Done column narrative updated with all completed card groups and changelog
  references; board last-updated date added.
- `docs/ROADMAP.md` — refreshed to reflect PoC complete status: Phase 0 section
  updated with full "What landed" checklist including engine module, computed
  tokens, 37-test suite, AUDIT-500, ERD, COMPLEXITY; all four acceptance criteria
  marked met; Phase 1 open-tasks table added; Phase 2 open-tasks table added;
  phase headers now include state labels (Complete / Next / Planned).

## [0.1.5] - 2026-06-12

### Added

- `docs/ERD.md` — three-view data-model reference: Mermaid `erDiagram` of the
  full plugin/prompt data model (GENERATOR_PLUGIN, FIELD, RANGE, OPTION,
  CONDITION, PROMPT_TEMPLATE, OUTPUT_RULES, COMPUTED_TOKEN, MODALITY,
  ASSEMBLED_PROMPT) with attributes matching the meta-schema; ERM section
  documenting the meta-schema-governs-plugins relationship, `dependsOn` DAG
  invariants, template token integrity contract, `parameterOrder` single-source-
  of-truth rule, and modality coverage cardinalities; ERP section with Mermaid
  `sequenceDiagram` (structured-mode load → form render → value capture →
  assemble → preview; Glyph Canvas path) and `stateDiagram` for the
  `dependsOn` visibility state machine and the structured vs Glyph-Canvas mode
  branch.
- `docs/COMPLEXITY.md` — Big-O time and space analysis for every major
  operation: form render O(F), full visibility sweep O(E), `assemble()` O(F +
  C + I_c + T) dominated by O(T), schema validation O(S), semantic lint O(F +
  T + C + E), `dependsOn` DAG cycle check O(V+E). Operation table, dominant-
  term analysis, worked 50-field "Everything"-tier example with per-step
  operation counts and space breakdown. Cross-linked to MODALITIES.md and
  ARCHITECTURE.md.

### Changed

- `README.md` — added `docs/ERD.md` and `docs/COMPLEXITY.md` rows to the
  Quality and audit table.

## [0.1.4] - 2026-06-12

### Added

- `docs/AUDIT-500.md` — 500-point / 25-section deep inspection grounded in every
  source file (`app/`, `schemas/`, `generators/`, `scripts/`, `tests/`,
  `.github/`, `docs/`, `corpus/`). 25 sections × ~20 concrete, repo-specific
  checkboxes; per-section scores (/20); overall score 425/500; ranked Top 10
  findings. Covers: correctness, algorithms, time/space complexity, schema design
  (JSON Schema 2020-12), plugin model, template-engine semantics, determinism,
  plugin-trust & supply chain, XSS/injection security, input validation, error
  handling, WCAG 2.1 AA accessibility, no-build discipline, testing strategy,
  CI/CD quality gates, build/release, documentation, API design, code style,
  architecture, data model integrity, observability/privacy, licensing/provenance,
  and maintainability/DX/governance.

### Changed

- `docs/AUDIT.md` — cross-link to AUDIT-500.md added at the top with overall
  score summary.
- `README.md` — `docs/AUDIT-500.md` row added to the Quality and audit table.

## [0.1.3] - 2026-06-12

### Added

- `app/engine.js` — extracted ESM prompt-assembly engine (browser + Node compatible,
  zero dependencies). Exports `assemble(plugin, values)`, `isVisible`, `isSet`,
  `formatValue`. Implements in a single linear pass: token substitution
  (`{{key}}`), conditional section blocks (`{{#key}}…{{/key}}`), `omitIfDefault`
  gating, `dependsOn` field visibility, canonical flag ordering via
  `outputRules.parameterOrder`, `collapseWhitespace`/`trim` post-processing,
  `maxLength` + `overflowStrategy` (warn / truncate / error).
- `app/engine.js` — `computedTokens` support: `{{=id}}` scalar and
  `{{#=id}}…{{/=id}}` conditional section syntax for declarative flag-rename
  rules (e.g. Midjourney `--niji` vs `--v`).
- `tests/engine.test.mjs` — 37 unit tests using `node:test` + `node:assert`
  (zero extra dependencies). Covers all eight areas: token substitution,
  section blocks, `omitIfDefault` (MJ minimal-string assertion), `dependsOn`
  gating (SD `hires_upscaler` / MJ `model_version` mutual exclusion),
  parameter ordering, `maxLength` + overflow strategies, computed-token
  `--niji` flag rename, and `isVisible`/`isSet` export edge cases.
- `schemas/generator.schema.json` — `computedTokens` array property (optional)
  with `computedToken` `$def`: `id`, `emit`, `description`, `when[]` (reuses
  existing `condition` `$def`). Schema remains JSON Schema draft 2020-12 valid.
- `generators/midjourney.yaml` — `niji_version` enum field (Off / Niji 6 /
  Niji 5) with `omitIfDefault: true`; `model_version` gains
  `dependsOn: [{field: niji_version, operator: equals, value: "none"}]` so
  it is suppressed when Niji is active; one `computedToken` (`niji_flag`,
  emit `--niji`) wires the mutual-exclusion into the template. Plugin version
  bumped to 1.1.0, `lastVerified` updated to 2026-06-12.

### Changed

- `app/index.html` — `<script>` converted to `<script type="module">`;
  imports `assemble`, `isVisible`, `isSet` from `./engine.js`. Removed the
  ~40 lines of duplicated engine logic (`renderPrompt`, `isVisible`, `isSet`,
  `formatValue`). The app continues to run from `file://` with no bundler.
  Midjourney GENERATORS entry updated to include `niji_version`, `model_version`
  `dependsOn`, and `computedTokens` to match `generators/midjourney.yaml`.
- `scripts/validate.mjs` — extended semantic checks: validates
  `computedTokens` uniqueness, id/field-key collision, `when` condition field
  references; validates `{{=id}}` / `{{#=id}}` / `{{/=id}}` template references
  against declared computed-token ids; validates balanced computed-token sections.
- `.github/workflows/ci.yml` — added `node --test tests/engine.test.mjs` step
  before the plugin-validate step (same job, same permissions/concurrency).

## [0.1.2] - 2026-06-12

### Added

- `corpus/0thernes-entropy-corpus.md` — the five 0thernes entropy prompts reproduced
  verbatim with the Creative Commons attribution block, each followed by a technique
  annotation mapping it to the T1-T7 taxonomy. Includes the full taxonomy as a reference
  table. Prompt 4 is noted as the inverse dual (the practice spans both entropy and perfect
  order). Prompt 5 is annotated as the maximal composite (all six entropy techniques
  simultaneously active).

### Changed

- `docs/CREATIVE-MODES.md` — Glyph Canvas section rebuilt from primary sources:
  replaced speculative framing with 0thernes's documented method (10-250 iterations as
  composition; Stravinsky/Malick framing; anti-schema rationale in quoted words; adversarial-
  steering principle; curator model; primary tools DALL-E 3, Imagen 3-4, MidJourney secondary,
  Firefly). Added T1-T7 technique library as a reference table. Added "inverse dual" section
  documenting the both-poles practice. Added item 7 to the tooling spec describing four
  technique-library UI affordances (negative-constraint stack builder, keyword-avalanche
  palette, contradiction toggle, inverse-dual flip) grounded in the taxonomy. Corpus link added.
- `docs/ROADMAP.md` — Phase 2 (v1) scope extended with three new items: entropy-technique
  library UI (T1-T7), corpus import/save, and inverse-dual mode toggle.
- `docs/KANBAN.md` — three new backlog cards: T-024 (entropy-technique library UI),
  T-025 (corpus import/save/export), T-026 (inverse-dual mode toggle).
- `README.md` — added one paragraph linking the corpus and summarising the T1-T7 technique
  taxonomy and the four planned UI affordances.

## [0.1.1] - 2026-06-11

### Added

- `docs/MODALITIES.md` — full all-modality coverage map (image, video, 3D,
  music/audio, worlds). Documents which tools are in scope per modality
  (Midjourney, Runway, Suno, Luma, Meshy, Skybox AI, Pika, FLUX, Krea,
  Freepik, Udio, Stable Audio, etc.), maps art-school / art-institute concepts
  (composition, lighting, lens/focal length, camera movement, BPM, time
  signature, topology) to plugin field types, and defines the three complexity
  tiers (Simple / Advanced / Everything) and the plugin coverage plan.
- `docs/CREATIVE-MODES.md` — Structured mode vs Glyph Canvas (Entropy) mode.
  Documents 0thernes's avant-garde practice: latent-space random walks,
  Unicode-as-canvas, coloured text + emoji as composition tools, the curator
  model, and the entropies ethos (entropy and chaos as the medium; the human
  selects from uncanny output). Specifies the Glyph Canvas tooling needed:
  Unicode/emoji/symbol palette, colour tagging, font-weight markers, named
  save/curate, copy-raw and copy-styled actions.

### Changed

- `README.md` — updated tagline, solution section, and architecture overview
  to reflect dual creative modes and all-modality coverage; MVP scope updated
  to include complexity-tier toggle and Glyph Canvas baseline; quality/audit
  table extended with the two new docs.
- `docs/ARCHITECTURE.md` — design goals updated with dual-mode principle;
  system diagram extended to show the Glyph Canvas path; added Glyph Canvas
  subsystem section and all-modality coverage section; Future Work extended.
- `docs/ROADMAP.md` — Phase 1 (MVP) scope extended with complexity-tier toggle
  and Glyph Canvas baseline, plus new acceptance criterion 5; Phase 2 (v1)
  extended with per-modality plugin packs, Glyph Canvas v1 (colour tagging,
  HTML export), and `"freeform"` plugin type; Non-goals extended.
- `docs/KANBAN.md` — five new backlog cards: T-019 (Glyph Canvas Unicode
  palette UI), T-020 (Glyph Canvas save/curate/history), T-021
  (complexity-tier toggle + meta-schema field hint), T-022 (video plugin pack),
  T-023 (Glyph Canvas colour tagging + HTML export).
- `schemas/generator.schema.json` — clarified `modality` field description to
  note the planned `"freeform"` plugin type for Glyph Canvas and its
  relationship to the existing structured plugin contract.

## [0.1.0] - 2026-06-11

### Added

- Repository scaffold: README, MIT license, contribution and security policies,
  editor/git configuration, CI workflow.
- `schemas/generator.schema.json` — meta-schema (JSON Schema draft 2020-12)
  defining the generator plugin contract: identity, typed `fields[]` with
  ranges/options/`dependsOn`/`omitIfDefault`, `promptTemplate` token syntax,
  and `outputRules` (canonical parameter order, separators, length limits).
- Reference plugins authored against the meta-schema:
  `generators/midjourney.yaml` (flag-style syntax, v5.2–v7) and
  `generators/stable-diffusion.yaml` (A1111 paste format, dependsOn demo).
- `app/index.html` — zero-build PoC: schema-driven form renderer, mustache-style
  template engine with conditional sections, live prompt preview, copy button,
  character-limit warning.
- `scripts/validate.mjs` — structural (Ajv) + semantic plugin validation, run
  by CI on every push and pull request.
- `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, ADRs 0001–0002.
