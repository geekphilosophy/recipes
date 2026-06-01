# Recipe Transcription Guidelines

Guidelines for transcribing meal kit recipe cards into the library markdown format.
Derived from real transcription decisions — update as new cases arise.

---

## Ingredients

**Always omit:** sambal — drop it from both the ingredient list and any step that references it. We never use it.

**Pantry items** (not included in the kit) are listed without a quantity:
- `- olive oil`
- `- salt and pepper to taste`

**Kit items** are listed with the exact quantity shown on the card:
- `- 280 g rigatoni`
- `- 1/3 cup parmesan cheese`

**"Also Included" callouts** (sometimes a separate line on the card for proteins or
extras) are folded into the main ingredient list normally — no special treatment.

**Do not include** equipment from the "You will need" section (pots, pans, whisks, etc.).

---

## Eggs and multi-use ingredients

Where a recipe uses the same ingredient differently across steps (e.g. whole eggs vs
yolks only), keep the ingredient list simple (total quantity) and capture the nuance
in the steps where it occurs:

```
## Ingredients
- 6 free range brown eggs

## Steps
### 2. Prepare Egg Mixture
- Crack 2 whole eggs into a medium bowl.
- For remaining eggs, add only yolks, discarding whites or storing for another meal.
```

---

## Serving size

- Always set `serves: 4` regardless of what the card says.
- If the card serves 2, scale all ingredient quantities ×2 and update any step measurements that reference specific volumes or counts (e.g. "add 1 cup water" → "add 2 cups water", "form into 8 balls" → "16 balls"). Skip unscalable staples like "olive oil" or "salt and pepper to taste".
- If genuinely unclear how many the card serves, ask before finalising.

---

## Source

- Use the brand name exactly as printed: `FreshPrep`, `HelloFresh`, `Blue Apron`, etc.
- Capitalisation matters — match what's on the card.

---

## Title

- Use the full title including subtitle if there is one:
  `Italian Sausage Carbonara with Herbed Pangrattato & Broccolette`
- Use `&` not `and` in the title when that's how it appears on the card.
- If the title is cropped or missing, synthesise from the dish itself.

---

## Tags

Derive from: main protein · key vegetables · cuisine style · cooking method.
More is better — they power search ranking.

```
tags: sausage, pasta, egg, broccolette, rigatoni, parmesan, italian, carbonara, baked
```

Include cooking method when distinctive: `baked`, `grilled`, `stir-fry`, `slow-cooked`.

---

## Steps

- Group under `### N. Step Name` headings exactly as labelled on the card.
- Keep step names from the card where clear; synthesise if missing or vague.
- Consolidate closely related bullet points into one where it reads more naturally
  (e.g. "Line sheet with foil. Combine broccolette..." → single bullet).
- Internal temperatures stay in steps, not ingredients.

---

## Nutrition

Include a `## Nutrition` section after Steps if nutritional info appears on the card.
Values are **per serving** unless the card says otherwise.

```
## Nutrition
- Calories: 650 kcal
- Protein: 42 g
- Fat: 22 g
- Carbohydrates: 74 g
- Fibre: 4 g
- Sodium: 890 mg
```

- Include only the fields printed on the card — don't guess or omit values that are present.
- If the card shows "per 100g" or "per portion" instead of per serving, note it in parentheses: `Calories: 310 kcal (per 100g)`.
- Saturated fat, sugar, and other sub-values are optional but include them if shown.
- Omit the section entirely if no nutritional info is on the card.

---

## Filename

`kebab-case-recipe-title.md` — derived from the title. Minor slug differences (e.g. `and` vs `-`) don't matter.
