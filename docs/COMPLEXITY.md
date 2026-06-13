# Complexity Analysis — Big-O Time and Space

This document gives the asymptotic time and space complexity of every major
operation in Prompt Architect's structured mode, with worked examples for a
realistic "Everything"-tier plugin.

Variable definitions used throughout:

| Symbol | Meaning |
|--------|---------|
| F | number of fields in the plugin |
| T | length of `promptTemplate` in characters |
| O\_out | length of the assembled output string |
| S | size of the JSON Schema (number of schema nodes) |
| V | number of field nodes in the `dependsOn` DAG (= F) |
| E | number of directed dependency edges (sum of all `dependsOn` array lengths) |
| C | number of `computedTokens` |
| I\_c | number of `when` conditions across all `computedTokens` |

---

## Operation table

| Operation | Time | Space | Source |
|-----------|------|-------|--------|
| **Form render** — `buildForm()` | O(F) | O(F) | One DOM node per field; one state entry per field. |
| **Visibility check** — `isVisible(field, state)` per field | O(conditions on that field) | O(1) | Linear scan of `dependsOn[]`. |
| **Full visibility sweep** — all fields on each input event | O(E) ≤ O(F²) | O(1) | Sum over all `dependsOn` arrays; worst case every field depends on every other. |
| **Build byKey map** — `Object.fromEntries(fields.map(...))` | O(F) | O(F) | One entry per field in the engine. |
| **Resolve computed tokens** — `resolveComputedTokens()` | O(C + I\_c) | O(C) | Linear scan; at most C entries in result map. |
| **Template expansion** — `expandTemplate()` | O(T) | O(O\_out) | Single regex replace pass over the template string. |
| **Post-process** — collapse whitespace + trim | O(O\_out) | O(O\_out) | Split by newline, regex per line, rejoin. |
| **maxLength check** | O(1) | O(1) | Scalar integer comparison. |
| **Full `assemble()` call** | O(F + C + I\_c + T) | O(F + C + O\_out) | Dominating terms combined. |
| **Schema validation** — Ajv structural (CI only) | O(S) | O(S) | Ajv validates each schema node once; S is the compiled schema size. |
| **Semantic lint** — `scripts/validate.mjs` | O(F + T + C + E) | O(F + C) | Token-integrity scan + DAG cycle check (DFS O(V+E)). |
| **`dependsOn` DAG cycle check** | O(V + E) = O(F + E) | O(F) | Depth-first search over fields and dependency edges. |

All operations are at most linear in the sizes listed. There are no nested
loops over fields × template characters, no recursive template expansion
(sections do not nest), and no graph traversal at runtime (only at validate
time in CI).

---

## Dominant term at runtime

During live editing the hot path is:

```
assemble(plugin, state)
  buildByKey          O(F)
  resolveComputed     O(C + I_c)
  expandTemplate      O(T)
  post-process        O(O_out)
```

For all real plugins T ≫ F (the template is longer than the field count) and
O\_out ≤ T, so the dominant term is **O(T)**. Because T is bounded by
`outputRules.maxLength` (e.g. 2000 chars for Midjourney) the assemble call is
effectively O(1) for any fixed generator, and imperceptible to the user.

---

## Worked example — a hypothetical 50-field "Everything"-tier plugin

Realistic upper bound: an "Everything"-tier image plugin (see
[MODALITIES.md](MODALITIES.md)) exposing every known parameter for a complex
generator.

| Quantity | Assumed value |
|----------|--------------|
| F (fields) | 50 |
| E (dependsOn edges total) | 20 (many fields have no deps; a handful have 1–3) |
| C (computedTokens) | 5 |
| I\_c (total `when` conditions across all computed tokens) | 10 |
| T (promptTemplate length) | 800 chars |
| O\_out (assembled output) | 400 chars (roughly half the template, after empty sections collapse) |
| S (schema nodes, Ajv compile, CI only) | ~150 (the generator.schema.json is ~235 lines) |

### Time per `assemble()` call

| Step | Operations (approx.) |
|------|----------------------|
| buildByKey | 50 map entries |
| resolveComputedTokens | 5 + 10 = 15 condition evaluations |
| expandTemplate regex passes | ~800 chars × 4 regex passes (section blocks × 2 phases + scalars × 2 phases) |
| post-process | ~400 chars |
| **Total** | **~3 600 elementary operations** |

At browser JS speeds (billions of elementary operations per second) this is
well under 1 ms. The DOM show/hide loop adds O(E) = 20 condition evaluations —
negligible.

### Space

| Structure | Entries |
|-----------|---------|
| `byKey` map | 50 entries |
| `computedMap` | ≤ 5 entries |
| intermediate template string | ≤ 800 chars |
| assembled output string | ≤ 400 chars |
| **Total heap additions per call** | **~1 255 JS values** |

All temporaries are GC-eligible immediately after `assemble()` returns. No
persistent per-call allocations.

### Validation (CI, not runtime)

| Check | Operations |
|-------|-----------|
| Ajv structural validate | O(S) ≈ 150 |
| Token-integrity scan | O(F + T) ≈ 850 |
| DAG cycle check (DFS) | O(V + E) = O(50 + 20) = 70 |
| parameterOrder vs template order | O(F + T) ≈ 850 |
| **Total** | **≈ 1 920 operations** |

---

## Why there is no worse-case concern

1. **No nested sections.** The template engine explicitly does not allow
   `{{#a}}{{#b}}…{{/b}}{{/a}}` nesting. All section blocks are flat, so
   template expansion is a single linear pass regardless of the number of
   fields.

2. **`dependsOn` is a DAG, not a general graph.** The schema allows
   conditions only over sibling fields, and CI rejects cycles. The runtime
   visibility sweep is O(E) in the total number of dependency edges, never
   exponential.

3. **`parameterOrder` is pre-declared.** The engine does not sort at runtime.
   Flag ordering is a property of the static plugin file, not a runtime
   computation.

4. **Computed tokens are O(C + I\_c), never nested.** Computed-token
   conditions reference fields, not other computed tokens, so resolution is
   always a single-pass scan.

5. **maxLength is O(1).** The overflow check is a scalar integer comparison
   after the string is built; `truncate` strategy is a single `slice(0, N)`.

---

## Space summary

| Structure | Lifetime | Size |
|-----------|----------|------|
| Plugin object (in-memory after load) | session | O(F + C + T) |
| `byKey` map (per `assemble()` call) | call | O(F) |
| `computedMap` (per call) | call | O(C) |
| DOM form nodes | session | O(F) |
| `state` object | session | O(F) |
| Output string | call | O(O\_out) ≤ O(T) |

Total persistent memory per plugin: **O(F + C + T)** — entirely dominated by
the plugin object itself. For the 50-field example this is on the order of a
few kilobytes.

---

## Cross-links

- Engine implementation: [`app/engine.js`](../app/engine.js)
- Data model and entity relationships: [`ERD.md`](ERD.md)
- Modality coverage and complexity tiers: [`MODALITIES.md`](MODALITIES.md)
- Architecture and design rationale: [`ARCHITECTURE.md`](ARCHITECTURE.md)
