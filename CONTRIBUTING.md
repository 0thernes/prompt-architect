# Contributing to Prompt Architect

Thanks for your interest. The highest-value contribution is **generator
plugins** — pure data files, no code required.

## Adding or updating a generator plugin

1. Copy an existing file in `generators/` (e.g. `midjourney.yaml`) as a
   starting point.
2. Author against the contract in `schemas/generator.schema.json` — every
   property is documented inline in the schema's `description` fields.
3. Keep the accuracy-caveat header at the top of the file and fill in
   `docsUrl`, `targetVersion` and `lastVerified` honestly. Plugins are data
   files updated without code changes — that is the project's maintenance
   strategy, and `lastVerified` is what makes it auditable.
4. Order `fields[]` the way the form should read; list **every** field key in
   `outputRules.parameterOrder` in the order the target generator expects its
   parameters. CI rejects templates that contradict `parameterOrder`.
5. Use `omitIfDefault: true` for flags the generator already assumes, so
   assembled prompts stay minimal.
6. Validate locally before opening a PR:

   ```bash
   npm install --no-save ajv@8 ajv-formats@3 js-yaml@4
   node scripts/validate.mjs
   ```

7. In the PR description, link the vendor doc page that backs each changed
   range/enum/default.

## Working on the app

- `app/index.html` is intentionally a single zero-build file (vanilla ES2022,
  no framework, no bundler). Keep it that way; see ADR 0002 and
  `docs/ARCHITECTURE.md` before proposing structural changes.
- The embedded PoC plugin objects must stay verbatim mirrors of the YAML files
  until the MVP loader lands — if you change a YAML, change the mirror.
- Check HTML validity: `npx html-validate@8 app/index.html`.

## Ground rules

- **No runtime dependencies, no build step, no AI calls.** PRs introducing any
  of these need a superseding ADR first.
- Conventional Commits for messages (`feat:`, `fix:`, `docs:`, `chore:`).
- Update `CHANGELOG.md` (Unreleased section) with user-visible changes.
- Plugin version bumps: patch for option/range corrections, minor for new
  fields, major for template/breaking changes.

## Questions

Open a GitHub issue. For security matters, see [SECURITY.md](SECURITY.md).
