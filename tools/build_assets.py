# 把字体 / logo / 礼品图打包成 assets/assets.js（base64），双击 file:// 打开也能导出不被跨域拦
# 用法：python3 tools/build_assets.py
import base64, json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FILES = {
    'serif': ('assets/serif-sc.woff2', 'font/woff2'),
    'sans': ('assets/sans-sc.woff2', 'font/woff2'),
    'logo': ('assets/logo.png', 'image/png'),
    'bg': ('assets/bg.jpg', 'image/jpeg'),
    'item1': ('assets/item1.jpg', 'image/jpeg'),
    'item2': ('assets/item2.jpg', 'image/jpeg'),
}
out = {}
for k, (p, mime) in FILES.items():
    with open(os.path.join(ROOT, p), 'rb') as f:
        out[k] = 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())
with open(os.path.join(ROOT, 'assets/assets.js'), 'w') as f:
    f.write('window.ASSETS = ' + json.dumps(out) + ';\n')
print('assets/assets.js', sum(len(v) for v in out.values()) // 1024, 'KB')
