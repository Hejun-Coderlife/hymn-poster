# 赫眉门店海报生成器

门店经理选 43 店之一 → 海报自动换店名/电话/地址/二维码 → 下载 PNG(2508px) / PDF(210mm 方)。纯静态，双击 index.html 即可用(file://)。

- 海报全部用 canvas 画（js/poster.js，坐标按 1254 设计稿，参考图 source/template-ref.png）。
- 所有图片/字体都以 base64 挂在 window 全局（assets/assets.js、data/qr.js），否则 file:// 下 canvas 被污染导不出图、字体也加载不了。别改成 fetch / <img src=本地文件>。
- 门店数据 data/stores.js 由 tools/build_data.js 从 hymn-site 官网列表 + 抖音看板 43 店档案生成；电话用官网的对外电话。三横店官网没地址。
- 二维码：图片放 qr/，文件名=店名（如 横溪店.png），双击「打包二维码.command」。
- 活动文案：data/activity.js（总部改这里）。
- 字体（照原图核对过）：标题/数字=思源宋体 Noto Serif SC Black，小字=思源黑体 Noto Sans SC Regular，GB2312一级子集，OFL；原文件和 venv 在 fonts-src/（已 gitignore），改字体后跑 python3 tools/build_assets.py。
- 链接带 ?store=横溪店 可直接选好门店。
- 背景 source/bg.png、面膜图 source/mask.png 是用户给的；logo 用 flip-clock 的白色原件 logo-hymn.png（保持白色）。
- 同一个 index.html 两套布局：>860px 电脑版(左预览右表单)，≤860px 手机版(选店→预览→信息，下载按钮固定底部，点预览看大图可长按保存)。
