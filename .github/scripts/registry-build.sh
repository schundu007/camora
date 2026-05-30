#!/usr/bin/env bash
# Reads .github/registries.json, logs in to every active registry,
# generates the full comma-separated tag list for docker buildx, and
# ensures any ECR repositories exist before pushing.
#
# Usage: registry-build.sh <service> <short-sha> <branch> <is-main> <do-push>
#
# Outputs:
#   DOCKER_TAGS   — written to $GITHUB_OUTPUT (comma-separated tag list)
#   Exits non-zero if a mandatory registry login fails.
set -euo pipefail

SERVICE="${1:?service arg required}"
SHORT_SHA="${2:?short-sha arg required}"
BRANCH="${3:?branch arg required}"
IS_MAIN="${4:-false}"   # 'true' | 'false'
DO_PUSH="${5:-false}"   # 'true' | 'false'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CATALOG="${SCRIPT_DIR}/../registries.json"

# ── helpers ──────────────────────────────────────────────────────────────────

log()  { echo "  $*"; }
ok()   { echo "✅  $*"; }
skip() { echo "⬜  $*"; }
err()  { echo "❌  $*" >&2; }

# Replace __VARNAME__ tokens with the live env var value
resolve() {
  local s="$1"
  # replace each __KEY__ with ${KEY} then expand
  s=$(echo "$s" | sed 's/__\([A-Z0-9_]*\)__/${\1}/g')
  eval echo "\"$s\""
}

# Return 0 if every listed env var is non-empty
all_set() {
  while IFS= read -r var; do
    [[ -z "${!var:-}" ]] && return 1
  done < <(echo "$1" | jq -r '.[]')
  return 0
}

# Append tags for one image base: sha, branch, and (if main) latest
append_tags() {
  local base="$1"
  TAGS+=("${base}:sha-${SHORT_SHA}" "${base}:${BRANCH}")
  [[ "$IS_MAIN" == "true" ]] && TAGS+=("${base}:latest")
}

# ── main ─────────────────────────────────────────────────────────────────────

COUNT=$(jq '.registries | length' "$CATALOG")
TAGS=()

echo "── Registry login & tag generation for: ${SERVICE} ────────────────"

for i in $(seq 0 $((COUNT - 1))); do
  ENTRY=$(jq -c ".registries[$i]" "$CATALOG")

  ID=$(echo "$ENTRY"    | jq -r '.id')
  LABEL=$(echo "$ENTRY" | jq -r '.label')
  TYPE=$(echo "$ENTRY"  | jq -r '.type')
  ALWAYS=$(echo "$ENTRY"| jq -r '.always_enabled // false')
  REQUIRED=$(echo "$ENTRY" | jq -c '.required_env // []')
  FORMAT=$(echo "$ENTRY" | jq -r '.image_format')

  # Skip if credentials are missing
  if [[ "$ALWAYS" != "true" ]] && ! all_set "$REQUIRED"; then
    MISSING=$(echo "$REQUIRED" | jq -r '.[]' | tr '\n' ',' | sed 's/,$//')
    skip "${LABEL} (missing: ${MISSING})"
    continue
  fi

  # Resolve the image base for this service
  IMAGE_BASE=$(resolve "$FORMAT" | sed "s|__SERVICE__|${SERVICE}|g")

  # ── Login per registry type ────────────────────────────────────────────

  if [[ "$DO_PUSH" == "true" ]]; then
    case "$TYPE" in

      ghcr)
        echo "${GITHUB_TOKEN}" | docker login ghcr.io \
          --username "${GITHUB_ACTOR}" --password-stdin
        ;;

      aws-ecr)
        # Ensure ECR repo exists (create with scan-on-push if not)
        REGION="${AWS_REGION}"
        ACCT="${AWS_ACCOUNT_ID}"
        aws configure set aws_access_key_id     "${AWS_ACCESS_KEY_ID}"
        aws configure set aws_secret_access_key "${AWS_SECRET_ACCESS_KEY}"
        aws configure set default.region        "${REGION}"

        aws ecr describe-repositories \
          --repository-names "${SERVICE}" \
          --region "${REGION}" &>/dev/null \
        || aws ecr create-repository \
             --repository-name "${SERVICE}" \
             --region "${REGION}" \
             --image-scanning-configuration scanOnPush=true \
             --image-tag-mutability MUTABLE

        aws ecr get-login-password --region "${REGION}" \
          | docker login --username AWS --password-stdin \
              "${ACCT}.dkr.ecr.${REGION}.amazonaws.com"
        ;;

      gcp-gar)
        REGION="${GCP_REGION}"
        echo "${GAR_JSON_KEY}" | docker login \
          --username _json_key --password-stdin \
          "${REGION}-docker.pkg.dev"
        ;;

      docker-login)
        REG_VAR=$(echo "$ENTRY" | jq -r '.registry_var // ""')
        USER_VAR=$(echo "$ENTRY" | jq -r '.username_var')
        PASS_VAR=$(echo "$ENTRY" | jq -r '.password_var')
        REGISTRY="${!REG_VAR:-}"

        DOCKER_LOGIN_ARGS=(--username "${!USER_VAR}" --password-stdin)
        [[ -n "$REGISTRY" ]] && DOCKER_LOGIN_ARGS+=("$REGISTRY")

        echo "${!PASS_VAR}" | docker login "${DOCKER_LOGIN_ARGS[@]}"
        ;;

      *)
        err "Unknown registry type '${TYPE}' for ${ID} — skipping"
        continue
        ;;
    esac
    ok "${LABEL} → ${IMAGE_BASE}"
  else
    log "${LABEL} — skipping login (dry-run / PR)"
    ok "${LABEL} → ${IMAGE_BASE} (tags only)"
  fi

  append_tags "$IMAGE_BASE"
done

# ── Output ────────────────────────────────────────────────────────────────

if [[ ${#TAGS[@]} -eq 0 ]]; then
  err "No registries active — cannot build without at least one tag destination."
  exit 1
fi

JOINED=$(IFS=,; echo "${TAGS[*]}")

echo ""
echo "── Tags ────────────────────────────────────────────────────────────"
printf '  %s\n' "${TAGS[@]}"
echo ""

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "DOCKER_TAGS=${JOINED}" >> "$GITHUB_OUTPUT"
fi
