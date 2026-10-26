// 从官网 hymn-site 的门店列表 + 抖音看板的 43 店档案，生成 data/stores.js
// 用法：node tools/build_data.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const site = fs.readFileSync('/Users/hejun/Projects/hymn-site/index.html', 'utf8');
const siteStores = [...site.matchAll(/\{n:'([^']*)',b:'([^']*)',r:'([^']*)',a:'([^']*)',t:'([^']*)'/g)]
  .map(m => ({ n: m[1], b: m[2], a: m[4], t: m[5] }));
const board = require('/Users/hejun/Desktop/hymn-douyin-board/data/stores.json');

// 抖音看板店名 → 官网店名（含品牌线区分）
const ALIAS = {
  '泗门珀莱雅': ['余姚泗门店'],
  '美时百货': ['小港店'],
  '邱隘店': ['邱隘店', '倾城护肤'],
  '邱隘二店': ['邱隘店', '思美'],
};
// 海报上显示的店名
const DISPLAY = { '泗门珀莱雅': '余姚泗门店', '美时百货': '小港店' };

function shortAddr(a) {
  let s = a.replace(/\s+/g, '').replace(/^浙江省/, '');
  s = s.replace(/^[^市]{2,3}市(?=[^市区县]{1,4}[市区县])/, '');
  return s.replace(/(号)(赫眉|珀莱雅店)$/, "$1");
}

const out = board.map(s => {
  const [n, b] = ALIAS[s.storeName] || [s.storeName];
  const hit = siteStores.find(x => x.n === n && (!b || x.b === b));
  if (!hit) console.warn('官网没有这家店的地址：', s.storeName);
  return {
    name: DISPLAY[s.storeName] || s.storeName,
    manager: s.manager,
    phone: hit ? hit.t : '',
    address: hit ? shortAddr(hit.a) : '',
  };
});

fs.writeFileSync(path.join(ROOT, 'data/stores.js'),
  '// 由 tools/build_data.js 生成；手改也行（name 店名 / manager 区域经理 / phone 电话 / address 地址）\n' +
  'window.STORES = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(out.length, '家店已写入 data/stores.js');
out.forEach(s => console.log(s.manager, s.name, s.phone, s.address));
