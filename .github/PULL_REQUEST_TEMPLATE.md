## Summary

<!-- One or two sentences describing what this PR does and why. -->

## Linked card

<!-- Backlog card reference, e.g. T-003 or "none (hotfix)". -->
Card: 

## Change type

- [ ] New / updated generator plugin (data-only)
- [ ] App: `app/index.html` renderer / template engine
- [ ] Meta-schema: `schemas/generator.schema.json`
- [ ] Validator: `scripts/validate.mjs`
- [ ] CI / tooling / governance
- [ ] Docs only

## Test evidence

<!-- Show that the change works. At minimum: -->
- [ ] `node scripts/validate.mjs` exits 0 on my machine
- [ ] `npx html-validate@8 app/index.html` exits 0 (if HTML touched)
- [ ] The assembled prompt for the affected generator looks correct in the browser

For plugin additions/updates, paste the assembled prompt for at least one
representative form state here:
```
<prompt goes here>
```
Vendor doc page consulted: <!-- link -->

## Audit checklist

- [ ] No runtime dependencies introduced (`node_modules` never ships to users)
- [ ] No `innerHTML` writes using plugin or user-supplied data
- [ ] Any new field key added to `outputRules.parameterOrder` and template
- [ ] `lastVerified` updated if plugin content changed
- [ ] `CHANGELOG.md` Unreleased section updated with user-visible impact

## Rollback note

<!-- How to revert if this lands broken.
     For plugin changes: reverting the YAML restores previous behaviour.
     For app changes: list any localStorage schema changes that need migration. -->
