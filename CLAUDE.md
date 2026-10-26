# 赫眉门店海报生成器

门店经理选 43 店之一 → 海报自动换店名/电话/地址（这张海报不放二维码，用户 10-26 明确去掉） → 下载 PNG(2508px) / PDF(210mm 方)。纯静态，双击 index.html 即可用(file://)。

- 海报全部用 canvas 画（js/poster.js，坐标按 1254 设计稿，参考图 source/template-ref.png）。
- 所有图片/字体都以 base64 挂在 window 全局（assets/assets.js），否则 file:// 下 canvas 被污染导不出图、字体也加载不了。别改成 fetch / <img src=本地文件>。
- 门店数据：电话/地址唯一来源是 data/门店信息.tsv（用户 2026-10-26 给的清单，营业时间不用）；区域经理取抖音看板档案。node tools/build_data.js 生成 data/stores.js，再跑 tools/build_pinyin.py。清单里「邱隘思美店」=邱隘二店、「邱隘倾城店」=邱隘店。
- 活动文案：data/activity.js（总部改这里）。
- 字体（照原图核对过）：标题/数字=思源宋体 Noto Serif SC Black，小字=思源黑体 Noto Sans SC Regular，GB2312一级子集，OFL；原文件和 venv 在 fonts-src/（已 gitignore），改字体后跑 python3 tools/build_assets.py。
- 支持多店同时选择：多家时图片逐张单独下载原图 PNG(用户要求不打包不压缩)、PDF 合成多页(每店一页)；多选时：电脑=左侧小图列+右侧大图，手机=从上往下整宽排（用户否了阵列）。标题靠 titleStore 记住当前写的是哪家店，只替换不插入（曾出现取消再选时店名叠加的 bug）。链接 ?store=横溪店,姜山店 可预选多家。选店框可搜店名/拼音/首字母/区域经理(搜到经理只列她名下的店+「全选这N家」)(data/pinyin.js 由 tools/build_pinyin.py 生成，增删店后重跑)。
- 标题框显示整行标题(和海报一致，可直接改)，默认 赫眉+店名+activity.event；换店只替换标题里的旧店名。不要用 {店名} 占位符，也不要只给个"活动名"框(两种都被否过)。
- 界面风格照抖音看板(白底/发丝线/直角/无阴影/近黑按钮)；页面上不要出现「总部」二字。
- 背景 source/bg.png、面膜图 source/mask.png 是用户给的；logo 用 flip-clock 的白色原件 logo-hymn.png（保持白色）。
- 同一个 index.html 两套布局：>860px 电脑版(左预览右表单)，≤860px 手机版(选店→预览→信息，下载按钮固定底部，点预览看大图可长按保存)。
- 多海报：首页=模板列表(预览图)，点进 ?t=模板id 是编辑页。模板清单在 data/templates.js（id/name/draw/defaults），加新海报=新写一个画图函数(参照 js/poster.js)+在清单里加一项；编辑页「活动内容」表单目前按周年庆这张的字段写死，新模板字段不同要另做表单。
- 编辑页标题下不要加说明文字（用户删过「选门店，店名、电话、地址自动换好，直接下载」）。
- 每次推送前跑 tools/bump_version.sh 给脚本加新版本号（Pages 缓存 10 分钟，用户手机曾因缓存看不到修复）。
- 手机多选时「本店信息」挪到当前那张海报正下方(placeInfo)，活动内容仍在最下面；重排卡片时位置没变别动 DOM，否则输入框失焦收键盘。
