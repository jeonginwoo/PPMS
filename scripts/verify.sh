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

check_doc_refs() {
  # Backticked repo paths inside the docs must resolve. Conventions carried over
  # from another repo rot silently otherwise — v3's three files referenced 12 paths
  # that do not exist here (measured 2026-09-19).
  # Only harness-owned prefixes are checked; `src/...`-style paths are prescriptive
  # (they describe where code will go) and placeholders like <NN-slug> are skipped.
  local missing=0 f ref
  local files=()
  while IFS= read -r f; do files+=("$f"); done < <(
    { echo CLAUDE.md; find docs -name '*.md' 2>/dev/null; } | sort
  )
  for f in "${files[@]}"; do
    [ -f "$f" ] || continue
    while IFS= read -r ref; do
      case "$ref" in *'<'*|*'*'*) continue ;; esac
      [ -e "${ref%/}" ] || { echo "dead reference: $f -> $ref"; missing=1; }
    done < <(grep -ohE '`(docs|scripts|prototype|\.claude)/[A-Za-z0-9._/-]+`' "$f"              | tr -d '`' | sort -u)
  done
  [ $missing -eq 0 ] && echo "checked ${#files[@]} doc(s), all repo references resolve"
  return $missing
}

check_proto_buildfree() {
  # prototype/ must stay double-click-openable (CLAUDE.md structure rule 1).
  # Mechanical, so it belongs here rather than in the reviewer agent's judgement.
  local bad=0 f
  for f in prototype/package.json prototype/package-lock.json prototype/node_modules            prototype/vite.config.ts prototype/vite.config.js prototype/tsconfig.json; do
    [ -e "$f" ] && { echo "prototype must stay build-free, but $f exists"; bad=1; }
  done
  [ $bad -eq 0 ] && echo "no build step, no dependency"
  return $bad
}

check_cycle_discipline() {
  # The branch name is the declaration of intent, so the cycle's preconditions can
  # be checked without judgement. What is left for the reviewer agent is what
  # actually needs judging (scope creep, hollowed tests, convention violations).
  local bad=0 branch slug protected
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || {
    echo "not a git repo — skipped"; return 0; }

  if [ "$branch" = "main" ]; then
    protected=$(git status --porcelain -- .       ':(exclude)docs/PROGRESS.md' ':(exclude)docs/ROADMAP.md' ':(exclude)docs/BACKBONE.md'       ':(exclude)docs/conventions' ':(exclude).claude' ':(exclude)scripts'       ':(exclude)CLAUDE.md' ':(exclude).gitignore' ':(exclude).gitattributes' 2>/dev/null)
    if [ -n "$protected" ]; then
      echo "on main with work that needs a branch (git-workflow section 1):"
      echo "$protected"
      bad=1
    fi
  fi

  case "$branch" in
    spec/*)
      slug="${branch#spec/}"
      ls -d prototype/snapshots/*-"$slug" >/dev/null 2>&1 || {
        echo "spec branch for '$slug' but no approved prototype snapshot — run /proto first"
        bad=1; }
      ;;
    feat/*|fix/*)
      slug="${branch#*/}"
      [ -f "docs/features/$slug.md" ] || {
        echo "implementation branch for '$slug' but docs/features/$slug.md does not exist"
        bad=1; }
      ;;
  esac

  [ $bad -eq 0 ] && echo "branch '$branch' — preconditions met"
  return $bad
}

check_script_eol() {
  # Shell scripts must be LF in the working copy too — bash chokes on a CR at the
  # end of a line. Editors and scripted rewrites reintroduce CRLF silently (hit
  # 2026-09-19 while patching this very file), so .gitattributes alone is not enough.
  # Counted with tr: awk and grep read text mode under Git Bash and swallow the CR,
  # which made an earlier version of this check pass on a CRLF file (measured).
  local bad=0 f n
  while IFS= read -r f; do
    n=$(tr -dc '\r' < "$f" | wc -c)
    if [ "$n" -gt 0 ]; then
      echo "CRLF in $f ($n carriage returns) — shell scripts must be LF"
      bad=1
    fi
  done < <(find scripts -name '*.sh' 2>/dev/null | sort)
  [ $bad -eq 0 ] && echo "all scripts are LF"
  return $bad
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
step "doc references" check_doc_refs
step "prototype build-free" check_proto_buildfree
step "script line endings" check_script_eol

if [ "$QUICK" != "--quick" ]; then
  step "cycle discipline" check_cycle_discipline
  step "snapshots frozen" check_snapshots_frozen
  soft_step "diff budget" check_diff_budget
fi

# NOTE: app build/test stages belong here. Add them in the cycle that creates the
# app — not before (CLAUDE.md: no speculative parts).

exit $fail
