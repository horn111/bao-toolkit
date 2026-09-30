"""Build BAO's original eight-row display face. Requires FontTools.

The glyph outlines, like the rest of this repository, use the MIT license.
Run from apps/docs: python assets/fonts/build_bao_block.py
"""

from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen


BITMAPS = {
    "A": ["0011100", "0111110", "1100011", "1100011", "1111111", "1111111", "1100011", "1100011"],
    "B": ["1111110", "1111111", "1100011", "1111110", "1111110", "1100011", "1111111", "1111110"],
    "C": ["0111111", "1111111", "1100000", "1100000", "1100000", "1100000", "1111111", "0111111"],
    "D": ["1111100", "1111110", "1100011", "1100011", "1100011", "1100011", "1111110", "1111100"],
    "E": ["1111111", "1111111", "1100000", "1111110", "1111110", "1100000", "1111111", "1111111"],
    "F": ["1111111", "1111111", "1100000", "1111110", "1111110", "1100000", "1100000", "1100000"],
    "G": ["0111111", "1111111", "1100000", "1101111", "1101111", "1100011", "1111111", "0111110"],
    "H": ["1100011", "1100011", "1100011", "1111111", "1111111", "1100011", "1100011", "1100011"],
    "I": ["11"] * 8,
    "J": ["0000011", "0000011", "0000011", "0000011", "0000011", "1100011", "1111111", "0111110"],
    "K": ["1100011", "1100110", "1101100", "1111000", "1111000", "1101100", "1100110", "1100011"],
    "L": ["1100000"] * 6 + ["1111111"] * 2,
    "M": ["110000011", "111000111", "111101111", "110111011", "110010011", "110000011", "110000011", "110000011"],
    "N": ["1100011", "1110011", "1111011", "1101111", "1101111", "1100111", "1100011", "1100011"],
    "O": ["0111110", "1111111", "1100011", "1100011", "1100011", "1100011", "1111111", "0111110"],
    "P": ["1111110", "1111111", "1100011", "1100011", "1111111", "1111110", "1100000", "1100000"],
    "Q": ["0111110", "1111111", "1100011", "1100011", "1101011", "1100111", "1111110", "0111101"],
    "R": ["1111110", "1111111", "1100011", "1100011", "1111110", "1101100", "1100110", "1100011"],
    "S": ["0111111", "1111111", "1100000", "0111110", "0111110", "0000011", "1111111", "1111110"],
    "T": ["1111111"] * 2 + ["0011100"] * 6,
    "U": ["1100011"] * 6 + ["1111111", "0111110"],
    "V": ["1100011"] * 5 + ["0110110", "0111110", "0011100"],
    "W": ["110000011", "110000011", "110000011", "110010011", "110111011", "111101111", "111000111", "110000011"],
    "X": ["1100011", "1100011", "0110110", "0011100", "0011100", "0110110", "1100011", "1100011"],
    "Y": ["1100011", "1100011", "0110110", "0011100", "0011100", "0011100", "0011100", "0011100"],
    "Z": ["1111111", "1111111", "0000110", "0001100", "0011000", "0110000", "1111111", "1111111"],
    "0": ["0111110", "1111111", "1101011", "1101011", "1101011", "1101011", "1111111", "0111110"],
    "1": ["001100", "011100", "001100", "001100", "001100", "001100", "111111", "111111"],
    "2": ["0111110", "1111111", "0000011", "0001110", "0011100", "0110000", "1111111", "1111111"],
    "3": ["1111110", "1111111", "0000011", "0011110", "0011110", "0000011", "1111111", "1111110"],
    "4": ["1100011", "1100011", "1100011", "1111111", "1111111", "0000011", "0000011", "0000011"],
    "5": ["1111111", "1111111", "1100000", "1111110", "1111111", "0000011", "1111111", "1111110"],
    "6": ["0111110", "1111111", "1100000", "1111110", "1111111", "1100011", "1111111", "0111110"],
    "7": ["1111111", "1111111", "0000011", "0000110", "0001100", "0011000", "0011000", "0011000"],
    "8": ["0111110", "1111111", "1100011", "0111110", "0111110", "1100011", "1111111", "0111110"],
    "9": ["0111110", "1111111", "1100011", "1111111", "0111111", "0000011", "1111111", "0111110"],
    ".": ["00"] * 6 + ["11"] * 2,
    "?": ["0111110", "1111111", "0000011", "0001110", "0011100", "0000000", "0011100", "0011100"],
    "-": ["00000"] * 3 + ["11111"] * 2 + ["00000"] * 3,
}


def glyph(rows):
    pen = TTGlyphPen(None)
    for row_index, row in enumerate(rows):
        column = 0
        while column < len(row):
            if row[column] == "0":
                column += 1
                continue
            end = column
            while end < len(row) and row[end] == "1":
                end += 1
            x, y = column * 100, (7 - row_index) * 100
            pen.moveTo((x, y))
            pen.lineTo((x, y + 100))
            pen.lineTo((end * 100, y + 100))
            pen.lineTo((end * 100, y))
            pen.closePath()
            column = end
    return pen.glyph()


def build():
    names = {character: f"uni{ord(character):04X}" for character in BITMAPS}
    order = [".notdef", "space", *names.values()]
    builder = FontBuilder(1000, isTTF=True)
    builder.setupGlyphOrder(order)
    builder.setupCharacterMap({32: "space", **{ord(c): name for c, name in names.items()}})
    builder.setupGlyf({".notdef": glyph(BITMAPS["?"]), "space": glyph([]), **{names[c]: glyph(rows) for c, rows in BITMAPS.items()}})
    builder.setupHorizontalMetrics({".notdef": (800, 0), "space": (400, 0), **{names[c]: ((len(rows[0]) + 1) * 100, 0) for c, rows in BITMAPS.items()}})
    builder.setupHorizontalHeader(ascent=800, descent=-200, lineGap=0)
    builder.setupNameTable({
        "familyName": "BAO Block",
        "styleName": "Bold",
        "uniqueFontIdentifier": "BAO Block Bold 1.0",
        "fullName": "BAO Block Bold",
        "psName": "BAOBlock-Bold",
        "version": "Version 1.000",
        "copyright": "Copyright (c) 2026 Base App OS contributors. MIT License.",
        "licenseDescription": "MIT License. See the repository LICENSE.",
    })
    builder.setupOS2(version=4, sTypoAscender=800, sTypoDescender=-200, sTypoLineGap=0, usWinAscent=800, usWinDescent=200, sxHeight=800, sCapHeight=800, usWeightClass=700, fsSelection=160)
    builder.setupPost()
    builder.setupMaxp()
    builder.font["head"].macStyle = 1
    builder.font["head"].created = builder.font["head"].modified = 3863030400
    builder.font.recalcTimestamp = False
    output = Path(__file__).resolve().parents[2] / "public/fonts/bao-block-bold.ttf"
    builder.save(output)
    print(f"{output.name}: {len(order)} glyphs")


if __name__ == "__main__":
    build()
