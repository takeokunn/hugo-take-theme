#!/usr/bin/env bash
# Generate one image per post; run from the Hugo site root.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
fonts="${FONTS:-fonts/ogp}"
config="$here/tcardgen.config.yaml"

list() {
  if [ "${1:-}" = "-" ]; then cat; else find "$@" -name '*.md' ! -name '_index.md'; fi
}

list "$@" | while IFS= read -r md; do
  [ -f "$md" ] || continue
  name="$(basename "$md" .md)"
  if [ "$name" = "index" ]; then
    name="$(basename "$(dirname "$md")")"
  fi
  mkdir -p static/ogp
  tcardgen --fontDir "$fonts" --config "$config" --output "static/ogp/$name.png" "$md"
done
