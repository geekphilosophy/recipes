#!/usr/bin/env node
// Regression tests for the grocery-list ingredient parsing functions.
// Extracts the functions directly from index.html so we're always testing
// the production code, not a copy.

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const htmlLines = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").split("\n");

// Extract the grocery parsing section (between the two section comments).
const start = htmlLines.findIndex(l => l.includes("Grocery: ingredient parsing"));
const end   = htmlLines.findIndex(l => l.includes("Grocery: selection UI"));
if (start === -1 || end === -1) {
  console.error("Could not locate grocery functions in index.html");
  process.exit(1);
}
const groceryCode = htmlLines.slice(start + 1, end).join("\n");

// Run in an isolated context so `const` declarations don't conflict.
const ctx = vm.createContext({});
vm.runInContext(groceryCode, ctx);

const { parseAmount, parseIngredient, consolidate, formatIngredient, extractIngredients } = ctx;

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? "✓" : "✗", name);
  if (!ok) {
    console.log("    expected:", JSON.stringify(expected));
    console.log("    got:     ", JSON.stringify(actual));
    failed++;
  } else {
    passed++;
  }
}

// ── parseAmount ───────────────────────────────────────────────────────────────
test("parseAmount: integer",      parseAmount("1"),     1);
test("parseAmount: decimal",      parseAmount("200"),   200);
test("parseAmount: fraction 1/2", parseAmount("1/2"),   0.5);
test("parseAmount: fraction 3/4", parseAmount("3/4"),   0.75);
test("parseAmount: fraction 1/3", parseAmount("1/3"),   1/3);
test("parseAmount: mixed 1 1/2",  parseAmount("1 1/2"), 1.5);
test("parseAmount: mixed 2 1/4",  parseAmount("2 1/4"), 2.25);
test("parseAmount: null",         parseAmount(null),    null);

// ── parseIngredient ───────────────────────────────────────────────────────────
test("parseIngredient: package",
  parseIngredient("1 package diced chicken breast"),
  { amount: 1, unit: "package", name: "diced chicken breast" });

test("parseIngredient: fractional cup",
  parseIngredient("3/4 cup arborio rice"),
  { amount: 0.75, unit: "cup", name: "arborio rice" });

test("parseIngredient: grams",
  parseIngredient("200 g mushrooms"),
  { amount: 200, unit: "g", name: "mushrooms" });

test("parseIngredient: tbsp",
  parseIngredient("1 tbsp garlic"),
  { amount: 1, unit: "tbsp", name: "garlic" });

test("parseIngredient: no amount or unit",
  parseIngredient("olive oil"),
  { amount: null, unit: null, name: "olive oil" });

test("parseIngredient: approx. prefix stripped",
  parseIngredient("approx. 1/3 cup white cooking wine"),
  { amount: 1/3, unit: "cup", name: "white cooking wine" });

test("parseIngredient: unit normalization (tablespoons → tbsp)",
  parseIngredient("2 tablespoons butter"),
  { amount: 2, unit: "tbsp", name: "butter" });

test("parseIngredient: plural package normalised",
  parseIngredient("2 packages ground beef"),
  { amount: 2, unit: "package", name: "ground beef" });

// ── consolidate ───────────────────────────────────────────────────────────────
const dup = consolidate(["1 package diced chicken breast", "1 package diced chicken breast"]);
test("consolidate: two identical packages → 1 item",   dup.length,    1);
test("consolidate: two identical packages → amount 2", dup[0].amount, 2);
test("consolidate: two identical packages → unit",     dup[0].unit,   "package");

const dedup = consolidate(["olive oil", "olive oil"]);
test("consolidate: dedup no-amount ingredient", dedup.length, 1);

const sumCup = consolidate(["1/2 cup soy sauce", "1/4 cup soy sauce"]);
test("consolidate: sum fractions (½ + ¼ = ¾)", sumCup[0].amount, 0.75);

const mixed = consolidate(["1/2 cup soy sauce", "200 g mushrooms", "olive oil"]);
test("consolidate: mixed ingredients, sorted alphabetically",
  mixed.map(i => i.name),
  ["mushrooms", "olive oil", "soy sauce"]);

// ── formatIngredient ──────────────────────────────────────────────────────────
test("format: 1 package (singular)",
  formatIngredient({ amount: 1, unit: "package", name: "chicken" }),
  "1 package chicken");

test("format: 2 packages (plural)",
  formatIngredient({ amount: 2, unit: "package", name: "diced chicken breast" }),
  "2 packages diced chicken breast");

test("format: ½ cup",
  formatIngredient({ amount: 0.5, unit: "cup", name: "soy sauce" }),
  "½ cup soy sauce");

test("format: ¾ cup",
  formatIngredient({ amount: 0.75, unit: "cup", name: "soy sauce" }),
  "¾ cup soy sauce");

test("format: no amount or unit",
  formatIngredient({ amount: null, unit: null, name: "olive oil" }),
  "olive oil");

test("format: integer amount",
  formatIngredient({ amount: 200, unit: "g", name: "mushrooms" }),
  "200 g mushrooms");

// ── extractIngredients ────────────────────────────────────────────────────────
const sampleMd = `# Test Recipe
tags: chicken
## Ingredients
- 1 package chicken thighs
- olive oil
- 1/2 cup soy sauce
## Steps
### 1. Cook
- Heat oil in pan
- Add chicken`;

test("extractIngredients: returns only ingredient lines",
  extractIngredients(sampleMd),
  ["1 package chicken thighs", "olive oil", "1/2 cup soy sauce"]);

test("extractIngredients: step bullets excluded",
  extractIngredients(sampleMd).includes("Heat oil in pan"),
  false);

test("extractIngredients: empty recipe",
  extractIngredients("# No Ingredients\n## Steps\n- Do something"),
  []);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
