"""Generate ARPA Suite PWA icons: navy rounded square + gold AS."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAVY = (26, 42, 74, 255)
GOLD = (201, 168, 76, 255)

FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\arialbd.ttf"),
    Path(r"C:\Windows\Fonts\Arial Bold.ttf"),
    Path(r"C:\Windows\Fonts\calibrib.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def draw_icon(size: int, corner_ratio: float = 0.18) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = max(4, int(size * corner_ratio))
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=NAVY)

    target = size * 0.70
    font_size = int(size * 0.52)
    font = load_font(font_size)

    text = "AS"
    while font_size > 8:
        font = load_font(font_size)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        if tw <= target and th <= target:
            break
        font_size -= 2

    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    draw.text((x, y), text, fill=GOLD, font=font)
    return img


def main() -> None:
    outputs = [
        "icon-192.png",
        "icon-512.png",
        "icon-192x192.png",
        "icon-512x512.png",
        "icon-maskable-192.png",
        "icon-maskable-512.png",
        "apple-touch-icon.png",
    ]
    for name in outputs:
        size = 192 if "192" in name else 512
        img = draw_icon(size)
        out = ROOT / name
        img.save(out, "PNG", optimize=True)
        print(f"Wrote {out} ({size}x{size})")


if __name__ == "__main__":
    main()
