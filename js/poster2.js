// 第2个海报：购物节 A4 正反面（正面 6.7折购物节，背面 礼品券），坐标按 2000×2826 原稿
// 底图是原稿擦掉每家店不同的字之后的样子（tools/build_t2.py），这里只重画会变的：店名、日期、地址电话、二维码
(function () {
  const W = 2000, H = 2826;
  const GAP = 60;           // 预览时两面中间的空隙
  const ROSE = '#fb1e43';   // 全张统一的红 = 「全场护肤彩妆」彩带正面的红（底图里的字、标题图也对齐到它）
  const FALLBACK = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif';
  const BLACK = '"HymnSansBlack",' + FALLBACK;
  const BOLD = '"HymnSansBold",' + FALLBACK;

  function font(size, family, weight) { return `${weight} ${size}px ${family}`; }
  function fit(ctx, text, family, weight, size, maxW, min) {
    for (; size > min; size -= 2) {
      ctx.font = font(size, family, weight);
      if (ctx.measureText(text).width <= maxW) break;
    }
    return size;
  }
  // 按字形的实际外框居中（中文、数字高低不一样，用 actualBoundingBox 才准）
  function centerText(ctx, text, cx, cy) {
    const m = ctx.measureText(text);
    const x = cx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
    const y = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    ctx.fillText(text, x, y);
  }
  // 左边对齐到字形左缘（和原稿上下几行对齐）
  function leftText(ctx, text, left, cy) {
    const m = ctx.measureText(text);
    ctx.fillText(text, left + m.actualBoundingBoxLeft, cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  }
  function softShadow(ctx, color, blur, dx, dy) {
    ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = dx; ctx.shadowOffsetY = dy;
  }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = ctx.shadowOffsetY = 0; }

  function drawQR(ctx, img, x, y, s) {
    if (!img) return;
    ctx.drawImage(img, x, y, s, s); // 二维码图是 360px，和这里的尺寸差不多，不会糊
  }

  // ---------- 正面：一年一度购物节 ----------
  // 店名那一行：粗黑斜体、红色渐变、白描边、外面一圈粉色光（仿原稿的立体字）
  function storeLine(ctx, text) {
    const cx = 960, cy = 250, maxW = 1700;
    const size = fit(ctx, text, BLACK, 900, 290, maxW / 1.02, 120);
    ctx.save();
    ctx.font = font(size, BLACK, 900);
    ctx.lineJoin = 'round';
    const m = ctx.measureText(text);
    const w = m.actualBoundingBoxRight - m.actualBoundingBoxLeft;
    const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    ctx.translate(cx, cy);
    ctx.transform(1, 0, -0.16, 1, 0, 0); // 往右斜
    const x = -w / 2 + m.actualBoundingBoxLeft, y = 325 - cy - desc; // 字底在第二行上方留出行距，店名长字变小时也保持这个间距
    const k = size / 290;
    // 白描边 + 浅浅的投影（不用红光晕，红光晕会把整行压暗）
    softShadow(ctx, 'rgba(190,40,70,.28)', 24 * k, 0, 8 * k);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 34 * k;
    ctx.strokeText(text, x, y);
    noShadow(ctx);
    ctx.strokeText(text, x, y);
    // 立体的厚度：6.7折侧面的颜色
    ctx.fillStyle = '#e01236'; // 厚度：比字面深一档的同色
    ctx.fillText(text, x + 4 * k, y + 6 * k);
    // 字面：照 6.7折正面字面实测，上亮下深，中间是 ROSE
    const g = ctx.createLinearGradient(0, -asc, 0, desc);
    g.addColorStop(0, '#fd3452');
    g.addColorStop(0.5, '#fb2447');
    g.addColorStop(1, '#f91e43');
    ctx.fillStyle = g;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ---------- 标题（新设计）：两行都在这里画，字收窄、拉开字距行距 ----------
  // 一行立体字：逐字画（字距 gap），横向压到 sx（收窄），白描边 + 浅投影 + 同色厚度 + 渐变字面
  function bigText(ctx, text, cx, cy, size, o) {
    const sx = o.sx || 0.86, gap = (o.gap || 0.08) * size, skew = o.skew || 0;
    ctx.save();
    ctx.font = font(size, BLACK, 900);
    ctx.lineJoin = 'round';
    const chars = [...text];
    const ws = chars.map(ch => ctx.measureText(ch).width * sx);
    const total = ws.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
    const m = ctx.measureText(text);
    const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    const base = (asc - desc) / 2;
    const k = size / 230;
    const each = fn => {
      let x = cx - total / 2;
      chars.forEach((ch, i) => {
        ctx.save();
        ctx.translate(x, cy);
        ctx.transform(sx, 0, skew * sx, 1, 0, 0);
        fn(ch);
        ctx.restore();
        x += ws[i] + gap;
      });
    };
    softShadow(ctx, 'rgba(190,40,70,.3)', 26 * k, 0, 10 * k);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = (o.stroke || 26) * k / sx;
    each(ch => ctx.strokeText(ch, 0, base));
    noShadow(ctx);
    each(ch => ctx.strokeText(ch, 0, base));
    ctx.fillStyle = '#e01236';
    each(ch => ctx.fillText(ch, 4 * k, base + 6 * k));
    const g = ctx.createLinearGradient(0, cy - asc / 2 - 10, 0, cy + asc / 2 + 10);
    g.addColorStop(0, '#fd3452');
    g.addColorStop(0.5, '#fb2447');
    g.addColorStop(1, '#f91e43');
    ctx.fillStyle = g;
    each(ch => ctx.fillText(ch, 0, base));
    ctx.restore();
    return total;
  }
  // 字太长时缩字号：按收窄+字距后的总宽来算
  function fitBig(ctx, text, size, maxW, o) {
    const sx = o.sx || 0.86, gap = o.gap || 0.08;
    for (; size > 60; size -= 4) {
      ctx.font = font(size, BLACK, 900);
      const w = [...text].reduce((a, ch) => a + ctx.measureText(ch).width * sx, 0) + gap * size * ([...text].length - 1);
      if (w <= maxW) break;
    }
    return size;
  }
  // 飘带：一条从左下绕上来的红丝带，白边 + 高光
  function swoosh(ctx, y) {
    // 左边绕一个小圈，往右上扬起
    const path = new Path2D(`M 520 ${y + 95} C 300 ${y + 40}, 110 ${y + 60}, 160 ${y + 110} C 220 ${y + 170}, 700 ${y + 140}, 1050 ${y + 95} S 1650 ${y + 20}, 1840 ${y - 120}`);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    softShadow(ctx, 'rgba(255,60,100,.55)', 34, 0, 8);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 46; ctx.stroke(path);
    noShadow(ctx);
    const g = ctx.createLinearGradient(160, 0, 1840, 0);
    g.addColorStop(0, '#f91e43'); g.addColorStop(0.5, ROSE); g.addColorStop(1, '#fd3452');
    ctx.strokeStyle = g; ctx.lineWidth = 30; ctx.stroke(path);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 5;
    ctx.translate(0, -7); ctx.stroke(path);
    ctx.restore();
  }

  function titleA(ctx, d) {
    // 方案A：店名放进白色胶囊做小标题，下面「一年一度购物节」大字
    const name = '赫眉' + (d.store || '');
    ctx.save();
    ctx.font = font(92, BLACK, 900);
    const gap = 92 * 0.14;
    const tw = [...name].reduce((a, ch) => a + ctx.measureText(ch).width, 0) + gap * ([...name].length - 1);
    const pw = tw + 150, ph = 150, px = 1000 - pw / 2, py = 120;
    softShadow(ctx, 'rgba(190,40,70,.25)', 24, 0, 8);
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fillStyle = '#fff'; ctx.fill();
    noShadow(ctx);
    ctx.lineWidth = 6; ctx.strokeStyle = ROSE; ctx.stroke();
    ctx.fillStyle = ROSE;
    const m = ctx.measureText('赫');
    let x = 1000 - tw / 2;
    const y = py + ph / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    for (const ch of name) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + gap; }
    ctx.restore();
    const o = { sx: 0.84, gap: 0.1, stroke: 30 };
    bigText(ctx, '一年一度购物节', 1000, 470, fitBig(ctx, '一年一度购物节', 250, 1760, o), o);
    swoosh(ctx, 650);
  }
  function titleB(ctx, d) {
    // 方案B：两行同样的立体字，稍微斜一点，行距拉开
    const name = '赫眉' + (d.store || '');
    const o1 = { sx: 0.84, gap: 0.08, skew: -0.12, stroke: 26 };
    const o2 = { sx: 0.84, gap: 0.12, skew: -0.12, stroke: 30 };
    bigText(ctx, name, 1000, 215, fitBig(ctx, name, 190, 1700, o1), o1);
    bigText(ctx, '一年一度购物节', 1000, 480, fitBig(ctx, '一年一度购物节', 240, 1760, o2), o2);
    swoosh(ctx, 660);
  }

  function front(ctx, d, assets) {
    ctx.drawImage(assets.t2front, 0, 0, W, H);
    const style = d.titleStyle || window.T2_TITLE || 'orig';
    if (style === 'A') titleA(ctx, d);
    else if (style === 'B') titleB(ctx, d);
    else {
      if (assets.t2title) ctx.drawImage(assets.t2title, 0, 60);
      storeLine(ctx, '赫眉' + (d.store || ''));
    }

    // 胶囊：活动时间（字距拉开，和原稿一样）
    if (d.date) {
      const txt = '活动时间：' + d.date;
      ctx.save();
      ctx.fillStyle = ROSE;
      softShadow(ctx, 'rgba(255,64,96,.35)', 8, 3, 5);
      let size = 72, gap = 0;
      for (; size > 36; size -= 2) {
        ctx.font = font(size, BOLD, 700);
        const plain = [...txt].reduce((s, ch) => s + ctx.measureText(ch).width, 0);
        gap = Math.min(size * 0.42, (1230 - plain) / ([...txt].length - 1));
        if (gap >= 0) break;
      }
      ctx.font = font(size, BOLD, 700);
      const chars = [...txt];
      const total = chars.reduce((s, ch) => s + ctx.measureText(ch).width, 0) + gap * (chars.length - 1);
      let x = 1000 - total / 2;
      const m = ctx.measureText('活');
      const y = 1917 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      for (const ch of chars) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + gap; }
      ctx.restore();
    }

    // 二维码（左右各一个）
    drawQR(ctx, d.qr, 32, 1318, 350);
    drawQR(ctx, d.qr, 1620, 1318, 350);

    // 底部：活动地址 + 美丽热线
    const parts = [];
    if (d.address) parts.push('活动地址：' + d.address);
    if (d.phone) parts.push('美丽热线：' + d.phone);
    if (parts.length) {
      const txt = parts.join('　　');
      ctx.fillStyle = ROSE;
      fit(ctx, txt, BOLD, 700, 66, 1830, 30);
      centerText(ctx, txt, 985, 2722);
    }
  }

  // ---------- 背面：礼品券 ----------
  function back(ctx, d, assets) {
    ctx.drawImage(assets.t2back, 0, 0, W, H);

    // 顶上白色大日期
    if (d.date) {
      ctx.save();
      ctx.fillStyle = '#fff';
      softShadow(ctx, 'rgba(214,60,96,.45)', 18, 4, 8);
      fit(ctx, d.date, BOLD, 700, 182, 1640, 80);
      centerText(ctx, d.date, 1000, 172);
      ctx.restore();
    }

    // 赫眉XX店周年庆
    ctx.save();
    ctx.fillStyle = ROSE;
    softShadow(ctx, 'rgba(200,40,80,.35)', 16, 4, 8);
    fit(ctx, d.title, BLACK, 900, 206, 1680, 80);
    centerText(ctx, d.title, 1005, 414);
    ctx.restore();

    // 地址 + 咨询热线
    const parts = [];
    if (d.address) parts.push(d.address);
    if (d.phone) parts.push('咨询热线：' + d.phone);
    if (parts.length) {
      const txt = parts.join('  ');
      ctx.fillStyle = ROSE;
      fit(ctx, txt, BOLD, 700, 64, 1720, 30);
      centerText(ctx, txt, 993, 580);
    }

    // 使用说明第 2 行（带日期）
    ctx.fillStyle = ROSE;
    ctx.font = font(48, BOLD, 700);
    leftText(ctx, '2、有无消费均可领！' + (d.date ? '时间：' + d.date : ''), 232, 2616);

    drawQR(ctx, d.qr, 1506, 655, 354);
    drawQR(ctx, d.qr, 1607, 2434, 352);
  }

  const PAGES = [front, back];

  // 导出：一页一张，原稿尺寸
  function drawPage(canvas, d, assets, scale, p) {
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    PAGES[p](ctx, d, assets);
  }
  // 预览：正反面并排画在一张上
  function draw(canvas, d, assets, scale) {
    const s = scale * 0.32;
    canvas.width = Math.round((W * 2 + GAP) * s);
    canvas.height = Math.round(H * s);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    PAGES.forEach((fn, p) => {
      ctx.setTransform(s, 0, 0, s, p * (W + GAP) * s, 0);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      fn(ctx, d, assets);
    });
  }

  window.Poster2 = { draw, drawPage, W, H };
})();
