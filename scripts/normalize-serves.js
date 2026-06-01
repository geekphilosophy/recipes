#!/usr/bin/env node
// Normalizes all recipes to 4 servings by scaling ingredient amounts.
// Safe to re-run — recipes already at 4 servings are skipped.

const fs   = require("fs");
const path = require("path");

const RECIPES_DIR = path.join(__dirname, "..", "recipes");
const TARGET = 4;

// ── Unicode fraction map ────────────────────────────────────────────────────
const UNICODE_FRACS = { "½":1/2, "¼":1/4, "¾":3/4, "⅓":1/3, "⅔":2/3, "⅛":1/8, "⅜":3/8, "⅝":5/8, "⅞":7/8 };
const UF_CHARS = Object.keys(UNICODE_FRACS).join("");

// ── parseAmount ─────────────────────────────────────────────────────────────
// Returns { prefix, amount, rest } or null.
// `rest` preserves the original separator (space or empty) between amount and unit.
function parseAmount(line) {
  // approx. prefix — strip, recurse, re-attach
  const approxM = line.match(/^(approx\.?\s+)/i);
  if (approxM) {
    const inner = parseAmount(line.slice(approxM[1].length));
    if (!inner) return null;
    return { prefix: approxM[1] + inner.prefix, amount: inner.amount, rest: inner.rest };
  }

  // Unicode mixed: "1½..." or "4½..."
  const uMixedM = line.match(new RegExp(`^(\\d+)([${UF_CHARS}])`));
  if (uMixedM) {
    return {
      prefix: "", amount: parseInt(uMixedM[1]) + UNICODE_FRACS[uMixedM[2]],
      rest: line.slice(uMixedM[0].length),
    };
  }

  // Standalone unicode fraction: "½ cup"
  const uAloneM = line.match(new RegExp(`^([${UF_CHARS}])`));
  if (uAloneM) {
    return { prefix: "", amount: UNICODE_FRACS[uAloneM[1]], rest: line.slice(1) };
  }

  // Spaced mixed: "1 1/2 ..." — lookahead preserves trailing space in rest
  const sMixedM = line.match(/^(\d+)\s+(\d+)\/(\d+)(?=\s)/);
  if (sMixedM) {
    const whole = parseInt(sMixedM[1]), frac = parseInt(sMixedM[2]) / parseInt(sMixedM[3]);
    return { prefix: "", amount: whole + frac, rest: line.slice(sMixedM[0].length) };
  }

  // ASCII fraction: "3/4 ..." — lookahead preserves trailing space
  const fracM = line.match(/^(\d+)\/(\d+)(?=\s)/);
  if (fracM) {
    return { prefix: "", amount: parseInt(fracM[1]) / parseInt(fracM[2]), rest: line.slice(fracM[0].length) };
  }

  // No-space unit: "180g" — lookahead for letter, rest starts at unit letter
  const noSpaceM = line.match(/^(\d+)(?=[a-zA-Z])/);
  if (noSpaceM) {
    return { prefix: "", amount: parseInt(noSpaceM[1]), rest: line.slice(noSpaceM[0].length) };
  }

  // Plain integer followed by space — lookahead preserves the space in rest
  const intM = line.match(/^(\d+)(?=\s)/);
  if (intM) {
    return { prefix: "", amount: parseInt(intM[1]), rest: line.slice(intM[0].length) };
  }

  return null;
}

// ── formatAmount ─────────────────────────────────────────────────────────────
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

function formatAmount(n) {
  const whole = Math.floor(n);
  const frac  = n - whole;
  if (Math.abs(frac) < 0.001) return String(whole);

  for (let d = 2; d <= 12; d++) {
    const num = Math.round(frac * d);
    if (Math.abs(num / d - frac) < 0.001 && num > 0 && num < d) {
      const g = gcd(num, d);
      const sn = num / g, sd = d / g;
      return whole > 0 ? `${whole} ${sn}/${sd}` : `${sn}/${sd}`;
    }
  }

  return n.toFixed(1).replace(/\.0$/, "");
}

// ── pluralizeUnit ─────────────────────────────────────────────────────────────
// Pluralizes units that are full words (not abbreviations) when amount > 1.
const NO_PLURAL = new Set(["g","kg","ml","l","oz","lb","tbsp","tsp"]);

function pluralizeUnit(rest, scaledAmount) {
  if (scaledAmount <= 1) return rest;
  // rest is like " package chicken" or " cup rice" or "g mushrooms"
  // Only pluralize if rest starts with a space followed by a known word unit
  const m = rest.match(/^(\s+)(\w+)(.*)/s);
  if (!m) return rest;
  const unit = m[2].toLowerCase();
  if (NO_PLURAL.has(unit)) return rest;
  // Simple pluralization: add 's' if not already plural
  if (!unit.endsWith("s")) return m[1] + m[2] + "s" + m[3];
  return rest;
}

// ── scaleIngredientLine ──────────────────────────────────────────────────────
function scaleIngredientLine(line, factor) {
  const parsed = parseAmount(line);
  if (!parsed) return { scaled: line, unchanged: true };

  const scaled = parsed.amount * factor;
  const rest   = pluralizeUnit(parsed.rest, scaled);
  return { scaled: parsed.prefix + formatAmount(scaled) + rest, unchanged: false };
}

// ── Main ─────────────────────────────────────────────────────────────────────
const files = fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith(".md")).sort();

for (const filename of files) {
  const filepath = path.join(RECIPES_DIR, filename);
  const original = fs.readFileSync(filepath, "utf8");
  const lines    = original.split("\n");

  const servesLine = lines.find(l => /^serves:/i.test(l));
  const serves     = servesLine ? parseInt(servesLine.split(":")[1]) : null;

  if (!serves || isNaN(serves)) {
    console.log(`⚠️  ${filename}: no serves: field, skipping`);
    continue;
  }
  if (serves === TARGET) {
    console.log(`—  ${filename}: already serves ${TARGET}, skipping`);
    continue;
  }

  const factor = TARGET / serves;
  let inIngredients = false;
  let scaledCount = 0;
  const unscaled = [];
  const out = [];

  for (const line of lines) {
    if (/^## ingredients/i.test(line)) { inIngredients = true; out.push(line); continue; }
    if (/^##/.test(line) && inIngredients) inIngredients = false;

    if (inIngredients && /^-\s/.test(line)) {
      const ingredient = line.replace(/^-\s+/, "");
      const { scaled, unchanged } = scaleIngredientLine(ingredient, factor);
      out.push("- " + scaled);
      if (unchanged) unscaled.push(`    ! could not scale: ${ingredient}`);
      else scaledCount++;
    } else if (/^serves:/i.test(line)) {
      out.push(`serves: ${TARGET}`);
    } else {
      out.push(line);
    }
  }

  fs.writeFileSync(filepath, out.join("\n"), "utf8");
  console.log(`✓  ${filename}: serves ${serves} → ${TARGET}, scaled ${scaledCount} ingredient(s)`);
  for (const w of unscaled) console.log(w);
}
