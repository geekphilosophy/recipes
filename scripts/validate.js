#!/usr/bin/env node
// scripts/validate.js
//
// Preview and validate a recipe markdown file before import.
//
// Usage:
//   node scripts/validate.js recipes/my-recipe.md
//
// Exit codes:
//   0 — valid (possibly with warnings)
//   1 — errors that must be fixed before import

const fs   = require("fs");
const path = require("path");

// ── ANSI helpers ──────────────────────────────────────────────
const R = s => `\x1b[0m${s}\x1b[0m`;   // reset
const B = s => `\x1b[1m${s}\x1b[0m`;   // bold
const D = s => `\x1b[2m${s}\x1b[0m`;   // dim
const G = s => `\x1b[32m${s}\x1b[0m`;  // green
const Y = s => `\x1b[33m${s}\x1b[0m`;  // yellow
const Re= s => `\x1b[31m${s}\x1b[0m`;  // red
const C = s => `\x1b[36m${s}\x1b[0m`;  // cyan

// ── Argument ──────────────────────────────────────────────────
const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate.js <recipe.md>");
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const md       = fs.readFileSync(file, "utf8");
const lines    = md.split("\n");
const filename = path.basename(file);

// ── Parsers ───────────────────────────────────────────────────
const getMeta = (key) => {
  const line = lines.find(l => l.match(new RegExp(`^${key}:`, "i")));
  return line ? line.slice(key.length + 1).trim() : null;
};

const title  = md.match(/^# (.+)/m)?.[1]?.trim() ?? null;
const tags   = (getMeta("tags") ?? "").split(",").map(t => t.trim()).filter(Boolean);
const time   = getMeta("time");
const serves = getMeta("serves");
const source = getMeta("source");

// Parse sections: collect bullet points under each ## heading
function parseSections(md) {
  const sections = {};
  let current = null;
  for (const ln of md.split("\n")) {
    if (/^## /.test(ln))      { current = ln.slice(3).trim().toLowerCase(); sections[current] = []; }
    else if (current && /^- /.test(ln)) { sections[current].push(ln.slice(2).trim()); }
  }
  return sections;
}

// Count ### step headings under ## Steps
function parseStepSections(md) {
  let inSteps = false;
  const steps = [];
  for (const ln of md.split("\n")) {
    if (/^## steps/i.test(ln))       { inSteps = true; continue; }
    if (/^## /.test(ln))             { inSteps = false; }
    if (inSteps && /^### /.test(ln)) { steps.push(ln.slice(4).trim()); }
  }
  return steps;
}

const sections  = parseSections(md);
const ingredients = sections["ingredients"] ?? [];
const stepSections = parseStepSections(md);

// ── Validation rules ──────────────────────────────────────────
const errors   = [];   // blocking — must fix
const warnings = [];   // non-blocking — should review

// Errors
if (!title)                    errors.push("No title found — needs a # heading");
if (!sections["ingredients"])  errors.push("No ## Ingredients section");
if (!sections["steps"])        errors.push("No ## Steps section");
if (ingredients.length === 0)  errors.push("Ingredients section is empty");
if (stepSections.length === 0) errors.push("No step headings found (### 1. Name)");

// Warnings
if (!tags.length)              warnings.push("No tags: field — search won't find this recipe by ingredient");
if (tags.length > 0 && tags.length < 3)
                               warnings.push(`Only ${tags.length} tag(s) — consider adding cuisine style or cooking method`);
if (!time)                     warnings.push("No time: field");
if (!serves)                   warnings.push("No serves: field");
if (!source)                   warnings.push("No source: field — add if from a meal kit");
if (ingredients.length > 0 && ingredients.length < 3)
                               warnings.push(`Only ${ingredients.length} ingredient(s) — looks incomplete`);

// ── Output ────────────────────────────────────────────────────
const hr = "─".repeat(52);
console.log(`\n${hr}`);
console.log(`  ${B("PREVIEW")}  ${D(filename)}`);
console.log(hr);

const row = (label, value, warn) => {
  const lpad = label.padEnd(10);
  const v    = value ? R(value) : D("(none)");
  const flag = warn && !value ? ` ${Y("⚠")}` : "";
  console.log(`  ${D(lpad)} ${v}${flag}`);
};

row("Title",  title,  true);
row("Tags",   tags.length ? tags.join(", ") : null, true);
row("Time",   time,   true);
row("Serves", serves, true);
row("Source", source, false);

console.log("");
console.log(`  ${D("Ingredients")}  ${ingredients.length} item(s)`);
console.log(`  ${D("Steps")}        ${stepSections.length} section(s)`);

// Show step names so you can sanity-check them
if (stepSections.length > 0) {
  for (const [i, s] of stepSections.entries()) {
    console.log(`               ${D(`${i + 1}.`)} ${s}`);
  }
}

// Errors and warnings
if (errors.length || warnings.length) {
  console.log("");
  for (const e of errors)   console.log(`  ${Re("✗")}  ${Re(e)}`);
  for (const w of warnings) console.log(`  ${Y("⚠")}  ${w}`);
}

console.log(hr);

if (errors.length) {
  console.log(`\n  ${Re(B("Errors must be fixed before import."))}\n`);
  process.exit(1);
} else if (warnings.length) {
  console.log(`\n  ${G("✓")}  ${G("Valid")} ${D(`(${warnings.length} warning${warnings.length > 1 ? "s" : ""})`)}\n`);
  process.exit(0);
} else {
  console.log(`\n  ${G("✓")}  ${G("Looks good.")}\n`);
  process.exit(0);
}
