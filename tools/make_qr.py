# 二维码统一样式：把 source/qr/店名.png（各店原图，颜色样式五花八门）解码出链接，
# 记到 source/qr/链接.tsv，再按同一个样式重新生成到 source/qr-clean/店名.png（黑色小方点 + 圆角定位角，仿微信名片码 + 中间微信图标）
# 用法：python3 tools/make_qr.py（需要 pillow + zxing-cpp + qrcode），然后跑 build_qr.py
import os
import qrcode
import zxingcpp
from PIL import Image, ImageDraw, ImageOps
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import GappedSquareModuleDrawer, RoundedModuleDrawer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'source/qr')
OUT = os.path.join(ROOT, 'source/qr-clean')
os.makedirs(OUT, exist_ok=True)

def decode(path):
    im = Image.open(path).convert('L')
    for t in (im, im.resize((960, 960)), ImageOps.autocontrast(im)):
        r = zxingcpp.read_barcodes(t)
        if r: return r[0].text
    raise SystemExit('解不出：' + path)

def wechat_icon(s):
    # 黑底圆角方块 + 两个白色对话气泡（先 4 倍大画再缩小，边缘才平滑）
    k = 4; S = s * k
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=S * 0.16, fill='white')           # 外圈白边，和码点隔开
    m = S * 0.06
    d.rounded_rectangle((m, m, S - 1 - m, S - 1 - m), radius=S * 0.12, fill='black')
    def bubble(cx, cy, rx, ry, tail):
        d.polygon(tail, fill='white')
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill='white')
    bubble(S * .40, S * .40, S * .25, S * .21, [(S * .26, S * .52), (S * .24, S * .66), (S * .38, S * .58)])
    d.ellipse((S * .41, S * .45, S * .81, S * .79), outline='black', width=int(S * .035), fill='white')
    d.polygon([(S * .72, S * .74), (S * .77, S * .85), (S * .66, S * .78)], fill='white')
    for x, y, r in ((.31, .35, .028), (.49, .35, .028), (.54, .59, .024), (.68, .59, .024)):
        d.ellipse((S * (x - r), S * (y - r), S * (x + r), S * (y + r)), fill='black')
    return im.resize((s, s), Image.LANCZOS)

rows = []
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.png'): continue
    name, url = f[:-4], decode(os.path.join(SRC, f))
    rows.append((name, url))
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=24, border=2)
    qr.add_data(url); qr.make(fit=True)
    img = qr.make_image(image_factory=StyledPilImage, module_drawer=GappedSquareModuleDrawer(size_ratio=0.86),
                        eye_drawer=RoundedModuleDrawer(radius_ratio=1)).convert('RGBA')
    s = int(img.width * 0.22)
    img.alpha_composite(wechat_icon(s), ((img.width - s) // 2, (img.height - s) // 2))
    img = img.convert('RGB').resize((720, 720), Image.LANCZOS)
    # 生成完再解一次，确认扫得出、链接没变
    back = zxingcpp.read_barcodes(img)
    assert back and back[0].text == url, name
    img.save(os.path.join(OUT, name + '.png'))
with open(os.path.join(SRC, '链接.tsv'), 'w') as fp:
    fp.write('门店\t二维码链接\n' + ''.join(f'{n}\t{u}\n' for n, u in rows))
urls = [u for _, u in rows]
print(len(rows), '家，链接重复：', len(urls) - len(set(urls)))
