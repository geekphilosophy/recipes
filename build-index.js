#!/usr/bin/env node
// scripts/build-index.js
// Reads every .md file in recipes/ and writes index.json to the repo root.
// Run by GitHub Actions on every push that touches recipes/.

const fs   = require("fs");
const path = require("path");

const RECIPES_DIR = path.join(__dirname, "..", "recipes");
const OUTPUT_FILE = path.join(__dirname, "..", "index.json");

function parseMeta(md, filename) {
  const get = (key) => {
    const line = md.split("\n").find(l =>
      l.toLowerCase().startsWith(key.toLowerCase() + ":")
    );
    return line ? line.slice(key.length + 1).trim() : "";
  };

  const titleMatch = md.match(/^# (.+)/m);
  const title = titleMatch
    ? titleMatch[1].trim()
    : filename.replace(/\.md$/, "").replace(/-/g, " ");

  const tags = get("tags")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);

  // Extract plain-text ingredients for faster client-side search
  const ingredientLines = md
    .split("\n")
    .filter(l => /^-\s/.test(l))
    .map(l => l.replace(/^-\s+/, "").trim());

  return {
    title,
    tags,
    time:        get("time"),
    serves:      get("serves"),
    source:      get("source"),
    filename,
    ingredients: ingredientLines,
    markdown:    md,
  };
}

if (!fs.existsSync(RECIPES_DIR)) {
  console.error(`recipes/ directory not found at ${RECIPES_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(RECIPES_DIR)
  .filter(f => f.endsWith(".md"))
  .sort();

if (files.length === 0) {
  console.warn("No .md files found in recipes/ — writing empty index.");
}

const recipes = files.map(filename => {
  const fullPath = path.join(RECIPES_DIR, filename);
  const md = fs.readFileSync(fullPath, "utf8");
  return parseMeta(md, filename);
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(recipes, null, 2) + "\n");
console.log(`Built index.json — ${recipes.length} recipe(s): ${files.join(", ")}`);
