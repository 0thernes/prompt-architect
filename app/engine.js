/**
 * app/engine.js — Prompt Architect template engine.
 *
 * Pure ESM module; works in browser (type="module") and in Node (node:test).
 * Zero dependencies. No DOM references.
 *
 * Public API:
 *   assemble(plugin, values) → { text: string, charCount: number, overLimit: boolean }
 *
 * Plugin shape (subset consumed here):
 *   plugin.fields[]            — field descriptors
 *   plugin.promptTemplate      — mustache-lite template string
 *   plugin.outputRules         — parameterOrder, separator, listSeparator,
 *                                maxLength, overflowStrategy, collapseWhitespace, trim
 *   plugin.computedTokens[]?   — declarative flag-rename / computed-flag rules
 *
 * Template syntax:
 *   {{key}}           — substitute formatted value ('' when field is unset)
 *   {{#key}}…{{/key}} — section: emit body only when field isSet()
 *                       Sections may contain tokens; they do NOT nest.
 *   {{=key}}          — substitute a computed-token value by id
 *   {{#=key}}…{{/=key}} — conditional section keyed on a computed token being set
 *
 * Algorithm (single linear pass where possible):
 *   1. Build byKey map from plugin.fields (O(fields)).
 *   2. Build byComputedId map from plugin.computedTokens (O(computedTokens)).
 *   3. Expand template in one replace pass (O(template)):
 *      a. Section blocks {{#k}}…{{/k}} → '' or body (resolved recursively in body).
 *      b. Scalar tokens {{k}} → formatValue(field).
 *      c. Computed-token section blocks {{#=k}}…{{/=k}} → '' or body.
 *      d. Computed-token scalars {{=k}} → computed value string.
 *   4. Post-process: collapseWhitespace, trim (O(output)).
 *   5. maxLength check (O(1)).
 */

/* ------------------------------------------------------------------ helpers */

/**
 * Evaluate a single dependsOn condition against the current values map.
 * @param {{ field: string, operator: string, value?: * }} cond
 * @param {Object} values  — key→raw value map
 * @returns {boolean}
 */
function evalCondition(cond, values) {
  const v = values[cond.field];
  switch (cond.operator) {
    case "equals":    return v === cond.value;
    case "notEquals": return v !== cond.value;
    case "in":        return Array.isArray(cond.value) && cond.value.includes(v);
    case "notIn":     return Array.isArray(cond.value) && !cond.value.includes(v);
    case "gte":       return Number(v) >= cond.value;
    case "lte":       return Number(v) <= cond.value;
    case "truthy":    return Boolean(v);
    default:          return false;
  }
}

/**
 * True when the field should be visible given the current values (all dependsOn
 * conditions satisfied, or no dependsOn).
 * @param {{ dependsOn?: Array }} field
 * @param {Object} values
 * @returns {boolean}
 */
function isVisible(field, values) {
  if (!field.dependsOn || field.dependsOn.length === 0) return true;
  return field.dependsOn.every((c) => evalCondition(c, values));
}

/**
 * True when the field contributes a value to the output.
 * A field is "set" when it is:
 *   - visible (all dependsOn conditions hold)
 *   - not undefined/null
 *   - not the empty string
 *   - not the boolean false (for boolean type)
 *   - not equal to its default when omitIfDefault is true
 *   - not an empty array (for multi type)
 * @param {{ key: string, type: string, default?: *, omitIfDefault?: boolean }} field
 * @param {Object} values
 * @param {string} listSeparator
 * @returns {boolean}
 */
function isSet(field, values, _listSeparator) {
  if (!isVisible(field, values)) return false;
  const v = values[field.key];
  if (v === undefined || v === null) return false;
  if (field.type === "boolean") return v === true;
  if (field.type === "multi") return Array.isArray(v) && v.length > 0;
  if (String(v).trim() === "") return false;
  if (field.omitIfDefault && v === field.default) return false;
  return true;
}

/**
 * Format a field's value as a string ready for template insertion.
 * Returns '' when the field is not set.
 * @param {{ key: string, type: string, default?: *, omitIfDefault?: boolean }} field
 * @param {Object} values
 * @param {string} listSeparator
 * @returns {string}
 */
function formatValue(field, values, listSeparator) {
  if (!isSet(field, values, listSeparator)) return "";
  const v = values[field.key];
  if (field.type === "multi") return v.join(listSeparator);
  return String(v).trim();
}

/* ----------------------------------------- computed-token resolution ------
 *
 * A computedToken entry has:
 *   id        string   — token name referenced as {{=id}} in the template
 *   emit      string   — literal string to emit when the condition holds
 *   when[]    Array<condition>  — conditions evaluated against values
 *
 * If all conditions in `when` hold, the computed token is "set" and its
 * value is the `emit` string.
 * If `when` is absent or empty, the token is always set.
 */

/**
 * Resolve all computed tokens for the current values.
 * @param {Array<{ id: string, emit: string, when?: Array }>} computedTokens
 * @param {Object} values
 * @returns {Map<string, string>}  id → resolved emit string (only when set)
 */
function resolveComputedTokens(computedTokens, values) {
  const map = new Map();
  for (const ct of computedTokens) {
    const conditions = ct.when || [];
    const active = conditions.length === 0 || conditions.every((c) => evalCondition(c, values));
    if (active) map.set(ct.id, ct.emit);
  }
  return map;
}

/* ----------------------------------------- template expansion ------------ */

/**
 * Expand {{=id}} and {{#=id}}…{{/=id}} computed-token references inside a string.
 * Called on the body string after regular section expansion.
 * @param {string} str
 * @param {Map<string, string>} computedMap
 * @returns {string}
 */
function expandComputedTokens(str, computedMap) {
  // Computed-token section blocks {{#=id}}…{{/=id}}
  str = str.replace(/\{\{#=([a-z][a-z0-9_]*)\}\}([\s\S]*?)\{\{\/=\1\}\}/g,
    (_, id, body) => computedMap.has(id) ? expandComputedTokens(body, computedMap) : "");
  // Computed-token scalars {{=id}}
  str = str.replace(/\{\{=([a-z][a-z0-9_]*)\}\}/g,
    (_, id) => computedMap.has(id) ? computedMap.get(id) : "");
  return str;
}

/**
 * Expand the template string given resolved field and computed-token data.
 * Two-phase:
 *   Phase 1: section blocks ({{#key}}…{{/key}} and {{#=key}}…{{/=key}})
 *   Phase 2: scalar substitutions ({{key}} and {{=key}})
 *
 * @param {string} template
 * @param {Object} byKey       — field key → field descriptor
 * @param {Object} values      — field key → raw value
 * @param {string} listSeparator
 * @param {Map<string, string>} computedMap
 * @returns {string}
 */
function expandTemplate(template, byKey, values, listSeparator, computedMap) {
  // Phase 1a: regular conditional sections {{#key}}…{{/key}}
  let txt = template.replace(
    /\{\{#([a-z][a-z0-9_]*)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key, body) => {
      const field = byKey[key];
      if (field && isSet(field, values, listSeparator)) {
        // Expand tokens inside the body
        return body
          .replace(/\{\{([a-z][a-z0-9_]*)\}\}/g,
            (__, k) => byKey[k] ? formatValue(byKey[k], values, listSeparator) : "");
      }
      return "";
    }
  );

  // Phase 1b: computed-token section blocks {{#=id}}…{{/=id}}
  txt = txt.replace(
    /\{\{#=([a-z][a-z0-9_]*)\}\}([\s\S]*?)\{\{\/=\1\}\}/g,
    (_, id, body) => computedMap.has(id) ? body : ""
  );

  // Phase 2a: scalar field tokens {{key}}
  txt = txt.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g,
    (_, key) => byKey[key] ? formatValue(byKey[key], values, listSeparator) : "");

  // Phase 2b: computed-token scalars {{=id}}
  txt = txt.replace(/\{\{=([a-z][a-z0-9_]*)\}\}/g,
    (_, id) => computedMap.has(id) ? computedMap.get(id) : "");

  return txt;
}

/* ----------------------------------------------------------------- public  */

/**
 * Assemble a prompt string from a plugin descriptor and a values map.
 *
 * @param {Object} plugin   — generator plugin object (see schema)
 * @param {Object} values   — { [fieldKey]: rawValue }
 * @returns {{ text: string, charCount: number, overLimit: boolean }}
 */
export function assemble(plugin, values) {
  const rules = plugin.outputRules || {};
  const listSeparator = rules.listSeparator ?? ", ";
  const separator = rules.separator ?? " ";

  // O(fields): build lookup map
  const byKey = Object.fromEntries(plugin.fields.map((f) => [f.key, f]));

  // O(computedTokens): resolve computed flags
  const computedMap = resolveComputedTokens(plugin.computedTokens || [], values);

  // O(template): expand the template
  let txt = expandTemplate(
    plugin.promptTemplate,
    byKey,
    values,
    listSeparator,
    computedMap
  );

  // O(output): post-process
  if (rules.collapseWhitespace !== false) {
    // Collapse runs of horizontal whitespace on each line; preserve newlines.
    txt = txt.split("\n")
      .map((line) => line.replace(/[ \t]+/g, separator).trim())
      .join("\n");
  }
  if (rules.trim !== false) {
    txt = txt.trim();
  }

  const charCount = txt.length;
  const maxLength = rules.maxLength ?? null;
  const overLimit = maxLength !== null && charCount > maxLength;

  if (overLimit && rules.overflowStrategy === "truncate" && maxLength) {
    txt = txt.slice(0, maxLength);
  }

  return { text: txt, charCount, overLimit };
}

/**
 * Evaluate field visibility — exported so app/index.html can reuse the
 * same logic for DOM show/hide without duplicating it.
 * @param {{ dependsOn?: Array }} field
 * @param {Object} values
 * @returns {boolean}
 */
export { isVisible, isSet, formatValue };
