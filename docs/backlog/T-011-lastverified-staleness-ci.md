# T-011 — `lastVerified` staleness report in CI (warn > 90 days)

## Context

Each generator plugin carries a `lastVerified` field — the ISO date on which
a contributor last manually checked the plugin's flags and ranges against the
vendor's live documentation. ARCHITECTURE.md states: "Tooling can flag plugins
whose `lastVerified` is older than 90 days; reviewers re-check against
`docsUrl`."

This card implements that tooling as a CI step in the existing validate job.
The 90-day threshold balances update frequency (generator vendors ship changes
roughly monthly) against contributor burden. The step should warn but not fail,
because a plugin being stale is not a correctness error — it is a review signal.

## Acceptance criteria

- [ ] `scripts/validate.mjs` (or a separate `scripts/staleness.mjs`) computes
      the difference in days between today and each plugin's `lastVerified` date.
- [ ] Plugins older than 90 days produce a `WARN` line to stdout naming the
      plugin, the `lastVerified` date, and the number of days elapsed.
- [ ] The CI step exits 0 regardless of staleness (warn-only; failing CI for
      staleness would block merging legitimate unrelated PRs).
- [ ] A new CI step in `.github/workflows/ci.yml` is named "Plugin staleness
      check" and runs after the existing validate step.
- [ ] The output format is parseable: one line per stale plugin, starting with
      `STALE` for machine-readable filtering.
- [ ] `node scripts/validate.mjs` output on a fresh repo (both plugins verified
      today) contains no STALE lines.

## Definition of Done

- All acceptance criteria checked.
- CONTRIBUTING.md updated to note that `lastVerified` should be set to today
  when a plugin is changed and that CI will flag it after 90 days.
- CHANGELOG.md updated.

## Estimate

S (half-day)

## Dependencies

None — operates on existing YAML files and the existing CI workflow.
