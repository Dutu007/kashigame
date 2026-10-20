"""Prepare reference skins with empty areas for live game canvases.

Usage: python scripts/assets/prepare-weave-reference-ui.py SOURCE_DIRECTORY
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFilter

source = Path(sys.argv[1])
output = Path(__file__).resolve().parents[2] / 'game/levels/weave-lane/assets/ui/workshop'
output.mkdir(parents=True, exist_ok=True)


def paper_patch(image, polygon, sample_box, feather=2):
    """Replace baked sample content with paper sampled from the same artwork."""
    sample = image.crop(sample_box).resize(image.size, Image.Resampling.BICUBIC)
    sample = sample.filter(ImageFilter.GaussianBlur(1))
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    if feather:
        mask = mask.filter(ImageFilter.GaussianBlur(feather))
    image.paste(sample, (0, 0), mask)


preview = Image.open(source / '072cbf71be2bb6260a580ef3fdb08ac0.png').convert('RGB')
# Keep the wooden rod, lanterns, frame, heading and button artwork.
paper_patch(preview, [(294, 271), (824, 271), (864, 1015), (863, 1117),
                      (257, 1117), (257, 1009)], (866, 647, 887, 1000))
preview.save(output / 'hanging-preview-reference.webp', quality=95)

puzzle = Image.open(source / '29918aee696e275ca42004199c4a2f7d.png').convert('RGB')
# The reference number of correct strips is replaced with the current live count.
paper_patch(puzzle, [(370, 915), (1120, 915), (1120, 946), (370, 946)],
            (376, 948, 1100, 959), feather=1)
puzzle.save(output / 'puzzle-reference.webp', quality=95)

compare = Image.open(source / '42849bf5821fbe47d492a216c4c17064.jpg').convert('RGB')
for left, right in [(275, 657), (799, 1178)]:
    paper_patch(compare, [(left, 376), (right, 376), (right, 794), (left, 794)],
                (686, 407, 703, 775))
# Live selected blueprint name, work label and comparison note.
paper_patch(compare, [(420, 284), (1025, 284), (1025, 316), (420, 316)],
            (450, 319, 1000, 326), feather=1)
for left, right in [(352, 594), (858, 1095)]:
    paper_patch(compare, [(left, 807), (right, 807), (right, 840), (left, 840)],
                (380, 842, 570, 847), feather=1)
compare.save(output / 'silk-compare-reference.webp', quality=95)

frame = Image.open(source / 'da8bc615845a48fc2be00b8c75638fc3.png').convert('RGBA')
frame.save(output / 'blank-complete-frame.png')
print('Prepared preview, puzzle, comparison, and blank-completion skins.')
