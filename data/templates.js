// 海报模板清单：首页按这个顺序列出来。加新海报 = 写一个画图函数 + 在这里加一项
//   id       链接里用的名字（?t=xxx）
//   name     首页卡片上的名字
//   draw     画图函数 (canvas, 数据, 素材, 倍数)
//   defaults 默认内容（编辑页「活动内容」里的初始值）
window.TEMPLATES = [
  {
    id: 'anniversary',
    name: '周年庆 · 9.9元＝1690元大礼包',
    draw: (...a) => Poster.draw(...a),
    defaults: assets => {
      const A = window.ACTIVITY;
      return {
        title: '赫眉' + A.event, price: A.price, worth: A.worth, bundle: A.bundle,
        item1: { ...A.item1 }, item2: { ...A.item2 }, item3: { ...A.item3 },
        img1: assets.item1, img2: assets.item2,
      };
    },
  },
  {
    id: 'festival',
    name: '购物节 6.7折 + 礼品券 · A4 正反面',
    draw: (...a) => Poster2.draw(...a),
    drawPage: (...a) => Poster2.drawPage(...a),
    pages: ['正面', '背面'], // 导出时每页一张，文件名带上
    exportScale: 1,          // 原稿 2000×2826，约 240dpi
    defaults: () => ({ title: '赫眉周年庆' }), // 背面大标题，选店后自动变成 赫眉XX店周年庆
  },
];
