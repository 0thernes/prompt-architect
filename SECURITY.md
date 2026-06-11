# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x (PoC) | Current development line |

## Threat model (what this project is and is not)

Prompt Architect is a static, client-side application with **no backend, no
accounts, no telemetry and no network calls at runtime**. The PoC runs from
`file://`. The relevant attack surface is therefore small and specific:

- **Malicious plugin content.** Plugins are inert YAML data — never executed.
  The renderer inserts all plugin-derived strings via `textContent`/DOM APIs,
  not `innerHTML` (the single `innerHTML` use is a fixed label + a static
  marker, never plugin data). Field values end up only inside a `<pre>` text
  node and the clipboard. Keeping plugins non-executable is a hard design rule
  (ADR 0002); any PR weakening it should be treated as a security regression.
- **Clipboard.** The app writes to the clipboard only on an explicit user
  click and never reads it.
- **Supply chain.** No runtime dependencies exist. CI installs `ajv`,
  `ajv-formats` and `js-yaml` at pinned major versions for validation only;
  they never ship to users.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to **0_0@0thernes.art** with
"SECURITY: Prompt Architect" in the subject. Include reproduction steps and,
if relevant, the plugin file involved.

- Acknowledgement target: within 72 hours.
- Fix or mitigation target: within 14 days for anything affecting the rendered
  app; plugin-data corrections ship as fast as a YAML edit.
- Please do not open public issues for unpatched vulnerabilities; coordinated
  disclosure is appreciated and will be credited in the changelog.
