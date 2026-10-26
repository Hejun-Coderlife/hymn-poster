// 把 qr/ 文件夹里的二维码图片打包进 data/qr.js
// 文件名 = 店名，例如 qr/横溪店.png、qr/海曙龙湖天街店.jpg
// 用法：node tools/build_qr.js（或双击「打包二维码.command」）
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

const out = {};
for (const f of fs.readdirSync(path.join(ROOT, 'qr')).sort()) {
  const ext = path.extname(f).toLowerCase();
  if (!MIME[ext]) continue;
  const name = path.basename(f, path.extname(f)).normalize('NFC').trim();
  out[name] = `data:${MIME[ext]};base64,` + fs.readFileSync(path.join(ROOT, 'qr', f)).toString('base64');
}
fs.writeFileSync(path.join(ROOT, 'data/qr.js'),
  '// 由 tools/build_qr.js 根据 qr/ 文件夹生成，别手改\nwindow.QR = ' + JSON.stringify(out) + ';\n');

const stores = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'data/stores.js'), 'utf8'))(w); return w.STORES; })();
const names = new Set(stores.map(s => s.name));
const keys = Object.keys(out);
console.log(`已打包 ${keys.length} 张二维码`);
const unknown = keys.filter(k => !names.has(k));
if (unknown.length) console.log('⚠️ 这些文件名对不上店名：', unknown.join('、'));
const missing = stores.filter(s => !out[s.name]).map(s => s.name);
if (missing.length) console.log(`还缺 ${missing.length} 家：`, missing.join('、'));
