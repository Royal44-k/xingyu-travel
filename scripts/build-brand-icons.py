from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/design/generated-originals/xingyu-mark-imagegen.png"
PINE = (38, 49, 43, 255)
IVORY = (244, 240, 232, 255)
SAND = (183, 154, 104, 255)


def flatten_source() -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    flattened = Image.new("RGBA", source.size, PINE)
    output_pixels = []
    mask_pixels = []

    for red, green, blue, _alpha in source.get_flattened_data():
        if red > 110 and red - green > 10 and green - blue > 22:
            output_pixels.append(SAND)
            mask_pixels.append(255)
        elif red + green + blue > 330:
            output_pixels.append(IVORY)
            mask_pixels.append(255)
        else:
            output_pixels.append(PINE)
            mask_pixels.append(0)

    flattened.putdata(output_pixels)
    mask = Image.new("L", source.size)
    mask.putdata(mask_pixels)
    bounds = mask.getbbox()
    if bounds is None:
        raise RuntimeError("No logo silhouette detected in ImageGen source")

    mark = flattened.crop(bounds)
    target_width = 820
    target_height = round(mark.height * target_width / mark.width)
    mark = mark.resize((target_width, target_height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1024, 1024), PINE)
    canvas.alpha_composite(mark, ((1024 - target_width) // 2, (1024 - target_height) // 2))
    return canvas


def save_png(master: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    master.resize((size, size), Image.Resampling.LANCZOS).convert("RGB").save(
        path,
        format="PNG",
        optimize=True,
    )


def save_size_board(master: Image.Image) -> None:
    board_path = ROOT / "artifacts/brand-icon-2026-08-21/icon-size-board.png"
    board_path.parent.mkdir(parents=True, exist_ok=True)
    board = Image.new("RGB", (920, 260), (244, 240, 232))
    draw = ImageDraw.Draw(board)
    sizes = [16, 32, 64, 128]
    x = 42

    for size in sizes:
        icon = master.resize((size, size), Image.Resampling.LANCZOS).convert("RGB")
        enlarged = icon.resize((160, 160), Image.Resampling.NEAREST)
        board.paste(enlarged, (x, 34))
        draw.text((x + 66, 212), f"{size}px", fill=(38, 49, 43))
        x += 215

    board.save(board_path, format="PNG", optimize=True)


def save_comparison_board(master: Image.Image) -> None:
    source_capture = ROOT / "artifacts/brand-icon-2026-08-21/before-url-favicon.png"
    if not source_capture.exists():
        return

    board_path = ROOT / "artifacts/brand-icon-2026-08-21/favicon-comparison-board.png"
    before = Image.open(source_capture).convert("RGB")
    board = Image.new("RGB", (760, 180), (244, 240, 232))
    draw = ImageDraw.Draw(board)
    draw.text((24, 18), "Before · travel photograph", fill=(38, 49, 43))
    draw.text((390, 18), "After · XINGYU brand mark", fill=(38, 49, 43))
    board.paste(before, (24, 72))

    icon_24 = master.resize((24, 24), Image.Resampling.LANCZOS).convert("RGB")
    icon_32 = master.resize((32, 32), Image.Resampling.LANCZOS).convert("RGB")
    board.paste(icon_24, (410, 80))
    board.paste(icon_32, (500, 76))
    draw.text((401, 122), "24px", fill=(38, 49, 43))
    draw.text((497, 122), "32px", fill=(38, 49, 43))
    board.save(board_path, format="PNG", optimize=True)


def main() -> None:
    master = flatten_source()
    save_png(master, ROOT / "public/brand/xingyu-mark.png", 1024)
    save_png(master, ROOT / "src/app/icon.png", 512)
    save_png(master, ROOT / "src/app/apple-icon.png", 180)
    save_png(master, ROOT / "public/icon-192.png", 192)
    save_png(master, ROOT / "public/icon-512.png", 512)
    master.convert("RGBA").save(
        ROOT / "src/app/favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    save_size_board(master)
    save_comparison_board(master)


if __name__ == "__main__":
    main()
