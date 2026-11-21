#!/usr/bin/env python3
"""tcardgen の描画を Pillow で再現する: タイトルの行数チェックと見本の画像づくり。

tcardgen (github.com/Ladicle/tcardgen) の pkg/canvas の処理を写している:
  - 改行: drawMultiLineText (英数字の単語は分けない、閉じ括弧・句読点などは行頭に置かない、
    開き括弧は行末に残さない)
  - 位置: 1 行目のベースライン = start.py + fontSize、行送り = fontSize + lineSpacing
  - タグ: 角丸なしの箱。高さ = fontSize + 上下 padding + descent

使い方:
  python3 scripts/ogp/preview.py --check content/posts            # Warn when a title exceeds three lines
  python3 scripts/ogp/preview.py --render "タイトル" --date 2023.05.02 --tags Hugo TOC --out sample.png
"""
import argparse
import glob
import os
import re

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
# tcardgen.config.yaml と同じ値
CONF = dict(
    title=dict(px=116, py=158, size=60, style="ExtraBold", color="#F8F8F2", maxWidth=956, lineSpacing=25, maxLines=3),
    info=dict(px=116, py=108, size=22, style="Medium", color="#C3C6D4", separator=" · "),
    tags=dict(px=116, py=464, size=20, style="Bold", fg="#F8F8F2", bg="#44475A", spacing=10, pad=(8, 14, 8, 14), limit=3),
)

SPACE = set("\n\t\v 　")
START = set("({[<「『（｛【＜≪［")
END = set("、。.,ぁぃぅぇぉっゃゅょァィゥェォッャュョｧｨｩｪｫｯｬｭｮ)}]>」』）｝】＞≫］・ー―-：；／/ゝ々！？!?")


def one_byte(r):
    return len(r.encode()) == 1


def wrap(text, f, max_w):
    """tcardgen canvas.drawMultiLineText と同じ規則で行に分ける。"""
    lines, lbuf, wbuf = [], "", ""
    r = list(text)
    i = 0
    n = len(r)
    while i < n:
        c = r[i]
        wbuf += c
        if c in SPACE:
            pass
        elif one_byte(c) or c in START:
            if i + 1 < n:
                i += 1
                continue
        elif i + 1 < n and r[i + 1] in END:
            wbuf += r[i + 1]
            i += 1
        lbuf += wbuf
        if f.getlength(lbuf) <= max_w:
            wbuf = ""
            if i + 1 < n:
                i += 1
                continue
        lines.append(lbuf[:len(lbuf) - len(wbuf)])
        lbuf, wbuf = wbuf, ""
        i += 1
    if lbuf:
        lines.append(lbuf[:len(lbuf) - len(wbuf)] if wbuf and lbuf != wbuf else lbuf)
    return [l for l in lines if l != ""]


def fnt(fonts, style, size):
    return ImageFont.truetype(os.path.join(fonts, f"MPLUSRounded1c-{style}.ttf"), size)


def front_matter(path):
    txt = open(path, encoding="utf-8").read()
    m = re.match(r"^(---|\+\+\+)\s*\n(.*?)\n\1", txt, re.S)
    if not m:
        return {}
    fm = m.group(2)
    t = re.search(r'^title\s*[:=]\s*["\']?(.*?)["\']?\s*$', fm, re.M)
    return {"title": t.group(1) if t else ""}


def render(a):
    tc, ic, gc = CONF["title"], CONF["info"], CONF["tags"]
    im = Image.open(a.template).convert("RGB")
    d = ImageDraw.Draw(im)
    fi = fnt(a.fonts, ic["style"], ic["size"])
    d.text((ic["px"], ic["py"] + ic["size"]), f'{a.author}{ic["separator"]}{a.date}', font=fi, fill=ic["color"], anchor="ls")
    ft = fnt(a.fonts, tc["style"], tc["size"])
    y = tc["py"] + tc["size"]
    for line in wrap(a.render, ft, tc["maxWidth"]):
        d.text((tc["px"], y), line, font=ft, fill=tc["color"], anchor="ls")
        y += tc["size"] + tc["lineSpacing"]
    fg = fnt(a.fonts, gc["style"], gc["size"])
    descent = fg.getmetrics()[1]
    pt, pr, pb, pl = gc["pad"]
    x = gc["px"]
    for t in a.tags[:gc["limit"]]:
        w = round(fg.getlength(t)) + pl + pr
        d.rectangle([x, gc["py"], x + w, gc["py"] + gc["size"] + pt + pb + descent], fill=gc["bg"])
        d.text((x + pl, gc["py"] + pt - 1 + gc["size"]), t, font=fg, fill=gc["fg"], anchor="ls")
        x += w + gc["spacing"]
    im.save(a.out, optimize=True)
    print("wrote", a.out)


def check(a):
    tc = CONF["title"]
    ft = fnt(a.fonts, tc["style"], tc["size"])
    bad = 0
    files = [p for root in a.check for p in glob.glob(os.path.join(root, "**", "*.md"), recursive=True) if os.path.basename(p) != "_index.md"]
    for p in sorted(files):
        title = front_matter(p).get("title", "")
        if not title:
            continue
        n = len(wrap(title, ft, tc["maxWidth"]))
        if n > tc["maxLines"]:
            bad += 1
            print(f"::warning file={p}::OGP のタイトルが {n} 行になります (上限 {tc['maxLines']} 行): {title}")
    print(f"checked {len(files)} files, {bad} over the limit")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--fonts", default="fonts/ogp")
    p.add_argument("--template", default="assets/ogp/tcard-template.png")
    p.add_argument("--check", nargs="+")
    p.add_argument("--render")
    p.add_argument("--author", default="Author")
    p.add_argument("--date", default="2023.05.02")
    p.add_argument("--tags", nargs="*", default=[])
    p.add_argument("--out", default="ogp-preview.png")
    a = p.parse_args()
    if a.check:
        check(a)
        return
    if a.render:
        render(a)


if __name__ == "__main__":
    main()
