# Kanban board — Prompt Architect

## WIP limits

| Column | Limit | Rationale |
|--------|-------|-----------|
| Backlog | unlimited | Discovery and triage queue |
| Ready | 5 | Items in Ready are fully scoped; cap prevents wasted planning on work too far out |
| In Progress | 2 | Strict limit: single developer, context-switch cost is high, plugin authoring requires focused checking against live vendor docs |
| In Review | 3 | Reviews should clear quickly; a larger cap here creates a "done pile" that hides bottlenecks |
| Done | unlimited | Historical record |

A card moves to **In Progress** only when its Dependencies column is empty.
A card moves to **Done** only when every item in its Definition of Done is checked.

---

## Board

| ID | Title | Column | Priority | Estimate |
|----|-------|--------|----------|----------|
| T-001 | Runtime plugin loader (fetch + parse YAML) | Ready | P1 | M |
| T-002 | Computed tokens — `emit` map for flag-rename cases (e.g. --niji) | Done | P1 | M |
| T-027 | Extract template engine to `app/engine.js` (ESM, browser + Node) | Done | P1 | M |
| T-028 | Unit-test suite `tests/engine.test.mjs` (node:test, 37 cases) | Done | P1 | S |
| T-003 | Plugin: Runway Gen-3 video generator | Ready | P2 | S |
| T-004 | Plugin: Suno v4 audio/music generator | Ready | P2 | S |
| T-005 | Plugin: Luma Dream Machine video | Backlog | P2 | S |
| T-006 | Plugin: DALL·E 3 image | Backlog | P2 | S |
| T-007 | Preset save/load per generator (localStorage) | Ready | P1 | M |
| T-008 | Prompt history with plugin id+version per entry | Backlog | P1 | M |
| T-009 | PWA manifest + service worker (offline-first) | Backlog | P2 | L |
| T-010 | Export/import presets + history as JSON file | Backlog | P2 | M |
| T-011 | `lastVerified` staleness report in CI (warn > 90 days) | Ready | P2 | S |
| T-012 | Community plugin registry — static JSON index + content hashes | Backlog | P3 | XL |
| T-013 | Plugin signing / integrity verification on load | Backlog | P3 | L |
| T-014 | Declarative cross-field `constraints[]` in meta-schema | Backlog | P3 | L |
| T-015 | i18n of field labels (plugin-supplied translations) | Backlog | P3 | L |
| T-016 | Plugin: Udio music generator | Backlog | P2 | S |
| T-017 | Plugin: Meshy 3D model generator | Backlog | P3 | S |
| T-018 | Plugin: Skybox AI world builder | Backlog | P3 | S |
| T-019 | Glyph Canvas — Unicode/emoji/symbol palette UI (block browser, search, recents, insert-at-cursor) | Backlog | P2 | L |
| T-020 | Glyph Canvas — named save / curate / history (localStorage, export plain text) | Backlog | P2 | M |
| T-021 | Complexity-tier toggle (Simple/Advanced/Everything) + field `tier` hint in meta-schema | Backlog | P1 | M |
| T-022 | Plugin pack: Runway Gen-4 + Pika 2 + Luma (video pack, installable as unit) | Backlog | P2 | M |
| T-023 | Glyph Canvas — inline colour tagging + styled HTML export | Backlog | P3 | L |
| T-024 | Glyph Canvas — entropy-technique library UI (T1-T7): negative-constraint stack builder, keyword-avalanche palette, contradiction toggle, inverse-dual flip | Backlog | P2 | L |
| T-025 | Glyph Canvas — corpus import / save / export (paste or file import; save with technique tags; export full corpus as JSON or Markdown) | Backlog | P2 | M |
| T-026 | Glyph Canvas — inverse-dual mode toggle (persistent entropy/order axis toggle; one-tap composition mirror across T7 pole) | Backlog | P3 | M |

---

## Column detail

### Backlog
T-005, T-006, T-008, T-009, T-010, T-012, T-013, T-014, T-015, T-016, T-017, T-018, T-019, T-020, T-021, T-022, T-023, T-024, T-025, T-026

### Ready
T-001 · T-003 · T-004 · T-007 · T-011

### In Progress
_(empty)_

### In Review
_(empty)_

### Done
T-002 · T-027 · T-028 — see CHANGELOG.md [0.1.3] for details._
