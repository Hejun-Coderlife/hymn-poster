# 给门店名生成拼音（全拼+首字母），供选店搜索用 → data/pinyin.js
# 用法：fonts-src/.venv/bin/python tools/build_pinyin.py（需要 pypinyin）
import json, os, re
from pypinyin import lazy_pinyin
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = open(os.path.join(ROOT, 'data/stores.js'), encoding='utf-8').read()
names = re.findall(r'"name": "([^"]+)"', src)
out = {}
for n in names:
    py = lazy_pinyin(n)
    out[n] = ''.join(py) + ' ' + ''.join(p[0] for p in py if p)
with open(os.path.join(ROOT, 'data/pinyin.js'), 'w', encoding='utf-8') as f:
    f.write('// 由 tools/build_pinyin.py 生成：店名 → 全拼 首字母\nwindow.PINYIN = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
print(len(out), '家')
