#!/usr/bin/env bash
# Guard: this skill must ship unbranded.
#
# The maintainer's own working copy keeps their brand kits and handle.
# This repo must not ship either, so anyone installing it starts clean.
# Run before publishing:  bash scripts/check-unbranded.sh
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
kits=".claude/skills/design/template/src/lib/brandKits.ts"
seed=".claude/skills/design/template/src/slides.ts"

# 1. Brand kits ship empty, so the Brand section stays hidden.
if ! grep -qE 'export const BRAND_KITS: BrandKit\[\] = \[\];' "$kits"; then
  echo "FAIL: $kits must export an empty array. Brand kits are the user's to define."
  fail=1
fi

# 2. The seed deck carries no handle at all; the user sets their own.
if grep -qE '\bhandle:' "$seed"; then
  echo "FAIL: $seed sets a handle. Omit it so the user supplies their own."
  fail=1
fi

# 3. No social handle hardcoded anywhere in the shipped source. LICENSE and
#    README are exempt: author copyright and community attribution.
handles=$(git ls-files -z -- '.claude/skills/design' \
  | xargs -0 grep -nE '"@[A-Za-z0-9_.]+"' 2>/dev/null \
  | grep -viE '@yourhandle|@yourstudio|@username|@old|@testbrand|LICENSE')
if [ -n "$handles" ]; then
  echo "FAIL: hardcoded social handles in shipped source:"
  echo "$handles"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "OK: unbranded — no brand kits, no handles, Brand section hidden."
fi
exit "$fail"
