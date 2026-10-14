#!/usr/bin/env bash
# Upload the converted pages to Document Authoring, then preview and publish them.
#
#   export DA_TOKEN='<IMS bearer token>'
#   ./tools/da-publish.sh
#
# Get DA_TOKEN by signing in at da.live, opening devtools → Network, and copying the
# Authorization header from any admin.da.live request. It is short-lived; re-grab it
# if you start seeing 401s. For anything repeatable, use proper IMS credentials.
#
# NOTE: written from the DA Admin API reference, not executed against a live tenant.
# Watch the HTTP codes on the first page before letting it run through all eight.

set -euo pipefail

ORG="${ORG:-nikhilsinghal-acn}"
REPO="${REPO:-eds-llm-apps-eval}"
BRANCH="${BRANCH:-main}"
OUT_DIR="${OUT_DIR:-content/da-out}"

: "${DA_TOKEN:?Set DA_TOKEN first}"

if [ ! -d "$OUT_DIR" ]; then
  echo "No $OUT_DIR. Run: node tools/md-to-da.mjs" >&2
  exit 1
fi

echo "org=$ORG repo=$REPO branch=$BRANCH"
echo

while IFS= read -r file; do
  # tools/da-out/models/terra.html -> models/terra
  rel="${file#"$OUT_DIR"/}"
  path="${rel%.html}"

  printf '%-24s ' "$path"

  # 1. write the source document to DA. Field name must be `data`.
  code=$(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
    -H "Authorization: Bearer $DA_TOKEN" \
    -F "data=@${file};type=text/html" \
    "https://admin.da.live/source/${ORG}/${REPO}/${rel}")
  printf 'da=%s ' "$code"

  # 2. preview. Path has no .html extension.
  code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
    "https://admin.hlx.page/preview/${ORG}/${REPO}/${BRANCH}/${path}")
  printf 'preview=%s ' "$code"

  # 3. publish to .aem.live
  code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
    "https://admin.hlx.page/live/${ORG}/${REPO}/${BRANCH}/${path}")
  printf 'live=%s\n' "$code"

done < <(find "$OUT_DIR" -name '*.html' | sort)

echo
echo "edit    https://da.live/#/${ORG}/${REPO}"
echo "preview https://${BRANCH}--${REPO}--${ORG}.aem.page/"
echo "live    https://${BRANCH}--${REPO}--${ORG}.aem.live/"
