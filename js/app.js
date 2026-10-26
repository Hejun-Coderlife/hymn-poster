// 表单 ↔ 海报预览 ↔ 导出（支持多店同时选择，批量导出）
(function () {
  const $ = s => document.querySelector(s);
  const A = window.ACTIVITY;
  const STORES = window.STORES;
  const MANAGERS = ['官卜妮', '杜海霞', '张维'];

  const state = {
    title: '赫眉' + A.event, date: A.date, price: A.price, worth: A.worth, bundle: A.bundle,
    item1: { ...A.item1 }, item2: { ...A.item2 }, item3: { ...A.item3 },
    img1: null, img2: null,
  };
  let selected = [];        // 已勾选的门店下标（按勾选顺序）
  let cur = -1;             // 正在预览 / 编辑的那家
  const overrides = {};     // 手动改过的电话地址：店名 → { phone, address }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
  }

  async function loadFonts() {
    const faces = [
      new FontFace('HymnSerif', `url(${ASSETS.serif})`, { weight: '900' }),
      new FontFace('HymnSans', `url(${ASSETS.sans})`, { weight: '400' }),
    ];
    await Promise.all(faces.map(f => f.load().then(() => document.fonts.add(f)).catch(() => {})));
  }

  // ---------- 每家店的海报数据 ----------
  function infoOf(i) {
    const s = STORES[i];
    return { phone: s.phone, address: s.address, ...(overrides[s.name] || {}) };
  }
  // 标题跟着店名换：把当前预览店的店名换成目标店名，其余字保留
  function swapTitle(title, from, to) {
    const oldPart = '赫眉' + (from >= 0 ? STORES[from].name : '');
    if (title.startsWith(oldPart)) return '赫眉' + STORES[to].name + title.slice(oldPart.length);
    if (from >= 0 && title.includes(STORES[from].name)) return title.replace(STORES[from].name, STORES[to].name);
    return title;
  }
  function posterData(i) {
    if (i < 0) return { ...state, phone: '', address: '' };
    return { ...state, ...infoOf(i), title: i === cur ? state.title : swapTitle(state.title, cur, i) };
  }

  // ---------- 预览 ----------
  const preview = $('#preview');
  let assets;
  let queued = false;
  const grid = $('#grid');
  const cards = new Map();  // 门店下标 → 网格里的那张卡片
  let gen = 0;              // 每次重画加 1，旧的分批任务看到就停
  function render() {
    if (queued || !assets) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const multi = selected.length > 1;
      document.body.classList.toggle('multi', multi);
      if (!multi) { Poster.draw(preview, posterData(cur), assets, 1); return; }
      renderGrid();
    });
  }
  // 多选：每家一张，按勾选顺序排；分批画，免得一次画几十张卡住页面
  async function renderGrid() {
    const my = ++gen;
    for (const [i, el] of cards) if (!selected.includes(i)) { el.remove(); cards.delete(i); }
    selected.forEach(i => {
      let el = cards.get(i);
      if (!el) {
        el = document.createElement('figure');
        el.className = 'card';
        el.dataset.i = i;
        el.innerHTML = `<canvas></canvas><figcaption>${STORES[i].name}</figcaption>`;
        cards.set(i, el);
      }
      el.classList.toggle('on', i === cur);
      grid.appendChild(el); // 按顺序重新排
    });
    // 先画正在编辑的那张，其余随后
    const order = [cur].concat(selected.filter(i => i !== cur));
    for (let k = 0; k < order.length; k++) {
      if (my !== gen) return;
      Poster.draw(cards.get(order[k]).querySelector('canvas'), posterData(order[k]), assets, 0.5);
      if (k % 4 === 3) await new Promise(r => setTimeout(r, 0));
    }
  }

  // ---------- 门店选择：可搜索、可多选 ----------
  const PY = window.PINYIN || {};
  const box = $('#store');
  const list = $('#store-list');
  let hits = [];      // 当前列表里可选的门店下标
  let active = -1;    // 键盘高亮第几个

  function matches(s, q) {
    if (!q) return true;
    q = q.toLowerCase().replace(/\s+/g, '');
    return s.name.includes(q) || s.manager.includes(q) || (PY[s.name] || '').split(' ').some(p => p.includes(q));
  }
  function groupsOf() {
    return MANAGERS.concat([...new Set(STORES.map(s => s.manager))].filter(m => !MANAGERS.includes(m)));
  }
  function renderList(keepActive) {
    const q = box.value.trim();
    let html = '';
    hits = [];
    if (!q) {
      const all = selected.length === STORES.length;
      html += `<li class="bulk"><span>已选 ${selected.length} / ${STORES.length} 家</span>` +
        `<button type="button" data-act="all">${all ? '取消全选' : '全选 ' + STORES.length + ' 家'}</button>` +
        (selected.length ? '<button type="button" data-act="none">清空</button>' : '') + '</li>';
    }
    groupsOf().forEach(m => {
      const rows = STORES.map((s, i) => [s, i]).filter(([s]) => s.manager === m && matches(s, q));
      if (!rows.length) return;
      const allOn = rows.every(([, i]) => selected.includes(i));
      html += `<li class="grp">${m}<span>${rows.length}</span><button type="button" data-grp="${m}">${allOn ? '取消' : '全选'}</button></li>`;
      rows.forEach(([s, i]) => {
        html += `<li class="opt${selected.includes(i) ? ' on' : ''}" data-i="${i}" data-n="${hits.length}"><i></i>${s.name}</li>`;
        hits.push(i);
      });
    });
    list.innerHTML = q && !hits.length ? '<li class="empty">没有找到，换个字试试</li>' : html;
    if (!keepActive) active = q && hits.length ? 0 : -1;
    highlight();
  }
  function highlight() {
    list.querySelectorAll('.opt').forEach(li => li.classList.toggle('kb', +li.dataset.n === active));
    const el = list.querySelector('.kb');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
  function openList() { renderList(); list.hidden = false; }
  function closeList() { list.hidden = true; box.value = ''; }

  function setSelected(next, focus) {
    const prev = cur;
    selected = next;
    if (focus != null && selected.includes(focus)) cur = focus;
    else if (!selected.includes(cur)) cur = selected.length ? selected[0] : -1;
    if (cur !== prev && cur >= 0) {
      state.title = swapTitle(state.title, prev, cur);
      $('#title').value = state.title;
    }
    localStorage.setItem('hymn-poster-stores', selected.map(i => STORES[i].name).join(','));
    refreshStore();
  }
  function toggle(i) {
    if (selected.includes(i)) setSelected(selected.filter(x => x !== i));
    else setSelected(selected.concat(i), i);
  }
  function bindStorePicker() {
    box.addEventListener('focus', openList);
    box.addEventListener('input', openList);
    box.addEventListener('keydown', e => {
      if (list.hidden && (e.key === 'ArrowDown' || e.key === 'Enter')) { openList(); return; }
      if (e.key === 'ArrowDown') { active = Math.min(active + 1, hits.length - 1); highlight(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); highlight(); e.preventDefault(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const i = hits[active] != null ? hits[active] : hits.length === 1 ? hits[0] : null;
        if (i == null) return;
        toggle(i);
        box.value = '';
        renderList();
      }
      else if (e.key === 'Escape') { closeList(); box.blur(); }
    });
    // 用 pointerdown，抢在输入框失焦之前处理；勾选后清单保持打开，方便连续勾
    list.addEventListener('pointerdown', e => {
      e.preventDefault();
      const btn = e.target.closest('button');
      if (btn && btn.dataset.act === 'all') setSelected(selected.length === STORES.length ? [] : STORES.map((_, i) => i), cur);
      else if (btn && btn.dataset.act === 'none') setSelected([]);
      else if (btn && btn.dataset.grp) {
        const q = box.value.trim();
        const rows = STORES.map((s, i) => [s, i]).filter(([s]) => s.manager === btn.dataset.grp && matches(s, q)).map(([, i]) => i);
        const allOn = rows.every(i => selected.includes(i));
        setSelected(allOn ? selected.filter(i => !rows.includes(i)) : selected.concat(rows.filter(i => !selected.includes(i))), allOn ? null : rows[0]);
      } else {
        const li = e.target.closest('.opt');
        if (!li) return;
        active = +li.dataset.n;
        toggle(+li.dataset.i);
      }
      renderList(true);
    });
    box.addEventListener('blur', () => setTimeout(closeList, 150));
    $('#store-done').addEventListener('pointerdown', e => { e.preventDefault(); closeList(); box.blur(); });

    $('#chips').addEventListener('click', e => {
      const x = e.target.closest('[data-x]');
      const c = e.target.closest('[data-c]');
      if (x) setSelected(selected.filter(i => i !== +x.dataset.x));
      else if (c) setSelected(selected, +c.dataset.c);
    });
  }

  // 选中状态变了：刷新标签、信息栏、按钮
  function refreshStore() {
    const n = selected.length;
    $('#chips').innerHTML = selected.map(i =>
      `<span class="chip${i === cur ? ' on' : ''}" data-c="${i}">${STORES[i].name}<b data-x="${i}" title="移除">×</b></span>`).join('');
    $('#chips').hidden = !n;
    $('#pick-tip').textContent = n > 1 ? `已选 ${n} 家 · 点上面的店名切换预览` : '可以搜索，也可以勾选多家一起下载';
    const info = cur >= 0 ? infoOf(cur) : { phone: '', address: '' };
    $('#phone').value = info.phone;
    $('#address').value = info.address;
    $('#info-name').textContent = cur >= 0 ? ' · ' + STORES[cur].name : '';
    $('#hint-addr').hidden = !(cur >= 0 && !info.address);
    $('#dl-png').textContent = n > 1 ? `下载 ${n} 张图片` : '下载图片';
    $('#dl-pdf').textContent = n > 1 ? `下载 PDF（${n} 页）` : '下载 PDF';
    document.body.classList.toggle('no-store', !n);
    render();
  }

  // ---------- 表单绑定 ----------
  function bind() {
    document.querySelectorAll('[data-k]').forEach(el => {
      const path = el.dataset.k.split('.');
      const get = () => path.reduce((o, k) => o[k], state);
      const set = v => { path.length === 2 ? (state[path[0]][path[1]] = v) : (state[path[0]] = v); };
      el.value = get();
      el.addEventListener('input', () => { set(el.value.trim()); render(); });
    });
    ['phone', 'address'].forEach(k => {
      $('#' + k).addEventListener('input', e => {
        if (cur < 0) return;
        const name = STORES[cur].name;
        overrides[name] = { ...(overrides[name] || {}), [k]: e.target.value.trim() };
        render();
      });
    });
    bindStorePicker();

    ['img1', 'img2'].forEach(k => {
      $('#' + k + '-file').addEventListener('change', async e => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        state[k] = await loadImage(await fileToDataURL(f));
        render();
      });
    });
    $('#reset').addEventListener('click', () => {
      Object.assign(state, {
        title: '赫眉' + (cur >= 0 ? STORES[cur].name : '') + A.event, date: A.date, price: A.price, worth: A.worth, bundle: A.bundle,
        item1: { ...A.item1 }, item2: { ...A.item2 }, item3: { ...A.item3 },
        img1: assets.item1, img2: assets.item2,
      });
      document.querySelectorAll('[data-k]').forEach(el => {
        el.value = el.dataset.k.split('.').reduce((o, k) => o[k], state);
      });
      render();
    });

    $('#dl-png').addEventListener('click', () => exportFile('png'));
    $('#dl-pdf').addEventListener('click', () => exportFile('pdf'));
    $('#sheet-close').addEventListener('click', () => { $('#sheet').hidden = true; });
    // 手机上点预览看大图（也能长按保存）
    const isPhone = () => matchMedia('(max-width: 860px)').matches;
    const enlarge = i => {
      const c = document.createElement('canvas');
      Poster.draw(c, posterData(i), assets, EXPORT_SCALE);
      showSheet(c.toDataURL('image/jpeg', 0.92), '长按图片可保存');
    };
    preview.addEventListener('click', () => {
      if (isPhone() && assets && cur >= 0) enlarge(cur);
    });
    // 网格：点一张 = 切到这家编辑；手机上再点已选中的那张 = 看大图
    grid.addEventListener('click', e => {
      const card = e.target.closest('.card');
      if (!card) return;
      const i = +card.dataset.i;
      if (i === cur) { if (isPhone()) enlarge(i); return; }
      setSelected(selected, i);
    });
  }

  function fileToDataURL(f) {
    return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
  }
  function showSheet(src, tip) {
    $('#sheet-img').src = src || '';
    $('#sheet-img').hidden = !src;
    $('#sheet-tip').textContent = tip;
    $('#sheet').hidden = false;
  }

  // ---------- 导出 ----------
  const EXPORT_SCALE = 2; // 2508×2508，打印也够清楚
  const inWeChat = /MicroMessenger/i.test(navigator.userAgent);
  let busy = false;

  const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
  const tick = () => new Promise(r => setTimeout(r, 0));

  async function exportFile(type) {
    if (busy) return;
    if (!selected.length) { box.focus(); return; }
    const many = selected.length > 1;
    if (many && inWeChat) {
      showSheet('', '微信里不能批量下载，请点右上角「…」→「在浏览器打开」后再下载。');
      return;
    }
    busy = true;
    const btn = type === 'png' ? $('#dl-png') : $('#dl-pdf');
    const label = btn.textContent;
    const c = document.createElement('canvas');
    try {
      if (!many) {
        Poster.draw(c, posterData(cur), assets, EXPORT_SCALE);
        const base = '赫眉' + STORES[cur].name + '-海报';
        if (type === 'png') {
          deliver(await toBlob(c, 'image/png'), base + '.png', c.toDataURL('image/jpeg', 0.92));
        } else {
          const jpg = new Uint8Array(await (await toBlob(c, 'image/jpeg', 0.95)).arrayBuffer());
          deliver(makePDF([{ jpg, w: c.width, h: c.height }]), base + '.pdf', c.toDataURL('image/jpeg', 0.92), true);
        }
        return;
      }
      // 多家：一家一家画。图片每家单独下载一张原图 PNG（不打包、不压缩）；PDF 合成多页
      const pages = [];
      for (let k = 0; k < selected.length; k++) {
        btn.textContent = `生成中 ${k + 1} / ${selected.length}…`;
        await tick();
        const i = selected[k];
        Poster.draw(c, posterData(i), assets, EXPORT_SCALE);
        if (type === 'png') {
          deliver(await toBlob(c, 'image/png'), `赫眉${STORES[i].name}-海报.png`);
          await new Promise(r => setTimeout(r, 400)); // 连续下载要留点间隔，浏览器才不会吞掉
        } else {
          pages.push({ jpg: new Uint8Array(await (await toBlob(c, 'image/jpeg', 0.95)).arrayBuffer()), w: c.width, h: c.height });
        }
      }
      if (type === 'pdf') deliver(makePDF(pages), `赫眉海报-${selected.length}家店.pdf`);
    } finally {
      busy = false;
      btn.textContent = label;
    }
  }

  function deliver(blob, filename, previewURL, isPDF) {
    if (inWeChat) {
      // 微信里不能直接下载：图片给长按保存，PDF 提示去浏览器
      showSheet(previewURL, isPDF
        ? '微信里无法下载 PDF，请点右上角「…」→「在浏览器打开」后再下载。下面的图片可以长按保存。'
        : '长按图片 →「保存图片」');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // PDF：每张海报一页，JPEG 铺满，页面 210mm 宽
  function makePDF(pages) {
    const enc = s => new TextEncoder().encode(s);
    const parts = [];
    const offsets = [];
    let len = 0;
    const push = p => { const b = typeof p === 'string' ? enc(p) : p; parts.push(b); len += b.length; };
    const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
    // 对象编号：1 目录，2 页树，之后每页 3 个（页面 / 图片 / 内容）
    const pageId = k => 3 + k * 3;
    push('%PDF-1.4\n');
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push(`<< /Type /Pages /Kids [${pages.map((_, k) => pageId(k) + ' 0 R').join(' ')}] /Count ${pages.length} >>`));
    pages.forEach((p, k) => {
      const pw = 595.28, ph = pw * p.h / p.w;
      const id = pageId(k);
      const content = `q ${pw.toFixed(2)} 0 0 ${ph.toFixed(2)} 0 0 cm /Im0 Do Q`;
      obj(id, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Resources << /XObject << /Im0 ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`));
      obj(id + 1, () => {
        push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`);
        push(p.jpg);
        push('\nendstream');
      });
      obj(id + 2, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    });
    const total = 3 + pages.length * 3;
    const xref = len;
    let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let n = 1; n < total; n++) x += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  // ---------- 启动 ----------
  (async function init() {
    bind();
    await loadFonts();
    const [logo, item1, item2, bg] = await Promise.all([ASSETS.logo, ASSETS.item1, ASSETS.item2, ASSETS.bg].map(loadImage));
    assets = { logo, item1, item2, bg };
    state.img1 = item1;
    state.img2 = item2;
    // 链接里带 ?store=横溪店（多家用逗号隔开）就直接选好；否则用上次选的
    const q = new URLSearchParams(location.search).get('store');
    const names = (q || localStorage.getItem('hymn-poster-stores') || localStorage.getItem('hymn-poster-store') || '').split(/[,，、]/);
    const pre = names.map(n => STORES.findIndex(s => s.name === n.trim())).filter(i => i >= 0);
    setSelected([...new Set(pre)]);
    document.body.classList.add('ready');
  })();
})();
