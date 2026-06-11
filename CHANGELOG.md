# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
