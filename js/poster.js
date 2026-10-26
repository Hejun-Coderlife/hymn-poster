// 海报绘制：全部画在 canvas 上，坐标按 1254×1254 设计稿
(function () {
  const S = 1254;
  const CREAM = '#f6dfc7';
  const CREAM_HI = '#fdeedd';
  const CREAM_LO = '#e9c4a0';
  const RED_INK = '#a8121c';
  const SERIF = '"HymnSerif","Songti SC","STSong","Noto Serif SC","Source Han Serif SC",serif';
  const NUM = '"HymnBodoni","Didot","Bodoni 72",' + SERIF;
  const SANS = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif';

  function font(size, family, weight) { return `${weight || 900} ${size}px ${family}`; }

  // 字太长就缩小，返回最终字号
  function fit(ctx, text, family, size, maxW, weight, min) {
    for (; size > (min || 12); size -= 1) {
      ctx.font = font(size, family, weight);
      if (ctx.measureText(text).width <= maxW) break;
    }
    return size;
  }

  // 带字距的文字（canvas letterSpacing 在部分手机上不支持，自己逐字画）
  function spacedWidth(ctx, text, gap) {
    let w = 0;
    for (const ch of text) w += ctx.measureText(ch).width + gap;
    return w - gap;
  }
  function drawSpaced(ctx, text, x, y, gap) {
    for (const ch of text) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + gap; }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCover(ctx, img, x, y, w, h) {
    const k = Math.max(w / img.width, h / img.height);
    const sw = w / k, sh = h / k;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  }

  function creamGradient(ctx, top, bottom) {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, CREAM_HI);
    g.addColorStop(1, CREAM_LO);
    return g;
  }

  // ---------- 背景：红色丝绸 ----------
  function band(ctx, top, bottom, stops, gx0, gy0, gx1, gy1) {
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.bezierCurveTo(top[2], top[3], top[4], top[5], top[6], top[7]);
    ctx.lineTo(bottom[6], bottom[7]);
    ctx.bezierCurveTo(bottom[4], bottom[5], bottom[2], bottom[3], bottom[0], bottom[1]);
    ctx.closePath();
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fill();
  }

  function drawBackground(ctx) {
    let g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#c40f18');
    g.addColorStop(0.5, '#b30a13');
    g.addColorStop(1, '#9c050d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    // 左侧柔光
    g = ctx.createRadialGradient(260, 520, 0, 260, 520, 760);
    g.addColorStop(0, 'rgba(226,36,44,0.55)');
    g.addColorStop(1, 'rgba(226,36,44,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    // 右上暗角
    g = ctx.createRadialGradient(1220, 260, 0, 1220, 260, 520);
    g.addColorStop(0, 'rgba(70,0,6,0.55)');
    g.addColorStop(1, 'rgba(70,0,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    // 丝绸褶皱：一条从左下往右上扬起的亮面 + 下方暗褶 + 底部再亮起
    band(ctx,
      [0, 940, 360, 960, 760, 840, 1254, 700],
      [0, 1254, 400, 1254, 800, 1254, 1254, 1254],
      [[0, 'rgba(120,0,8,0)'], [1, 'rgba(120,0,8,0.35)']], 0, 800, 0, 1254);

    band(ctx,
      [0, 900, 380, 930, 800, 800, 1254, 640],
      [0, 1010, 420, 1030, 820, 930, 1254, 800],
      [[0, 'rgba(240,70,74,0)'], [0.45, 'rgba(240,70,74,0.42)'], [1, 'rgba(200,20,28,0)']], 0, 820, 0, 1020);

    band(ctx,
      [0, 1010, 420, 1030, 820, 930, 1254, 800],
      [0, 1130, 440, 1150, 860, 1080, 1254, 980],
      [[0, 'rgba(90,0,6,0.0)'], [0.6, 'rgba(90,0,6,0.45)'], [1, 'rgba(90,0,6,0.1)']], 0, 950, 0, 1140);

    band(ctx,
      [0, 1120, 440, 1140, 860, 1070, 1254, 970],
      [0, 1254, 400, 1254, 800, 1254, 1254, 1254],
      [[0, 'rgba(230,50,56,0.38)'], [0.35, 'rgba(210,30,38,0.12)'], [1, 'rgba(120,0,8,0.25)']], 0, 1080, 0, 1254);

    // 亮面上的一道高光
    ctx.save();
    ctx.lineWidth = 6;
    g = ctx.createLinearGradient(0, 0, S, 0);
    g.addColorStop(0, 'rgba(255,140,140,0)');
    g.addColorStop(0.5, 'rgba(255,150,150,0.35)');
    g.addColorStop(1, 'rgba(255,140,140,0)');
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 955);
    ctx.bezierCurveTo(400, 985, 810, 860, 1254, 715);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 小图标 ----------
  function iconCircle(ctx, cx, cy) {
    ctx.save();
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function phoneIcon(ctx, cx, cy) {
    iconCircle(ctx, cx, cy);
    ctx.save();
    ctx.translate(cx - 12, cy - 12);
    ctx.scale(1, 1);
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D('M5.5 2.5h3l1.5 4.5-2 1.5a12 12 0 0 0 7.5 7.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A18.5 18.5 0 0 1 3.5 4.5a2 2 0 0 1 2-2z'));
    ctx.restore();
  }
  function pinIcon(ctx, cx, cy) {
    iconCircle(ctx, cx, cy);
    ctx.save();
    ctx.translate(cx - 12, cy - 13);
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D('M12 24s-8-7.2-8-13a8 8 0 0 1 16 0c0 5.8-8 13-8 13z'));
    ctx.beginPath();
    ctx.arc(12, 11, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- logo ----------
  let logoTinted = null;
  function tintedLogo(img) {
    if (logoTinted) return logoTinted;
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = CREAM;
    x.fillRect(0, 0, c.width, c.height);
    return (logoTinted = c);
  }
  function drawLogo(ctx, img) {
    const h = 40, w = h * img.width / img.height;
    ctx.font = font(27, '"Arial Black","Helvetica Neue",Arial,sans-serif', 900);
    const hymnW = spacedWidth(ctx, 'HYMN', 1.5);
    const total = w + 10 + hymnW;
    const x = (S - total) / 2, y = 31;
    ctx.drawImage(tintedLogo(img), x, y, w, h);
    ctx.fillStyle = CREAM;
    ctx.textBaseline = 'alphabetic';
    drawSpaced(ctx, 'HYMN', x + w + 10, y + 31, 1.5);
  }

  // ---------- 二维码 ----------
  function drawQR(ctx, img, caption) {
    const x = 1016, y = 66, size = 172, pad = 10;
    ctx.save();
    ctx.shadowColor = 'rgba(60,0,4,0.35)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, x, y, size, size, 14);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, 4);
    ctx.clip();
    drawCover(ctx, img, x + pad, y + pad, size - pad * 2, size - pad * 2);
    ctx.restore();
    if (caption) {
      ctx.fillStyle = CREAM;
      ctx.textAlign = 'center';
      const sz = fit(ctx, caption, SANS, 24, size + 20, 500);
      ctx.font = font(sz, SANS, 500);
      ctx.fillText(caption, x + size / 2, y + size + 34);
      ctx.textAlign = 'left';
    }
  }

  // ---------- 主体 ----------
  function draw(canvas, d, assets, scale) {
    canvas.width = canvas.height = S * scale;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    drawBackground(ctx);
    drawLogo(ctx, assets.logo);

    const hasQR = d.showQR && d.qr;
    if (hasQR) drawQR(ctx, d.qr, d.qrCaption);

    // 标题
    const L = 113;
    const title = d.title;
    const tMax = (hasQR ? 990 : 1150) - L;
    const tSize = fit(ctx, title, SERIF, 106, tMax, 900, 40);
    ctx.font = font(tSize, SERIF, 900);
    ctx.fillStyle = creamGradient(ctx, 232 - tSize * 0.85, 232);
    ctx.fillText(title, L, 232);

    // 领取时间胶囊
    if (d.date) {
      const txt = '领取时间：' + d.date;
      const size = fit(ctx, txt, SANS, 34, (hasQR ? 990 : 1140) - L - 64, 500);
      ctx.font = font(size, SANS, 500);
      const w = ctx.measureText(txt).width + 64;
      const g = ctx.createLinearGradient(L, 0, L + w, 0);
      g.addColorStop(0, '#f8e2cc');
      g.addColorStop(1, '#e2b896');
      roundRect(ctx, L, 287, w, 60, 15);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = '#7d2a1d';
      ctx.fillText(txt, L + 32, 317 + size * 0.36);
    }

    // 9.9 元=
    const priceSize = fit(ctx, d.price, NUM, 372, 500, 800, 120);
    ctx.font = font(priceSize, NUM, 800);
    ctx.fillStyle = creamGradient(ctx, 380, 640);
    ctx.fillText(d.price, 135, 640);
    const priceEnd = 135 + ctx.measureText(d.price).width;
    ctx.font = font(42, SERIF, 900);
    ctx.fillStyle = CREAM;
    ctx.fillText('元＝', Math.max(priceEnd + 6, 630), 622);

    // 1690元 / 大礼包（右对齐）
    const R = 1142;
    const worth = d.worth;
    let numSize = 140, unitSize = 98;
    for (;;) {
      ctx.font = font(numSize, NUM, 800);
      const nw = ctx.measureText(worth).width;
      ctx.font = font(unitSize, SERIF, 900);
      const uw = ctx.measureText('元').width;
      if (nw + uw <= 420 || numSize < 60) break;
      numSize -= 2; unitSize -= 1.4;
    }
    ctx.font = font(unitSize, SERIF, 900);
    const unitW = ctx.measureText('元').width;
    ctx.fillStyle = creamGradient(ctx, 400, 495);
    ctx.fillText('元', R - unitW, 494);
    ctx.font = font(numSize, NUM, 800);
    ctx.textAlign = 'right';
    ctx.fillText(worth, R - unitW - 4, 494);

    const bSize = fit(ctx, d.bundle, SERIF, 124, 420, 900, 40);
    ctx.font = font(bSize, SERIF, 900);
    ctx.fillStyle = creamGradient(ctx, 528, 632);
    ctx.fillText(d.bundle, R, 630);
    ctx.textAlign = 'left';

    // 三张礼品卡
    const cards = [75, 463, 852];
    const cy = 682, cs = 320;
    cards.forEach((cx, i) => {
      ctx.save();
      ctx.shadowColor = 'rgba(50,0,4,0.45)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 10;
      roundRect(ctx, cx, cy, cs, cs, 16);
      ctx.fillStyle = '#f5e6d3';
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, cx, cy, cs, cs, 16);
      ctx.clip();
      if (i < 2) drawCover(ctx, i === 0 ? d.img1 : d.img2, cx, cy, cs, cs);
      else drawCoupon(ctx, cx, cy, cs, d.item3);
      ctx.restore();
    });

    // 礼品名 + 价值
    cards.forEach((cx, i) => {
      const it = d['item' + (i + 1)];
      const mid = cx + cs / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = CREAM_HI;
      const ns = fit(ctx, it.name, SANS, 32, 380, 500, 16);
      ctx.font = font(ns, SANS, 500);
      ctx.fillText(it.name, mid, 1046);
      if (it.value) {
        ctx.textAlign = 'left';
        ctx.font = font(20, SANS, 400);
        const lw = ctx.measureText('价值').width;
        const v = '¥' + it.value;
        ctx.font = font(40, SANS, 500);
        const vw = ctx.measureText(v).width;
        const x0 = mid - (lw + 14 + vw) / 2;
        ctx.fillStyle = CREAM;
        ctx.font = font(20, SANS, 400);
        ctx.fillText('价值', x0, 1096);
        ctx.font = font(40, SANS, 500);
        ctx.fillText(v, x0 + lw + 14, 1098);
      }
    });
    ctx.textAlign = 'left';

    // 分割线
    ctx.strokeStyle = 'rgba(246,223,199,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(58, 1150);
    ctx.lineTo(1196, 1150);
    ctx.stroke();

    // 底栏：电话 + 地址
    const fy = 1199;
    ctx.fillStyle = CREAM;
    let phoneEnd = 58;
    if (d.phone) {
      phoneIcon(ctx, 87, fy);
      ctx.font = font(32, SANS, 400);
      const t = '电话：' + d.phone;
      drawSpaced(ctx, t, 134, fy + 12, 4);
      phoneEnd = 134 + spacedWidth(ctx, t, 4);
    }
    if (d.address) {
      const avail = 1196 - (phoneEnd + 60) - 70;
      let size = 32, gap = 3;
      for (; size > 16; size--) {
        ctx.font = font(size, SANS, 400);
        gap = size >= 28 ? 3 : 1;
        if (spacedWidth(ctx, d.address, gap) <= avail) break;
      }
      ctx.font = font(size, SANS, 400);
      const aw = spacedWidth(ctx, d.address, gap);
      const ax = 1196 - aw;
      pinIcon(ctx, ax - 46, fy);
      drawSpaced(ctx, d.address, ax, fy + size * 0.37, gap);
    }
  }

  function drawCoupon(ctx, x, y, s, it) {
    let g = ctx.createLinearGradient(x, y, x + s, y + s);
    g.addColorStop(0, '#fcf3e6');
    g.addColorStop(1, '#f0dcc3');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, s, s);

    // 底部金色波纹
    g = ctx.createLinearGradient(x, 0, x + s, 0);
    g.addColorStop(0, 'rgba(201,150,90,0.15)');
    g.addColorStop(0.5, 'rgba(201,150,90,0.95)');
    g.addColorStop(1, 'rgba(201,150,90,0.3)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 232);
    ctx.bezierCurveTo(x + 110, y + 262, x + 200, y + 300, x + s, y + 262);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 246);
    ctx.bezierCurveTo(x + 120, y + 276, x + 210, y + 312, x + s, y + 278);
    ctx.stroke();

    ctx.fillStyle = RED_INK;
    ctx.font = font(34, SERIF, 900);
    ctx.fillText(it.name || '抵用券', x + 26, y + 96);

    const v = it.value || '';
    let size = 112;
    for (; size > 40; size -= 2) {
      ctx.font = font(size, NUM, 800);
      const w = ctx.measureText(v).width;
      ctx.font = font(size * 0.55, NUM, 800);
      if (w + ctx.measureText('¥').width + 8 <= s - 44) break;
    }
    ctx.font = font(size * 0.55, NUM, 800);
    const yw = ctx.measureText('¥').width;
    ctx.font = font(size, NUM, 800);
    const vw = ctx.measureText(v).width;
    const x0 = x + (s - yw - 8 - vw) / 2;
    ctx.fillText(v, x0 + yw + 8, y + 210);
    ctx.font = font(size * 0.55, NUM, 800);
    ctx.fillText('¥', x0, y + 206);
  }

  window.Poster = { draw, SIZE: S };
})();
