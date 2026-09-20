#!/usr/bin/env bash
# Verify a string is actually being SERVED by production — not just present in
# local source, and not just "the deployment says Ready".
#
# Two traps this exists to avoid:
#   1. `vercel ls` prints its table to STDERR. `2>/dev/null` silently discards
#      everything, so any grep on it matches nothing forever. Always use 2>&1.
#   2. A 200 means nothing on its own: the SPA fallback answers every unknown
#      path with index.html. Check the content-type.
#   3. The entry hash does NOT change when only a lazy chunk changes, so the
#      needle has to be hunted across every chunk the entry references.
#
# Usage: scripts/verify-deploy.sh "<needle>" [origin]
set -uo pipefail
NEEDLE="${1:?usage: verify-deploy.sh <needle> [origin]}"
ORIGIN="${2:-https://camora.cariara.com}"

INDEX="$(curl -fsS "$ORIGIN/")" || { echo "FAIL: cannot fetch $ORIGIN"; exit 1; }
mapfile -t SEEDS < <(grep -oE '/assets/[A-Za-z0-9._-]+\.(js|css)' <<<"$INDEX" | sort -u)
[ "${#SEEDS[@]}" -gt 0 ] || { echo "FAIL: no assets referenced by $ORIGIN"; exit 1; }

# Lazy chunks are named inside the entry bundles, not in index.html.
declare -A SEEN
QUEUE=("${SEEDS[@]}")
ALL=()
while [ "${#QUEUE[@]}" -gt 0 ]; do
  A="${QUEUE[0]}"; QUEUE=("${QUEUE[@]:1}")
  [ -n "${SEEN[$A]:-}" ] && continue
  SEEN[$A]=1; ALL+=("$A")
done

for A in "${SEEDS[@]}"; do
  case "$A" in *.js)
    while read -r C; do
      [ -n "${SEEN[$C]:-}" ] && continue
      SEEN[$C]=1; ALL+=("$C")
    done < <(curl -fsS "$ORIGIN$A" | grep -oE 'assets/[A-Za-z0-9._-]+\.js' | sed 's#^#/#' | sort -u)
  ;; esac
done

echo "scanning ${#ALL[@]} served assets for: $NEEDLE"
HITS=0
for A in "${ALL[@]}"; do
  CT="$(curl -fsS -o /tmp/.vd_asset -w '%{content_type}' "$ORIGIN$A" 2>/dev/null)" || continue
  case "$CT" in text/html*) continue;; esac   # SPA fallback, not a real asset
  if grep -qF -- "$NEEDLE" /tmp/.vd_asset; then
    echo "  FOUND in $A  ($CT)"
    HITS=$((HITS+1))
  fi
done
rm -f /tmp/.vd_asset
[ "$HITS" -gt 0 ] && { echo "PASS: live production serves it"; exit 0; }
echo "FAIL: not served by $ORIGIN (deploy not live yet, or the string changed)"
exit 1
