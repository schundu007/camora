#!/usr/bin/env bash
# Rebuild every Graphviz docs diagram from .dot source.
#
# Each .dot file at any depth under this directory is re-rendered to a PNG
# of the same basename next to it. Output: 150 dpi for retina-quality
# screens, with PNG named after the dot file stem.
#
# Requirements: graphviz (`brew install graphviz` on macOS).
#
# Usage:
#   bash apps/frontend/public/diagrams/docs/render.sh

set -euo pipefail

# Resolve to the directory holding this script regardless of caller cwd.
DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v dot >/dev/null 2>&1; then
  echo "error: graphviz \`dot\` not found on PATH. Install with \`brew install graphviz\`." >&2
  exit 1
fi

count=0
while IFS= read -r -d '' src; do
  out="${src%.dot}.png"
  echo "rendering: ${src#$DIR/}  →  ${out#$DIR/}"
  dot -Tpng -Gdpi=150 "$src" -o "$out"
  count=$((count + 1))
done < <(find "$DIR" -type f -name '*.dot' -print0)

echo "done. rendered $count diagram(s)."
