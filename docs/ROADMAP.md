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
PWA, covering the generators actually in rotation.

Scope:

- Plugin loader: fetch + parse `generators/*.yaml` at runtime (replaces the
  embedded PoC objects); meta-schema validation in the browser with friendly
  error surfaces for plugin authors
- 8–10 curated plugins spanning modalities (target list: Midjourney, Stable
  Diffusion, FLUX, DALL·E, Runway, Luma, Suno, Udio, Meshy, Skybox)
- Preset save/load per generator (localStorage), prompt history with the
  plugin `id`+`version` recorded per entry
- PWA: manifest + service worker, offline-first, installable
- `lastVerified` staleness report in CI (warn > 90 days)

**Acceptance criteria**

1. A new plugin dropped into `generators/` appears in the UI with zero code
   changes (verified by adding a throwaway plugin in a test).
2. A user with no prior Midjourney knowledge produces a prompt accepted
   first-try by the live service, using only field labels and hints.
3. Lighthouse PWA installability checks pass; the app fully works offline
   after first load.
4. Presets survive a browser restart; history entries replay byte-identical
   prompts.

## Phase 2 — v1 (community)

**Goal:** the plugin corpus grows faster than one maintainer can write it,
without ever executing third-party code.

Scope:

- Community plugin registry: static JSON index + content hashes; submission =
  PR into a registry repo gated by the same CI validator
- Plugin signing / integrity verification on load
- Export/import of presets + history as a single JSON file
- Computed tokens and declarative cross-field `constraints[]` (meta-schema
  minor version, backwards compatible)
- i18n of field labels (plugin-supplied translations)

**Acceptance criteria**

1. At least one third-party plugin merged with no maintainer code changes —
   the CI gate alone decided.
2. A tampered plugin (hash mismatch) is refused at load with a clear message.
3. Exporting on machine A and importing on machine B reproduces presets and
   history exactly.
4. Meta-schema version bump ships with a migration note and all first-party
   plugins still validating.

## Non-goals (all phases)

- Calling any generator's API, or any LLM, at runtime
- Accounts, telemetry, server-side anything
- "Prompt quality" scoring or generation — Prompt Architect assembles, the
  human decides
