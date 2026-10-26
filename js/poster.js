// 海报绘制：全部画在 canvas 上，坐标按 1254×1254 设计稿
(function () {
  const S = 1254;
  const CREAM = '#f6dfc7';
  const CREAM_HI = '#fdeedd';
  const CREAM_LO = '#e9c4a0';
  const RED_INK = '#a8121c';
  const SERIF = '"HymnSerif","Songti SC","STSong","Noto Serif SC","Source Han Serif SC",serif';
  const NUM = SERIF; // 原图数字就是思源宋体自带的数字
  const SANS = '"HymnSans","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif';

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

  // ---------- 背景：用户给的红色丝绸底图 ----------
  function drawBackground(ctx, img) {
    ctx.drawImage(img, 0, 0, S, S);
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

  // ---------- logo（原件白色 PNG，染成和标题一样的香槟色） ----------
  let logoTinted = null;
  function tintedLogo(img) {
    if (logoTinted) return logoTinted;
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    const g = x.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, CREAM_HI);
    g.addColorStop(1, CREAM_LO);
    x.fillStyle = g;
    x.fillRect(0, 0, c.width, c.height);
    return (logoTinted = c);
  }
  function drawLogo(ctx, img) {
    const h = 38, w = h * img.width / img.height;
    ctx.drawImage(tintedLogo(img), (S - w) / 2, 31, w, h);
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
      const sz = fit(ctx, caption, SANS, 24, size + 20, 400);
      ctx.font = font(sz, SANS, 400);
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

    drawBackground(ctx, assets.bg);
    drawLogo(ctx, assets.logo);

    const hasQR = d.showQR && d.qr;
    if (hasQR) drawQR(ctx, d.qr, d.qrCaption);

    // 标题
    const L = 113;
    const title = d.title;
    const tMax = (hasQR ? 990 : 1150) - L;
    const tSize = fit(ctx, title, SERIF, 104, tMax, 900, 40);
    ctx.font = font(tSize, SERIF, 900);
    ctx.fillStyle = creamGradient(ctx, 232 - tSize * 0.85, 232);
    ctx.fillText(title, L, 232);

    // 领取时间胶囊
    if (d.date) {
      const txt = '领取时间：' + d.date;
      const size = fit(ctx, txt, SANS, 36, (hasQR ? 990 : 1140) - L - 64, 400);
      ctx.font = font(size, SANS, 400);
      const w = ctx.measureText(txt).width + 64;
      const g = ctx.createLinearGradient(L, 0, L + w, 0);
      g.addColorStop(0, '#f8e2cc');
      g.addColorStop(1, '#e2b896');
      roundRect(ctx, L, 287, w, 60, 15);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = '#86331f';
      ctx.fillText(txt, L + 32, 317 + size * 0.36);
    }

    // 9.9 元=
    const priceSize = fit(ctx, d.price, NUM, 372, 500, 900, 120);
    ctx.font = font(priceSize, NUM, 900);
    ctx.fillStyle = creamGradient(ctx, 380, 640);
    ctx.fillText(d.price, 135, 640);
    const priceEnd = 135 + ctx.measureText(d.price).width;
    ctx.font = font(42, SERIF, 900);
    ctx.fillStyle = CREAM;
    ctx.fillText('元＝', Math.max(priceEnd + 6, 630), 622);

    // 1690元 / 大礼包（右对齐）
    const R = 1142;
    const worth = d.worth;
    let numSize = 132, unitSize = 94;
    for (;;) {
      ctx.font = font(numSize, NUM, 900);
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
    ctx.font = font(numSize, NUM, 900);
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
      ctx.fillStyle = CREAM;
      const ns = fit(ctx, it.name, SANS, 32, 380, 400, 16);
      ctx.font = font(ns, SANS, 400);
      ctx.fillText(it.name, mid, 1046);
      if (it.value) {
        ctx.textAlign = 'left';
        ctx.font = font(20, SANS, 400);
        const lw = ctx.measureText('价值').width;
        const v = '¥' + it.value;
        ctx.font = font(40, SANS, 400);
        const vw = ctx.measureText(v).width;
        const x0 = mid - (lw + 14 + vw) / 2;
        ctx.fillStyle = CREAM;
        ctx.font = font(20, SANS, 400);
        ctx.fillText('价值', x0, 1096);
        ctx.font = font(40, SANS, 400);
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
      ctx.font = font(size, NUM, 900);
      const w = ctx.measureText(v).width;
      ctx.font = font(size * 0.55, NUM, 900);
      if (w + ctx.measureText('¥').width + 8 <= s - 44) break;
    }
    ctx.font = font(size * 0.55, NUM, 900);
    const yw = ctx.measureText('¥').width;
    ctx.font = font(size, NUM, 900);
    const vw = ctx.measureText(v).width;
    const x0 = x + (s - yw - 8 - vw) / 2;
    ctx.fillText(v, x0 + yw + 8, y + 210);
    ctx.font = font(size * 0.55, NUM, 900);
    ctx.fillText('¥', x0, y + 206);
  }

  window.Poster = { draw, SIZE: S };
})();
