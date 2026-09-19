#!/usr/bin/env bash
# Full verification in one command.
# Full logs are offloaded to build/last-verify.log — the console prints only
# PASS/FAIL/WARN per step, so verification output never floods the context window.
# Usage: bash scripts/verify.sh [--quick]   (--quick: docs + links only, for fast loops)
set -u

QUICK="${1:-}"
LOG="build/last-verify.log"
BUDGET="${DIFF_BUDGET:-400}"
mkdir -p build
: > "$LOG"

fail=0

step() {
  local name="$1"; shift
  echo "== $name ==" >> "$LOG"
  if "$@" >> "$LOG" 2>&1; then
    echo "PASS  $name"
  else
    echo "FAIL  $name  (see $LOG)"
    fail=1
  fi
}

soft_step() {   # reports a number, never fails the run
  local name="$1"; shift
  echo "== $name ==" >> "$LOG"
  if "$@" >> "$LOG" 2>&1; then
    echo "PASS  $name"
  else
    echo "WARN  $name  (see $LOG)"
  fi
}

# --- checks -------------------------------------------------------------------

check_docs() {
  local missing=0 f
  for f in CLAUDE.md docs/PROGRESS.md docs/ROADMAP.md docs/BACKBONE.md; do
    [ -f "$f" ] || { echo "missing required doc: $f"; missing=1; }
  done
  return $missing
}

check_proto_links() {
  # Every relative href/src on a live prototype page must resolve.
  # Snapshots are frozen history and are not checked.
  local missing=0 f dir link target
  local files=()
  while IFS= read -r f; do files+=("$f"); done < <(
    find prototype -name '*.html' -not -path 'prototype/snapshots/*' 2>/dev/null | sort
  )
  if [ ${#files[@]} -eq 0 ]; then echo "no prototype pages yet"; return 0; fi
  for f in "${files[@]}"; do
    dir=$(dirname "$f")
    while IFS= read -r link; do
      case "$link" in ''|http*|//*|mailto:*|data:*|'#'*) continue ;; esac
      link="${link%%#*}"; link="${link%%\?*}"
      [ -n "$link" ] || continue
      target="$dir/$link"
      [ -e "$target" ] || { echo "broken link: $f -> $link"; missing=1; }
    done < <(grep -ohE '(href|src)="[^"]*"' "$f" | sed -E 's/^(href|src)="//; s/"$//')
  done
  [ $missing -eq 0 ] && echo "checked ${#files[@]} page(s), all links resolve"
  return $missing
}

check_snapshots_frozen() {
  # prototype/snapshots/ is append-only: a committed snapshot file never changes.
  git rev-parse HEAD >/dev/null 2>&1 || { echo "no commits yet — skipped"; return 0; }
  local changed
  changed=$(git diff HEAD --name-only -- prototype/snapshots 2>/dev/null)
  if [ -n "$changed" ]; then
    echo "snapshots are append-only, but these were modified or deleted:"
    echo "$changed"
    return 1
  fi
  echo "no committed snapshot was touched"
  return 0
}

check_diff_budget() {
  git rev-parse HEAD >/dev/null 2>&1 || { echo "no commits yet — skipped"; return 0; }
  local ex=(':(exclude)docs' ':(exclude)prototype/snapshots' ':(exclude)build')
  local tracked untracked n
  tracked=$(git diff --numstat HEAD -- . "${ex[@]}" 2>/dev/null \
            | awk '{a+=$1; d+=$2} END {print a+d+0}')
  untracked=$(git ls-files --others --exclude-standard -- . "${ex[@]}" 2>/dev/null \
              | tr '\n' '\0' | xargs -0 -r cat 2>/dev/null | wc -l)
  n=$(( tracked + untracked ))
  echo "changed lines this cycle (docs/ and snapshots excluded): $n / $BUDGET"
  [ "$n" -le "$BUDGET" ]
}

# --- run ----------------------------------------------------------------------

step "docs" check_docs
step "prototype links" check_proto_links

if [ "$QUICK" != "--quick" ]; then
  step "snapshots frozen" check_snapshots_frozen
  soft_step "diff budget" check_diff_budget
fi

# NOTE: app build/test stages belong here. Add them in the cycle that creates the
# app — not before (CLAUDE.md: no speculative parts).

exit $fail
