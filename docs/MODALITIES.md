# Modalities — Coverage Map

Prompt Architect targets five output modalities. For each modality this
document records: which tools are in scope, the art-school concept taxonomy
that underlies their option surfaces, how those concepts map to plugin field
types, and the three complexity tiers that make the full control surface
opt-in rather than mandatory.

---

## The art-school insight

Every major generator UI is, at its core, an art-school vocabulary surfaced as
form fields. "Bokeh" is not a magic word — it is shallow depth-of-field caused
by a fast prime lens. "Cinematic" is not a vibe — it is a combination of
anamorphic lens distortion, a specific colour grade, a 2.39:1 crop, and
motion-blur consistent with a 180° shutter. Midjourney's `--stylize` slider is
a dial between photographic literalism and painterly abstraction: an art
director's familiarity with that dial comes from knowing where Rembrandt sits
versus a commercial catalogue shot.

The plugin model exposes these concepts honestly — label them with the
art-school term, describe what they do, and let the complexity tier system
decide how much to show at once.

---

## Complexity tiers

Most users bounce off a generator's full option surface. The three tiers make
the firehose opt-in and keep the core experience fast.

| Tier | Who it's for | What is shown |
|------|-------------|---------------|
| **Simple** | First-time users, quick experiments | Subject/concept, style preset, aspect ratio / duration. 3–5 fields at most. |
| **Advanced** | Regular users who know what they want | All fields that affect the result meaningfully, grouped by category (composition, lighting, etc.). Defaults hidden only when omitIfDefault is set. |
| **Everything** | Power users who own the entire parameter set | All fields including edge-case flags, experimental options, and raw override strings. The firehose, deliberately opt-in. |

Plugin authors tag each field with a `tier` hint (`simple` / `advanced` /
`everything`). The renderer shows only fields at or below the active tier.
This is a planned meta-schema extension; the current schema accepts all fields
at the `Everything` level until the tier field is added.

---

## Modality 1 — Image

### Tools in scope

Midjourney, Stable Diffusion / AUTOMATIC1111, FLUX (Black Forest Labs),
DALL·E, Ideogram, Adobe Firefly, Krea, Freepik Mystic / Pikaso, Leonardo.Ai.

### Art-school concept taxonomy → field types

| Concept group | Examples | Field type |
|---------------|---------|-----------|
| **Subject / concept** | what is depicted | `string` (required, multiline) |
| **Style / medium** | oil painting, vector, photograph, render | `enum` or `multi` |
| **Composition** | rule of thirds, central subject, negative space, dutch angle | `enum` |
| **Aspect ratio** | 1:1, 16:9, 4:5, 2:3 | `enum` |
| **Lighting** | golden hour, Rembrandt, hard rim, flat key, neon, bioluminescent | `enum` or `multi` |
| **Colour palette / grade** | muted, high-contrast, analogue film, duotone | `enum` or free `string` |
| **Lens / focal length** | 35mm, 85mm portrait, fisheye, macro, tilt-shift | `enum` |
| **Depth of field** | f/1.4 shallow, f/11 landscape, forced perspective | `enum` |
| **Camera distance / shot type** | extreme close-up, medium shot, wide establishing | `enum` |
| **Rendering engine / renderer** | octane, unreal, blender cycles, keyshot | `enum` or `multi` |
| **Artist / reference** | in the style of … (tool-permitting) | `string` |
| **Negative prompt** | what to exclude (A1111, FLUX, DALL·E) | `string` multiline |
| **Stylize / creativity** | Midjourney `--stylize`, Firefly strength | `number` with range |
| **Chaos / variety** | Midjourney `--chaos` | `number` with range |
| **Seed** | reproducibility pin | `number` |
| **Steps / CFG scale** | A1111 inference controls | `number` with range |
| **Sampler** | Euler a, DPM++ SDE, DDIM | `enum` |
| **LoRA / model weights** | fine-tune identifiers | `string` or `multi` |
| **Version / model** | MJ v7, FLUX Schnell vs Dev | `enum` |
| **Output resolution** | width × height in px | `number` pair |
| **Hires. fix / upscale** | A1111 two-pass upscale | `boolean` + conditional group |

### Notes

- Fields that only exist in one tool ship in that tool's plugin; the schema
  allows arbitrary field sets.
- Midjourney's `--niji` flag is a flag-rename of `--v`; the *computed tokens*
  feature (T-002) handles this cleanly once shipped.
- Freepik Mystic and Krea expose style-transfer and inpainting controls that
  require an image upload; the schema's `string` type with a `mode: file-uri`
  extension will handle this in a future meta-schema minor.

---

## Modality 2 — Video

### Tools in scope

Runway Gen-3 Alpha / Gen-4, Sora, Pika, Luma Dream Machine, Kling, Hailuo,
Minimax Video, Krea Video.

### Art-school concept taxonomy → field types

| Concept group | Examples | Field type |
|---------------|---------|-----------|
| **Prompt / scene description** | what is happening | `string` multiline |
| **Shot type** | ECU, MS, wide, aerial, POV | `enum` |
| **Camera movement** | dolly in, crane up, handheld, orbit, static | `enum` or `multi` |
| **Movement speed / easing** | slow, fast, smooth, snap | `enum` |
| **Lens / focal emulation** | 24mm anamorphic, 85mm, drone fisheye | `enum` |
| **Lighting / time of day** | magic hour, overcast, neon night, studio | `enum` |
| **Colour grade / film stock** | Kodak 5219, bleach-bypass, high-contrast | `enum` or `string` |
| **Motion style** | cinematic, hyperrealistic, stylised, animated | `enum` |
| **Duration** | seconds | `number` with range |
| **Aspect ratio** | 16:9, 9:16, 4:3, 1:1 | `enum` |
| **Frame rate** | 24, 30, 60 fps | `enum` |
| **Seed** | reproducibility | `number` |
| **Image reference / init frame** | first-frame or last-frame anchor | `string` (URI) |
| **Style reference** | style-transfer weight | `number` with range |
| **Negative prompt** | Pika, Kling exclusions | `string` |
| **Motion intensity** | Kling, Luma strength dial | `number` with range |
| **Loop / hold** | end-hold, ping-pong, seamless loop | `boolean` + `enum` |
| **Model version** | Runway Gen-3 vs Gen-4, Pika 2.0 | `enum` |

### Notes

- Sora's native interface exposes scene, style, and cinematography as a single
  prose prompt; the plugin models this as a guided multiline string with
  cinematic presets.
- Runway uses separate "text prompt" + "motion preset" fields — both modelled
  as distinct plugin fields.
- First-frame/last-frame image inputs are a "file-uri" field type extension
  (not yet in the schema; tracked as a meta-schema minor).

---

## Modality 3 — 3D

### Tools in scope

Meshy, Tripo3D, Shap-E, CSM (Common Sense Machines), Luma Genie, Spline AI.

### Art-school concept taxonomy → field types

| Concept group | Examples | Field type |
|---------------|---------|-----------|
| **Object / subject** | what to generate | `string` |
| **Output type** | mesh, rigged character, scene, texture-only | `enum` |
| **Topology style** | low-poly, high-poly, subdivision-ready | `enum` |
| **Polygon budget** | triangle count target | `number` with range |
| **Surface / material** | PBR metallic-rough, toon, matte clay | `enum` |
| **Texturing mode** | textureless / baked UV / procedural | `enum` |
| **Reference image** | init-from-image | `string` (URI) |
| **Symmetry** | bilateral, radial, none | `enum` |
| **Scale / real-world size** | metres | `number` |
| **Export format** | GLB, OBJ, FBX, USD | `enum` |
| **Seed** | reproducibility | `number` |
| **Remesh** | post-process retopo | `boolean` |
| **Rig** | auto-rig for humanoid | `boolean` |

---

## Modality 4 — Music / Audio

### Tools in scope

Suno (v3/v4), Udio, Stable Audio, MusicGen (Meta), AudioCraft, ElevenLabs
music mode, Mureka.

### Art-school concept taxonomy → field types

| Concept group | Examples | Field type |
|---------------|---------|-----------|
| **Lyric prompt / concept** | thematic content, mood, story | `string` multiline |
| **Custom lyrics** | verbatim lyrics (Suno/Udio) | `string` multiline |
| **Genre** | lo-fi hip-hop, death metal, bossa nova | `enum` or free `string` |
| **Sub-genre / style tags** | bedroom pop, cinematic orchestral, glitchcore | `multi` or free `string` |
| **Tempo / BPM** | target BPM | `number` with range |
| **Key / mode** | C major, A minor, Dorian | `enum` |
| **Time signature** | 4/4, 3/4, 7/8 | `enum` |
| **Instrumentation** | piano, synthesizer, live drums, strings | `multi` |
| **Vocal style** | male tenor, female breathy, choir, no vocals | `enum` |
| **Vocal effect** | dry, reverb, autotune, harmonised | `multi` |
| **Energy / intensity** | calm, moderate, intense, chaotic | `enum` |
| **Era / decade** | 1970s, 1990s grunge era, futuristic | `enum` or `string` |
| **Duration / sections** | intro + verse + chorus structure | `string` or `number` |
| **Instrumental only** | no vocals | `boolean` |
| **Continuation** | extend-from clip reference | `string` (URI) |
| **Negative style** | exclude genres or instruments (Udio) | `string` |
| **Seed** | reproducibility | `number` |
| **Model version** | Suno v3 Chirp / v4, Udio 130 | `enum` |

### Notes

- Suno's `[Verse]`, `[Chorus]`, `[Bridge]` meta-tags in the lyric field are
  modelled as a structured sub-template inside the `custom_lyrics` field
  description, not as separate schema fields — keeping the plugin flat.
- BPM works as a `number` field; genre + style tag combination works best as
  two separate `multi` fields (one enumerated, one free-form) to give the model
  enough signal without over-constraining.

---

## Modality 5 — Worlds

### Tools in scope

Skybox AI (Blockade Labs), SkyboxAI by Polycam, Spatialized / Luma Scene,
Masterpiece Studio (environment mode), Promethean AI, WorldGen (research-stage).

World-vibing tools — generative game engines, AI-assisted level design,
procedural narrative worlds (NovelAI, AI Dungeon, Latitude) — are an
**acknowledged stretch goal**. The schema's modality enum already includes
`"world"` and the architecture can accommodate a world-building plugin; the
concept taxonomy below is the design sketch for when tooling matures enough
to warrant authoring plugins.

### Art-school concept taxonomy → field types

| Concept group | Examples | Field type |
|---------------|---------|-----------|
| **Environment / biome** | temperate forest, alien ocean floor, megacity | `string` or `enum` |
| **Time of day** | dawn, midday, dusk, night | `enum` |
| **Weather / atmosphere** | clear, overcast, rain, fog, sandstorm | `enum` |
| **Architectural style** | brutalist, gothic, solarpunk, ruins | `enum` or `multi` |
| **Colour / mood** | warm, desaturated, neon-drenched | `enum` |
| **Scale** | intimate village, planetary vista | `enum` |
| **360° projection** | equirectangular, cubemap | `enum` |
| **Skybox style** | photorealistic, painted, stylised | `enum` |
| **Game genre reference** | open-world RPG, horror, sci-fi colony | `enum` or `string` |
| **Seed** | reproducibility | `number` |

---

## Plugin coverage plan

| Tool | Modality | Phase | Status |
|------|----------|-------|--------|
| Midjourney | image | PoC | done — `generators/midjourney.yaml` |
| Stable Diffusion (A1111) | image | PoC | done — `generators/stable-diffusion.yaml` |
| Runway Gen-3/4 | video | MVP | T-003 |
| Suno v4 | audio | MVP | T-004 |
| Luma Dream Machine | video | MVP | T-005 |
| DALL·E 3 | image | MVP | T-006 |
| Udio | audio | MVP | T-016 |
| Meshy | 3d | v1 | T-017 |
| Skybox AI | world | v1 | T-018 |
| Pika | video | backlog | — |
| FLUX | image | backlog | — |
| Krea | image/video | backlog | — |
| Freepik Mystic | image | backlog | — |
| Stable Audio | audio | backlog | — |
| Tripo3D | 3d | backlog | — |
