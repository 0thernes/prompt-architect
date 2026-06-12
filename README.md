# Prompt Architect

[![CI](https://github.com/0thernes/prompt-architect/actions/workflows/ci.yml/badge.svg)](https://github.com/0thernes/prompt-architect/actions/workflows/ci.yml)
[![CodeQL](https://github.com/0thernes/prompt-architect/actions/workflows/codeql.yml/badge.svg)](https://github.com/0thernes/prompt-architect/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![status: PoC](https://img.shields.io/badge/status-PoC-orange.svg)](docs/ROADMAP.md)

**A schema-driven, non-AI universal prompt builder** with two first-class
creative modes. One app that aggregates the options and settings of every major
AI generator — image, video, 3D, music/audio, worlds — so a power user fills
out a form and copies a perfect one-shot prompt for the chosen target. And for
the entropy artist: a freeform Glyph Canvas for composing 140,000+ Unicode
glyphs, coloured text, and symbols as deliberate incoherence — pushing models
into liminal latent space where uncanny outputs live. No app-hopping. No context
exhaustion. No model calls.

> **Status: PoC (v0.1.0)** — schema, two reference plugins, and a working
> zero-build demo. Local only; not yet published.

---

## The problem

The generative landscape has fragmented into dozens of tools, each with its own
flag syntax, parameter names, value ranges and defaults: Midjourney's
`--stylize 0–1000`, Stable Diffusion's CFG scale and sampler zoo, Runway,
Suno, Luma, world-builders — every one a separate mental model. Power users
burn time and attention:

- **App-hopping** — keeping a dozen docs pages open just to remember which flag
  exists in which tool, at which version.
- **Context exhaustion** — asking a chat LLM to "write me a Midjourney prompt"
  spends tokens, hallucinates flags that don't exist, and goes stale the moment
  the vendor ships an update.
- **Trial-and-error cost** — every malformed prompt on a paid generator is real
  money and queue time wasted.

## The solution — two creative modes

Prompt Architect is deliberately **not** an AI product. It is a deterministic
form-to-prompt compiler — and an entropy canvas.

### Structured mode (schema-driven)

1. Every supported generator is described by a **plugin** — a pure data file
   (YAML) validated against a published meta-schema.
2. The app reads the plugin and **renders a form**: sliders with the real
   ranges, dropdowns with the real enums, conditional fields that appear only
   when relevant.
3. As the user types, a **template engine assembles the native prompt string**
   for that exact target — correct flags, canonical parameter order, length
   limits enforced — ready to paste in one shot.

A **complexity tier** (Simple / Advanced / Everything) keeps the form usable
at every skill level: beginners see 3–5 essential controls; power users who
opt into `Everything` get the full parameter surface. The tier system
acknowledges an honest UX tension: most users bounce off a million options, so
the full control surface is opt-in, not default.

**The schema is the product.** Generators change weekly; code that hard-wires
their options rots immediately. Here, vendor drift is absorbed by editing a
YAML file — no code change, no release, no rebuild. The meta-schema
([`schemas/generator.schema.json`](schemas/generator.schema.json)) is the
stable contract; everything above and below it is replaceable.

### Glyph Canvas mode (entropy mode)

A freeform composition surface with no schema, no fields, no template engine.
The input is the full Unicode range — 140,000+ glyphs, symbols, emoji —
composed with colour tagging and font-weight markers. The goal: deliberate
incoherence that places the model in uncanny / liminal latent space, producing
outputs that no structured prompt can reach. The human acts as curator and
tastemaker, selecting from the uncanny output. This is 0thernes's documented
avant-garde practice — entropy and chaos as the medium.

Full description and tooling specification: [`docs/CREATIVE-MODES.md`](docs/CREATIVE-MODES.md).

The Glyph Canvas mode is now grounded in 0thernes's five published prompts and a seven-technique
taxonomy (T1-T7) derived from direct analysis of the corpus. The techniques — AI-only
cryptography frame, negative-constraint stacking, anti-instruction paradox, keyword avalanche,
self-referential identity invocation, contradiction bomb, and the inverse dual — map directly to
planned UI affordances: a negative-constraint stack builder, a keyword-avalanche palette, a
contradiction toggle, and an inverse-dual flip that mirrors any entropy composition to its
maximum-order pole. The full annotated corpus lives at
[`corpus/0thernes-entropy-corpus.md`](corpus/0thernes-entropy-corpus.md).

## Architecture overview

```
schemas/generator.schema.json     the contract (JSON Schema 2020-12)
        ▲ validates                       what a "generator plugin" IS
generators/*.yaml                 data plugins: fields, ranges, enums,
        │ consumed by             dependsOn rules, promptTemplate, outputRules
app/index.html                    zero-build vanilla-JS renderer:
        │                         [Structured mode] form ⇒ template engine ⇒ prompt
        │                         [Glyph Canvas]    freeform Unicode canvas ⇒ prompt (verbatim)
        │ produces
"one-shot prompt"                 pasted into the target generator
```

- **Plugins are data, never code** — safe to crowd-source, trivial to review.
- **Template engine** — mustache-style `{{token}}` substitution plus
  `{{#token}}…{{/token}}` conditional sections; ~30 lines, fully deterministic.
- **Three-layer validation** — meta-schema (Ajv in CI), semantic lint
  (`scripts/validate.mjs`: token↔field integrity, canonical parameter order,
  defaults inside ranges), runtime form constraints.
- **No build step** — the PoC is a single `index.html`; open it from disk.
- **Glyph Canvas** — no schema, no validation, no template; a Unicode text
  area with a symbol/emoji palette, colour tagging, and named saves.

Full design rationale: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Modality coverage and art-school taxonomy: [`docs/MODALITIES.md`](docs/MODALITIES.md).
Creative modes in depth: [`docs/CREATIVE-MODES.md`](docs/CREATIVE-MODES.md).

## MVP scope

In: plugin loader for `generators/*.yaml`, 8–10 curated plugins across image /
video / audio / 3D / world modalities, preset save/load (localStorage), prompt
history, PWA install, the CI plugin-validation pipeline as the contribution
gate, complexity-tier toggle (Simple / Advanced / Everything), and the Glyph
Canvas baseline (Unicode text area, emoji/symbol palette, named saves).

Out (deliberately): any model API calls, accounts/backend, prompt "quality
scoring", browser extensions.

## Roadmap

| Phase | Focus | Exit criterion |
|-------|-------|----------------|
| **PoC** (now) | Prove the schema can describe real generators and drive a usable form | Two plugins validate in CI and produce paste-ready prompts |
| **MVP** | Plugin loader, 8–10 plugins, presets, history, PWA | A stranger builds a correct Midjourney + Suno prompt without reading docs |
| **v1** | Community plugin registry, signed plugin updates, export/import, i18n | Third-party plugin merged through the CI gate without maintainer code changes |

Detailed phases with acceptance criteria: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Tech stack

- **Spec:** JSON Schema draft 2020-12 (meta-schema), YAML plugins
- **App:** single-file HTML + vanilla ES2022, no framework, no bundler, no
  runtime dependencies — matches the owner's no-build PWA house style
- **Quality gate:** GitHub Actions — Ajv structural validation, semantic lint
  (`scripts/validate.mjs`), `html-validate`

## Repository layout

```
schemas/      generator.schema.json — the meta-schema (the product)
generators/   midjourney.yaml, stable-diffusion.yaml — reference plugins
app/          index.html — zero-build PoC (open directly in a browser)
scripts/      validate.mjs — structural + semantic plugin validator
docs/         ARCHITECTURE.md, ROADMAP.md, adr/
```

## Try it

Open `app/index.html` in any modern browser (no server needed), pick a
generator, fill the form, press **Copy**.

To validate plugins locally:

```bash
npm install --no-save ajv@8 ajv-formats@3 js-yaml@4
node scripts/validate.mjs
```

## Project board

Current work state, WIP limits, and all backlog cards live in
[`docs/KANBAN.md`](docs/KANBAN.md).

## Quality and audit

| Document | What it covers |
|----------|----------------|
| [`docs/AUDIT.md`](docs/AUDIT.md) | Self-audit checklist (correctness, security, plugin trust, accessibility) |
| [`docs/TESTING.md`](docs/TESTING.md) | Test strategy, pyramid, coverage targets, how to run |
| [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md) | Structured log schema, event catalogue, `app/logger.js` |
| [`docs/SECURITY-NOTES.md`](docs/SECURITY-NOTES.md) | Defensive security posture — assets, trust model, mitigations |
| [`docs/FAQ.md`](docs/FAQ.md) | Common questions answered honestly |
| [`docs/MODALITIES.md`](docs/MODALITIES.md) | All-modality coverage map, tool lists, art-school taxonomy, complexity tiers |
| [`docs/CREATIVE-MODES.md`](docs/CREATIVE-MODES.md) | Structured vs Glyph-Canvas mode; entropy practice; Unicode/colour tooling spec |

## License

MIT — see [LICENSE](LICENSE). © 2026 0thernes.
