# -*- coding: utf-8 -*-
"""生成 Markdown Reader 扩展图标（16/32/48/128）。"""
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (46, 43, 40, 255)        # 暖深色
FG = (250, 249, 247, 255)     # 米白
ACCENT = (125, 163, 221, 255) # 主题蓝（亮化版 #4778c7）

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\calibrib.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def load_font(size):
    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = max(3, int(size * 0.22))
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)

    # ---- "M" 文字 ----
    m_font = load_font(int(size * 0.60))
    text = "M"
    bbox = d.textbbox((0, 0), text, font=m_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    # ---- 下箭头（多边形） ----
    aw = size * 0.30            # 箭头整体宽
    shaft = size * 0.11         # 箭杆厚
    head = size * 0.28          # 箭头三角高
    total_w = tw * 0.92 + aw
    x0 = (size - total_w) / 2
    cy = size / 2

    # M 放在左侧
    d.text((x0, cy - th / 2 - bbox[1]), text, font=m_font, fill=FG)

    # 箭头：竖杆 + 三角头
    ax = x0 + tw * 0.92 + aw * 0.08
    ax_c = ax + aw / 2
    top = cy - size * 0.16
    bottom = cy + size * 0.20
    d.rectangle([ax_c - shaft / 2, top, ax_c + shaft / 2, bottom - head * 0.7], fill=ACCENT)
    d.polygon(
        [
            (ax + aw * 0.06, bottom - head),
            (ax + aw * 0.94, bottom - head),
            (ax_c, bottom),
        ],
        fill=ACCENT,
    )
    return img


for s in (16, 32, 48, 128):
    icon = make_icon(s)
    # 32 的倍数尺寸用高清源缩放更平滑
    if s not in (16,):
        big = make_icon(256).resize((s, s), Image.LANCZOS)
        icon = big
    path = os.path.join(OUT, f"icon{s}.png")
    icon.save(path)
    print("written", path)
