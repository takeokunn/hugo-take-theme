#!/usr/bin/env bash
# Generate one image per post; run from the Hugo site root.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
fonts="${FONTS:-fonts/ogp}"
config="$here/tcardgen.config.yaml"

mkdir -p static/ogp
find "$@" -name '*.md' ! -name '_index.md' | while IFS= read -r md; do
  name="$(basename "$md" .md)"
  if [ "$name" = "index" ]; then
    name="$(basename "$(dirname "$md")")"
  fi
  tcardgen --fontDir "$fonts" --config "$config" --output "static/ogp/$name.png" "$md"
done
