/**
 * tests/engine.test.mjs — unit tests for app/engine.js
 *
 * Run: node --test tests/
 *
 * Uses Node built-ins only: node:test + node:assert (no extra deps).
 * Covers:
 *   1. Token substitution
 *   2. Section blocks ({{#key}}…{{/key}})
 *   3. omitIfDefault — MJ defaults assemble to minimal string
 *   4. dependsOn gating — SD hires_upscaler only when hires_fix is on
 *   5. parameterOrder canonical ordering (not enforced by engine, enforced by
 *      validate.mjs; engine test confirms it follows template order)
 *   6. maxLength + overflow: warn, truncate
 *   7. Computed token — --niji flag rename ({{=id}} scalar + {{#=id}} section)
 *   8. isVisible / isSet exports
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assemble, isVisible, isSet } from "../app/engine.js";

/* ---------------------------------------------------------------- fixtures */

/** Minimal Midjourney-like plugin. */
const MJ = {
  id: "midjourney-test",
  name: "Midjourney (test)",
  modality: "image",
  version: "1.0.0",
  fields: [
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "style_refs", label: "Style refs", type: "string" },
    { key: "negative", label: "Negative", type: "string" },
    { key: "aspect_ratio", label: "AR", type: "enum", default: "1:1",
      options: ["1:1","16:9","9:16"] },
    { key: "niji_version", label: "Niji", type: "enum", default: "none",
      omitIfDefault: true, options: [
        { value: "none", label: "Off" },
        { value: "6", label: "Niji 6" },
        { value: "5", label: "Niji 5" },
      ] },
    { key: "model_version", label: "Model", type: "enum", default: "7",
      options: [{ value: "7", label: "v7" }, { value: "6.1", label: "v6.1" }],
      dependsOn: [{ field: "niji_version", operator: "equals", value: "none" }] },
    { key: "stylize", label: "Stylize", type: "number", default: 100,
      omitIfDefault: true, range: { min: 0, max: 1000, step: 10 } },
    { key: "chaos", label: "Chaos", type: "number", default: 0,
      omitIfDefault: true, range: { min: 0, max: 100, step: 1 } },
    { key: "seed", label: "Seed", type: "number",
      range: { min: 0, max: 4294967295, step: 1 } },
  ],
  promptTemplate:
    "{{subject}}{{#style_refs}} --sref {{style_refs}}{{/style_refs}}" +
    "{{#negative}} --no {{negative}}{{/negative}}" +
    " --ar {{aspect_ratio}}" +
    "{{#=niji_flag}} {{=niji_flag}} {{niji_version}}{{/=niji_flag}}" +
    "{{#model_version}} --v {{model_version}}{{/model_version}}" +
    "{{#stylize}} --stylize {{stylize}}{{/stylize}}" +
    "{{#chaos}} --chaos {{chaos}}{{/chaos}}" +
    "{{#seed}} --seed {{seed}}{{/seed}}",
  computedTokens: [
    {
      id: "niji_flag",
      emit: "--niji",
      description: "Active when niji_version is not 'none'.",
      when: [{ field: "niji_version", operator: "notEquals", value: "none" }],
    },
  ],
  outputRules: {
    parameterOrder: ["subject","style_refs","negative","aspect_ratio",
                     "niji_version","model_version","stylize","chaos","seed"],
    separator: " ",
    listSeparator: ", ",
    maxLength: 2000,
    overflowStrategy: "warn",
    collapseWhitespace: true,
    trim: true,
  },
};

/** Minimal Stable-Diffusion-like plugin (dependsOn + no maxLength). */
const SD = {
  id: "sd-test",
  name: "SD (test)",
  modality: "image",
  version: "1.0.0",
  fields: [
    { key: "positive_prompt", label: "Prompt", type: "string", required: true },
    { key: "negative_prompt", label: "Negative", type: "string" },
    { key: "steps", label: "Steps", type: "number", default: 20,
      range: { min: 1, max: 150, step: 1 } },
    { key: "sampler", label: "Sampler", type: "enum", default: "DPM++ 2M Karras",
      options: ["DPM++ 2M Karras","Euler a","DDIM"] },
    { key: "cfg_scale", label: "CFG", type: "number", default: 7,
      range: { min: 1, max: 30, step: 0.5 } },
    { key: "seed", label: "Seed", type: "number", default: -1,
      range: { min: -1, max: 4294967295, step: 1 } },
    { key: "width", label: "Width", type: "number", default: 1024,
      range: { min: 256, max: 2048, step: 64 } },
    { key: "height", label: "Height", type: "number", default: 1024,
      range: { min: 256, max: 2048, step: 64 } },
    { key: "hires_fix", label: "Hires fix", type: "boolean", default: false },
    { key: "hires_upscaler", label: "Hires upscaler", type: "enum",
      default: "R-ESRGAN 4x+",
      options: ["Latent","R-ESRGAN 4x+","ESRGAN_4x"],
      dependsOn: [{ field: "hires_fix", operator: "truthy" }] },
  ],
  promptTemplate:
    "{{positive_prompt}}{{#negative_prompt}}\nNegative prompt: {{negative_prompt}}{{/negative_prompt}}\n" +
    "Steps: {{steps}}, Sampler: {{sampler}}, CFG scale: {{cfg_scale}}, " +
    "Seed: {{seed}}, Size: {{width}}x{{height}}" +
    "{{#hires_fix}}, Hires upscaler: {{hires_upscaler}}{{/hires_fix}}",
  computedTokens: [],
  outputRules: {
    parameterOrder: ["positive_prompt","negative_prompt","steps","sampler",
                     "cfg_scale","seed","width","height","hires_fix","hires_upscaler"],
    separator: " ",
    listSeparator: ", ",
    overflowStrategy: "warn",
    collapseWhitespace: true,
    trim: true,
  },
};

/* ===================================================================
   1. Token substitution
   =================================================================== */
describe("token substitution", () => {
  it("substitutes a required string field", () => {
    const { text } = assemble(MJ, {
      subject: "a red fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
    });
    assert.ok(text.startsWith("a red fox"), `got: ${text}`);
  });

  it("substitutes enum field values", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "16:9",
      niji_version: "none",
      model_version: "7",
    });
    assert.ok(text.includes("--ar 16:9"), `got: ${text}`);
    assert.ok(text.includes("--v 7"), `got: ${text}`);
  });

  it("leaves {{key}} blank for unset optional string field", () => {
    // style_refs not provided → section collapses, no --sref in output
    const { text } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
    });
    assert.ok(!text.includes("--sref"), `got: ${text}`);
  });
});

/* ===================================================================
   2. Section blocks  {{#key}}…{{/key}}
   =================================================================== */
describe("section blocks", () => {
  it("emits section body when the field is set", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      style_refs: "https://example.com/a.png",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
    });
    assert.ok(text.includes("--sref https://example.com/a.png"), `got: ${text}`);
  });

  it("collapses section body when the field is empty string", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      style_refs: "",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
    });
    assert.ok(!text.includes("--sref"), `got: ${text}`);
  });

  it("collapses section body when the field is undefined", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
    });
    assert.ok(!text.includes("--sref"), `got: ${text}`);
  });

  it("emits negative section when negative is set", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      negative: "text, watermark",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
    });
    assert.ok(text.includes("--no text, watermark"), `got: ${text}`);
  });
});

/* ===================================================================
   3. omitIfDefault — MJ defaults assemble to minimal string
   =================================================================== */
describe("omitIfDefault", () => {
  it("omits --stylize when value equals default (100)", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
      stylize: 100,   // default → omitted
      chaos: 0,       // default → omitted
    });
    assert.ok(!text.includes("--stylize"), `got: ${text}`);
    assert.ok(!text.includes("--chaos"), `got: ${text}`);
  });

  it("emits --stylize when value differs from default", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
      stylize: 750,
    });
    assert.ok(text.includes("--stylize 750"), `got: ${text}`);
  });

  it("emits --chaos when non-zero", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
      chaos: 40,
    });
    assert.ok(text.includes("--chaos 40"), `got: ${text}`);
  });

  it("minimal MJ prompt has no optional flags at defaults", () => {
    const { text } = assemble(MJ, {
      subject: "a fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
      stylize: 100,
      chaos: 0,
    });
    // Should be: "a fox --ar 1:1 --v 7"
    assert.equal(text, "a fox --ar 1:1 --v 7");
  });
});

/* ===================================================================
   4. dependsOn gating — SD hires_upscaler only when hires_fix is on
   =================================================================== */
describe("dependsOn gating", () => {
  it("hires_upscaler is hidden when hires_fix is false", () => {
    const { text } = assemble(SD, {
      positive_prompt: "a cat",
      steps: 20,
      sampler: "DPM++ 2M Karras",
      cfg_scale: 7,
      seed: -1,
      width: 1024,
      height: 1024,
      hires_fix: false,
      hires_upscaler: "R-ESRGAN 4x+",
    });
    assert.ok(!text.includes("Hires upscaler"), `got: ${text}`);
  });

  it("hires_upscaler appears when hires_fix is true", () => {
    const { text } = assemble(SD, {
      positive_prompt: "a cat",
      steps: 20,
      sampler: "DPM++ 2M Karras",
      cfg_scale: 7,
      seed: -1,
      width: 1024,
      height: 1024,
      hires_fix: true,
      hires_upscaler: "R-ESRGAN 4x+",
    });
    assert.ok(text.includes("Hires upscaler: R-ESRGAN 4x+"), `got: ${text}`);
  });

  it("isVisible returns false for dependsOn-gated field when condition not met", () => {
    const field = SD.fields.find((f) => f.key === "hires_upscaler");
    assert.equal(isVisible(field, { hires_fix: false }), false);
  });

  it("isVisible returns true for dependsOn-gated field when condition met", () => {
    const field = SD.fields.find((f) => f.key === "hires_upscaler");
    assert.equal(isVisible(field, { hires_fix: true }), true);
  });

  it("model_version is invisible when niji_version is not 'none'", () => {
    const field = MJ.fields.find((f) => f.key === "model_version");
    assert.equal(isVisible(field, { niji_version: "6" }), false);
    assert.equal(isVisible(field, { niji_version: "none" }), true);
  });
});

/* ===================================================================
   5. parameterOrder canonical ordering
      The engine follows template order; we verify that the assembled
      string has tokens in the order declared in the template (which
      validate.mjs enforces matches parameterOrder).
   =================================================================== */
describe("parameter ordering", () => {
  it("MJ output has subject before --ar before --v", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "16:9",
      niji_version: "none",
      model_version: "7",
    });
    const iSubject = text.indexOf("fox");
    const iAr = text.indexOf("--ar");
    const iV = text.indexOf("--v");
    assert.ok(iSubject < iAr, `subject should precede --ar: ${text}`);
    assert.ok(iAr < iV, `--ar should precede --v: ${text}`);
  });

  it("SD output has positive_prompt before Steps before Seed", () => {
    const { text } = assemble(SD, {
      positive_prompt: "a wolf",
      steps: 20,
      sampler: "DPM++ 2M Karras",
      cfg_scale: 7,
      seed: 42,
      width: 1024,
      height: 1024,
      hires_fix: false,
    });
    const iPrompt = text.indexOf("a wolf");
    const iSteps = text.indexOf("Steps:");
    const iSeed = text.indexOf("Seed:");
    assert.ok(iPrompt < iSteps, `prompt before Steps: ${text}`);
    assert.ok(iSteps < iSeed, `Steps before Seed: ${text}`);
  });

  it("optional flags appear in declared order: stylize before chaos before seed", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
      stylize: 500,
      chaos: 20,
      seed: 99999,
    });
    const iStylize = text.indexOf("--stylize");
    const iChaos = text.indexOf("--chaos");
    const iSeed = text.indexOf("--seed");
    assert.ok(iStylize < iChaos, `--stylize before --chaos: ${text}`);
    assert.ok(iChaos < iSeed, `--chaos before --seed: ${text}`);
  });
});

/* ===================================================================
   6. maxLength + overflow strategies
   =================================================================== */
describe("maxLength and overflow", () => {
  it("overLimit is false when text is within maxLength", () => {
    const { text, charCount, overLimit } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
    });
    assert.ok(charCount <= 2000);
    assert.equal(overLimit, false);
  });

  it("overLimit is true and text unchanged for 'warn' strategy", () => {
    // Build a plugin with tiny maxLength=10 and warn strategy
    const tiny = {
      ...MJ,
      outputRules: { ...MJ.outputRules, maxLength: 10, overflowStrategy: "warn" },
    };
    const { text, overLimit } = assemble(tiny, {
      subject: "a very long subject that exceeds ten characters easily",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
    });
    assert.equal(overLimit, true);
    // warn does NOT truncate
    assert.ok(text.length > 10, `text should not be truncated: "${text}"`);
  });

  it("truncates text when overflowStrategy is 'truncate'", () => {
    const tiny = {
      ...MJ,
      outputRules: { ...MJ.outputRules, maxLength: 10, overflowStrategy: "truncate" },
    };
    const { text, overLimit } = assemble(tiny, {
      subject: "a very long subject that exceeds ten characters",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
    });
    assert.equal(overLimit, true);
    assert.equal(text.length, 10);
  });

  it("charCount matches text.length", () => {
    const { text, charCount } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "16:9",
      niji_version: "none",
      model_version: "7",
      stylize: 250,
      chaos: 10,
      seed: 12345,
    });
    assert.equal(charCount, text.length);
  });

  it("plugin with no maxLength has overLimit false regardless of length", () => {
    const noMax = {
      ...SD,
      outputRules: { ...SD.outputRules, maxLength: undefined },
    };
    const { overLimit } = assemble(noMax, {
      positive_prompt: "x".repeat(5000),
      steps: 20,
      sampler: "DDIM",
      cfg_scale: 7,
      seed: -1,
      width: 1024,
      height: 1024,
      hires_fix: false,
    });
    assert.equal(overLimit, false);
  });
});

/* ===================================================================
   7. Computed tokens — --niji flag rename
   =================================================================== */
describe("computedTokens (--niji flag rename)", () => {
  it("emits --v when niji_version is 'none'", () => {
    const { text } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "7",
    });
    assert.ok(text.includes("--v 7"), `expected --v 7 in: ${text}`);
    assert.ok(!text.includes("--niji"), `should not contain --niji: ${text}`);
  });

  it("emits --niji 6 and suppresses --v when niji_version is '6'", () => {
    const { text } = assemble(MJ, {
      subject: "anime girl",
      aspect_ratio: "9:16",
      niji_version: "6",
      model_version: "7",   // present in values but field is invisible
    });
    assert.ok(text.includes("--niji 6"), `expected --niji 6 in: ${text}`);
    assert.ok(!text.includes("--v"), `should not contain --v: ${text}`);
  });

  it("emits --niji 5 for niji_version='5'", () => {
    const { text } = assemble(MJ, {
      subject: "samurai",
      aspect_ratio: "1:1",
      niji_version: "5",
      model_version: "7",
    });
    assert.ok(text.includes("--niji 5"), `expected --niji 5 in: ${text}`);
    assert.ok(!text.includes("--v"), `should not contain --v: ${text}`);
  });

  it("computed token section collapses when conditions not met", () => {
    // niji_version = "none" → niji_flag inactive → section collapses → no --niji
    const { text } = assemble(MJ, {
      subject: "fox",
      aspect_ratio: "1:1",
      niji_version: "none",
      model_version: "6.1",
    });
    assert.ok(!text.includes("--niji"), `should not have --niji: ${text}`);
    assert.ok(text.includes("--v 6.1"), `should have --v 6.1: ${text}`);
  });

  it("a plugin with no computedTokens still assembles correctly", () => {
    const noct = { ...SD };   // SD has computedTokens: []
    const { text } = assemble(noct, {
      positive_prompt: "portrait",
      steps: 25,
      sampler: "Euler a",
      cfg_scale: 7,
      seed: -1,
      width: 512,
      height: 512,
      hires_fix: false,
    });
    assert.ok(text.startsWith("portrait"), `got: ${text}`);
  });
});

/* ===================================================================
   8. isVisible / isSet re-exports (edge cases)
   =================================================================== */
describe("isVisible and isSet exports", () => {
  it("isVisible is true for a field with no dependsOn", () => {
    const field = MJ.fields.find((f) => f.key === "subject");
    assert.equal(isVisible(field, {}), true);
  });

  it("isSet returns false for an empty string value", () => {
    const field = MJ.fields.find((f) => f.key === "style_refs");
    assert.equal(isSet(field, { style_refs: "" }), false);
  });

  it("isSet returns false for undefined value", () => {
    const field = MJ.fields.find((f) => f.key === "style_refs");
    assert.equal(isSet(field, {}), false);
  });

  it("isSet returns false for a boolean field that is false", () => {
    const field = SD.fields.find((f) => f.key === "hires_fix");
    assert.equal(isSet(field, { hires_fix: false }), false);
  });

  it("isSet returns true for a boolean field that is true", () => {
    const field = SD.fields.find((f) => f.key === "hires_fix");
    assert.equal(isSet(field, { hires_fix: true }), true);
  });

  it("isSet returns false for hidden (dependsOn) field even with a value", () => {
    const field = MJ.fields.find((f) => f.key === "model_version");
    // niji_version != "none" → model_version is hidden → isSet must be false
    assert.equal(isSet(field, { niji_version: "6", model_version: "7" }), false);
  });

  it("isSet returns false when omitIfDefault and value equals default", () => {
    const field = MJ.fields.find((f) => f.key === "stylize");
    assert.equal(isSet(field, { stylize: 100 }), false);
  });

  it("isSet returns true when omitIfDefault and value differs from default", () => {
    const field = MJ.fields.find((f) => f.key === "stylize");
    assert.equal(isSet(field, { stylize: 200 }), true);
  });
});
