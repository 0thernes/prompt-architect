# FAQ — Prompt Architect

**Q: What exactly does Prompt Architect do?**

It is a form-to-prompt compiler. You pick a target AI generator (e.g. Midjourney,
Stable Diffusion, Suno), fill out a structured form with that generator's actual
parameters, and the app assembles the correctly formatted prompt string for you
to paste. It never calls any generator API itself — it only constructs the text.

---

**Q: Why not just ask an LLM to write my prompt for me?**

Because LLMs hallucinate flags that do not exist, go stale the moment a vendor
ships an update, and spend tokens on every query. Prompt Architect is
deterministic: the same inputs always produce the same output, the parameters
come directly from the plugin YAML (which can be corrected with a one-line
data edit), and it costs nothing to run.

---

**Q: Is there any AI involved at runtime?**

No. This is a hard design constraint, not a temporary limitation. The app is a
pure data-driven form renderer and template engine. The word "AI" in "AI generator"
refers to the target tools you are building prompts for — Prompt Architect itself
makes zero model calls. See ARCHITECTURE.md for the full rationale.

---

**Q: How do I try it right now?**

Open `app/index.html` in any modern browser from the local filesystem. No
install, no server, no account. The current PoC has two generators: Midjourney
and Stable Diffusion (A1111 format). More generators ship in Phase 1 (MVP).

---

**Q: What generators are planned?**

Phase 1 targets 8–10 generators spanning image, video, and audio modalities:
Midjourney, Stable Diffusion (FLUX and DALL·E variants), Runway, Luma, Suno,
Udio, Meshy (3D), and Skybox (world builder). See `docs/KANBAN.md` and
`docs/ROADMAP.md` for the current state.

---

**Q: How do I add a generator plugin?**

Copy an existing YAML from `generators/`, author fields against the contract
in `schemas/generator.schema.json` (every property has inline documentation),
run `node scripts/validate.mjs` locally, and open a PR. You do not need to
write any code. See `CONTRIBUTING.md` for the full checklist.

---

**Q: What happens when a generator vendor changes their parameters?**

Edit the YAML, bump the plugin's `version` field, update `lastVerified`, open
a PR. That is the entire maintenance path — no code change, no release, no
rebuild. The `lastVerified` field exists specifically so CI can flag plugins
that have not been re-checked in more than 90 days.

---

**Q: The generated prompt is wrong for a specific generator — what do I do?**

File a bug report using the GitHub issue template. Include which generator,
the field values you set, the incorrect output, and what the output should be.
Bonus: link to the vendor documentation page that specifies the correct
parameter format.

---

**Q: Is this usable as a daily driver today?**

At PoC (v0.1.0): it demonstrates the concept solidly for two generators. It is
not yet a daily driver because the plugin set is small and presets/history have
not landed. Phase 1 (MVP) is the intended first daily-drivable milestone. Honest
caveat: the vendor parameter landscape moves fast; any plugin may drift stale
within weeks of a vendor update.

---

**Q: Will there ever be a hosted version, accounts, or cloud sync?**

No, by design. The app is a static file that runs locally or from any static
host (GitHub Pages, your own server, local disk). Accounts and server-side
storage are explicit non-goals in every roadmap phase. Preset and history data
stays in your browser's localStorage; export/import to a JSON file is planned
for Phase 2.

---

**Q: What is the project's status and who maintains it?**

PoC, v0.1.0, single maintainer (0thernes). The schema and two reference plugins
are functional; MVP work is in progress. The project is open to plugin
contributions now — no code knowledge required. See `docs/KANBAN.md` for
current work state.
