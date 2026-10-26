# 第2个海报（购物节正面 + 礼品券背面）：从原稿里把每家店不同的字擦掉，换回干净底图，出两张静态底层
# 原稿/底图在 source/t2/（2000×2826，底图与原稿逐像素对齐）。会变的字由 js/poster2.js 在 canvas 上重画
# 用法：python3 tools/build_t2.py（需要 numpy + pillow）
import io
import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'source/t2')
bg = np.asarray(Image.open(os.path.join(SRC, 'bg.png')).convert('RGB')).copy()

def erase(im, rects):
    for x0, y0, x1, y1 in rects:
        im[y0:y1, x0:x1] = bg[y0:y1, x0:x1]

def fill_rows(im, x0, y0, x1, y1, sx0, sx1):
    # 胶囊里的字：每一行用同一行字外面那段（sx0..sx1）的颜色铺满，保留上下的明暗
    row = np.median(im[y0:y1, sx0:sx1].astype(float), axis=1)
    im[y0:y1, x0:x1] = row[:, None, :].round().astype(np.uint8)

INK = np.array([0xfb, 0x1e, 0x43])  # 全张统一的红 = 「全场护肤彩妆」彩带正面的红（用户 10-26 指定对齐这块）；彩带和6.7折保持原稿

def recolor(im, rect, old, new=INK, tol=40):
    # 原稿里纯色的字/线：按「底图→旧色」的比例反推透明度，同比例换成新色（字边过渡、阴影都保留）
    x0, y0, x1, y1 = rect
    C = im[y0:y1, x0:x1].astype(float)
    B = bg[y0:y1, x0:x1].astype(float)
    d = np.array(old, float) - B
    a = np.clip((C - B) * d, None, None).sum(2) / np.maximum((d * d).sum(2), 1)
    a = np.clip(a, 0, 1)
    resid = np.abs(C - (B + a[..., None] * d)).max(2)
    a[resid > tol] = 0
    out = C + a[..., None] * (np.array(new, float) - np.array(old, float))
    out[a > 0.8] = new  # 字的实心部分直接定成新色，小字也正好是这个色
    im[y0:y1, x0:x1] = np.clip(out, 0, 255).round().astype(np.uint8)

def shift_red(C, old=None, mask=None):
    # 立体字/彩带：只动红色的像素（金边、白字、高光不动），把主色平移到 INK
    # old 不给就量这块里红色像素的中位数当主色，校正后主色正好等于 INK
    C = C.astype(float)
    w = np.clip((C[..., 0] - C[..., 1] - 60) / 80, 0, 1)[..., None]   # 越红权重越大
    if old is None:
        solid = (w[..., 0] >= 1) if mask is None else (w[..., 0] >= 1) & mask
        old = np.median(C[solid], axis=0)
    return np.clip(C + w * (INK - np.array(old, float)), 0, 255)  # 整体平移：明暗层次不变，主色正好落在 INK

ROSE = (0xff, 0x40, 0x60)    # 原稿正文粉红
DECO = (0xf8, 0x7c, 0x90)    # 两侧 HYMN 字和小三角
BORDER = (0xfc, 0x58, 0x84)  # 活动时间胶囊的边框

# 背面 礼品券
back = np.asarray(Image.open(os.path.join(SRC, 'back-ref.png')).convert('RGB')).copy()
erase(back, [
    (330, 70, 1680, 290),     # 顶上大日期
    (180, 300, 1830, 532),    # 赫眉XX店周年庆
    (240, 538, 1760, 624),    # 地址 + 电话
    (1490, 642, 1876, 1018),  # 二维码（上）
    (220, 2582, 1200, 2652),  # 使用说明第 2 行（含日期）
    (1595, 2425, 1970, 2795), # 二维码（下）
])
recolor(back, (100, 640, 1490, 1100), ROSE)   # 礼品券 + 下面两行
recolor(back, (200, 2380, 1500, 2730), ROSE)  # 使用说明
recolor(back, (0, 0, 108, 2826), DECO)        # 左边装饰
recolor(back, (1880, 0, 2000, 2826), DECO)    # 右边装饰
Image.fromarray(back).save(os.path.join(ROOT, 'assets/t2-back.jpg'), quality=90, subsampling=0)  # 4:4:4 不压颜色，小字才不偏色

# 正面 购物节
front = np.asarray(Image.open(os.path.join(SRC, 'front-ref.png')).convert('RGB')).copy()
# 标题：有透明底的「一年一度购物节+飘带」(front-title.png) 就整块擦掉、运行时再叠上去；没有就先粗擦店名那一行
title_png = os.path.join(SRC, 'front-title.png')
erase(front, [(0, 60, 2000, 820)] if os.path.exists(title_png) else [(250, 90, 1760, 378)])
erase(front, [
    (20, 1308, 392, 1676),    # 二维码（左）
    (1608, 1308, 1980, 1676), # 二维码（右）
    (60, 2675, 1940, 2772),   # 活动地址 + 热线
])
fill_rows(front, 372, 1866, 1660, 1970, 1665, 1685)  # 「活动时间：…」胶囊里的字
recolor(front, (300, 1840, 1745, 1995), BORDER)  # 胶囊边框
Image.fromarray(front).save(os.path.join(ROOT, 'assets/t2-front.jpg'), quality=90, subsampling=0)
if os.path.exists(title_png):
    t = np.asarray(Image.open(title_png).convert('RGBA')).astype(float)
    # 「一年一度购物节」+飘带原来是深一点的 #E5153C，按通道比例整体提到 6.7折的红（白描边乘完超出 255 仍是白）
    # 叠到底图上按成品同样的量法（红色像素中位数）反复校准，直到正好等于 INK
    TITLE_NUDGE = np.array([0, 0, 0])  # 成品底图是 JPEG，和这里差一点点；按网页导出图实测补的
    base = front[60:820].astype(float)
    src = t.copy()
    old = np.median(src[..., :3][(src[..., 3] > 250) & (src[..., 0] - src[..., 1] > 140)], axis=0)
    for _ in range(20):
        t = src.copy()
        t[..., :3] = shift_red(src[..., :3], old)
        buf = io.BytesIO()  # 按存成 WebP 再读回来的样子量，压缩误差也一起校掉
        Image.fromarray(t.round().astype(np.uint8), 'RGBA').save(buf, 'WEBP', quality=92, method=6)
        t = np.asarray(Image.open(buf).convert('RGBA')).astype(float)
        a = t[..., 3:] / 255
        comp = t[..., :3] * a + base * (1 - a)
        reg = comp[340:640]  # 「一年一度购物节」这一行（成品 y 400-700）
        got = np.median(reg[reg[..., 0] - reg[..., 1] > 120], axis=0)  # 字面的主色
        err = got - (INK + TITLE_NUDGE)
        if np.abs(err).max() < 0.5: break
        old = old + err
    t = np.asarray(Image.open(buf).convert('RGBA')).astype(float)
    Image.fromarray(t.round().astype(np.uint8), 'RGBA').save(os.path.join(ROOT, 'assets/t2-title.webp'), quality=92, method=6)  # 带透明的 WebP，比 PNG 小十倍且不出色斑
print('ok')
