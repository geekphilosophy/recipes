#!/bin/bash
# add-recipe.sh — validate, preview, and import recipe markdown files
#
# Usage:
#   ./add-recipe.sh path/to/recipe.md    # single file with preview loop
#   ./add-recipe.sh                      # batch: validate + sync all pending changes

set -e
cd "$(dirname "$0")"

# ── Single file mode ──────────────────────────────────────────
if [ -n "$1" ]; then
  SRC="$1"
  BASENAME=$(basename "$SRC")
  DEST="recipes/$BASENAME"

  if [ ! -f "$SRC" ]; then
    echo "File not found: $SRC"
    exit 1
  fi

  if [ "$SRC" != "$DEST" ] && [ "$SRC" != "./$DEST" ]; then
    cp "$SRC" "$DEST"
    echo "Copied → $DEST"
  fi

  # Preview / edit loop
  while true; do
    node scripts/validate.js "$DEST"
    STATUS=$?

    if [ $STATUS -ne 0 ]; then
      # Errors — only offer edit or abort
      printf "  [e] edit in \$EDITOR   [a] abort: "
      read -r choice
      case "$choice" in
        e|E) ${EDITOR:-vi} "$DEST" ;;
        *)   echo "Aborted."; rm -f "$DEST"; exit 1 ;;
      esac
    else
      # Valid (may have warnings) — offer commit, edit, or abort
      printf "  [c] commit   [e] edit in \$EDITOR   [a] abort: "
      read -r choice
      case "$choice" in
        c|C) break ;;
        e|E) ${EDITOR:-vi} "$DEST" ;;
        *)   echo "Aborted."; rm -f "$DEST"; exit 1 ;;
      esac
    fi
  done

  git add "$DEST"
  TITLE=$(grep "^# " "$DEST" | head -1 | sed 's/^# //')
  git commit -m "add: ${TITLE:-$BASENAME}"
  git push
  echo "Done — GitHub Actions will rebuild index.json."

# ── Batch sync mode ───────────────────────────────────────────
else
  # Find new or modified files in recipes/ (unstaged)
  PENDING=$(git status --porcelain recipes/ \
    | grep -E "^\?\?|^ M|^M " \
    | awk '{print $2}' \
    | grep "\.md$" || true)

  if [ -z "$PENDING" ]; then
    echo "Nothing to sync."
    exit 0
  fi

  COUNT=$(echo "$PENDING" | wc -l | tr -d '[:space:]')
  echo "Found $COUNT file(s) to validate..."

  ERRORS=0
  while IFS= read -r f; do
    node scripts/validate.js "$f" || ERRORS=$((ERRORS + 1))
  done <<< "$PENDING"

  if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "  $ERRORS file(s) have errors. Fix them and re-run."
    exit 1
  fi

  printf "  All valid. [c] commit + push   [a] abort: "
  read -r choice
  case "$choice" in
    c|C) ;;
    *)   echo "Aborted."; exit 0 ;;
  esac

  git add recipes/
  NAMES=$(echo "$PENDING" | xargs -I{} basename {} .md | paste -sd ", " -)
  git commit -m "sync: $COUNT recipe(s) — $NAMES"
  git push
  echo "Done — GitHub Actions will rebuild index.json."
fi
