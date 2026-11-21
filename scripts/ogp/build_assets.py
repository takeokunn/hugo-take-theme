#!/usr/bin/env python3
"""OGP の固定素材を作る (Pillow)。

  - assets/ogp/tcard-template.png : tcardgen に渡すテンプレート (記事用 OGP の土台)
  - assets/ogp/site.png           : サイト既定の OGP (完成品)

使い方:
  pip install pillow
  python3 scripts/ogp/build_assets.py --fonts fonts/ogp --avatar assets/icons/avatar.png \
      --name Author --topics Hugo Emacs Nix Design --out assets/ogp

デザインの正本は Design キャンバスの OGP-B / OGP-Site。座標はそこから写している。
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
S = 2  # 2 倍で描いて縮小 (アンチエイリアス)

C = dict(
    bg="#282a36", surface="#343746", line="#44475a", fg="#f8f8f2", muted="#c3c6d4",
    pink="#ff79c6", purple="#bd93f9", cyan="#8be9fd", green="#50fa7b", orange="#ffb86c", yellow="#f1fa8c",
)
# サイト本体の params.tagColors と合わせる。無いタグは名前のハッシュで決める。
TAG_COLORS = {"Hugo": "pink", "Markdown": "cyan", "Math": "cyan", "Design": "purple", "Shortcode": "purple",
              "Emacs": "green", "Theme": "green", "Nix": "orange", "TOC": "yellow"}
TAG_ORDER = ["pink", "cyan", "purple", "green", "orange", "yellow"]

CARD = (56, 56, W - 68, H - 68)  # x0, y0, x1, y1
SHADOW = 12


def rgb(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def s(v):
    return int(round(v * S))


def font(fonts, style, size):
    return ImageFont.truetype(os.path.join(fonts, f"MPLUSRounded1c-{style}.ttf"), s(size))


def tag_color(tag):
    if tag in TAG_COLORS:
        return C[TAG_COLORS[tag]]
    h = 2166136261
    for b in tag.lower().encode():
        h = ((h ^ b) * 16777619) & 0xFFFFFFFF
    return C[TAG_ORDER[h % 6]]


def canvas():
    im = Image.new("RGBA", (s(W), s(H)), rgb(C["bg"]))
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = CARD
    d.rounded_rectangle([s(x0 + SHADOW), s(y0 + SHADOW), s(x1 + SHADOW), s(y1 + SHADOW)], s(36), fill=rgb(C["line"]))
    d.rounded_rectangle([s(x0), s(y0), s(x1), s(y1)], s(36), fill=rgb(C["surface"]))
    return im


def hex_sticker(im, fonts):
    """右上の λ シール (60px の六角形、12° 回転、カードの角に重ねる)。"""
    n = s(60)
    st = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(st)
    pts = [(0.25, 0.067), (0.75, 0.067), (1, 0.5), (0.75, 0.933), (0.25, 0.933), (0, 0.5)]
    d.polygon([(x * (n - 1), y * (n - 1)) for x, y in pts], fill=rgb(C["pink"]))
    f = ImageFont.truetype(os.path.join(fonts, "MPLUSRounded1c-ExtraBold.ttf"), s(34))
    d.text((n / 2, n / 2), "λ", font=f, fill=rgb(C["bg"]), anchor="mm")
    st = st.rotate(-12, resample=Image.BICUBIC, expand=True)
    cx, cy = s(W - 78 - 30), s(34 + 30)
    im.alpha_composite(st, (cx - st.width // 2, cy - st.height // 2))


def round_avatar(path, size, ring=0, ring_color=None):
    n = s(size)
    av = Image.open(path).convert("RGBA")
    side = min(av.size)
    av = av.crop(((av.width - side) // 2, (av.height - side) // 2, (av.width + side) // 2, (av.height + side) // 2)).resize((n, n), Image.LANCZOS)
    mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, n - 1, n - 1], fill=255)
    out = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    if ring:
        ImageDraw.Draw(out).ellipse([0, 0, n - 1, n - 1], fill=rgb(ring_color))
        r = s(ring)
        inner = av.resize((n - 2 * r, n - 2 * r), Image.LANCZOS)
        m2 = Image.new("L", inner.size, 0)
        ImageDraw.Draw(m2).ellipse([0, 0, inner.width - 1, inner.height - 1], fill=255)
        out.paste(inner, (r, r), m2)
    else:
        out.paste(av, (0, 0), mask)
    return out


def brand(im, fonts, name, right, top, size=22, avatar=None, avatar_size=36):
    """右揃えで「(アバター) Name.blog」を描く。"""
    d = ImageDraw.Draw(im)
    f = font(fonts, "ExtraBold", size)
    parts = [(name, C["fg"]), (".", C["pink"]), ("blog", C["fg"])]
    tw = sum(d.textlength(t, font=f) for t, _ in parts)
    x = s(right) - tw
    cy = s(top + avatar_size / 2)
    for t, col in parts:
        d.text((x, cy), t, font=f, fill=rgb(col), anchor="lm")
        x += d.textlength(t, font=f)
    if avatar:
        av = round_avatar(avatar, avatar_size)
        im.alpha_composite(av, (int(s(right) - tw - s(14) - av.width), s(top)))


def build_template(a):
    im = canvas()
    hex_sticker(im, a.fonts)
    x0, y0, x1, y1 = CARD
    brand(im, a.fonts, a.name, right=x1 - 60, top=y1 - 52 - 36, avatar=a.avatar)
    return im


def build_site(a):
    im = canvas()
    hex_sticker(im, a.fonts)
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = CARD
    left = x0 + 60
    top = 131

    # brand + Hi! bubble
    fb = font(a.fonts, "ExtraBold", 24)
    bx = s(left)
    for t, col in [(a.name, C["muted"]), (".", C["pink"]), ("blog", C["muted"])]:
        d.text((bx, s(top + 20)), t, font=fb, fill=rgb(col), anchor="lm")
        bx += d.textlength(t, font=fb)
    fh = font(a.fonts, "ExtraBold", 22)
    bw = int(d.textlength("Hi!", font=fh)) + s(32)
    bh = s(40)
    bub = Image.new("RGBA", (bw + s(10), bh + s(14)), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bub)
    bd.rounded_rectangle([0, 0, bw, bh], s(16), fill=rgb(C["pink"]))
    bd.polygon([(s(14), bh - s(2)), (s(30), bh - s(2)), (s(18), bh + s(11))], fill=rgb(C["pink"]))
    bd.text((bw / 2, bh / 2), "Hi!", font=fh, fill=rgb(C["bg"]), anchor="mm")
    bub = bub.rotate(6, resample=Image.BICUBIC, expand=True)
    im.alpha_composite(bub, (int(bx + s(16)), s(top) - s(2)))

    # headline (3 lines, 52px / 74px)
    f = font(a.fonts, "ExtraBold", 52)
    lines = [[("こんにちは、", None), (a.name, "mark"), (" です。", None)],
             [("・".join(a.topics[:3]) + " の", None)],
             [("ことを書いています。", None)]]
    y = top + 62
    over = Image.new("RGBA", im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(over)
    for line in lines:
        x = s(left)
        for t, kind in line:
            w = d.textlength(t, font=f)
            if kind == "mark":
                od.rectangle([x - s(4), s(y + 74 * .62), x + w + s(4), s(y + 74 * .92)], fill=rgb(C["pink"], 77))
            x += w
        y += 74
    im.alpha_composite(over)
    y = top + 62
    for line in lines:
        x = s(left)
        for t, _ in line:
            d.text((x, s(y + 37)), t, font=f, fill=rgb(C["fg"]), anchor="lm")
            x += d.textlength(t, font=f)
        y += 74

    # topic pills
    fp = font(a.fonts, "ExtraBold", 22)
    x = s(left)
    py = s(top + 62 + 222 + 26)
    for t in a.topics[:4]:
        tw = d.textlength(t, font=fp)
        w = s(18) + s(12) + s(10) + tw + s(18)
        h = s(46)
        d.rounded_rectangle([x, py, x + w, py + h], h // 2, fill=rgb(C["bg"]), outline=rgb(C["line"]), width=s(2))
        d.ellipse([x + s(18), py + h / 2 - s(6), x + s(30), py + h / 2 + s(6)], fill=rgb(tag_color(t)))
        d.text((x + s(40), py + h / 2), t, font=fp, fill=rgb(C["fg"]), anchor="lm")
        x += w + s(12)

    # avatar (220, purple ring, offset shadow)
    ax, ay = x1 - 60 - 236, y0 + (y1 - y0 - 236) // 2
    d.ellipse([s(ax + 14), s(ay + 14), s(ax + 14 + 220), s(ay + 14 + 220)], fill=rgb(C["line"]))
    im.alpha_composite(round_avatar(a.avatar, 220, ring=6, ring_color=C["purple"]), (s(ax), s(ay)))
    return im


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--fonts", default="fonts/ogp")
    p.add_argument("--avatar", default="assets/icons/avatar.png")
    p.add_argument("--name", default="Author")
    p.add_argument("--topics", nargs="+", default=["Hugo", "Emacs", "Nix", "Design"])
    p.add_argument("--out", default="assets/ogp")
    a = p.parse_args()
    os.makedirs(a.out, exist_ok=True)
    for fn, im in [("tcard-template.png", build_template(a)), ("site.png", build_site(a))]:
        im.resize((W, H), Image.LANCZOS).convert("RGB").save(os.path.join(a.out, fn), optimize=True)
        print("wrote", os.path.join(a.out, fn))


if __name__ == "__main__":
    main()
