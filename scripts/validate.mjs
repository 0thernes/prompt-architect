#!/usr/bin/env node
/**
 * Plugin validator for Prompt Architect.
 *
 * Layer 1 — structural: every generators/*.yaml must validate against
 *           schemas/generator.schema.json (JSON Schema draft 2020-12 via Ajv).
 * Layer 2 — semantic: rules a JSON Schema cannot express:
 *           - field keys are unique
 *           - every {{token}} / {{#section}} in promptTemplate names a declared field
 *           - outputRules.parameterOrder lists every field key exactly once
 *           - token first-occurrence order in the template respects parameterOrder
 *           - enum/multi defaults reference declared option values
 *           - number defaults fall inside their declared range
 *           - dependsOn conditions reference declared fields (and not themselves)
 *
 * Usage: node scripts/validate.mjs        (exit 0 = all plugins valid)
 * Deps (CI installs them ad hoc; not vendored): ajv@8 ajv-formats js-yaml
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(root, "schemas", "generator.schema.json");
const generatorsDir = path.join(root, "generators");

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateStructure = ajv.compile(JSON.parse(readFileSync(schemaPath, "utf8")));

let errors = 0;
const fail = (file, msg) => { errors++; console.error(`  ERROR  [${file}] ${msg}`); };

const optionValues = (field) =>
  (field.options || []).map((o) => (typeof o === "object" ? o.value : o));

function semanticChecks(file, plugin) {
  const keys = plugin.fields.map((f) => f.key);
  const keySet = new Set(keys);
  if (keySet.size !== keys.length)
    fail(file, `duplicate field keys: ${keys.filter((k, i) => keys.indexOf(k) !== i).join(", ")}`);

  // --- template tokens ---
  const tokenRe = /\{\{([#/]?)([a-z][a-z0-9_]*)\}\}/g;
  const firstSeen = [];
  for (const m of plugin.promptTemplate.matchAll(tokenRe)) {
    const [, prefix, key] = m;
    if (!keySet.has(key)) fail(file, `template token '{{${prefix}${key}}}' has no matching field`);
    if (prefix !== "/" && !firstSeen.includes(key)) firstSeen.push(key);
  }
  // unbalanced sections: every {{#k}} needs a {{/k}} and vice versa
  const opens = [...plugin.promptTemplate.matchAll(/\{\{#([a-z0-9_]+)\}\}/g)].map((m) => m[1]);
  const closes = [...plugin.promptTemplate.matchAll(/\{\{\/([a-z0-9_]+)\}\}/g)].map((m) => m[1]);
  for (const k of opens) if (!closes.includes(k)) fail(file, `section '{{#${k}}}' is never closed`);
  for (const k of closes) if (!opens.includes(k)) fail(file, `'{{/${k}}}' closes a section that was never opened`);

  // --- parameterOrder is the single source of truth for ordering ---
  const order = plugin.outputRules.parameterOrder;
  for (const k of order)
    if (!keySet.has(k)) fail(file, `parameterOrder entry '${k}' has no matching field`);
  for (const k of keys)
    if (!order.includes(k)) fail(file, `field '${k}' missing from parameterOrder`);
  let prev = -1;
  for (const k of firstSeen) {
    const idx = order.indexOf(k);
    if (idx === -1) continue; // already reported above
    if (idx < prev)
      fail(file, `template emits '${k}' out of canonical order (see outputRules.parameterOrder)`);
    prev = Math.max(prev, idx);
  }

  // --- per-field invariants ---
  for (const f of plugin.fields) {
    if ((f.type === "enum" || f.type === "multi") && f.default !== undefined) {
      const vals = optionValues(f);
      const defaults = f.type === "multi" ? (Array.isArray(f.default) ? f.default : [f.default]) : [f.default];
      for (const d of defaults)
        if (!vals.includes(d)) fail(file, `field '${f.key}' default '${d}' is not a declared option`);
    }
    if (f.type === "number" && typeof f.default === "number" && f.range) {
      if (f.default < f.range.min || f.default > f.range.max)
        fail(file, `field '${f.key}' default ${f.default} outside range [${f.range.min}, ${f.range.max}]`);
    }
    for (const c of f.dependsOn || []) {
      if (!keySet.has(c.field)) fail(file, `field '${f.key}' dependsOn unknown field '${c.field}'`);
      if (c.field === f.key) fail(file, `field '${f.key}' cannot depend on itself`);
    }
  }
}

const files = readdirSync(generatorsDir).filter((f) => /\.ya?ml$/i.test(f)).sort();
if (files.length === 0) { console.error("No plugins found in generators/"); process.exit(1); }

for (const file of files) {
  console.log(`Validating ${file} ...`);
  let plugin;
  try {
    plugin = yaml.load(readFileSync(path.join(generatorsDir, file), "utf8"));
  } catch (e) {
    fail(file, `YAML parse error: ${e.message}`);
    continue;
  }
  if (!validateStructure(plugin)) {
    for (const e of validateStructure.errors)
      fail(file, `${e.instancePath || "(root)"} ${e.message}`);
    continue; // semantic checks assume a structurally valid plugin
  }
  semanticChecks(file, plugin);
}

if (errors > 0) {
  console.error(`\n${errors} error(s) across ${files.length} plugin(s).`);
  process.exit(1);
}
console.log(`\nOK — ${files.length} plugin(s) structurally and semantically valid.`);
