# Creative Modes

Prompt Architect provides two first-class creative modes. They are not tiers
of the same workflow — they are genuinely different creative philosophies, and
both are native citizens of the application.

---

## Mode 1 — Structured (Schema-Driven)

The default mode. A plugin describes a generator's parameter set; the renderer
draws a form; the user fills it; the template engine assembles the native
prompt string. Deterministic, reproducible, auditable.

This is the mode documented in [ARCHITECTURE.md](ARCHITECTURE.md) and covered
by the existing schema. It serves users who want control surfaces they can
understand, learn from, and repeat — the power user who wants to know that
`--stylize 750` means something specific and that changing it to `850` will
predictably shift the result toward more stylised interpretation.

The complexity tier system (Simple / Advanced / Everything, documented in
[MODALITIES.md](MODALITIES.md)) makes this mode accessible to beginners without
removing depth. At the `Everything` tier, the structured form exposes every
known parameter for a generator; at `Simple`, it collapses to the three or four
controls that determine 80% of outcomes.

**Characteristic outputs:** consistent, predictable, directly reusable. The
same form state produces the same prompt bytes every time. Suitable for
production work, client briefs, or any workflow where reproducibility matters.

---

## Mode 2 — Glyph Canvas (Entropy Mode)

The Glyph Canvas is a freeform prompt composition surface — no schema, no
structured fields, no template engine. It is a blank canvas whose input medium
is the full breadth of Unicode: the 140,000+ codepoints of the Unicode
Standard, every emoji, every symbol block, every script, every archaic glyph,
every miscellaneous technical character, rendered with user-specified colour and
font-weight tagging.

This mode is grounded in 0thernes's documented avant-garde practice.

### The ethos — entropy as medium

0thernes's working method treats the language model's latent space as a
navigable terrain, and structured prompts as roads: efficient, but bounded by
where roads go. The Glyph Canvas takes the vehicle off-road.

The operating principle: a prompt composed as deliberate incoherence — dense,
syntactically fractured, symbolically overloaded, coloured, mixed-script,
half-glyph — places the model in a region of latent space that has no
well-worn path through it. The model must resolve the input by finding the
nearest semantically coherent neighbourhood to an input that has no coherent
neighbourhood. The output is drawn from the liminal, uncanny space between
trained concepts — the mutant nodes, the transient embeddings that exist in
the model's weight space but are never reliably reachable via clean language.

This is not prompt injection, not jailbreaking, not noise: it is cartography.
The artist composes a glyph prompt, fires it at the model, and receives
an output that no structured prompt could have produced. The human's role shifts
from author to curator / tastemaker: composing many glyph prompts, generating
many outputs, and selecting the images or frames whose uncanniness has value.

The 0thernes "entropies" prompt — the example that defines this practice — is
formatted to push a model into an *ontological shocking and discordant
incoherent mess that only the AI itself resolves*. Entropy and chaos are the
medium; resolution is the model's act.

### Near-zero-shot random walks

A structured prompt makes a point-query of the model's latent space. A glyph
prompt makes a random walk from a poorly-defined starting position. With low
guidance scale or high temperature, the walk has more degrees of freedom. With
dense Unicode input, the starting position is genuinely ambiguous — the model
has to commit to a trajectory without the usual signposts. This is the source
of the uncanny output: not randomness, but the model's own aesthetic resolution
of an unresolvable input.

### What the Glyph Canvas tooling must provide

The structured mode's schema infrastructure is deliberately absent here. The
Glyph Canvas needs a different set of tools:

**1. The input surface**
- A large, high-contrast text area styled for Unicode composition — not a
  standard form input. Monospace or mixed-width rendering; correct handling of
  combining characters, bidirectional text, and emoji variation selectors.
- No schema validation, no field labels, no template preview. The output of
  the canvas IS the prompt, verbatim.

**2. Unicode / emoji / symbol palette**
- A searchable picker covering the Unicode blocks most useful for glyph
  composition: Mathematical Alphanumeric Symbols, Miscellaneous Technical,
  Braille Patterns, Box Drawing, Dingbats, Emoticons, Enclosed Alphanumerics,
  Ancient Scripts, IPA Extensions, Modifier Letters, and the full emoji set.
- Block-browser navigation: scroll by Unicode block; tap to insert at cursor.
- Recent-glyphs and favourites shelf.

**3. Colour tagging**
- Inline colour markup for prompt text: `[text|#hexcolor]` or similar syntax
  that the generator's input (or the copy-paste flow) can strip, while the
  canvas renders it coloured for the composer.
- Palette of composer-chosen colours; eyedropper / hex input.
- Colour is a composition tool, not a generator instruction — it helps the
  artist see structure in visual chaos before sending.

**4. Font-weight and style tags**
- Bold, italic, strikethrough, underline as composition markers — again,
  visual aids for the composer, stripped before transmission.
- The goal is to let the artist lay out the glyph-prompt as a visual artefact
  in its own right before it becomes machine input.

**5. Save and curate**
- Named saves for glyph prompts: a title, a tag set, and the raw Unicode text.
- No schema required; storage is a flat JSON array in localStorage (same
  mechanism as structured presets).
- Output history: every glyph prompt that produced a saved result can be
  stored with a thumbnail or a note linking back to the generator output.
- Export as plain text (for pasting) or as a styled HTML fragment (for sharing
  the composition visually).

**6. Transmission**
- **Copy (raw):** strips colour/weight tags, copies clean Unicode to clipboard.
- **Copy (with markers):** copies the full tagged representation, for generators
  or interfaces that can interpret it.
- No template engine, no parameter ordering, no max-length enforcement —
  the artist decides what is too long.

### Glyph Canvas and the schema

The Glyph Canvas does not use `generators/*.yaml` plugins. It is a parallel
mode, not a plugin type. A `"freeform"` plugin concept may eventually allow
generators to self-describe basic metadata (which Unicode blocks are useful,
typical effective length, models that respond well to glyph prompts) without
imposing field structure — but the canvas surface itself is always schema-free.

See [generator.schema.json](../schemas/generator.schema.json) for the note on
the `"freeform"` plugin type extension.

---

## Mode comparison

| Dimension | Structured | Glyph Canvas |
|-----------|-----------|--------------|
| Input surface | Schema-driven form | Freeform Unicode text area |
| Output | Template-assembled prompt string | Raw composed text (verbatim) |
| Reproducibility | Exact — same form state, same prompt | Intentionally non-reproducible |
| Validation | Three-layer (schema, semantic, runtime) | None — intentional |
| Creative role | Author → form → deterministic output | Composer → glyph artefact → curated selection |
| Suitable for | Production, client work, learning the tool | Experimental, avant-garde, uncanny/liminal output |
| Plugin required | Yes | No |
| Complexity tier | Simple / Advanced / Everything | N/A — the artist owns the complexity |
| Primary user | Power user with a clear target | Entropy artist / curator |

Both modes are first-class. The UI top-level toggle between them is a
single control; switching modes does not discard work in the other mode.

---

## Implementation notes

The PoC and MVP phases focus on the structured mode. The Glyph Canvas is
scoped as a parallel track starting in MVP late-stage, with the Unicode palette
and basic save/curate as the first deliverables (T-019, T-020). Full colour
tagging and export tooling land in v1 (T-021, T-022).

See [ROADMAP.md](ROADMAP.md) and [KANBAN.md](KANBAN.md) for current task
status.
