# 赫眉门店海报生成器

门店经理选 43 店之一 → 海报自动换店名/电话/地址（这张海报不放二维码，用户 10-26 明确去掉） → 下载 PNG(2508px) / PDF(210mm 方)。纯静态，双击 index.html 即可用(file://)。

- 海报全部用 canvas 画（js/poster.js，坐标按 1254 设计稿，参考图 source/template-ref.png）。
- 所有图片/字体都以 base64 挂在 window 全局（assets/assets.js），否则 file:// 下 canvas 被污染导不出图、字体也加载不了。别改成 fetch / <img src=本地文件>。
- 门店数据 data/stores.js 由 tools/build_data.js 从 hymn-site 官网列表 + 抖音看板 43 店档案生成；电话用官网的对外电话。三横店官网没地址。
- 活动文案：data/activity.js（总部改这里）。
- 字体（照原图核对过）：标题/数字=思源宋体 Noto Serif SC Black，小字=思源黑体 Noto Sans SC Regular，GB2312一级子集，OFL；原文件和 venv 在 fonts-src/（已 gitignore），改字体后跑 python3 tools/build_assets.py。
- 支持多店同时选择：多家时图片逐张单独下载原图 PNG(用户要求不打包不压缩)、PDF 合成多页(每店一页)；多选时预览区显示所有海报网格。链接 ?store=横溪店,姜山店 可预选多家。选店框可搜店名/拼音/首字母/区域经理(搜到经理只列她名下的店+「全选这N家」)(data/pinyin.js 由 tools/build_pinyin.py 生成，增删店后重跑)。
- 标题框显示整行标题(和海报一致，可直接改)，默认 赫眉+店名+activity.event；换店只替换标题里的旧店名。不要用 {店名} 占位符，也不要只给个"活动名"框(两种都被否过)。
- 界面风格照抖音看板(白底/发丝线/直角/无阴影/近黑按钮)；页面上不要出现「总部」二字。
- 背景 source/bg.png、面膜图 source/mask.png 是用户给的；logo 用 flip-clock 的白色原件 logo-hymn.png（保持白色）。
- 同一个 index.html 两套布局：>860px 电脑版(左预览右表单)，≤860px 手机版(选店→预览→信息，下载按钮固定底部，点预览看大图可长按保存)。
