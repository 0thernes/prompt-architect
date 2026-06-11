# ADR 0002 — Generator plugins are schema-validated data, not code

- **Status:** Accepted
- **Date:** 2026-06-11
- **Deciders:** 0thernes

## Context

Every supported generator (Midjourney, Stable Diffusion, Runway, Suno, …)
exposes a different prompt syntax whose option sets drift on the vendor's
schedule, not ours. Three implementation strategies were considered:

1. **Hard-coded per-generator UI** — fastest to demo, rots immediately, every
   vendor change is a code release.
2. **JS plugin modules** — flexible (arbitrary assembly logic), but accepting
   community plugins means executing third-party code; review burden and
   security surface are disqualifying for a solo maintainer.
3. **Declarative data plugins against a meta-schema** — generators described
   entirely in YAML (fields, ranges, enums, conditional visibility, a token
   template, output rules), validated structurally and semantically in CI.

## Decision

Strategy 3. The meta-schema (`schemas/generator.schema.json`) is the stable
contract and the core product asset. Expressiveness is intentionally bounded:
token substitution plus one-level conditional sections, `dependsOn` visibility,
`omitIfDefault`, and post-processing rules. When a real generator exceeds that
expressiveness (e.g. Midjourney's `--niji` flag *rename*), we extend the
meta-schema deliberately (versioned, with ADR) rather than escaping to code.

## Consequences

- **Positive:** vendor drift is absorbed by one-line YAML edits; plugin diffs
  are reviewable by non-programmers; community contributions never execute
  code; the corpus outlives any single renderer.
- **Negative:** some generator features are temporarily inexpressible; the
  meta-schema becomes a compatibility surface that must be versioned with
  care (semver, migration notes).
- **Guard rail:** `scripts/validate.mjs` enforces the parts of the contract
  JSON Schema cannot state (token↔field integrity, canonical parameter order),
  so the "data only" rule cannot be quietly bypassed via the template.
