#!/usr/bin/env bash
# Reads .github/registries.json and reports which registries are active.
# Writes preflight outputs to $GITHUB_OUTPUT when running in GitHub Actions.
# Usage: registry-preflight.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CATALOG="${SCRIPT_DIR}/../registries.json"

# resolve_format replaces __VARNAME__ placeholders with env var values
resolve_format() {
  local fmt="$1"
  # replace every __KEY__ token with the value of the env var named KEY
  echo "$fmt" | sed 's/__\([A-Z0-9_]*\)__/${'"'"'\1'"'"'}/g' | \
    envsubst 2>/dev/null || echo "$fmt"
}

# check_required returns 0 (true) if all listed env var names are non-empty
check_required() {
  local vars="$1"   # JSON array of strings
  while IFS= read -r var; do
    [[ -z "${!var:-}" ]] && return 1
  done < <(echo "$vars" | jq -r '.[]')
  return 0
}

COUNT=$(jq '.registries | length' "$CATALOG")

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            Registry Pre-flight Check                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Catalog : .github/registries.json  ($COUNT registries defined)"
echo "  Event   : ${GITHUB_EVENT_NAME:-local}"
echo "  Branch  : ${GITHUB_REF_NAME:-local}"
echo ""
echo "── Status ──────────────────────────────────────────────────────"

ACTIVE_IDS=()

for i in $(seq 0 $((COUNT - 1))); do
  ENTRY=$(jq -c ".registries[$i]" "$CATALOG")
  ID=$(echo "$ENTRY"    | jq -r '.id')
  LABEL=$(echo "$ENTRY" | jq -r '.label')
  ALWAYS=$(echo "$ENTRY"| jq -r '.always_enabled // false')
  REQUIRED=$(echo "$ENTRY" | jq -c '.required_env // []')
  FORMAT=$(echo "$ENTRY" | jq -r '.image_format')

  if [[ "$ALWAYS" == "true" ]] || check_required "$REQUIRED"; then
    ACTIVE_IDS+=("$ID")
    EXAMPLE=$(resolve_format "$FORMAT" | sed 's/__SERVICE__/<service>/')
    echo "✅  ${LABEL}"
    echo "      ${EXAMPLE}"
  else
    MISSING=$(echo "$REQUIRED" | jq -r '.[]' | tr '\n' ',' | sed 's/,$//')
    echo "⬜  ${LABEL}"
    echo "      secrets needed: ${MISSING}"
  fi
done

echo ""

# Emit outputs for GitHub Actions
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  # JSON array of active registry IDs
  printf -v JOINED '"%s",' "${ACTIVE_IDS[@]}"
  JSON_ARRAY="[${JOINED%,}]"
  echo "active_registries=${JSON_ARRAY}" >> "$GITHUB_OUTPUT"

  # Also emit a simple comma-separated list for human display
  CSV=$(IFS=,; echo "${ACTIVE_IDS[*]}")
  echo "active_csv=${CSV}" >> "$GITHUB_OUTPUT"
fi

echo "Active registries: $(IFS=,; echo "${ACTIVE_IDS[*]:-none}")"
echo ""
echo "Pre-flight complete."
