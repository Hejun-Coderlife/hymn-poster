# 各店二维码打包成 data/qr.js（base64，双击 file:// 打开也能画进 canvas）
# 先跑 make_qr.py 生成统一样式的 source/qr-clean/店名.png；用法：python3 tools/build_qr.py
# 白底去掉（和原稿一样直接印在粉底上），只留中间微信图标的白色
import base64, io, json, os
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DIR = os.path.join(ROOT, 'source/qr-clean')
out = {}
for f in sorted(os.listdir(DIR)):
    if not f.endswith('.png'): continue
    im = Image.open(os.path.join(DIR, f)).convert('L').resize((360, 360), Image.LANCZOS)
    a = im.point(lambda v: 255 - v)                      # 越黑越不透明
    c = int(360 * 0.39), int(360 * 0.61)
    a.paste(255, (c[0], c[0], c[1], c[1]))               # 中间图标整块不透明（白色气泡要留着）
    im = Image.merge('LA', (im, a))
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    out[f[:-4]] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
with open(os.path.join(ROOT, 'data/qr.js'), 'w') as fp:
    fp.write('// 由 tools/build_qr.py 生成：店名 → 二维码图片。正反面海报上 4 个二维码位置都用这一张；没有的店就空着\n')
    fp.write('window.STORE_QR = ' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n')
print(len(out), '家', os.path.getsize(os.path.join(ROOT, 'data/qr.js')) // 1024, 'KB')
