#!/usr/bin/env bash
# Stop hook: block ending the session while the prototype is broken.
# exit 0 = allow stop. exit 2 = block stop; stderr is fed back to Claude so it can
# fix the problem itself (block + feedback).
#
# Guard: only act when a live prototype file was actually touched — doc-only,
# snapshot-only and chat-only sessions must never be blocked.

if git status --porcelain -- prototype 2>/dev/null | grep -qv 'prototype/snapshots/'; then
  if ! bash scripts/verify.sh --quick >/dev/null 2>&1; then
    echo "verify --quick is failing. Fix it before ending the session — read only the failing part of build/last-verify.log." >&2
    exit 2
  fi
fi
exit 0
