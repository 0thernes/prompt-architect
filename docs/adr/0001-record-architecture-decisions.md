# ADR 0001 — Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-06-11
- **Deciders:** 0thernes

## Context

Prompt Architect's value is concentrated in a handful of structural choices
(schema-first plugins, zero-build app, data-over-code maintenance). As a solo
project intended to reach investor and community scrutiny, the *reasons* for
those choices must survive longer than the founder's working memory, and
contributors must be able to challenge a decision against its recorded context
rather than guessing.

## Decision

We record architecturally significant decisions as Architecture Decision
Records (Michael Nygard's format) in `docs/adr/`, numbered sequentially
(`NNNN-title.md`). Each ADR carries Status, Date, Context, Decision and
Consequences. ADRs are immutable once accepted; reversals are new ADRs that
supersede the old one (status updated to "Superseded by NNNN").

A decision is "architecturally significant" when it constrains the meta-schema,
the plugin contract, the no-build constraint, or the security model.

## Consequences

- Pull requests that bend a recorded constraint must include a superseding
  ADR, which keeps drift deliberate instead of accidental.
- The docs/adr/ directory doubles as the due-diligence trail: the project's
  riskiest assumptions are enumerated, dated and signed.
- Slight authoring overhead per significant decision — accepted; the PoC has
  exactly two (this one and ADR 0002).
