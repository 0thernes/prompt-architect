# Self-audit checklist — Prompt Architect

> **Deep inspection:** [`AUDIT-500.md`](AUDIT-500.md) — 500-point / 25-section analysis
> grounded in every source file, with per-section scores and a ranked Top 10 findings list.
> Overall score: **425 / 500** (2026-06-12).

A gold-standard checklist for reviewing the project's quality before any
significant release or before inviting community contributions. Work through
each category and tick items as they are verified. An unchecked item is a
known gap, not a blocking failure — document why it is deferred if needed.

---

## Correctness

- [ ] `node scripts/validate.mjs` exits 0 with all current plugins passing
      both structural (Ajv) and semantic (token/parameterOrder) checks.
- [ ] Each shipped plugin produces the correct assembled prompt for the "all
      defaults except subject" form state as described in ROADMAP.md acceptance
      criteria (e.g. Midjourney → `<subject> --ar 1:1 --v 7`).
- [ ] `dependsOn` conditions in every plugin are tested: toggling the parent
      field shows/hides the dependent field correctly in the browser.
- [ ] `omitIfDefault: true` fields are verified absent in the assembled prompt
      when at their default value, and present when changed.
- [ ] Balanced template sections: every `{{#field}}` has a matching `{{/field}}`
      in every plugin (enforced by validator, but manually re-checked after any
      template edit).
- [ ] `parameterOrder` in every plugin covers every declared field key exactly
      once, and the order matches the generator's documented parameter sequence.
- [ ] `outputRules.maxLength` values match current vendor-published limits
      (e.g. Midjourney's 2000-character cap).
- [ ] Character counter warning fires correctly at `maxLength` in the browser UI.
- [ ] Copy button places the exact assembled prompt text on the clipboard (no
      invisible trailing whitespace, no newline artefacts).
- [ ] `lastVerified` dates are within 90 days of the current date for all
      shipped plugins; stale plugins are flagged by CI.

---

## Security

- [ ] No `innerHTML` assignment uses plugin-derived or user-supplied content.
      All plugin string values are inserted via `textContent` or DOM attribute
      setters.
- [ ] The assembled prompt lands in a `<pre>` text node and in the clipboard only —
      never injected into the DOM as HTML.
- [ ] `app/logger.js` does not log free-text string field values (subject,
      lyrics, etc.) to the console — only type/key/count metadata.
- [ ] CI installs `ajv`, `ajv-formats`, and `js-yaml` with `--no-scripts` equivalent
      to prevent lifecycle script execution during validation.
- [ ] CodeQL analysis passes with no unresolved security-category findings.
- [ ] Dependabot is configured for both `github-actions` and `npm` ecosystems.
- [ ] No credentials, API keys, or personal tokens appear anywhere in the
      repository (verified by searching for common patterns).
- [ ] SECURITY.md reporting process is current and the contact email is valid.

---

## Plugin trust / supply chain

- [ ] Every plugin in `generators/` was authored by the maintainer or reviewed
      against the vendor's official documentation before merge.
- [ ] Plugin YAML files are validated against the meta-schema in CI before any
      merge to `main` — no plugin can land without passing the validator.
- [ ] No plugin file contains executable code (JS, Python, shell, etc.) — only
      YAML data conforming to the meta-schema.
- [ ] The `docsUrl` field in each plugin points to the actual vendor
      documentation page that was consulted; the link resolves.
- [ ] For Phase 2 (community registry): each plugin entry in the registry index
      carries a SHA-256 content hash; the app verifies the hash on load before
      rendering the plugin.
- [ ] For Phase 2: a tampered plugin (hash mismatch) produces a visible error
      and is not rendered.

---

## Performance

- [ ] `app/index.html` opens and renders the generator form in under 500 ms on
      a mid-range laptop from a local file server (no external network required).
- [ ] Switching generators is perceptibly instant (< 100 ms) because it only
      re-renders the form DOM, not re-fetching plugins.
- [ ] Prompt assembly on field change (the hot path) runs synchronously in < 5 ms
      for any plugin with ≤ 20 fields.
- [ ] The YAML plugin files are sized appropriately: no plugin should exceed
      ~15 KB (they are data, not code; larger files indicate scope creep).
- [ ] For the PWA (Phase 1): Lighthouse performance score ≥ 90 on mobile emulation.

---

## Reproducibility

- [ ] The same form state (same field values) on the same plugin version always
      produces byte-identical output — no randomness, no timestamps in the
      assembled prompt.
- [ ] Presets saved in localStorage replay byte-identical prompts (Acceptance
      Criterion 4 from ROADMAP.md Phase 1).
- [ ] History entries reference the plugin `id` and `version` so that a future
      major plugin update does not silently change what the stored entry meant.
- [ ] `node scripts/validate.mjs` is hermetic: its output depends only on
      the YAML files and the installed npm packages (no network calls, no clock).

---

## Documentation

- [ ] README accurately describes the current state of the project (PoC vs MVP
      status badge is correct).
- [ ] `docs/ARCHITECTURE.md` "Known limitations" section is up to date after
      any meta-schema or template engine change.
- [ ] Every ADR in `docs/adr/` has a Status field that is current.
- [ ] `docs/ROADMAP.md` acceptance criteria for the current phase are still
      checkable (not made obsolete by later changes).
- [ ] `CHANGELOG.md` Unreleased section reflects all user-visible changes since
      the last tagged release.
- [ ] Each plugin's `docsUrl` resolves and accurately describes the field/range
      it backs.

---

## Tests

- [ ] CI passes on `main` (green badge).
- [ ] All plugins pass structural validation (Ajv).
- [ ] All plugins pass semantic validation (`scripts/validate.mjs`).
- [ ] `html-validate` reports no errors or warnings on `app/index.html`.
- [ ] CodeQL reports no unresolved findings.
- [ ] Link checker (`links.yml`) reports no broken external links in docs.
- [ ] (Phase 1) Integration tests cover at least the two PoC acceptance criteria:
      Midjourney default-prompt shape and Stable Diffusion `dependsOn` toggle.

---

## Developer experience

- [ ] `make help` lists all targets with descriptions.
- [ ] `make setup && make lint` completes without errors on a clean checkout.
- [ ] CONTRIBUTING.md instructions for adding a plugin are accurate: copy,
      edit, validate locally, open PR.
- [ ] Pre-commit hooks run without errors on the current codebase
      (`pre-commit run --all-files` exits 0).
- [ ] Issue templates and PR template are present and accurate.
- [ ] `docs/KANBAN.md` reflects current actual work state (not stale).

---

## Licensing / provenance

- [ ] `LICENSE` (MIT) is present and the copyright year is current.
- [ ] No plugin YAML includes content copied from a vendor's documentation in
      a way that would constitute a derivative work — only structured data
      derived from reading the docs (flag names, value ranges, enum lists).
- [ ] CI dependencies (`ajv`, `ajv-formats`, `js-yaml`) have compatible
      open-source licenses (MIT / ISC — verified).
- [ ] No other dependencies are introduced.

---

## Accessibility (a11y / WCAG 2.1 AA)

- [ ] Every `<input>`, `<select>`, `<textarea>`, and `<button>` in the rendered
      form has an associated `<label>` with a correct `for`/`id` pairing.
- [ ] The generator `<select>` is keyboard-navigable and announces its current
      value to screen readers.
- [ ] Slider inputs (`<input type="range">`) expose their current value to AT
      via `aria-valuenow` or a visible text readout adjacent to the control.
- [ ] Hint/description text is linked to its input via `aria-describedby` or
      is adjacent in source order such that a screen reader reads it naturally.
- [ ] The "Copy" button indicates success to keyboard/AT users (e.g. changes
      label to "Copied!" for 1.5 s — verified with keyboard only, no mouse).
- [ ] Color contrast for all text/background combinations meets WCAG AA (4.5:1
      for normal text, 3:1 for large text) — checked with a contrast checker
      against the custom CSS variables.
- [ ] The warning state of the character counter (when prompt exceeds maxLength)
      uses more than color alone to communicate the issue (e.g. bold text or
      icon + text, not just a color change to `--warn`).
- [ ] The app is usable with keyboard only: Tab traverses all form controls in
      logical order; Enter/Space activates buttons; no keyboard trap exists.
- [ ] `html-validate` `a11y` rule set passes with no errors.
- [ ] Conditional fields (`dependsOn`) that appear/disappear do not cause focus
      loss in a confusing way — focus is managed or remains predictable.
