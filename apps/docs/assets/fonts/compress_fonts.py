"""Create full-glyph WOFF2 web fonts from the checked-in TTF sources.

Requires fonttools[woff]==4.60.1. Run from apps/docs:
python assets/fonts/compress_fonts.py

The TTF sources, names, glyph coverage and licenses remain unchanged.
Open Graph rendering continues to use its separate static TTF face.
"""

import hashlib
import json
from pathlib import Path

from fontTools.ttLib import TTFont


FONT_DIR = Path(__file__).resolve().parents[2] / "public" / "fonts"
WEB_FONTS = ("space-grotesk", "jetbrains-mono", "pixelify-sans", "bao-block-bold")


def main():
    manifest_path = FONT_DIR / "sources.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    web_paths = {f"{stem}.woff2" for stem in WEB_FONTS}
    manifest = [entry for entry in manifest if entry["path"] not in web_paths]

    for stem in WEB_FONTS:
        source_path = FONT_DIR / f"{stem}.ttf"
        output_path = FONT_DIR / f"{stem}.woff2"
        font = TTFont(source_path, recalcTimestamp=False)
        font.flavor = "woff2"
        font.save(output_path)

        with TTFont(output_path) as result:
            assert font.getBestCmap() == result.getBestCmap(), stem
            assert font.getGlyphOrder() == result.getGlyphOrder(), stem
            assert font["name"].compile(font) == result["name"].compile(result), stem
            assert font["hmtx"].metrics == result["hmtx"].metrics, stem
            if "fvar" in font:
                assert font["fvar"].compile(font) == result["fvar"].compile(result), stem

        source_entry = next(entry for entry in manifest if entry["path"] == source_path.name)
        manifest.append({
            "family": source_entry["family"],
            "path": output_path.name,
            "source": source_path.name,
            "sha256": hashlib.sha256(output_path.read_bytes()).hexdigest(),
            "purpose": "Full-glyph WOFF2 compressed with FontTools 4.60.1 by assets/fonts/compress_fonts.py; same family, metrics and license as the TTF source.",
        })
        print(f"{stem}: {source_path.stat().st_size} -> {output_path.stat().st_size} bytes; glyphs, names, metrics and variation axes preserved")
        font.close()

    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
