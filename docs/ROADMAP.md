# Roadmap

Three phases. Each phase has explicit acceptance criteria; a phase is done when
every criterion is checkable, not when it "feels done".

## Phase 0 — PoC (current, v0.1.x)

**Goal:** prove that one meta-schema can faithfully describe real, dissimilar
generators and mechanically drive a usable form and a correct prompt.

Scope:

- [x] Meta-schema `schemas/generator.schema.json` (JSON Schema 2020-12)
- [x] Two reference plugins: `midjourney.yaml` (flag-style syntax),
      `stable-diffusion.yaml` (line-oriented A1111 paste format)
- [x] Zero-build `app/index.html`: form renderer, template engine, live
      preview, copy button, length counter
- [x] CI: Ajv structural validation + semantic lint + html-validate

**Acceptance criteria**

1. `node scripts/validate.mjs` exits 0; introducing any of these makes it exit
   non-zero: an unknown template token, a field missing from `parameterOrder`,
   an enum default not present in `options`.
2. The Midjourney form, left at defaults except a subject, produces exactly
   `<subject> --ar 1:1 --v 7` (omit-if-default proven working).
3. The Stable Diffusion form with Hires. fix off emits no hires text; toggling
   it on reveals the upscaler field and appends it (dependsOn proven working).
4. The assembled Midjourney prompt shows a visible warning beyond 2000 chars.

## Phase 1 — MVP (v0.2 – v0.5)

**Goal:** daily-drivable tool for one real user (the founder), installable as a
PWA, covering the generators actually in rotation — in both creative modes.

Scope:

- Plugin loader: fetch + parse `generators/*.yaml` at runtime (replaces the
  embedded PoC objects); meta-schema validation in the browser with friendly
  error surfaces for plugin authors
- 8–10 curated plugins spanning all modalities (target list: Midjourney,
  Stable Diffusion, FLUX, DALL·E, Runway, Luma, Suno, Udio, Meshy, Skybox)
- Complexity-tier toggle (Simple / Advanced / Everything) surfaced per plugin;
  field `tier` hint added to meta-schema as a minor extension
- Preset save/load per generator (localStorage), prompt history with the
  plugin `id`+`version` recorded per entry
- PWA: manifest + service worker, offline-first, installable
- `lastVerified` staleness report in CI (warn > 90 days)
- **Glyph Canvas baseline:** Unicode text area, searchable symbol/emoji palette
  (Unicode block browser + recents), named glyph-prompt saves in localStorage,
  copy-raw action

**Acceptance criteria**

1. A new plugin dropped into `generators/` appears in the UI with zero code
   changes (verified by adding a throwaway plugin in a test).
2. A user with no prior Midjourney knowledge produces a prompt accepted
   first-try by the live service, using only field labels and hints.
3. Lighthouse PWA installability checks pass; the app fully works offline
   after first load.
4. Presets survive a browser restart; history entries replay byte-identical
   prompts.
5. The Glyph Canvas accepts and round-trips arbitrary Unicode (including
   combining characters and emoji) without mangling; saved glyph prompts
   persist across browser restarts.

## Phase 2 — v1 (community)

**Goal:** the plugin corpus grows faster than one maintainer can write it,
without ever executing third-party code; and the Glyph Canvas reaches full
composition-tool maturity.

Scope:

- Community plugin registry: static JSON index + content hashes; submission =
  PR into a registry repo gated by the same CI validator
- Plugin signing / integrity verification on load
- Export/import of presets + history as a single JSON file
- Computed tokens and declarative cross-field `constraints[]` (meta-schema
  minor version, backwards compatible)
- i18n of field labels (plugin-supplied translations)
- **Per-modality plugin packs** — curated bundles (image pack, video pack,
  audio pack) installable as a unit from the community registry
- **Glyph Canvas v1:** inline colour tagging (`[text|#hex]` syntax) rendered
  live; font-weight markers; export as plain text and as styled HTML fragment;
  glyph-prompt output history with optional generator-output notes/thumbnails
- `"freeform"` plugin type in the schema — lightweight metadata (useful
  Unicode blocks, typical effective length, responsive model notes) for
  Glyph Canvas, carrying no field structure
- **Entropy-technique library UI (T1-T7):** negative-constraint stack builder,
  keyword-avalanche palette, contradiction toggle, and inverse-dual flip —
  UI affordances derived from the 0thernes primary corpus (see
  `corpus/0thernes-entropy-corpus.md`); grounded in the T1-T7 taxonomy
- **Corpus import / save:** import a plain-text prompt file or paste a raw
  prompt and save it to the Glyph Canvas corpus with technique tags; export
  the full corpus as a JSON or Markdown file for archiving and sharing
- **Inverse-dual mode toggle:** a persistent UI toggle that keeps the canvas
  in entropy mode (T1-T6 scaffolding active) or structural/order mode (T7 pole
  active), with a one-tap flip to mirror the current composition across the axis

**Acceptance criteria**

1. At least one third-party plugin merged with no maintainer code changes —
   the CI gate alone decided.
2. A tampered plugin (hash mismatch) is refused at load with a clear message.
3. Exporting on machine A and importing on machine B reproduces presets and
   history exactly.
4. Meta-schema version bump ships with a migration note and all first-party
   plugins still validating.
5. A glyph-prompt composition with colour tags exports as a styled HTML
   fragment that renders correctly in a modern browser.

## Non-goals (all phases)

- Calling any generator's API, or any LLM, at runtime
- Accounts, telemetry, server-side anything
- "Prompt quality" scoring or generation — Prompt Architect assembles, the
  human decides
- Imposing schema structure on Glyph Canvas output — the entropy artist owns
  the composition completely; validation would defeat the purpose
