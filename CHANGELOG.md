# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
