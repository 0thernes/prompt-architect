# T-007 — Preset save/load per generator (localStorage)

## Context

ROADMAP.md Phase 1 scope explicitly includes "Preset save/load per generator
(localStorage), prompt history with the plugin id+version recorded per entry."
This card covers the preset half; T-008 covers history.

A preset is a named snapshot of all form field values for a particular generator.
Use case: a user has tuned a Midjourney landscape workflow (specific style refs,
high stylize, wide AR) and wants to recall it without re-entering 12 fields.
Presets are stored under a namespaced localStorage key per generator `id`, not
in cookies or any server-side store.

The Phase 1 acceptance criteria state: "Presets survive a browser restart;
history entries replay byte-identical prompts."

## Acceptance criteria

- [ ] A "Save preset" button in the UI opens a small input to name the preset.
- [ ] Saving stores `{ name, fieldValues, pluginId, pluginVersion, savedAt }`
      under `promptArchitect.presets.<pluginId>[]` in `localStorage`.
- [ ] A "Load preset" dropdown (visible when at least one preset exists for the
      current generator) lists saved presets by name; selecting one populates
      all form fields and re-assembles the prompt.
- [ ] Presets survive a browser restart (localStorage persistence verified).
- [ ] Switching to a different generator does not show or accidentally apply
      presets from the previous one.
- [ ] A "Delete preset" affordance removes the entry from localStorage.
- [ ] If a saved preset references a field key no longer present in the plugin
      (plugin updated), the load still works — unknown keys are silently skipped,
      a notice is shown: "Some saved fields were not found in the current plugin
      version."
- [ ] No `innerHTML` is used when rendering preset names; only `textContent`.

## Definition of Done

- All acceptance criteria checked.
- `app/logger.js` logs a `preset_saved` and `preset_loaded` event (see
  `docs/OBSERVABILITY.md` schema).
- Manual test: save a Midjourney preset, reload the browser, load it, confirm
  the assembled prompt is identical to when it was saved.
- CHANGELOG.md updated.

## Estimate

M (1 day)

## Dependencies

T-001 (runtime plugin loader) — presets reference `pluginId`; the loader must
be in place so IDs are stable. Does not depend on T-008 (history).
