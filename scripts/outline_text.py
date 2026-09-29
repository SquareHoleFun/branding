#!/usr/bin/env python3
"""
Outlines every brand text (wordmark, taglines, labels) to SVG path data, so no font file ships with the kit and the
wordmark looks the same everywhere.

  python3 scripts/outline_text.py            # writes src/text-paths.json
  python3 scripts/outline_text.py --check    # re-outlines in memory and compares with src/text-paths.json

Font: Plus Jakarta Sans (variable, OFL-1.1), the Latin WOFF2 of @fontsource-variable/plus-jakarta-sans@5.3.0, the
exact package the Square Hole app pins (ADR-0005). Its sha256 is checked, so a different font cannot slip in.
Shaping (kerning) comes from HarfBuzz `hb-shape`; outlines come from fontTools at the requested weight.
Requires fontTools (4.51.0 used) with brotli for WOFF2, and the `hb-shape` binary (HarfBuzz 14.2.0 used).

Font lookup order: $SQUAREHOLE_FONT, then node_modules/ of this repo, then the Square Hole code checkout at
$SQUAREHOLE_REPO (default ../squarehole).
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from fontTools import version as fonttools_version
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "text-paths.json"
PACKAGE = "@fontsource-variable/plus-jakarta-sans"
PACKAGE_VERSION = "5.3.0"
WOFF2 = "files/plus-jakarta-sans-latin-wght-normal.woff2"
FONT_SHA256 = "153fc85b70298beeb1d61a5f723331649e7f23bb77302a66e61cb3e2fbdb5e79"

# id -> (text, weight, tracking in em, HarfBuzz features). Tracking is added after every glyph but the last.
# Domain names keep their letters apart (no "fi" ligature), so they read exactly as typed.
TEXTS = {
    "wordmark": ("Square Hole", 750, -0.02, ""),
    "tagline": ("Different shapes. Same hole.", 550, -0.005, ""),
    "tagline-alt": ("Many shapes. One hole.", 550, -0.005, ""),
    "label-brand-kit": ("BRAND KIT", 700, 0.14, ""),
    "label-fit": ("FIT", 700, 0.14, ""),
    "domains": ("squarehole.fun · squarehole.xyz · squarehole.fit", 550, 0.0, "-liga,-dlig"),
}


def ntos(value):
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def find_font():
    candidates = []
    if os.environ.get("SQUAREHOLE_FONT"):
        candidates.append(Path(os.environ["SQUAREHOLE_FONT"]))
    candidates.append(ROOT / "node_modules" / PACKAGE / WOFF2)
    repo = Path(os.environ.get("SQUAREHOLE_REPO", ROOT.parent / "squarehole"))
    candidates.append(repo / "packages" / "design" / "node_modules" / PACKAGE / WOFF2)
    for path in candidates:
        if path.is_file():
            package_json = path.parent.parent / "package.json"
            if package_json.is_file():
                version = json.loads(package_json.read_text())["version"]
                if version != PACKAGE_VERSION:
                    sys.exit(f"{PACKAGE} is {version} at {path}; the kit is pinned to {PACKAGE_VERSION}")
            return path.resolve()
    sys.exit(f"{PACKAGE}@{PACKAGE_VERSION} not found; set SQUAREHOLE_FONT or SQUAREHOLE_REPO")


def hb_version():
    first = subprocess.run(["hb-shape", "--version"], capture_output=True, text=True, check=True).stdout.splitlines()[0]
    return first.split()[-1]


def shape(ttf_path, text, weight, features):
    extra = [f"--features={features}"] if features else []
    result = subprocess.run(
        ["hb-shape", str(ttf_path), text, f"--variations=wght={weight}", "--output-format=json", "--no-glyph-names", *extra],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def outline(font, ttf_path, text, weight, tracking, features):
    glyph_set = font.getGlyphSet(location={"wght": weight})
    order = font.getGlyphOrder()
    upem = font["head"].unitsPerEm
    svg_pen = SVGPathPen(glyph_set, ntos=ntos)
    bounds_pen = BoundsPen(glyph_set)
    x = 0.0
    glyphs = shape(ttf_path, text, weight, features)
    for i, g in enumerate(glyphs):
        name = order[g["g"]]
        # Font units, y flipped so the baseline sits at y = 0 and y grows downwards (SVG).
        matrix = (1, 0, 0, -1, x + g["dx"], -g["dy"])
        glyph_set[name].draw(TransformPen(svg_pen, matrix))
        glyph_set[name].draw(TransformPen(bounds_pen, matrix))
        x += g["ax"] + (tracking * upem if i < len(glyphs) - 1 else 0)
    x_min, y_min, x_max, y_max = bounds_pen.bounds
    return {
        "text": text,
        "weight": weight,
        "trackingEm": tracking,
        "features": features,
        "unitsPerEm": upem,
        "advance": round(x, 2),
        "ink": [round(x_min, 2), round(y_min, 2), round(x_max, 2), round(y_max, 2)],
        "d": svg_pen.getCommands(),
    }


def build():
    font_path = find_font()
    raw = font_path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != FONT_SHA256:
        sys.exit(f"font sha256 {digest} differs from the pinned {FONT_SHA256}")
    font = TTFont(str(font_path))
    os2 = font["OS/2"]
    with tempfile.TemporaryDirectory() as tmp:
        ttf_path = Path(tmp) / "font.ttf"
        font.flavor = None
        font.save(str(ttf_path))
        font = TTFont(str(ttf_path))
        texts = {key: outline(font, ttf_path, *spec) for key, spec in TEXTS.items()}
    return {
        "schemaVersion": 1,
        "description": "Brand texts outlined to SVG paths (font units, baseline at y = 0, y down). Generated by scripts/outline_text.py; do not edit.",
        "font": {
            "family": "Plus Jakarta Sans",
            "license": "OFL-1.1",
            "copyright": font["name"].getDebugName(0),
            "version": font["name"].getDebugName(5),
            "source": f"{PACKAGE}@{PACKAGE_VERSION}/{WOFF2}",
            "sha256": digest,
            "capHeight": os2.sCapHeight,
            "xHeight": os2.sxHeight,
            "ascender": font["hhea"].ascent,
            "descender": font["hhea"].descent,
        },
        "tools": {"fontTools": fonttools_version, "harfbuzz": hb_version()},
        "texts": texts,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = build()
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if OUT.read_text() != text:
            sys.exit("src/text-paths.json is out of date: run python3 scripts/outline_text.py")
        print("src/text-paths.json matches")
        return
    OUT.write_text(text)
    for key, item in data["texts"].items():
        print(f"{key}: {item['text']!r} advance {item['advance']} ink {item['ink']} ({len(item['d'])} chars)")


if __name__ == "__main__":
    main()
