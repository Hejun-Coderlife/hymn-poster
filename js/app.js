// 表单 ↔ 海报预览 ↔ 导出
(function () {
  const $ = s => document.querySelector(s);
  const A = window.ACTIVITY;
  const STORES = window.STORES;
  const MANAGERS = ['官卜妮', '杜海霞', '张维'];

  const state = {
    store: null,
    event: A.event, date: A.date, price: A.price, worth: A.worth, bundle: A.bundle,
    item1: { ...A.item1 }, item2: { ...A.item2 }, item3: { ...A.item3 },
    phone: '', address: '',
    img1: null, img2: null,
  };

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

  // ---------- 预览 ----------
  const preview = $('#preview');
  let assets;
  let queued = false;
  function render() {
    if (queued || !assets) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      Poster.draw(preview, posterData(), assets, 1);
    });
  }
  function posterData() {
    const name = state.store ? state.store.name : '';
    return { ...state, title: '赫眉' + name + state.event };
  }

  // ---------- 门店选择：可搜索（店名 / 拼音 / 首字母 / 区域经理） ----------
  const PY = window.PINYIN || {};
  const box = $('#store');
  const list = $('#store-list');
  let hits = [];      // 当前列表里可选的门店下标
  let active = -1;    // 键盘高亮第几个

  function matches(s, q) {
    if (!q) return true;
    q = q.toLowerCase().replace(/\s+/g, '');
    return s.name.includes(q) || s.manager.includes(q) || (PY[s.name] || '').replace(' ', '|').split('|').some(p => p.includes(q));
  }
  function renderList() {
    const q = box.value.trim();
    const groups = MANAGERS.concat([...new Set(STORES.map(s => s.manager))].filter(m => !MANAGERS.includes(m)));
    let html = '';
    hits = [];
    groups.forEach(m => {
      const rows = STORES.map((s, i) => [s, i]).filter(([s]) => s.manager === m && matches(s, q));
      if (!rows.length) return;
      html += `<li class="grp">${m}<span>${rows.length}</span></li>`;
      rows.forEach(([s, i]) => {
        html += `<li class="opt${state.store === s ? ' on' : ''}" data-i="${i}" data-n="${hits.length}">${s.name}</li>`;
        hits.push(i);
      });
    });
    list.innerHTML = html || '<li class="empty">没有找到，换个字试试</li>';
    active = q && hits.length ? 0 : -1;
    highlight();
  }
  function highlight() {
    list.querySelectorAll('.opt').forEach(li => li.classList.toggle('kb', +li.dataset.n === active));
    const el = list.querySelector('.kb');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
  function openList() { renderList(); list.hidden = false; }
  function closeList() {
    list.hidden = true;
    box.value = state.store ? state.store.name : '';
  }
  function choose(i) {
    box.value = STORES[i].name;
    list.hidden = true;
    box.blur();
    pickStore(i);
  }
  function bindStorePicker() {
    box.addEventListener('focus', () => { box.select(); openList(); });
    box.addEventListener('input', openList);
    box.addEventListener('keydown', e => {
      if (list.hidden && (e.key === 'ArrowDown' || e.key === 'Enter')) { openList(); return; }
      if (e.key === 'ArrowDown') { active = Math.min(active + 1, hits.length - 1); highlight(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); highlight(); e.preventDefault(); }
      else if (e.key === 'Enter') { if (hits[active] != null) choose(hits[active]); else if (hits.length === 1) choose(hits[0]); e.preventDefault(); }
      else if (e.key === 'Escape') { closeList(); box.blur(); }
    });
    // 用 pointerdown，抢在输入框失焦之前选中
    list.addEventListener('pointerdown', e => {
      const li = e.target.closest('.opt');
      e.preventDefault();
      if (li) choose(+li.dataset.i);
    });
    box.addEventListener('blur', () => setTimeout(closeList, 120));
    $('#store-clear').addEventListener('click', () => { box.value = ''; box.focus(); });
  }
  function pickStore(i) {
    const s = STORES[i];
    state.store = s || null;
    state.phone = s ? s.phone : '';
    state.address = s ? s.address : '';
    $('#phone').value = state.phone;
    $('#address').value = state.address;
    if (s) localStorage.setItem('hymn-poster-store', s.name);
    $('#hint-addr').hidden = !(s && !s.address);
    document.body.classList.toggle('no-store', !s);
    render();
  }

  // ---------- 表单绑定 ----------
  function bind() {
    document.querySelectorAll('[data-k]').forEach(el => {
      const path = el.dataset.k.split('.');
      const get = () => path.reduce((o, k) => o[k], state);
      const set = v => { path.length === 2 ? (state[path[0]][path[1]] = v) : (state[path[0]] = v); };
      if (el.type === 'checkbox') {
        el.checked = get();
        el.addEventListener('change', () => { set(el.checked); render(); });
      } else {
        el.value = get();
        el.addEventListener('input', () => { set(el.value.trim()); render(); });
      }
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
    $('#reset').addEventListener('click', async () => {
      Object.assign(state, {
        event: A.event, date: A.date, price: A.price, worth: A.worth, bundle: A.bundle,
        item1: { ...A.item1 }, item2: { ...A.item2 }, item3: { ...A.item3 },
        img1: assets.item1, img2: assets.item2,
      });
      document.querySelectorAll('[data-k]').forEach(el => {
        if (el.type === 'checkbox') return;
        el.value = el.dataset.k.split('.').reduce((o, k) => o[k], state);
      });
      render();
    });

    $('#dl-png').addEventListener('click', () => exportFile('png'));
    $('#dl-pdf').addEventListener('click', () => exportFile('pdf'));
    $('#sheet-close').addEventListener('click', () => { $('#sheet').hidden = true; });
    // 手机上点预览看大图（也能长按保存）
    preview.addEventListener('click', () => {
      if (!matchMedia('(max-width: 860px)').matches || !assets) return;
      const c = document.createElement('canvas');
      Poster.draw(c, posterData(), assets, EXPORT_SCALE);
      $('#sheet-img').src = c.toDataURL('image/jpeg', 0.92);
      $('#sheet-tip').textContent = '长按图片可保存';
      $('#sheet').hidden = false;
    });
  }

  function fileToDataURL(f) {
    return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
  }

  // ---------- 导出 ----------
  const EXPORT_SCALE = 2; // 2508×2508，打印也够清楚
  function fileBase() {
    const name = state.store ? state.store.name : '门店';
    return '赫眉' + name + '-海报';
  }

  async function exportFile(type) {
    if (!state.store) { alert('请先选择门店'); return; }
    const c = document.createElement('canvas');
    Poster.draw(c, posterData(), assets, EXPORT_SCALE);
    if (type === 'png') {
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      deliver(blob, fileBase() + '.png', c.toDataURL('image/jpeg', 0.92));
    } else {
      const jpg = c.toDataURL('image/jpeg', 0.95);
      const blob = makePDF(jpg, c.width, c.height);
      deliver(blob, fileBase() + '.pdf', jpg, true);
    }
  }

  const inWeChat = /MicroMessenger/i.test(navigator.userAgent);
  function deliver(blob, filename, previewURL, isPDF) {
    if (inWeChat) {
      // 微信里不能直接下载：图片给长按保存，PDF 提示去浏览器
      $('#sheet-img').src = previewURL;
      $('#sheet-tip').textContent = isPDF
        ? '微信里无法下载 PDF，请点右上角「…」→「在浏览器打开」后再下载。下面的图片可以长按保存。'
        : '长按图片 →「保存图片」';
      $('#sheet').hidden = false;
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  // 单页 PDF：整张海报作为 JPEG 铺满，页面 210×210mm
  function makePDF(jpgDataURL, w, h) {
    const bin = atob(jpgDataURL.split(',')[1]);
    const img = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) img[i] = bin.charCodeAt(i);
    const pw = 595.28, ph = pw * h / w;
    const enc = s => new TextEncoder().encode(s);
    const content = `q ${pw.toFixed(2)} 0 0 ${ph.toFixed(2)} 0 0 cm /Im0 Do Q`;
    const parts = [];
    const offsets = [];
    let len = 0;
    const push = p => { const b = typeof p === 'string' ? enc(p) : p; parts.push(b); len += b.length; };
    push('%PDF-1.4\n');
    const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
    obj(3, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
    obj(4, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);
      push(img);
      push('\nendstream');
    });
    obj(5, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    const xref = len;
    let x = 'xref\n0 6\n0000000000 65535 f \n';
    for (let n = 1; n <= 5; n++) x += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
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
    // 链接里带 ?store=横溪店 就直接选好这家（可以把专属链接发给店长）
    const q = new URLSearchParams(location.search).get('store');
    const last = q || localStorage.getItem('hymn-poster-store');
    const i = STORES.findIndex(s => s.name === last);
    if (i >= 0) box.value = STORES[i].name;
    await pickStore(i);
    document.body.classList.add('ready');
  })();
})();
