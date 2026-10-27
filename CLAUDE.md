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
- 同一个 index.html 两套布局：>860px 电脑版(左预览按屏幕高度撑满 100vh-100px，和稿定设计一样大；返回链接/模板名/下载按钮都在右栏顶上，用户 10-27 要求)，≤860px 手机版(选店→预览→信息，下载按钮固定底部，点预览看大图可长按保存)。
- 多海报：首页=模板列表(预览图)，点进 ?t=模板id 是编辑页。模板清单在 data/templates.js（id/name/draw/defaults），加新海报=新写一个画图函数(参照 js/poster.js)+在清单里加一项；编辑页「活动内容」表单目前按周年庆这张的字段写死，新模板字段不同要另做表单。
- 编辑页标题下不要加说明文字（用户删过「选门店，店名、电话、地址自动换好，直接下载」）。
- 每次推送前跑 tools/bump_version.sh 给脚本加新版本号（Pages 缓存 10 分钟，用户手机曾因缓存看不到修复）。
- 手机多选时「本店信息」+「活动内容」一起挪到当前那张海报正下方(placeInfo，用户要求活动内容也跟过去)；重排卡片时位置没变别动 DOM，否则输入框失焦收键盘。
- 手机下载走系统分享面板(navigator.share files)：先弹预览+「保存到手机」按钮(分享必须由点击直接触发)，选「存储N张图像」进相册。iPhone 上 a.download 连续下载只留最后一张、且 Chrome 存到 文件>我的iPhone>Chrome，别再用。
- 活动日期是必选项(用户 10-26 要求)：选店下面单独一栏「活动日期 · 必选」(开始/结束两个日期框，两个都必填，只办一天就选同一天，用户 10-26 要求)，默认空、不选就不让下载(提示+滚过去)；转成「10月23日-25日 / 10月30日-11月2日」画进领取时间胶囊。activity.js 里不再放 date；「恢复默认内容」不清日期；首页缩略图用示例日期。
- 第2个海报 ?t=festival「购物节 6.7折 + 礼品券」= A4 正反面(js/poster2.js，坐标按 2000×2826 原稿)。原稿/底图在 source/t2/(底图与原稿逐像素对齐)，tools/build_t2.py 把每家店不同的字擦回底图出 assets/t2-front.jpg / t2-back.jpg，canvas 只重画：正面店名行(仿立体字)、胶囊里活动时间、底部地址热线；背面大日期、赫眉XX店周年庆(=标题框)、地址热线、使用说明第2行日期。红色统一 #FB1E43=「全场护肤彩妆」彩带正面的红(用户 10-26 最终指定：店名行+一年一度购物节要和彩带一样；之前按 6.7折中位数/平均值对都被否，人眼比的是大块字面)。彩带/6.7折保持原稿；平涂字/胶囊边框/HYMN装饰 build_t2.py recolor 换色；「一年一度购物节」+飘带按中位数校准(含 WebP 回读)；店名行=竖向渐变 #fd3452→#fb2447→#f91e43。核对方法：导出原尺寸图，比「R-G>150 且 R>235」像素的平均色。底图 JPG 用 4:4:4。读用户截图取色要先按 ICC(外接显示器 L2410F1)转 sRGB(曾因此误定 #FF1B48)，字体思源黑体 Black/Bold(assets/sans-black/bold.woff2，子集=chars.txt+门店用字)。改完跑 build_t2.py 再 build_assets.py(要 numpy+pillow)。
- 正面「一年一度购物节+飘带」：source/t2/front-title.png 由 tools/cut_t2_title.py 从原稿精确扣出(底图已知反推透明度，按红字连通块分开两行，第二行白描边外扩15px补)；GPT 重画的版本字形位置对不上，弃用。build_t2.py 有这张图就整块擦掉原标题，运行时叠 assets/t2-title.webp(带透明 WebP，PNG 调色板会出色斑)。店名行字底在 y=325，和第二行留出行距(用户 10-27 嫌 372 贴太紧)。
- 二维码：用户 10-26 给的 43 家原图(文件名「01联丰路赫眉」这种编号+简称，已换算成店名)存 source/qr/店名.png。用户要求样式统一：tools/make_qr.py 用 zxing 解出链接(source/qr/链接.tsv，全是 u.wechat.com 名片)，按同一样式重生成(黑色小方点+圆角定位角+中间微信图标，纠错H，生成后回扫校验)到 source/qr-clean/，再 build_qr.py 去白底打包成 data/qr.js。正反面 4 个位置用同一张。换某店的码=换 source/qr/店名.png 后依次跑这两个脚本。
- 多页模板：templates.js 里 pages/drawPage/exportScale；预览是两面并排一张图(body.spread)，导出每面一张 PNG(文件名带 -正面/-背面)、PDF 每面一页。
