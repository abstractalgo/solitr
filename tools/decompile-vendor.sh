#!/usr/bin/env bash
# Rebuilds decompiled/vendor/*.js from the original bundle.
#
#   1. unminify.js     – restore identifier names from the source map
#   2. split-bundle.js – split the bundle into its top-level parts
#   3. concatenate the parts each library needs and prettify them
#
# The game code (part 20) is not copied: decompiled/js/ is a hand-written
# ES2015 port of it. Its name-restored form is left in tools/out/parts/part020.js
# for reference.
set -euo pipefail
cd "$(dirname "$0")"

ROOT=..
ASSETS=$ROOT/original/assets
OUT=out
VENDOR=$ROOT/decompiled/vendor

mkdir -p "$OUT/parts" "$VENDOR"
node unminify.js "$ASSETS"/application-67cff164f04de397a15cbbf24fcf6124.js \
                 "$ASSETS"/application-302f772b2753f4ebb0b82e12a609af84.map \
                 "$OUT"/application.named.js
node split-bundle.js "$OUT"/application.named.js "$OUT"/parts > "$OUT"/parts/index.txt

# vendor file            parts (see out/parts/index.txt)
LIBS=(
  "jquery-3.1.0.js              000"
  "store-2.0.12.js              001"
  "bootstrap-3.3.4.js           002 003 004"   # dropdown, modal, transition
  "bootstrap-toggle-2.2.0.js    005"
  "jquery-ui-1.11.3.js          006 007 008 009" # core, widget, mouse, effect
  "jquery.ui.touch-punch.js     011"
  "jquery.transform.js          012 013 014 015 016 017" # Sylvester matrix + transform plugin
  "underscore-1.3.1.js          018"
)
# Not copied: 010 jquery.cookie (unused), 019 cookieconsent, 020 game code.

for entry in "${LIBS[@]}"; do
  read -r file parts <<<"$entry"
  {
    echo "// $file – extracted from solitr.com's application.js (parts: $parts)."
    echo "// Identifier names restored from the source map by tools/unminify.js."
    for p in $parts; do cat "$OUT/parts/part$p.js"; done
  } | npx prettier --parser babel > "$VENDOR/$file"
  echo "wrote vendor/$file"
done
