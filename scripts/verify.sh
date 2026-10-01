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
  for f in CLAUDE.md docs/PROGRESS.md docs/ROADMAP.md docs/BACKBONE.md docs/WHY.md; do
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
    protected=$(git status --porcelain -- .       ':(exclude)docs/PROGRESS.md' ':(exclude)docs/ROADMAP.md' ':(exclude)docs/BACKBONE.md'       ':(exclude)docs/WHY.md' ':(exclude)docs/features/_TEMPLATE.md'       ':(exclude)docs/conventions' ':(exclude).claude' ':(exclude)scripts'       ':(exclude)CLAUDE.md' ':(exclude).gitignore' ':(exclude).gitattributes' 2>/dev/null)
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
  # prototype/snapshots/ is append-only, which means two different things here:
  #   - a frozen snapshot's own files never change at all;
  #   - INDEX.md is a ledger: rows may be added and their annotation column filled
  #     in later, but a row is never deleted.
  # Counting removed *lines* was too strict — it blocked both the snapshot script's
  # own row and any later correction of the "확정된 것" column (both measured).
  git rev-parse HEAD >/dev/null 2>&1 || { echo "no commits yet — skipped"; return 0; }
  local bad=0 changed idx before after
  changed=$(git diff HEAD --name-only -- prototype/snapshots ':(exclude)prototype/snapshots/INDEX.md' 2>/dev/null)
  if [ -n "$changed" ]; then
    echo "a frozen snapshot was modified or deleted:"
    echo "$changed"
    bad=1
  fi
  idx=prototype/snapshots/INDEX.md
  if [ -f "$idx" ] && git cat-file -e "HEAD:$idx" 2>/dev/null; then
    before=$(git show "HEAD:$idx" | grep -c '^| [0-9]')
    after=$(grep -c '^| [0-9]' "$idx")
    if [ "$after" -lt "$before" ]; then
      echo "INDEX.md lost rows: $before -> $after (the ledger is append-only)"
      bad=1
    fi
  fi
  [ $bad -eq 0 ] && echo "snapshots intact; INDEX.md ledger not shrunk"
  return $bad
}

changed_lines() {
  # tracked edits + whole untracked files, for the given pathspecs
  local tracked untracked
  tracked=$(git diff --numstat HEAD -- "$@" 2>/dev/null | awk '{a+=$1; d+=$2} END {print a+d+0}')
  untracked=$(git ls-files --others --exclude-standard -- "$@" 2>/dev/null \
              | tr '\n' '\0' | xargs -0 -r cat 2>/dev/null | wc -l)
  echo $(( tracked + untracked ))
}

check_diff_budget() {
  # The budget caps PRODUCT CODE — what a human has to review and then live with.
  # prototype/ is exempt because it is throwaway, but it is still REPORTED: the
  # number is the cycle-width signal, and excluding it silently would delete the
  # very thing the budget exists to make visible (review finding, 2026-09-19).
  #
  # The glob covers sibling prototype dirs (prototype-v2/ …), not just prototype/.
  # A rebuilt prototype is as throwaway as the first one, but sitting outside
  # prototype/ it was counted as product code — 4,553 lines of material nobody
  # will maintain, charged against a 400-line budget. That number is not wrong,
  # it is MEANINGLESS: it drowns the signal the budget exists to give. The lines
  # are still reported on the prototype row (2026-10-01 decision).
  git rev-parse HEAD >/dev/null 2>&1 || { echo "no commits yet — skipped"; return 0; }
  local code proto
  code=$(changed_lines . ':(exclude)docs' ':(exclude)prototype*' ':(exclude)build')
  proto=$(changed_lines 'prototype*' ':(exclude)prototype*/snapshots')
  echo "product code : $code / $BUDGET"
  echo "prototype    : $proto (budget-exempt, but this is the cycle-width signal — read it)"
  [ "$code" -le "$BUDGET" ]
}

check_why_page() {
  # docs/WHY.md is the one file in this repo that PRD-growth would come in through
  # (v3: PRD-pms.md 150KB). "One page" is a rule, so it is measured, not wished.
  # Second half: only what the user actually said may sit in section 2. An inferred
  # line reads as plausible, survives review, and then becomes a spec's 근거
  # (measured 2026-09-28: two of them were wrong about how the work is done today).
  local max=90 n bad=0 sec2
  [ -f docs/WHY.md ] || { echo "missing docs/WHY.md"; return 1; }
  n=$(wc -l < docs/WHY.md | tr -d ' ')
  echo "docs/WHY.md : $n / $max lines"
  if [ "$n" -gt "$max" ]; then
    echo "over one page — cut it, or move detail into the unit spec under docs/features/"
    bad=1
  fi
  sec2=$(awk '/^## 2\./{f=1;next} /^## 3\./{f=0} f' docs/WHY.md)
  if grep -q '확인중' <<<"$sec2"; then
    echo "section 2 holds a 확인중 — an unconfirmed pain belongs in section 3. Ask the user first."
    bad=1
  fi
  awk '
    function flush() { if (b != "" && !seen) { print "section 2 block with no 근거 (ask the user, then tag it): " b; rc=1 } }
    /^### /{ flush(); b=$0; seen=0; next }
    /`(결정|실측|피드백)`/{ if (b != "") seen=1 }
    END { flush(); exit rc+0 }
  ' <<<"$sec2" || bad=1
  [ $bad -eq 0 ] && echo "section 2: every block cites 근거, no 확인중"
  return $bad
}

# --- run ----------------------------------------------------------------------

step "docs" check_docs
step "WHY one page" check_why_page
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
