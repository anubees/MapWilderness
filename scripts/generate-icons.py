"""
Generate PWA icon PNGs matching src/assets/icons/favicon.svg.

The SVG is the source of truth (wilderness scene: moon, mountains, pines, lake).
Run manually or let build.js invoke this when icon-192.png is missing.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "icons"

# Palette aligned with app CSS tokens (--bg, --accent, --sky, --sunset).
BG = (13, 34, 41)
BG_END = (7, 24, 32)
SKY_TOP = (20, 51, 61)
GREEN = (82, 213, 147)
GREEN_MID = (45, 184, 114)
MOUNTAIN_BACK = (26, 74, 85)
MOUNTAIN_MID = (45, 184, 114)
SKY = (104, 216, 255)
GOLD = (247, 200, 115)


def lerp(a: float, b: float, t: float) -> float:
    """Linear interpolation between two numbers."""
    return a + (b - a) * t


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    """Linear interpolation between two RGB tuples."""
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def draw_icon(size: int) -> Image.Image:
    """Rasterize the 32×32 wilderness icon design at the requested square size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s = size / 32
    radius = int(7 * s)

    # Diagonal gradient background with lighter sky band at the top.
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            base = lerp_color(BG, BG_END, t)
            if y < 20 * s:
                sky_t = y / (20 * s)
                base = lerp_color(SKY_TOP, base, sky_t * 0.55)
            img.putpixel((x, y), base + (255,))

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    img.putalpha(mask)

    draw = ImageDraw.Draw(img)

    def poly(points: list[tuple[float, float]], fill: tuple[int, int, int], alpha: int = 255) -> None:
        """Draws a filled polygon on the icon canvas."""
        draw.polygon([(p[0] * s, p[1] * s) for p in points], fill=fill + (alpha,))

    def rect(x: float, y: float, w: float, h: float, fill: tuple[int, int, int], alpha: int = 255) -> None:
        """Draws a filled rounded rectangle on the icon canvas."""
        draw.rounded_rectangle(
            [x * s, y * s, (x + w) * s, (y + h) * s],
            radius=max(1, int(0.3 * s)),
            fill=fill + (alpha,),
        )

    def circle(cx: float, cy: float, r: float, fill: tuple[int, int, int], alpha: int = 255) -> None:
        """Draws a filled circle on the icon canvas."""
        draw.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], fill=fill + (alpha,))

    # Moon and stars
    circle(24.5, 7.5, 2.8, GOLD, 242)
    circle(25.6, 6.8, 2.3, BG_END)
    circle(10, 6, 0.55, SKY, 217)
    circle(14.5, 4.5, 0.4, SKY, 166)

    # Mountain ridges
    poly([(0, 22), (7, 13), (13, 19), (19, 10), (26, 18), (32, 14), (32, 32), (0, 32)], MOUNTAIN_BACK, 217)
    poly([(0, 26), (5, 20), (11, 25), (17, 17), (24, 24), (32, 19), (32, 32), (0, 32)], MOUNTAIN_MID, 140)

    # Lake shimmer
    draw.ellipse(
        [(16 - 11) * s, (28.5 - 1.2) * s, (16 + 11) * s, (28.5 + 1.2) * s],
        fill=SKY + (71,),
    )

    def pine(
        cx: float,
        base: float,
        top: float,
        width: float,
        tiers: int,
        foliage: tuple[int, int, int],
        trunk: tuple[int, int, int],
    ) -> None:
        """Draws a pine tree from stacked triangular tiers and a trunk."""
        tier_h = (base - top) / tiers
        for i in range(tiers):
            y_top = top + i * tier_h * 0.55
            y_bot = top + (i + 1) * tier_h
            half = width * (1 - i * 0.18)
            poly([(cx, y_top), (cx - half, y_bot), (cx + half, y_bot)], foliage)
        trunk_w = max(0.8, width * 0.22)
        rect(cx - trunk_w / 2, y_bot, trunk_w, base - y_bot, trunk)

    pine(5, 28, 18, 2.5, 3, GREEN_MID, MOUNTAIN_MID)
    pine(16, 28, 16, 5, 3, GREEN, GREEN_MID)
    pine(25, 28, 19, 3, 2, GREEN_MID, MOUNTAIN_MID)

    return img


def main() -> None:
    """Writes icon-192.png and icon-512.png to src/assets/icons/."""
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size in [("icon-192.png", 192), ("icon-512.png", 512)]:
        draw_icon(size).save(OUT / name, "PNG")
        print(f"Wrote {OUT / name}")


if __name__ == "__main__":
    main()
