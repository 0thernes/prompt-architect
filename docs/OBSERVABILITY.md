# Observability — Prompt Architect

## Context

Prompt Architect is a static, client-side PWA with no backend and no telemetry
sent off-device. "Observability" here means structured console output from
`app/logger.js` that a developer can read in the browser DevTools during local
use or debugging. There are no remote sinks, no analytics endpoints, and no
log files on disk — which also satisfies the project's "no accounts, no
server-side anything" design constraint.

---

## Logger module: `app/logger.js`

A lightweight, level-gated structured logger for browser context. Each call
writes a single JSON string to `console.log` / `console.warn` / `console.error`
so DevTools' "Filter" box can parse it with `JSON.parse(event.message)` or the
built-in JSON viewer.

### Log levels

| Level | Numeric | When to use |
|-------|---------|-------------|
| `DEBUG` | 10 | Verbose tracing: template token expansion, individual field evaluation |
| `INFO` | 20 | Normal lifecycle events: plugin loaded, form ready, preset saved |
| `WARN` | 30 | Recoverable issues: stale plugin (lastVerified > 90 days), prompt near maxLength |
| `ERROR` | 40 | Failures requiring user attention: plugin structural validation failed, YAML parse error |

The effective log level defaults to `INFO` in production and `DEBUG` when
`localStorage.promptArchitect.logLevel = "DEBUG"` is set. Level filtering is
done in the module before any `console.*` call.

---

## Structured log field schema

Every log entry is a JSON object with these fields:

```json
{
  "ts":      "2026-06-11T14:22:07.543Z",  // ISO 8601 UTC — always present
  "level":   "INFO",                        // DEBUG | INFO | WARN | ERROR
  "event":   "plugin_loaded",              // snake_case event name — always present
  "plugin":  "midjourney",                 // plugin id — when applicable
  "version": "1.0.0",                      // plugin version — when applicable
  "msg":     "Plugin loaded successfully", // human-readable summary
  // ... additional event-specific fields (see event catalogue below)
}
```

Fields `ts`, `level`, `event`, and `msg` are present in every entry.
All other fields are event-specific and optional.

---

## Event catalogue

| Event | Level | Extra fields | Description |
|-------|-------|-------------|-------------|
| `app_init` | INFO | `pluginCount` | Logger and app initialised; N plugins available |
| `plugin_load_start` | DEBUG | `plugin`, `url` | Fetch of a YAML plugin file started |
| `plugin_loaded` | INFO | `plugin`, `version`, `fieldCount` | Plugin parsed and validated successfully |
| `plugin_validation_error` | ERROR | `plugin`, `url`, `errors[]` | Structural or semantic validation failure on plugin load |
| `plugin_parse_error` | ERROR | `plugin`, `url`, `cause` | YAML parse error (malformed file) |
| `plugin_stale` | WARN | `plugin`, `lastVerified`, `daysSince` | Plugin `lastVerified` is > 90 days ago |
| `generator_selected` | INFO | `plugin`, `version` | User switched to a different generator |
| `form_ready` | DEBUG | `plugin`, `fieldCount` | Form rendered with all fields visible |
| `field_changed` | DEBUG | `plugin`, `field`, `value` | A field value changed (value omitted if type=string to avoid logging user content) |
| `prompt_assembled` | DEBUG | `plugin`, `charCount`, `overLimit` | Prompt re-assembled; whether it exceeds maxLength |
| `prompt_copied` | INFO | `plugin`, `charCount` | User clicked Copy; prompt placed on clipboard |
| `preset_saved` | INFO | `plugin`, `presetName` | A named preset was saved to localStorage |
| `preset_loaded` | INFO | `plugin`, `presetName`, `skippedKeys[]` | A preset was loaded; `skippedKeys` lists fields no longer in the plugin |
| `preset_deleted` | INFO | `plugin`, `presetName` | A preset was removed from localStorage |
| `history_entry_added` | DEBUG | `plugin`, `version`, `charCount` | A prompt was added to history |
| `service_worker_registered` | INFO | `scope` | PWA service worker installed (Phase 1) |
| `service_worker_error` | WARN | `cause` | Service worker registration failed; app still works offline-capable via cache |

---

## Privacy

No log entry includes the content of the assembled prompt or the raw values
of free-text string fields (subject, lyrics, etc.). The `field_changed` event
logs the field key and, for non-string types (numbers, booleans, enums), the
value — because range/enum values carry no user-authored creative content.
String fields log only that they changed, not what they contain.

This is a deliberate design decision: the logger exists for debugging
plugin-loading and form-rendering issues, not for capturing user work.

---

## logs/ directory convention

The `logs/` directory in this repo is a placeholder maintained by `logs/.gitkeep`.
Log files (`*.log`) are gitignored. Their intended use:

- **CI runs:** GitHub Actions writes step output to its own log storage; no
  files are written to `logs/` during CI.
- **Future CLI / local validator tool:** if a headless validation script is
  ever run outside CI (e.g. in a pre-release batch check), it may write a
  `logs/validate-YYYY-MM-DD.log` with one JSON line per plugin, using the same
  event schema above (substituting `console.log` with `fs.appendFileSync`).

For the browser app, the `logs/` directory is irrelevant at runtime — all
output goes to the DevTools console.
