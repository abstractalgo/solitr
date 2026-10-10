#!/usr/bin/env python3
"""Pull the data-URI images out of the original solitr CSS files.

Usage: extract-css-images.py <original-css> <out-dir>

Writes one file per CSS rule that embeds an image, named after the rule's
selector (e.g. `.cardah` -> ah.png, `.cardback` -> back.png, `.undo-icon` -> undo-icon.svg).
"""
import base64, os, re, sys, urllib.parse

css_path, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
css = open(css_path).read()

rule = re.compile(r'([^{}]+)\{[^{}]*?url\((["\']?)data:([^;,]+)(;base64)?(?:;charset=[^,]*)?,([^)"\']*)\2\)')
for m in rule.finditer(css):
    selector, mime, is_b64, payload = m.group(1).strip(), m.group(3), m.group(4), m.group(5)
    name = selector.split(',')[-1].strip().lstrip('.#')
    name = re.sub(r'^card(?=..$)', '', name)       # .cardah -> ah
    name = 'back' if name == 'cardback' else name
    ext = {'image/png': 'png', 'image/svg+xml': 'svg'}[mime]
    data = base64.b64decode(payload) if is_b64 else urllib.parse.unquote(payload).encode()
    with open(os.path.join(out_dir, f'{name}.{ext}'), 'wb') as f:
        f.write(data)
    print(f'{selector:40s} -> {name}.{ext} ({len(data)} bytes)')
