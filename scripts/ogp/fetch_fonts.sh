#!/usr/bin/env bash
# OGP 用フォント (M PLUS Rounded 1c, SIL Open Font License 1.1) を fonts/ogp/ に取得する。
# tcardgen はディレクトリ内の <name>-<style>.ttf を 1 つの書体として読むので、ファイル名は変えないこと。
set -euo pipefail
dir="${1:-fonts/ogp}"
mkdir -p "$dir"
base="https://raw.githubusercontent.com/google/fonts/main/ofl/mplusrounded1c"
for style in Regular ExtraBold Bold Medium; do
  curl -fsSL -o "$dir/MPLUSRounded1c-$style.ttf" "$base/MPLUSRounded1c-$style.ttf"
done
echo "fonts saved to $dir (license: https://github.com/google/fonts/tree/main/ofl/mplusrounded1c)"
