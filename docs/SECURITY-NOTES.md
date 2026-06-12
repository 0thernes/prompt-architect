# Security notes — Prompt Architect

This document describes the assets worth protecting, the trust model, the
relevant risk categories, and the safeguards in place or planned for each.
It is a defensive, constructive document — the goal is to document what the
project does to stay safe, not to provide a recipe for attacking it.

---

## Assets to protect

1. **User-authored creative content** — the subjects, prompts, lyrics, and
   style descriptions a user types into the form. These may be early-stage
   creative work the user considers private.
2. **User presets and history** (Phase 1+) — named form states and prompt
   history stored in the browser's `localStorage`. Leaking these would expose
   a user's creative workflow.
3. **The plugin corpus** — the `generators/*.yaml` files. Corrupted or
   maliciously crafted plugins could produce misleading or harmful output.
4. **The meta-schema** — `schemas/generator.schema.json`. If tampered, the CI
   gate would fail silently or incorrectly admit bad plugins.
5. **The renderer** — `app/index.html`. A compromised renderer could
   exfiltrate clipboard content or inject unwanted content into the UI.

---

## Trust model and trust boundaries

```
Untrusted                          Trust boundary            Trusted
─────────────────────────────────────────────────────────────────────
Community plugin YAML ──────────► CI gate (Ajv + semantic lint)
                                         │
                                         ▼
User-supplied form values ──────► App DOM (textContent only)
                                         │
                                         ▼
Clipboard write (user-initiated) ◄─── Assembled prompt text
─────────────────────────────────────────────────────────────────────
Runtime network ──────────────── None (static app, no fetch at runtime)
```

The key trust boundary is the CI gate: only YAML that passes both structural
and semantic validation can land in `generators/`. In the browser, all
plugin-derived strings cross a second boundary — the renderer — which enforces
`textContent`-only insertion.

---

## Risk categories and mitigations

### 1. Community plugin YAML as untrusted input

**Risk:** A contributed plugin could attempt to inject HTML, JavaScript, or
other executable content into the UI through plugin-derived string values
(field labels, descriptions, enum option text, template output).

**Safeguards in place:**
- The renderer inserts all plugin-derived strings exclusively via
  `textContent` and DOM attribute setters. There is no `innerHTML` path that
  accepts plugin or user data. The single `innerHTML` use in the current code
  is for a fixed structural label containing no plugin input.
- The CI gate (Ajv) validates that all plugin fields are the correct types
  (string, number, boolean, array of known shapes). A field that should be a
  number cannot be a script tag.
- The semantic validator checks that template tokens reference declared fields,
  so a crafted template cannot reference arbitrary JavaScript expressions.
- Plugin files are pure YAML data — no executable format. The YAML parser
  (`js-yaml`) is configured in safe mode (default), which disallows `!!js/...`
  type tags that could execute code during parsing.

**Planned (Phase 2):**
- Content hashing: each plugin in the community registry carries a SHA-256
  hash. The app verifies the hash before rendering the plugin; a mismatch
  causes a visible refusal, not silent loading.
- Plugin signing for first-party plugins.

---

### 2. Safe template assembly

**Risk:** The template engine substitutes user-controlled field values into a
prompt string. If this string were ever injected into the DOM as HTML, it would
be a stored XSS vector.

**Safeguards in place:**
- The assembled prompt is placed into a `<pre id="output">` element via
  `textContent` only, not `innerHTML`. The browser treats the content as plain
  text regardless of what characters it contains.
- The clipboard write (`navigator.clipboard.writeText`) takes the raw text
  string, not HTML. No HTML serialization occurs.
- `outputRules.collapseWhitespace` and `trim` are applied before the prompt
  reaches the output node, but these are pure string operations with no HTML
  semantics.
- The character counter reads `.length` of the same plain text string.

**Planned:**
- The future history store (T-008) will serialize prompt text as a JSON string
  value, not as HTML. When rendered back from history, it will use `textContent`.

---

### 3. Safe rendering of user-provided field values in the form UI

**Risk:** User-typed content (especially the freeform "Subject / scene" field)
could contain characters that, if unsafely rendered, produce unexpected UI
behavior.

**Safeguards in place:**
- Form inputs are standard `<textarea>` and `<input>` elements. Their `value`
  property is the user's raw text; the browser's built-in form rendering never
  interprets the value as HTML.
- The renderer never writes user-typed values back into the DOM via `innerHTML`.
  The live preview (`<pre id="output">`) uses `textContent`.
- The `app/logger.js` module deliberately omits string field values from log
  events to avoid capturing user creative content in the console.

---

### 4. Supply chain (CI dependencies)

**Risk:** The CI pipeline installs `ajv`, `ajv-formats`, and `js-yaml` ad hoc.
A compromised package version could run arbitrary code during CI.

**Safeguards in place:**
- All three packages are pinned to their current major version (`ajv@8`,
  `ajv-formats@3`, `js-yaml@4`). A major-version bump requires a deliberate
  code change, not just a lock file update.
- `npm install --no-audit --no-fund` is used in CI to reduce noise; security
  advisories for these packages are monitored via Dependabot.
- None of these packages are ever served to end users — they exist only in the
  CI runner during validation.
- The `github/codeql-action` and `lycheeverse/lychee-action` action versions
  are pinned; Dependabot watches `github-actions` ecosystem for updates.

**Planned:**
- Pin CI action versions to exact SHAs (not just tags) once the project reaches
  community-facing status.

---

### 5. Browser storage (localStorage)

**Risk:** Preset and history data (Phase 1+) stored in `localStorage` is
accessible to any JavaScript running on the same origin. If the app were ever
served from a shared origin hosting other content, that content could read it.

**Safeguards in place:**
- The app is designed to run from its own dedicated origin (or `file://` for
  local use). Mixing it with unrelated content on the same origin is not a
  supported deployment pattern.
- All localStorage keys are namespaced under `promptArchitect.*` to reduce
  accidental collision.
- No sensitive authentication material is ever stored — only creative work
  the user has explicitly saved.

---

### 6. Clipboard

**Risk:** A malicious page on another tab could attempt to read clipboard content.

**Safeguards in place:**
- The app writes to the clipboard only on an explicit user gesture (button
  click). It never reads the clipboard.
- Browser clipboard APIs are permission-gated; the app does not request
  read clipboard permission.

---

## Out of scope

- Server-side injection, SSRF, authentication bypass, session fixation — the
  app has no server, no accounts, and no network calls at runtime.
- Prompt injection against a downstream AI generator — by design, Prompt
  Architect only assembles text for the user to review and paste. The user
  is always in the loop before anything reaches a generator.
