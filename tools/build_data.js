// 生成 data/stores.js
//   电话、地址：data/门店信息.tsv（用户 2026-10-26 给的门店清单，唯一来源；营业时间不用）
//   区域经理：抖音看板的 43 店档案
// 用法：node tools/build_data.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const rows = fs.readFileSync(path.join(ROOT, 'data/门店信息.tsv'), 'utf8').trim().split('\n').slice(1)
  .map(l => l.split('\t'))
  .map(([full, , phone, addr]) => ({ name: (full.match(/（(.+?)）/) || [])[1], phone: phone.trim(), addr: addr.trim() }));
const board = require('/Users/hejun/Desktop/hymn-douyin-board/data/stores.json');

// 门店清单里的叫法 → 海报上的店名（其余同名）
const ALIAS = { '邱隘思美店': '邱隘二店', '邱隘倾城店': '邱隘店' };
// 抖音看板里的叫法 → 海报上的店名
const BOARD = { '泗门珀莱雅': '余姚泗门店', '美时百货': '小港店' };

// 去掉省和地级市前缀：浙江省宁波市江北区… → 江北区…；浙江省台州市温岭市… → 温岭市…
function shortAddr(a) {
  let s = a.replace(/\s+/g, '').replace(/^浙江省/, '');
  s = s.replace(/^[^市]{2,3}市(?=[^市区县]{1,4}[市区县])/, '');
  return s.replace(/(号)赫眉$/, '$1');
}

const manager = {};
board.forEach(s => { manager[BOARD[s.storeName] || s.storeName] = s.manager; });

const out = rows.map(r => {
  const name = ALIAS[r.name] || r.name;
  if (!manager[name]) console.warn('⚠️ 抖音看板里找不到区域经理：', name);
  return { name, manager: manager[name] || '', phone: r.phone, address: shortAddr(r.addr) };
});
const missing = Object.keys(manager).filter(n => !out.some(s => s.name === n));
if (missing.length) console.warn('⚠️ 门店清单里缺这些店：', missing.join('、'));

fs.writeFileSync(path.join(ROOT, 'data/stores.js'),
  '// 由 tools/build_data.js 根据 data/门店信息.tsv 生成；改门店信息请改 tsv 再重跑\n' +
  'window.STORES = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(out.length, '家店已写入 data/stores.js');
out.forEach(s => console.log(s.manager, s.name, s.phone, s.address));
