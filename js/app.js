// 表单 ↔ 海报预览 ↔ 导出
(function () {
  const $ = s => document.querySelector(s);
  const A = window.ACTIVITY;
  const STORES = window.STORES;
  const QR = window.QR || {};
  const MANAGERS = ['官卜妮', '杜海霞', '张维'];

  const state = {
    store: null,
    title: A.title, date: A.date, price: A.price, worth: A.worth, bundle: A.bundle,
    item1: { ...A.item1 }, item2: { ...A.item2 }, item3: { ...A.item3 },
    qrCaption: A.qrCaption, showQR: true,
    phone: '', address: '', qr: null,
    img1: null, img2: null,
  };
  const uploadedQR = {}; // 本次手动上传的二维码，按店名记

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
    return { ...state, title: state.title.replace(/\{店名\}/g, name) };
  }

  // ---------- 门店选择 ----------
  const sel = $('#store');
  function buildStoreSelect() {
    sel.innerHTML = '<option value="">— 选择门店 —</option>';
    const groups = MANAGERS.concat([...new Set(STORES.map(s => s.manager))].filter(m => !MANAGERS.includes(m)));
    groups.forEach(m => {
      const og = document.createElement('optgroup');
      og.label = m + '（' + STORES.filter(s => s.manager === m).length + '家）';
      STORES.forEach((s, i) => {
        if (s.manager !== m) return;
        const o = document.createElement('option');
        o.value = i;
        o.textContent = s.name;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  }
  async function pickStore(i) {
    const s = STORES[i];
    state.store = s || null;
    state.phone = s ? s.phone : '';
    state.address = s ? s.address : '';
    $('#phone').value = state.phone;
    $('#address').value = state.address;
    const src = s && (uploadedQR[s.name] || QR[s.name]);
    state.qr = src ? await loadImage(src) : null;
    updateQRStatus();
    if (s) localStorage.setItem('hymn-poster-store', s.name);
    $('#hint-addr').hidden = !(s && !s.address);
    document.body.classList.toggle('no-store', !s);
    render();
  }
  function updateQRStatus() {
    const s = state.store;
    const el = $('#qr-status');
    if (!s) { el.textContent = '先选门店'; el.className = 'qr-status'; return; }
    if (uploadedQR[s.name]) { el.textContent = '用的是刚上传的二维码'; el.className = 'qr-status ok'; }
    else if (QR[s.name]) { el.textContent = '已自动匹配本店二维码'; el.className = 'qr-status ok'; }
    else { el.textContent = '本店还没有二维码，可点右边上传'; el.className = 'qr-status warn'; }
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
    sel.addEventListener('change', () => pickStore(sel.value === '' ? -1 : +sel.value));

    $('#qr-file').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f || !state.store) return;
      const url = await fileToDataURL(f);
      uploadedQR[state.store.name] = url;
      state.qr = await loadImage(url);
      updateQRStatus();
      render();
    });
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
        title: A.title, date: A.date, price: A.price, worth: A.worth, bundle: A.bundle,
        item1: { ...A.item1 }, item2: { ...A.item2 }, item3: { ...A.item3 }, qrCaption: A.qrCaption,
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
    buildStoreSelect();
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
    if (i >= 0) sel.value = i;
    await pickStore(i);
    document.body.classList.add('ready');
  })();
})();
