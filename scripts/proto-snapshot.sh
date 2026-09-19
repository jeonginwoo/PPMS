#!/usr/bin/env bash
# Freeze the current prototype into prototype/snapshots/<NNN>-<label>/.
# Snapshots are append-only planning history — never edited, never deleted.
# Usage: bash scripts/proto-snapshot.sh <label>        e.g. b1-backbone
set -eu

LABEL="${1:-}"
if [ -z "$LABEL" ]; then
  echo "usage: bash scripts/proto-snapshot.sh <label>   (e.g. b1-backbone)" >&2
  exit 1
fi
case "$LABEL" in
  *[!a-z0-9-]*) echo "label must be lowercase letters, digits and '-' only" >&2; exit 1 ;;
esac

SRC=prototype
DEST_ROOT=prototype/snapshots

if ! find "$SRC" -name '*.html' -not -path "$DEST_ROOT/*" | grep -q .; then
  echo "nothing to snapshot — $SRC has no live page" >&2
  exit 1
fi

mkdir -p "$DEST_ROOT"
last=$(ls -1 "$DEST_ROOT" 2>/dev/null | grep -oE '^[0-9]{3}' | sort -n | tail -1 || true)
seq=$(printf '%03d' $(( 10#${last:-0} + 1 )))
DEST="$DEST_ROOT/$seq-$LABEL"
[ -e "$DEST" ] && { echo "$DEST already exists — snapshots are append-only" >&2; exit 1; }

mkdir -p "$DEST"
(cd "$SRC" && find . -path ./snapshots -prune -o -type f -print) |
  while IFS= read -r f; do
    mkdir -p "$DEST/$(dirname "$f")"
    cp "$SRC/$f" "$DEST/$f"
  done

printf '| %s | %s | %s |  |\n' "$seq" "$LABEL" "$(date +%Y-%m-%d)" >> "$DEST_ROOT/INDEX.md"

echo "snapshot: $DEST"
echo "INDEX.md에 행 한 줄이 추가됐습니다 — 마지막 칸에 이 단계에서 확정된 것을 적으세요."
