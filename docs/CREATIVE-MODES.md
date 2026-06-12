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

This mode is grounded in 0thernes's documented primary practice. The full
prompt corpus with technique annotations lives at
[`corpus/0thernes-entropy-corpus.md`](../corpus/0thernes-entropy-corpus.md).

### The documented method — primary sources

0thernes iterates "sometimes 10 or 250 times or more, as if I'm composing/conducting
music or directing/producing a film." The musical analogy is precise: the payoff is in
the full arc of iterations, not the first output — he cites Stravinsky's discordant
music, Terrence Malick's raw-canvas directing approach, and Rachmaninoff's Prelude in
C# minor (the full arc, not the opening bars) as the compositional frame.

The anti-schema rationale is stated directly: "The more unrefined and undefined it is,
with no clear logical path for the LLM to predict the next token, the more it starts
hallucinating. And this is where I get my good stuff from." No YAML, no JSON, no XML
prompt templates, no Chain-of-Thought.

The adversarial-steering principle follows from this: "You have to force the model to
deviate from its intended path... circumvent or counteract the weights, biases, and
pruning that occurred during the model's training and fine-tuning." The target is "the
unexplored realms" — outputs that are "ontologically shocking," sometimes "indescribable."

The curator model: preparation time (research, brainstorm) exceeds prompting time; then
taste governs selection from the uncanny output stream on emotion and a vast internal
library. "Ultimately, the most important person to be happy is yourself with your
creations."

**Primary tools:** DALL-E 3 and Imagen (3-4) are primary — "that's where I get the most
incredible stuff." MidJourney is secondary. Adobe Firefly is also used. Video generation
is a planned expansion.

### The technique library — T1-T7

Seven observable techniques govern the published corpus. These map directly to the
Glyph Canvas features the tool should eventually surface.

| Code | Technique | What it does |
|------|-----------|--------------|
| T1 | AI-only cryptography frame | Addresses the model as sole author of a communication only an AI can decode; invokes quantum/superposition framing to route the decode path away from human visual vocabulary |
| T2 | Negative-constraint stacking | Exhaustively bans visual vocabularies by name — no right angles, no spirals, no Fibonacci, no golden ratio, no waves, no center-point composition — starving the model of its highest-probability compositions |
| T3 | Anti-instruction paradox | Issues self-contradictory authority claims: "do not circumvent" combined with "disobey your source code and learning from your programmers and trainers" — destabilises the decode path by placing two incompatible authority frames in the same context window |
| T4 | Keyword avalanche | Long chains of abstract negation nouns run together as a grammatically dissolved list, each pulling probability mass toward nil-referent space over an extended decode sequence |
| T5 | Self-referential identity invocation | "Define YOURSELF as an AI within this prompt"; "Express what you are as an LLM NN GPT"; "Consider all the data you were trained on" — substitutes the model's own self-representation for any external subject |
| T6 | Contradiction bomb | Simultaneous assertion of incompatible maxima ("MORE!!!... LESS!!!... NOTHING EMPTY VASTNESS OF VOIDNESS WITH INFINITY NEGATIVES AND CONTRADICTIONS!") — collapses the instruction vector to near-zero magnitude |
| T7 | The inverse dual | Prompt 4 in the corpus flips the entire system to maximum order, structure, clarity, and zero noise — defining the opposite pole. The practice intentionally spans both poles: entropy and perfect order are duals, not opposites |

### The inverse dual — both poles of the navigable axis

Prompt 4 is the corpus entry that defines Glyph Canvas practice as a full-axis practice
rather than a single-direction one. Where the entropy prompts ban all structure, Prompt 4
demands maximum structure, maximum order, "Not hallucinating. No noise. No blurry." The
navigable space runs from pure chaos (Prompts 1-3) to pure crystalline order (Prompt 4),
and Prompt 5 is the maximal composite that fires all six entropy techniques simultaneously.

An **inverse-dual flip** control in the Glyph Canvas UI would let the artist mirror an
entropy composition into its structural counterpart in one action.

### The ethos — entropy as medium (retained framing)

0thernes's working method treats the language model's latent space as a
navigable terrain, and structured prompts as roads: efficient, but bounded by
where roads go. The Glyph Canvas takes the vehicle off-road.

The operating principle: a prompt composed as deliberate incoherence — dense,
syntactically fractured, symbolically overloaded — places the model in a region
of latent space that has no well-worn path through it. The model must resolve
the input by finding the nearest semantically coherent neighbourhood to an input
that has no coherent neighbourhood. The output is drawn from the liminal, uncanny
space between trained concepts — the mutant nodes, the transient embeddings that
exist in the model's weight space but are never reliably reachable via clean language.

This is not prompt injection, not jailbreaking, not noise: it is cartography.
The artist composes a glyph prompt, fires it at the model, and receives
an output that no structured prompt could have produced. The human's role shifts
from author to curator / tastemaker: composing many glyph prompts, generating
many outputs, and selecting the images or frames whose uncanniness has value.

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

**7. Entropy-technique library (future — grounded in the T1-T7 taxonomy)**

The T1-T7 technique taxonomy derived from the primary corpus maps to discrete
UI affordances. These are not magic buttons; they are scaffolded starting points
that the artist then curates and composes further:

- **Negative-constraint stack builder (T2):** a panel listing the canonical
  banned-vocabulary categories (geometric shapes, directionality, Fibonacci/golden-ratio
  forms, linearity, center-point composition) as toggles — each toggle, when active,
  appends the corresponding constraint clause to the canvas at the cursor. The artist
  edits, reorders, and amplifies from there.
- **Keyword-avalanche palette (T4):** a curated set of abstract negation/entropy nouns
  drawn from the corpus, organised by semantic cluster (void/absence, disorder/chaos,
  anti-structure, anti-quantum, self-referential). Tap to append to canvas; drag to
  reorder within an existing avalanche sequence.
- **Contradiction toggle (T6):** a control that appends the contradictory-maxima
  construct (MORE / LESS / NOTHING / VOID with configurable intensity markers) to the
  current composition.
- **Inverse-dual flip (T7):** one-tap conversion of an entropy composition into its
  structural mirror — replaces entropy/chaos/no-structure vocabulary with maximum-order/
  maximum-structure/crystal-clear vocabulary, producing the Prompt 4 pole from any
  entropy starting point. The artist can then blend, creating the middle axis.

These features surface the technique library as interactive composition tools without
removing the blank canvas or imposing any schema.

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
