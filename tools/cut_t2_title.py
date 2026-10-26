# 从原稿里把「一年一度购物节 + 飘带」单独扣成透明 PNG（不含店名那一行），输出 source/t2/front-title.png
# 原理：底图已知 → 每个像素能精确反推透明度；两行字的红色字面互不相连，按连通块分开，
# 离店名行更近的描边/光晕删掉，第二行顶上被粘住的白描边按自己红字外扩 15px 补回来。
# 用法：python3 tools/cut_t2_title.py（需要 numpy + pillow + scipy），然后跑 build_t2.py
import os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'source/t2')
Y0, Y1 = 60, 820   # 标题所在的横条
ref = np.asarray(Image.open(os.path.join(SRC, 'front-ref.png')).convert('RGB')).astype(float)[Y0:Y1]
bg = np.asarray(Image.open(os.path.join(SRC, 'bg.png')).convert('RGB')).astype(float)[Y0:Y1]

# 精确反推：叠回同一张底图时和原稿逐像素一致
up = np.where(ref > bg, (ref - bg) / np.maximum(255 - bg, 1), 0)
down = np.where(ref < bg, (bg - ref) / np.maximum(bg, 1), 0)
alpha = np.clip(np.maximum(up, down).max(2), 0, 1)
fg = np.where(alpha[..., None] > 0, bg + (ref - bg) / np.maximum(alpha[..., None], 1e-6), 0)
alpha[alpha < 0.03] = 0  # 底图压缩噪点

r, g, b = ref[..., 0], ref[..., 1], ref[..., 2]
crim = (r > 170) & (g < 110) & (b < 140)
lab, n = nd.label(crim)
l1 = np.zeros_like(crim)
for k, sl in enumerate(nd.find_objects(lab)):
    if sl[0].stop <= 318:   # 店名那一行的红字都在这条线以上，第二行从 322 开始
        l1 |= lab == k + 1
sizes = nd.sum(crim, lab, range(1, n + 1))
l2 = crim & ~l1 & (sizes[np.maximum(lab - 1, 0)] >= 50)  # 几个像素的红点是店名行边缘的杂点，不算
d1 = nd.distance_transform_edt(~l1)
d2 = nd.distance_transform_edt(~l2)

OUT = 15  # 白描边宽
rows = np.arange(ref.shape[0])[:, None]
mine = (d1 < d2) | (rows < 330)    # 离店名行更近、或在第二行顶上：原来属于店名行
alpha[mine & (d2 > OUT + 1.5)] = 0
edge = mine & (d2 <= OUT + 1.5)    # 第二行自己的白描边（原来和店名行粘在一起）
fg[edge] = 255
alpha[edge] = np.clip(OUT + 1.5 - d2[edge], 0, 1)
fg[l1 & (d2 <= OUT)] = 255
alpha[l1 & (d2 <= OUT)] = 1
# 补一点粉色外发光
glow = mine & (d2 > OUT) & (d2 < OUT + 40)
ga = 0.45 * np.exp(-(d2 - OUT) / 12)
fg[glow] = np.where(alpha[glow][:, None] < ga[glow][:, None], [255, 95, 140], fg[glow])
alpha[glow] = np.maximum(alpha[glow], ga[glow])

out = np.dstack([np.clip(fg, 0, 255), alpha * 255]).round().astype(np.uint8)
Image.fromarray(out, 'RGBA').save(os.path.join(SRC, 'front-title.png'), optimize=True)
print('ok')
