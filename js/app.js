// 表单 ↔ 海报预览 ↔ 导出（支持多店同时选择，批量导出）
(function () {
  const $ = s => document.querySelector(s);
  const A = window.ACTIVITY;
  const STORES = window.STORES;
  const TEMPLATES = window.TEMPLATES;
  let tpl = TEMPLATES[0];   // 当前编辑的海报模板
  const MANAGERS = ['官卜妮', '杜海霞', '张维'];

  const state = {
    title: '赫眉' + A.event, date: A.date, price: A.price, worth: A.worth, bundle: A.bundle,
    item1: { ...A.item1 }, item2: { ...A.item2 }, item3: { ...A.item3 },
    img1: null, img2: null,
  };
  let selected = [];        // 已勾选的门店下标（按勾选顺序）
  let cur = -1;             // 正在预览 / 编辑的那家
  let titleStore = -1;      // 标题文字里现在写的是哪家店（-1 = 还没写店名）。全部取消勾选时标题不动，下次只做替换，不会叠加
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
    return { ...state, ...infoOf(i), title: i === titleStore ? state.title : swapTitle(state.title, titleStore, i) };
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
      tpl.draw(preview, posterData(cur), assets, 1); // 单选 / 电脑多选时的大图
      if (!multi) { restoreInfo(); return; }
      renderGrid();
    });
  }
  // 多选：每家一张，按勾选顺序排；分批画，免得一次画几十张卡住页面
  async function renderGrid() {
    const my = ++gen;
    for (const [i, el] of cards) if (!selected.includes(i)) {
      if (el.contains(infoSec)) restoreInfo();
      el.remove(); cards.delete(i);
    }
    selected.forEach((i, k) => {
      let el = cards.get(i);
      if (!el) {
        el = document.createElement('figure');
        el.className = 'card';
        el.dataset.i = i;
        el.innerHTML = `<canvas></canvas><figcaption>${STORES[i].name}</figcaption>`;
        cards.set(i, el);
      }
      el.classList.toggle('on', i === cur);
      // 按顺序排；位置没变就别动它，否则正在输入的框会失焦、手机键盘被收起
      if (grid.children[k] !== el) grid.insertBefore(el, grid.children[k] || null);
    });
    placeInfo();
    // 先画正在编辑的那张，其余随后
    const order = [cur].concat(selected.filter(i => i !== cur));
    for (let k = 0; k < order.length; k++) {
      if (my !== gen) return;
      tpl.draw(cards.get(order[k]).querySelector('canvas'), posterData(order[k]), assets, 0.5);
      if (k % 4 === 3) await new Promise(r => setTimeout(r, 0));
    }
  }

  // 手机多选时，「本店信息」和「活动内容」挪到当前那张海报正下方；其余情况放回原位
  const infoSec = $('.info');
  const actSec = $('.act');
  const homes = [infoSec, actSec].map(sec => {
    const mark = document.createComment('home');
    sec.parentNode.insertBefore(mark, sec);
    return [sec, mark];
  });
  function restoreInfo() {
    homes.forEach(([sec, mark]) => {
      if (sec.previousSibling !== mark) mark.parentNode.insertBefore(sec, mark.nextSibling);
    });
  }
  function placeInfo() {
    const card = selected.length > 1 && matchMedia('(max-width: 860px)').matches && cards.get(cur);
    if (!card) return restoreInfo();
    // 位置已经对了就别动，否则正在输入的框会失焦
    if (infoSec.parentNode !== card || actSec.previousSibling !== infoSec) {
      card.appendChild(infoSec);
      card.appendChild(actSec);
    }
  }
  matchMedia('(max-width: 860px)').addEventListener('change', placeInfo);

  // ---------- 门店选择：可搜索、可多选 ----------
  const PY = window.PINYIN || {};
  const box = $('#store');
  const list = $('#store-list');
  let hits = [];      // 当前列表里可选的门店下标
  let active = -1;    // 键盘高亮第几个

  function matches(s, q) {
    if (!q) return true;
    q = q.toLowerCase().replace(/\s+/g, '');
    const py = n => (PY[n] || '').split(' ');
    return s.name.includes(q) || s.manager.includes(q) || py(s.name).some(p => p.includes(q)) || py(s.manager).some(p => p === q || (q.length >= 3 && p.startsWith(q)));
  }
  function groupsOf() {
    return MANAGERS.concat([...new Set(STORES.map(s => s.manager))].filter(m => !MANAGERS.includes(m)));
  }
  function renderList(keepActive) {
    const q = box.value.trim();
    let html = '';
    hits = [];
    // 搜的是区域经理：顶部给一行「名下 N 家 · 全选」
    const mgr = q && groupsOf().find(m => m.includes(q) || (PY[m] || '').split(' ').some(p => p === q.toLowerCase() || (q.length >= 3 && p.startsWith(q.toLowerCase()))));
    if (mgr) {
      const n = STORES.filter(s => s.manager === mgr).length;
      const allOn = STORES.every((s, i) => s.manager !== mgr || selected.includes(i));
      html += `<li class="bulk mgr"><span><b>${mgr}</b> 名下 ${n} 家</span><button type="button" class="solid" data-grp="${mgr}">${allOn ? '取消全选' : '全选这 ' + n + ' 家'}</button></li>`;
    }
    if (!q) {
      const all = selected.length === STORES.length;
      html += `<li class="bulk"><span>已选 ${selected.length} / ${STORES.length} 家</span>` +
        `<button type="button" data-act="all">${all ? '取消全选' : '全选 ' + STORES.length + ' 家'}</button>` +
        (selected.length ? '<button type="button" data-act="none">清空</button>' : '') + '</li>';
    }
    groupsOf().forEach(m => {
      if (mgr && m !== mgr) return; // 搜的是经理：只列她名下的店
      const rows = STORES.map((s, i) => [s, i]).filter(([s]) => s.manager === m && (mgr || matches(s, q)));
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
  const combo = box.closest('.combo');
  function openList() { renderList(); list.hidden = false; combo.classList.add('open'); }
  function closeList() { list.hidden = true; box.value = ''; combo.classList.remove('open'); }

  function setSelected(next, focus) {
    selected = next;
    if (focus != null && selected.includes(focus)) cur = focus;
    else if (!selected.includes(cur)) cur = selected.length ? selected[0] : -1;
    if (cur >= 0 && cur !== titleStore) {
      state.title = swapTitle(state.title, titleStore, cur);
      titleStore = cur;
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
    // 手机上收起键盘只是输入框失焦，列表和搜索词都要留着；点「完成」或点列表外面才关
    document.addEventListener('pointerdown', e => {
      if (!list.hidden && !combo.contains(e.target)) closeList();
    }, true); // 捕获阶段：赶在勾选重画列表之前判断，否则被点的那行已被替换，会误判成点了外面
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
    $('#pick-tip').textContent = n > 1 ? `已选 ${n} 家 · 点店名或海报切换` : '可以搜索，也可以勾选多家一起下载';
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
      Object.assign(state, tpl.defaults(assets), { title: '赫眉' + (cur >= 0 ? STORES[cur].name : '') + A.event });
      titleStore = cur;
      fillForm();
      render();
    });

    $('#dl-png').addEventListener('click', () => exportFile('png'));
    $('#dl-pdf').addEventListener('click', () => exportFile('pdf'));
    $('#sheet-close').addEventListener('click', () => { $('#sheet').hidden = true; });
    // 手机上点预览看大图（也能长按保存）
    const isPhone = () => matchMedia('(max-width: 860px)').matches;
    const enlarge = i => {
      const c = document.createElement('canvas');
      tpl.draw(c, posterData(i), assets, EXPORT_SCALE);
      showSheet(c.toDataURL('image/jpeg', 0.92), '长按图片可保存');
    };
    preview.addEventListener('click', () => {
      if (isPhone() && assets && cur >= 0) enlarge(cur);
    });
    // 网格：点一张 = 切到这家编辑；手机上再点已选中的那张 = 看大图
    grid.addEventListener('click', e => {
      const card = e.target.closest('.card');
      if (!card || e.target.closest('.info, .act')) return; // 在海报下面的编辑框里点，不算点海报
      const i = +card.dataset.i;
      if (i === cur) { if (isPhone()) enlarge(i); return; }
      setSelected(selected, i);
    });
  }

  function fillForm() {
    document.querySelectorAll('[data-k]').forEach(el => {
      el.value = el.dataset.k.split('.').reduce((o, k) => o[k], state);
    });
  }

  function fileToDataURL(f) {
    return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
  }
  function showSheet(src, tip) {
    $('#sheet-imgs').innerHTML = src ? `<img src="${src}" alt="">` : '';
    $('#sheet-tip').textContent = tip;
    $('#sheet-save').hidden = true;
    $('#sheet').hidden = false;
  }

  // ---------- 导出 ----------
  const EXPORT_SCALE = 2; // 2508×2508，打印也够清楚
  const inWeChat = /MicroMessenger/i.test(navigator.userAgent);
  let busy = false;

  const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
  const tick = () => new Promise(r => setTimeout(r, 0));

  // 手机（iPhone / 安卓）能用系统分享面板存文件：图片可直接「存储图像」进相册
  const canShareFiles = (() => {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'a.png', { type: 'image/png' })] })); }
    catch (e) { return false; }
  })();
  const isPhoneNow = () => matchMedia('(max-width: 860px)').matches;

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
      // 先把要存的文件全部生成好：图片每家一张原图 PNG（不打包、不压缩）；PDF 合成一份多页
      const files = [];
      const pages = [];
      const previews = [];
      for (let k = 0; k < selected.length; k++) {
        if (many) btn.textContent = `生成中 ${k + 1} / ${selected.length}…`;
        await tick();
        const i = selected[k];
        tpl.draw(c, posterData(i), assets, EXPORT_SCALE);
        if (type === 'png') {
          const blob = await toBlob(c, 'image/png');
          files.push(new File([blob], `赫眉${STORES[i].name}-海报.png`, { type: 'image/png' }));
          previews.push(URL.createObjectURL(blob));
        } else {
          const jpg = await toBlob(c, 'image/jpeg', 0.95);
          pages.push({ jpg: new Uint8Array(await jpg.arrayBuffer()), w: c.width, h: c.height });
          if (k === 0) previews.push(URL.createObjectURL(jpg));
        }
      }
      if (type === 'pdf') {
        const name = many ? `赫眉海报-${selected.length}家店.pdf` : `赫眉${STORES[selected[0]].name}-海报.pdf`;
        files.push(new File([makePDF(pages)], name, { type: 'application/pdf' }));
      }

      if (canShareFiles && isPhoneNow() && !inWeChat) {
        // 手机：先弹预览，再点「保存到手机」调起系统面板（分享必须由这次点击直接触发）
        saveSheet(files, previews, type);
      } else if (inWeChat) {
        showSheet(previews[0], type === 'pdf'
          ? '微信里无法下载 PDF，请点右上角「…」→「在浏览器打开」后再下载。下面的图片可以长按保存。'
          : '长按图片 →「保存图片」');
      } else {
        for (const f of files) {
          deliver(f, f.name);
          if (files.length > 1) await new Promise(r => setTimeout(r, 900)); // 连续下载要留够间隔，浏览器才不会吞掉
        }
      }
    } finally {
      busy = false;
      btn.textContent = label;
    }
  }

  function saveSheet(files, previews, type) {
    const n = files.length;
    $('#sheet-imgs').innerHTML = previews.map(u => `<img src="${u}" alt="">`).join('');
    $('#sheet-tip').textContent = type === 'pdf'
      ? '点下面的按钮，在弹出的面板里选「存储到文件」'
      : `点下面的按钮，在弹出的面板里选「存储${n > 1 ? ' ' + n + ' 张' : ''}图像」就进相册了；也可以长按图片保存`;
    const btn = $('#sheet-save');
    btn.textContent = type === 'pdf' ? '保存 PDF 到手机' : `保存${n > 1 ? ' ' + n + ' 张' : ''}到手机`;
    btn.hidden = false;
    btn.onclick = async () => {
      try { await navigator.share({ files }); }
      catch (e) {
        if (e.name !== 'AbortError') $('#sheet-tip').textContent = '没能打开保存面板，请长按上面的图片保存';
      }
    };
    $('#sheet').hidden = false;
  }

  function deliver(blob, filename) {
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

  // ---------- 首页：海报模板列表 ----------
  function storeFromURL() {
    const q = new URLSearchParams(location.search).get('store');
    return q ? '&store=' + encodeURIComponent(q) : '';
  }
  function renderGallery() {
    const sample = STORES.findIndex(s => s.name === '横溪店');
    const info = sample >= 0 ? infoOf(sample) : { phone: '', address: '' };
    $('#tpl-list').innerHTML = TEMPLATES.map(t =>
      `<a class="tpl" href="?t=${t.id}${storeFromURL()}" data-t="${t.id}"><canvas></canvas><div class="nm">${t.name}</div><div class="go">使用这个海报 →</div></a>`).join('');
    TEMPLATES.forEach((t, k) => {
      const d = { ...t.defaults(assets), ...info };
      d.title = d.title.replace(/^赫眉/, '赫眉' + (sample >= 0 ? STORES[sample].name : ''));
      t.draw($('#tpl-list').children[k].querySelector('canvas'), d, assets, 0.5);
    });
  }
  // 链接里有 ?t=模板 就进编辑页，没有就是首页
  function route() {
    const t = TEMPLATES.find(x => x.id === new URLSearchParams(location.search).get('t'));
    document.body.classList.toggle('view-gallery', !t);
    document.body.classList.toggle('view-editor', !!t);
    window.scrollTo(0, 0);
    if (!t) { renderGallery(); return; }
    if (t !== tpl) {
      tpl = t;
      Object.assign(state, tpl.defaults(assets));
      titleStore = -1;
      if (cur >= 0) { state.title = swapTitle(state.title, -1, cur); titleStore = cur; }
      fillForm();
    }
    $('#tpl-name').textContent = tpl.name;
    render();
  }

  // ---------- 启动 ----------
  (async function init() {
    bind();
    await loadFonts();
    const [logo, item1, item2, bg] = await Promise.all([ASSETS.logo, ASSETS.item1, ASSETS.item2, ASSETS.bg].map(loadImage));
    assets = { logo, item1, item2, bg };
    Object.assign(state, tpl.defaults(assets));
    fillForm();
    // 链接里带 ?store=横溪店（多家用逗号隔开）就直接选好；否则用上次选的
    const q = new URLSearchParams(location.search).get('store');
    const names = (q || localStorage.getItem('hymn-poster-stores') || localStorage.getItem('hymn-poster-store') || '').split(/[,，、]/);
    const pre = names.map(n => STORES.findIndex(s => s.name === n.trim())).filter(i => i >= 0);
    setSelected([...new Set(pre)]);
    // 首页点模板 / 编辑页点返回：不刷新页面，直接切
    document.addEventListener('click', e => {
      const a = e.target.closest('a.tpl, a.back');
      if (!a || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      history.pushState(null, '', a.getAttribute('href'));
      route();
    });
    window.addEventListener('popstate', route);
    route();
    document.body.classList.add('ready');
  })();
})();
