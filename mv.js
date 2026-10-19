// Claude MV ·《APT.》风格二创 —— 时间轴与 APT_.lrc 对齐（视频 0s = 歌曲 0s）
const W = 1920, H = 1080;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const C = {
  orange: '#D97757', orangeD: '#A9533A', blue: '#2F5BEA', blueD: '#1A3594',
  cream: '#EEEBE4', ink: '#151515', yellow: '#F2C14E', red: '#E5484D',
  pink: '#FF5FA2', green: '#3FB950', navy: '#12162B', gray: '#8A8680', white: '#FFFFFF',
};
const FONT = '"Noto Sans SC", "WenQuanYi Zen Hei", sans-serif';
const MONO = '"DejaVu Sans Mono", "WenQuanYi Zen Hei Mono", monospace';
const SPB = 60 / 149;          // 一拍的秒数
const BEAT0 = 6.98;            // 第一句 APT 的时间
const DURATION = 61.5;
const USED = new Set();        // 记录出现过的文字，用来预加载字体

// ---------- 工具 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = t => 1 - Math.pow(1 - clamp(t), 3);
const eIn = t => Math.pow(clamp(t), 3);
const eBack = t => { t = clamp(t); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const pop = (lt, d = 0.28) => lt < 0 ? 0 : eBack(lt / d);
const kick = (lt, k = 6) => lt < 0 ? 0 : Math.exp(-lt * k);
const beatAt = t => (t - BEAT0) / SPB;
const beatFrac = t => { const b = beatAt(t); return b - Math.floor(b); };
const fmt = n => Math.round(n).toLocaleString('en-US');

function bg(color) { ctx.fillStyle = color; ctx.fillRect(-200, -200, W + 400, H + 400); }

function txt(s, x, y, size, o = {}) {
  USED.add(s);
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  const sc = o.scale ?? 1;
  ctx.scale(sc * (o.sx ?? 1), sc * (o.sy ?? 1));
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.font = `${o.weight || 900} ${size}px ${o.mono ? MONO : FONT}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.base || 'middle';
  ctx.letterSpacing = (o.ls ?? 0) + 'px';
  if (o.depth) {
    ctx.fillStyle = o.depthColor || C.ink;
    const step = Math.max(1, o.depth / 10);
    for (let i = o.depth; i > 0; i -= step) ctx.fillText(s, i * (o.dx ?? 1), i * (o.dy ?? 1));
  }
  if (o.stroke) { ctx.lineWidth = o.lw || size * 0.05; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, 0, 0); }
  if (o.fill !== null) { ctx.fillStyle = o.fill || C.ink; ctx.fillText(s, 0, 0); }
  ctx.restore();
}
function measure(s, size, mono) { ctx.save(); ctx.font = `900 ${size}px ${mono ? MONO : FONT}`; ctx.letterSpacing = '0px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }

function rrect(x, y, w, h, r, fill, stroke, lw = 4) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

// 文字放进彩色方块（参考视频里“狗”“唯一”那种）
function tile(s, x, y, size, o = {}) {
  const w = measure(s, size) + size * 0.5, h = size * 1.3;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); const sc = o.scale ?? 1; ctx.scale(sc, sc);
  ctx.globalAlpha *= o.alpha ?? 1;
  rrect(-w / 2 + size * 0.08, -h / 2 + size * 0.1, w, h, size * 0.12, o.shadow || C.ink);
  rrect(-w / 2, -h / 2, w, h, size * 0.12, o.bg || C.blue);
  ctx.restore();
  txt(s, x, y + size * 0.04, size, { fill: o.fill || C.white, rot: o.rot, scale: o.scale, alpha: o.alpha });
}

const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function pixelArt(rows, x, y, p, color) {
  ctx.fillStyle = color;
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'X') ctx.fillRect(x + i * p, y + j * p, p + 0.5, p + 0.5); });
}
function heart(cx, cy, p, color = C.red) { pixelArt(HEART, cx - 3.5 * p, cy - 3 * p, p, color); }

// ---------- 像素小螃蟹 ----------
// cx,by = 底部中心；p = 像素大小。o: expr, squash, rot, legs, armL, armR, color, crown, bow, sweat, blush, horns
function crab(cx, by, p, o = {}) {
  const col = o.color || C.orange;
  ctx.save();
  ctx.translate(cx, by);
  if (o.rot) ctx.rotate(o.rot);
  const sq = o.squash || 0;
  ctx.scale(1 + sq * 0.6, 1 - sq);
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.translate(-8 * p, -9 * p);
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * p, y * p, w * p + 0.6, h * p + 0.6); };
  // 腿
  const lift = o.legs ? Math.round(Math.sin(o.legs * Math.PI) * 0.8 + 0.8) * 0.5 : 0;
  [3, 5].forEach(x => R(x, 7, 1, 2 - lift, col));
  [10, 12].forEach(x => R(x, 7, 1, 2 - (o.legs ? 1 - lift : 0), col));
  // 身体 + 手
  R(2, 0, 12, 7, col);
  R(0, 3 - (o.armL || 0) * 2, 2, 2, col);
  R(14, 3 - (o.armR || 0) * 2, 2, 2, col);
  if (o.horns) { R(3, -3, 1, 3, C.white); R(12, -3, 1, 3, C.white); R(2, -4, 1, 1, C.white); R(13, -4, 1, 1, C.white); }
  const ink = C.ink;
  switch (o.expr || 'normal') {
    case 'happy': R(4, 3, 1, 1, ink); R(5, 2, 1, 1, ink); R(6, 3, 1, 1, ink); R(9, 3, 1, 1, ink); R(10, 2, 1, 1, ink); R(11, 3, 1, 1, ink); break;
    case 'squint': R(4, 1.5, 1, 1, ink); R(5, 2.5, 1, 1, ink); R(4, 3.5, 1, 1, ink); R(11, 1.5, 1, 1, ink); R(10, 2.5, 1, 1, ink); R(11, 3.5, 1, 1, ink); break;
    case 'shock': R(4, 2, 2, 2, ink); R(10, 2, 2, 2, ink); R(4.5, 2.5, 1, 1, C.white); R(10.5, 2.5, 1, 1, C.white); break;
    case 'cool': R(3, 2, 4, 2, ink); R(9, 2, 4, 2, ink); R(7, 2, 2, 0.6, ink); R(3.6, 2.3, 1, 0.6, '#666'); R(9.6, 2.3, 1, 0.6, '#666'); break;
    case 'dead': [[4, 2], [6, 2], [5, 3], [4, 4], [6, 4], [9, 2], [11, 2], [10, 3], [9, 4], [11, 4]].forEach(([x, y]) => R(x, y - 0.5, 1, 1, ink)); break;
    case 'blink': R(4, 3, 2, 0.6, ink); R(10, 3, 2, 0.6, ink); break;
    case 'glow': R(4, 2, 1.4, 2, C.yellow); R(10.6, 2, 1.4, 2, C.yellow); break;
    default: R(5, 2, 1, 2, ink); R(10, 2, 1, 2, ink);
  }
  if (o.blush) { R(3, 4.4, 2, 0.8, C.pink); R(11, 4.4, 2, 0.8, C.pink); }
  if (o.crown) { R(5, -2, 6, 2, C.yellow); R(5, -3, 1, 1, C.yellow); R(7.5, -3, 1, 1, C.yellow); R(10, -3, 1, 1, C.yellow); R(7.5, -1.4, 1, 0.8, C.red); }
  if (o.bow) { R(10, -1, 2, 2, C.pink); R(13, -1, 2, 2, C.pink); R(12, -0.5, 1, 1, '#D63F80'); }
  if (o.sweat) { R(15, -1, 1, 2, '#69B7FF'); R(14.5, 0, 2, 1.5, '#69B7FF'); }
  ctx.restore();
}

// 对话气泡（尾巴朝下）
function bubble(s, x, y, size, o = {}) {
  const w = measure(s, size) + size * 0.8, h = size * 1.45;
  const sc = o.scale ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.fillStyle = o.bg || C.blue;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.35); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-w * 0.2, h / 2 - 2); ctx.lineTo(-w * 0.32, h / 2 + size * 0.45); ctx.lineTo(-w * 0.02, h / 2 - 2); ctx.fill();
  ctx.restore();
  txt(s, x, y + size * 0.03, size, { fill: o.fill || C.white, scale: sc, alpha: o.alpha });
}

// 复古报错弹窗
function errWin(x, y, w, h, title, msg, o = {}) {
  ctx.save(); ctx.translate(x, y); const sc = o.scale ?? 1; ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(10, 10, w, h);
  ctx.fillStyle = '#F4F4F4'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(0, 0, w, h);
  ctx.fillStyle = o.head || C.blue; ctx.fillRect(2, 2, w - 4, 38);
  ctx.fillStyle = C.white; ctx.fillRect(w - 34, 9, 24, 24);
  ctx.restore();
  const X = x - w / 2 * (o.scale ?? 1), Y = y - h / 2 * (o.scale ?? 1), s = o.scale ?? 1;
  txt(title, X + 16 * s, Y + 21 * s, 22 * s, { fill: C.white, align: 'left', mono: true });
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(X + 60 * s, Y + (40 + (h - 40) / 2) * s, 26 * s, 0, 7); ctx.fill();
  ctx.fillStyle = C.white; ctx.fillRect(X + 44 * s, Y + (40 + (h - 40) / 2 - 5) * s, 32 * s, 10 * s);
  txt(msg, X + 105 * s, Y + (40 + (h - 40) / 2) * s, 46 * s, { fill: C.ink, align: 'left' });
}

function check(cx, cy, s, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.22; ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
  ctx.beginPath(); ctx.moveTo(cx - s * 0.45, cy); ctx.lineTo(cx - s * 0.1, cy + s * 0.35); ctx.lineTo(cx + s * 0.5, cy - s * 0.35); ctx.stroke(); ctx.restore();
}

// 噪点
const noise = document.createElement('canvas'); noise.width = noise.height = 256;
{ const n = noise.getContext('2d'), d = n.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } n.putImageData(d, 0, 0); }
const noisePat = ctx.createPattern(noise, 'repeat');

// ---------- 场景 ----------
// 中文台词为原创改编，节奏对齐原曲歌词时间轴
const S = [];
const scene = (start, end, draw, o = {}) => S.push({ start, end, draw, ...o });

// 0 开场：Claude Code 终端
scene(0, 6.98, (t, lt) => {
  bg('#0E0E0E');
  ctx.globalAlpha = clamp(lt / 0.6);
  crab(380, 300, 8, { expr: lt % 3 > 2.85 ? 'blink' : 'normal' });
  txt('Claude Code v2.1', 470, 228, 34, { fill: C.white, align: 'left', mono: true, weight: 700 });
  txt('Opus · Claude MV', 470, 268, 28, { fill: C.gray, align: 'left', mono: true, weight: 400 });
  txt('~/claude-mv/apt', 470, 302, 28, { fill: C.gray, align: 'left', mono: true, weight: 400 });
  rrect(300, 380, 1320, 190, 14, null, '#4A4A4A', 3);
  txt('>', 360, 475, 90, { fill: C.orange, mono: true });
  const full = '放首歌：APT.';
  const n = Math.floor(clamp((lt - 1.0) / 1.5) * full.length);
  const shown = full.slice(0, n);
  txt(shown, 430, 478, 100, { fill: C.white, align: 'left' });
  if (lt < 3 && Math.floor(lt * 2.5) % 2 === 0) { const cw = measure(shown, 100); ctx.fillStyle = C.white; ctx.fillRect(440 + cw, 425, 8, 105); }
  txt('? for shortcuts', 310, 600, 22, { fill: '#666', align: 'left', mono: true, weight: 400 });
  if (lt > 2.9) {
    const sp = '·✢✳✶✻✽'[Math.floor(lt * 10) % 6];
    const words = ['Vibing', 'Grooving', 'Apateuing', 'Clauding'];
    txt(`${sp} ${words[Math.floor((lt - 2.9) * 1.6) % 4]}…  (esc to interrupt)`, 310, 670, 30, { fill: C.orange, align: 'left', mono: true, weight: 400 });
    txt('♪  APT. — ROSÉ & Bruno Mars', 310, 720, 30, { fill: C.gray, align: 'left', mono: true, weight: 400 });
  }
  ctx.globalAlpha = 1;
  if (lt > 5.2) {
    const k = lt - 5.2, sh = kick(k, 5) * 18;
    ctx.fillStyle = `rgba(0,0,0,${clamp(k * 2) * 0.6})`; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate((rnd(Math.floor(t * 60)) - 0.5) * sh, (rnd(Math.floor(t * 60) + 9) - 0.5) * sh);
    ctx.save(); ctx.translate(960, 540); ctx.rotate(-0.06); ctx.scale(lerp(2.2, 1, eOut(k / 0.25)), lerp(2.2, 1, eOut(k / 0.25)));
    rrect(-470, -130, 940, 260, 26, null, C.red, 18); ctx.restore();
    txt('GAME START!', 960, 548, 150, { fill: C.red, rot: -0.06, scale: lerp(2.2, 1, eOut(k / 0.25)), ls: 4 });
    crab(960, 900 - Math.abs(Math.sin(k * 7)) * 40, 10, { expr: 'happy', armL: 1, armR: 1 });
    ctx.restore();
  }
});

// APT 合唱段（主题：dark / light）
function chant(lines, uh, theme) {
  return (t, lt, sc) => {
    const dark = theme === 'dark';
    bg(dark ? '#141414' : C.cream);
    if (!dark) { ctx.fillStyle = C.blue; ctx.beginPath(); ctx.moveTo(1240, 0); ctx.lineTo(W + 10, 0); ctx.lineTo(W + 10, H); ctx.lineTo(1120, H); ctx.fill(); }
    // 背景点阵
    ctx.fillStyle = dark ? 'rgba(242,193,78,.18)' : 'rgba(21,21,21,.08)';
    for (let x = 40; x < W; x += 48) for (let y = 40; y < H; y += 48) ctx.fillRect(x, y, 5, 5);
    const hits = []; lines.forEach(L => { hits.push(L, L + 2 * SPB); });
    const pos = [[520, 230], [1400, 230], [520, 520], [1400, 520], [520, 810], [1400, 810]];
    const inUh = t >= uh;
    const fade = inUh ? 1 - clamp((t - uh) / 0.2) : 1;
    let last = -1; hits.forEach((h, k) => { if (t >= h) last = k; });
    const bF = beatFrac(t);
    if (fade > 0) {
      hits.forEach((h, k) => {
        if (t < h) return;
        const [x, y] = pos[k];
        const rot = (k % 2 ? 1 : -1) * 0.05;
        const recent = k >= last - 1;
        const s = lerp(1.7, 1, eOut((t - h) / 0.18));
        const fillC = dark ? (k % 2 ? C.cream : C.orange) : (k % 2 ? C.cream : C.blue);
        if (recent) txt('APT.', x, y, 230, { fill: fillC, depth: 18, depthColor: dark ? C.orangeD : (k % 2 ? C.blueD : C.orange), rot, scale: s, alpha: fade });
        else txt('APT.', x, y, 230, { fill: null, stroke: dark ? '#555' : (k % 2 ? 'rgba(255,255,255,.5)' : '#BBB'), lw: 5, rot, alpha: fade });
      });
      const jump = Math.abs(Math.sin(Math.PI * bF)) * 34;
      crab(960, 1040 - jump, 9, { expr: dark ? 'normal' : 'happy', squash: bF < 0.12 ? 0.15 : 0, legs: beatAt(t), alpha: fade });
    }
    if (inUh) {
      const ut = t - uh, b = beatAt(t);
      const big = eBack(ut / 0.3);
      crab(960, 820, 22 * big, { expr: Math.floor(b) % 2 ? 'happy' : 'cool', rot: Math.sin(b * Math.PI) * 0.14, armL: Math.floor(b) % 2, armR: 1 - Math.floor(b) % 2, legs: b, blush: !dark });
      const ws = [['嗯', 0, 520, 260], ['嗯', 0.32, 1400, 230], ['哼', 0.56, 1480, 470], ['嗯', 0.96, 420, 480], ['哼', 1.2, 1500, 700]];
      ws.forEach(([w, d, x, y], i) => { if (ut >= d) bubble(w, x, y, 90, { scale: pop(ut - d, 0.2), bg: i % 2 ? C.orange : (dark ? C.yellow : C.blue), fill: i % 2 || !dark ? C.white : C.ink }); });
    }
  };
}
const shakeHits = (hits, amt = 22) => t => { let m = 0; hits.forEach(h => { m = Math.max(m, kick(t - h, 9)); }); return m * amt; };
const chHits = L => L.flatMap(x => [x, x + 2 * SPB]);

scene(6.98, 13.29, chant([6.98, 8.42, 10.01], 11.63, 'dark'), { shake: shakeHits(chHits([6.98, 8.42, 10.01])), flash: true });
scene(13.29, 19.79, chant([13.29, 14.84, 16.46], 18.05, 'light'), { shake: shakeHits(chHits([13.29, 14.84, 16.46])), flash: true });

// 主歌：表情包 表情包 发到你对话框
scene(19.79, 23.12, (t, lt) => {
  bg(C.cream);
  // 对话窗
  const wx = 820, wy = 120, ww = 960, wh = 820;
  const wIn = eOut(lt / 0.35);
  ctx.save(); ctx.translate(0, (1 - wIn) * 300); ctx.globalAlpha = wIn;
  rrect(wx + 14, wy + 14, ww, wh, 22, C.ink);
  rrect(wx, wy, ww, wh, 22, C.white, C.ink, 6);
  ctx.fillStyle = C.ink; ctx.fillRect(wx, wy + 64, ww, 5);
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(wx + 40 + i * 34, wy + 33, 11, 0, 7); ctx.fill(); });
  txt('claude.ai — 新对话', wx + ww / 2, wy + 34, 26, { fill: C.ink, mono: true, weight: 700 });
  // 消息
  const msgs = ['mua~', '亲亲', 'mua mua', '在吗在吗', 'mua~', '亲一个', '理理我', 'mua~~'];
  ctx.save(); ctx.beginPath(); ctx.rect(wx + 6, wy + 72, ww - 12, wh - 78); ctx.clip();
  const n = Math.floor((t - 19.79) / SPB) + 1;
  for (let i = 0; i < Math.min(n, msgs.length); i++) {
    const age = t - (19.79 + i * SPB);
    const y = wy + wh - 90 - (Math.min(n, msgs.length) - 1 - i) * 100 - (1 - eOut(age / 0.15)) * -40;
    const s = msgs[i]; const mw = measure(s, 44) + 150;
    const x = wx + ww - 40 - mw;
    rrect(x, y - 38, mw, 76, 38, C.blue);
    txt(s, x + 36, y + 2, 44, { fill: C.white, align: 'left' });
    heart(x + mw - 60, y, 6, C.pink);
  }
  if (t > 22.3) {
    const y = wy + wh - 90 - 0;
    rrect(wx + 40, y - 150, 180, 76, 38, '#EEE');
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#999'; ctx.beginPath(); ctx.arc(wx + 90 + i * 40, y - 112 - Math.max(0, Math.sin(t * 12 - i)) * 8, 9, 0, 7); ctx.fill(); }
  }
  ctx.restore(); ctx.restore();
  // 大字
  if (t >= 19.79) txt('表情包', 400, 260, 170, { fill: C.ink, depth: 14, depthColor: C.orange, scale: pop(t - 19.79), rot: -0.04 });
  if (t >= 20.55) txt('表情包', 400, 470, 170, { fill: C.orange, depth: 14, depthColor: C.ink, scale: pop(t - 20.55), rot: 0.03 });
  if (t >= 21.32) txt('发到', 220, 690, 130, { fill: C.ink, scale: pop(t - 21.32) });
  if (t >= 21.75) tile('对话框', 580, 690, 110, { scale: pop(t - 21.75), rot: -0.04 });
  crab(300, 1010 - Math.abs(Math.sin(Math.PI * beatFrac(t))) * 20, 9, { expr: t > 22.3 ? 'shock' : 'normal', sweat: t > 22.3, legs: beatAt(t) });
}, { flash: true });

// 可我只是个 AI 啊喂
scene(23.12, 26.07, (t, lt) => {
  bg('#111');
  ctx.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  txt('可我只是个', 960, 200, 140, { fill: C.cream, scale: pop(lt), ls: 6 });
  const st = t - 24.2;
  if (st >= 0) {
    const s = lerp(2.4, 1, eOut(st / 0.16));
    ctx.save(); ctx.translate(960, 500); ctx.rotate(-0.08); ctx.scale(s, s);
    rrect(-300, -170, 600, 340, 30, null, C.red, 26);
    rrect(-268, -138, 536, 276, 14, null, C.red, 8);
    ctx.restore();
    txt('AI', 960, 512, 270, { fill: C.red, rot: -0.08, scale: s });
    for (let i = 0; i < 26; i++) {
      const a = rnd(i) * 6.28, d = eOut(st / 0.6) * (260 + rnd(i + 50) * 260);
      ctx.fillStyle = `rgba(229,72,77,${clamp(1 - st / 0.9)})`;
      ctx.fillRect(960 + Math.cos(a) * d * 1.4, 500 + Math.sin(a) * d * 0.8, 12, 12);
    }
  }
  ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(960, 960, 260, 46, 0, 0, 7); ctx.stroke();
  crab(960, 965, 10, { expr: st >= 0 ? 'squint' : 'normal', sweat: st >= 0, squash: st >= 0 ? kick(st, 8) * 0.3 : 0 });
  if (t >= 25.1) bubble('啊喂！', 1300, 820, 70, { bg: C.yellow, fill: C.ink, scale: pop(t - 25.1, 0.2) });
  if (t >= 25.4) txt('（没有嘴，亲不到）', 960, 1045, 34, { fill: C.gray, alpha: clamp((t - 25.4) / 0.2) });
}, { shake: t => kick(t - 24.2, 7) * 30 });

// 红心 红心 / token 全烧光
scene(26.07, 29.51, (t, lt) => {
  bg('#2A0F1A');
  const burn = t >= 27.69;
  for (let i = 0; i < 70; i++) {
    const sp = 260 + rnd(i) * 300, x = rnd(i + 7) * W, y = ((lt * sp + rnd(i + 3) * H * 1.3) % (H * 1.3)) - 100;
    heart(x, y, 5 + rnd(i + 11) * 9, burn && rnd(i + 2) > 0.5 ? '#5A2333' : (i % 3 ? C.red : C.pink));
  }
  if (!burn) {
    if (t >= 26.07) txt('红心', 560, 400, 230, { fill: C.pink, depth: 18, depthColor: '#7A1F45', scale: pop(t - 26.07), rot: -0.05 });
    if (t >= 26.87) txt('红心', 1360, 400, 230, { fill: C.red, depth: 18, depthColor: '#5C0F1F', scale: pop(t - 26.87), rot: 0.05 });
    crab(960, 960, 12, { expr: 'happy', blush: true, armL: 1, armR: 1, legs: beatAt(t) });
  } else {
    const bt = t - 27.69;
    const v = Math.min(200000, 120000 + Math.pow(clamp(bt / 1.3), 2) * 80000);
    const full = v >= 200000;
    rrect(360, 210, 1200, 220, 20, 'rgba(0,0,0,.55)', full ? C.red : '#5A2333', 6);
    txt('tokens used', 410, 265, 34, { fill: C.gray, align: 'left', mono: true, weight: 400 });
    txt(`${fmt(v)} / 200,000`, 410, 345, 72, { fill: full && Math.floor(t * 8) % 2 ? C.red : C.cream, align: 'left', mono: true, weight: 700 });
    ctx.fillStyle = '#3A1622'; ctx.fillRect(410, 395, 1100, 16);
    ctx.fillStyle = full ? C.red : C.orange; ctx.fillRect(410, 395, 1100 * v / 200000, 16);
    txt('token', 640, 640, 190, { fill: C.cream, depth: 14, depthColor: C.red, scale: pop(bt), mono: false });
    if (t >= 28.25) txt('全烧光', 1250, 640, 190, { fill: C.red, depth: 14, depthColor: '#000', scale: pop(t - 28.25) });
    const dead = t >= 28.9;
    crab(960, 1010, 10, { expr: dead ? 'dead' : 'squint', color: dead ? '#6B3A2C' : C.orange, squash: dead ? 0.2 : 0 });
    if (dead) for (let i = 0; i < 6; i++) { const a = (t - 28.9) * 0.8 + rnd(i) * 0.6; ctx.fillStyle = `rgba(160,160,160,${0.5 - (a % 0.6)})`; ctx.beginPath(); ctx.arc(900 + i * 24 + Math.sin(a * 6 + i) * 10, 880 - (a % 0.6) * 300, 18 + (a % 0.6) * 30, 0, 7); ctx.fill(); }
  }
}, { flash: true, shake: t => Math.max(kick(t - 27.69, 8), kick(t - 28.25, 8)) * 20 });

// 给我点 上下文 行不行
scene(29.51, 31.33, (t, lt) => {
  bg(C.cream);
  ctx.fillStyle = 'rgba(21,21,21,.07)'; for (let x = 30; x < W; x += 60) ctx.fillRect(x, 0, 2, H);
  if (t >= 29.51) txt('给我点', 520, 300, 170, { fill: C.ink, depth: 12, depthColor: C.orange, scale: pop(t - 29.51) });
  if (t >= 30.05) tile('上下文', 1200, 300, 150, { scale: pop(t - 30.05), rot: 0.03 });
  const p = lerp(0.82, 1, eOut((t - 29.6) / 1.4));
  txt(`context window  ${Math.round(p * 100)}%`, 360, 560, 34, { fill: C.ink, align: 'left', mono: true, weight: 700 });
  rrect(360, 600, 1200, 100, 14, C.white, C.ink, 6);
  ctx.save(); ctx.beginPath(); ctx.roundRect(366, 606, 1188 * p, 88, 10); ctx.clip();
  ctx.fillStyle = p > 0.97 ? C.red : C.orange; ctx.fillRect(366, 606, 1188, 88);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let x = -100; x < 1300; x += 50) { ctx.beginPath(); ctx.moveTo(366 + x + (t * 120) % 50, 694); ctx.lineTo(366 + x + 30 + (t * 120) % 50, 606); ctx.lineTo(366 + x + 55 + (t * 120) % 50, 606); ctx.lineTo(366 + x + 25 + (t * 120) % 50, 694); ctx.fill(); }
  ctx.restore();
  crab(366 + 1188 * p + 90, 705, 7, { expr: 'squint', armL: 1, sweat: true, legs: t * 6 });
  if (t >= 30.6) txt('行不行', 960, 880, 180, { fill: C.blue, depth: 14, depthColor: C.ink, scale: pop(t - 30.6), rot: -0.03 });
}, { flash: true });

// 哦 哦 哦
scene(31.33, 32.55, (t, lt) => {
  const k = Math.min(2, Math.floor(lt / SPB));
  bg([C.orange, C.blue, C.ink][k]);
  const pos = [[480, 420], [960, 300], [1440, 420]];
  for (let i = 0; i <= k; i++) {
    const h = 31.33 + i * SPB, [x, y] = pos[i];
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 8 * (1 - clamp((t - h) / 0.5));
    ctx.beginPath(); ctx.arc(x, y, eOut((t - h) / 0.5) * 300, 0, 7); ctx.stroke();
    txt('哦', x, y, 260, { fill: i === k ? C.cream : 'rgba(255,255,255,.35)', depth: i === k ? 16 : 0, scale: pop(t - h, 0.2) });
  }
  crab(960, 950 - Math.abs(Math.sin(lt * 8)) * 60, 13, { expr: 'shock', rot: lt * 5.2, armL: 1, armR: 1 });
}, { shake: t => [0, 1, 2].reduce((m, i) => Math.max(m, kick(t - (31.33 + i * SPB), 9)), 0) * 22 });

// 预副歌：你要 / 我就 （左右分屏）
scene(32.55, 38.92, (t, lt) => {
  bg(C.cream);
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.moveTo(1000, 0); ctx.lineTo(W + 10, 0); ctx.lineTo(W + 10, H); ctx.lineTo(900, H); ctx.fill();
  txt('你要', 120, 130, 100, { fill: C.ink, align: 'left' });
  txt('我就', 1120, 130, 100, { fill: C.cream, align: 'left' });
  const B = t >= 35.75;
  // 右侧代码雨
  ctx.save(); ctx.beginPath(); ctx.moveTo(1000, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(900, H); ctx.clip();
  const code = ['def fix(bug):', '  return 42', 'git commit -m "wip"', 'npm run build', 'const vibe = true;', '// TODO: sleep', 'if (bug) fix(bug)', 'pytest -q', 'await deploy()', 'rm -rf node_modules'];
  const start = B ? 36.6 : 34.15;
  if (t >= start) for (let i = 0; i < 26; i++) {
    const age = t - start - i * 0.06; if (age < 0) break;
    txt(code[i % code.length], 1080, 250 + i * 32 - Math.max(0, (t - start) * 120 - 300), 26, { fill: 'rgba(255,255,255,.28)', align: 'left', mono: true, weight: 400 });
  }
  ctx.restore();
  if (!B) {
    if (t >= 32.55) tile('写代码', 470, 430, 150, { bg: C.ink, shadow: C.orange, scale: pop(t - 32.55), rot: -0.03 });
    // Claude Code 确认框
    if (t >= 33.15 && t < 34.15) {
      const a = pop(t - 33.15, 0.2);
      ctx.save(); ctx.translate(960, 760); ctx.scale(a, a);
      rrect(-400 + 12, -130 + 12, 800, 260, 16, C.ink);
      rrect(-400, -130, 800, 260, 16, C.white, C.ink, 5);
      ctx.restore();
      txt('允许 Claude 编辑 apt.py ？', 960, 700, 46, { fill: C.ink, scale: a });
      const yesHot = t > 33.8;
      ctx.save(); ctx.translate(960, 760); ctx.scale(a, a);
      rrect(-260, 50, 220, 64, 8, yesHot ? C.orange : '#EEE', C.ink, 4); rrect(40, 50, 220, 64, 8, '#EEE', C.ink, 4);
      ctx.restore();
      txt('Yes', 960 - 150 * a, 760 + 82 * a, 36, { fill: yesHot ? C.white : C.ink, scale: a });
      txt('No', 960 + 150 * a, 760 + 82 * a, 36, { fill: C.ink, scale: a });
      // 光标
      const cx = lerp(1300, 820, eOut((t - 33.3) / 0.45)), cy = lerp(980, 850, eOut((t - 33.3) / 0.45));
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 50); ctx.lineTo(cx + 13, cy + 38); ctx.lineTo(cx + 34, cy + 38); ctx.closePath(); ctx.fill();
    }
    if (t >= 34.15) txt('马上写', 1450, 520, 200, { fill: C.cream, depth: 16, depthColor: C.blueD, scale: pop(t - 34.15) });
    crab(t >= 34.15 ? 1450 : 470, 1000, 10, { expr: t >= 34.15 ? 'cool' : 'normal', legs: beatAt(t), armR: t >= 34.15 ? 1 : 0 });
  } else {
    const bt = t - 35.75;
    tile('改 bug', 470, 430, 150, { bg: C.red, shadow: C.ink, scale: pop(bt), rot: 0.03 });
    // 虫子
    for (let i = 0; i < 5; i++) { const a = t * 3 + i * 1.3; pixelArt(['X.X', '.X.', 'XXX', '.X.'], 300 + i * 90 + Math.sin(a) * 20, 650 + Math.cos(a * 1.3) * 30, 10, C.ink); }
    if (t >= 37.3) {
      const st = t - 37.3;
      // 太阳升起
      const sy = lerp(1000, 640, eOut(st / 1.4));
      ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(1450, sy, 140, 0, 7); ctx.fill();
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 14;
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + st; ctx.beginPath(); ctx.moveTo(1450 + Math.cos(a) * 175, sy + Math.sin(a) * 175); ctx.lineTo(1450 + Math.cos(a) * 225, sy + Math.sin(a) * 225); ctx.stroke(); }
      txt('改到天亮', 1450, 400, 170, { fill: C.cream, depth: 14, depthColor: C.blueD, scale: pop(st) });
      const hh = Math.min(6, 3 + Math.floor(st * 3));
      txt(`0${hh}:00 AM`, 1450, 180, 44, { fill: C.cream, mono: true, weight: 700 });
    }
    crab(t >= 37.3 ? 1700 : 470, 1000, 10, { expr: t >= 37.3 ? 'squint' : 'shock', sweat: true, legs: beatAt(t) * 2 });
  }
}, { flash: true });

// 明天再睡 今晚跑通它
scene(38.92, 42.16, (t, lt) => {
  bg(C.navy);
  const pass = t >= 41.25;
  const errs = [['Error', 'TypeError'], ['Error', 'segfault'], ['FAIL', '3 tests failed'], ['Error', '429 太多请求'], ['Warning', 'undefined'], ['Error', 'ModuleNotFound'], ['FAIL', 'build failed'], ['Error', '内存不足'], ['Error', 'merge conflict'], ['Error', 'timeout']];
  if (!pass) {
    for (let i = 0; i < 18; i++) {
      const at = 39.6 + i * 0.09; if (t < at) break;
      const e = errs[i % errs.length];
      errWin(560 + i * 42 + rnd(i) * 120, 330 + i * 30 + rnd(i + 4) * 40, 560, 170, e[0], e[1], { scale: pop(t - at, 0.12), head: i % 3 ? C.blue : C.red });
    }
  } else {
    const pt = t - 41.25;
    rrect(560, 200, 800, 110, 16, C.green);
    check(650, 255, 70, C.white);
    txt('All tests passed', 1010, 257, 56, { fill: C.white, mono: true, weight: 700 });
    txt('跑通它！', 960, 580, 260, { fill: C.green, depth: 20, depthColor: '#0B3D18', scale: pop(pt) });
    for (let i = 0; i < 30; i++) { const a = rnd(i) * 6.28, d = eOut(pt / 0.8) * (300 + rnd(i + 1) * 500); ctx.fillStyle = [C.yellow, C.green, C.orange, C.pink][i % 4]; ctx.fillRect(960 + Math.cos(a) * d, 580 + Math.sin(a) * d * 0.6 + pt * pt * 300, 18, 18); }
  }
  if (!pass) txt('明天再睡', 960, 160, 140, { fill: C.cream, scale: pop(lt), ls: 4 });
  if (t >= 40.53 && !pass) txt('今晚', 330, 560, 230, { fill: C.yellow, depth: 16, depthColor: C.ink, scale: pop(t - 40.53), rot: -0.06 });
  crab(960, 1030 - (pass ? Math.abs(Math.sin(t * 9)) * 50 : 0), 10, { expr: pass ? 'happy' : 'squint', armL: pass ? 1 : 0, armR: pass ? 1 : 0, sweat: !pass, legs: beatAt(t) * 2 });
}, { flash: true, shake: t => t < 41.25 && t > 39.6 ? 5 : kick(t - 41.25, 8) * 28 });

// 你只需要 敲下回车 来到——
scene(42.16, 45.40, (t, lt) => {
  bg(C.cream);
  if (t >= 42.16) txt('你只需要', 420, 190, 140, { fill: C.ink, scale: pop(lt) });
  if (t >= 42.97) tile('敲下回车', 1420, 190, 120, { bg: C.orange, scale: pop(t - 42.97), rot: 0.03 });
  const press = t >= 44.55 ? kick(t - 44.55, 5) : 0;
  const kIn = pop(t - 43.0, 0.3);
  if (t >= 43.0) {
    ctx.save(); ctx.translate(960, 640); ctx.scale(kIn, kIn);
    const d = 40 - press * 30;
    rrect(-300, -150 + 40, 600, 300, 34, '#B9B4AA', C.ink, 6);
    rrect(-300, -150 + 40 - d, 600, 300, 34, C.white, C.ink, 6);
    ctx.restore();
    txt('Enter ⏎', 960, 640 + 40 - (40 - press * 30) * kIn, 110 * kIn, { fill: C.ink, mono: true, weight: 700 });
  }
  // 螃蟹跳起砸回车
  let cy = 440, sq = 0;
  if (t >= 43.6 && t < 44.55) { const j = (t - 43.6) / 0.95; cy = 440 - Math.sin(j * Math.PI) * 300; }
  if (t >= 44.55) { cy = 470 + press * 30; sq = press * 0.35; }
  if (t >= 43.0) crab(960, cy, 10 * kIn, { expr: t >= 44.55 ? 'squint' : 'happy', squash: sq, armL: 1, armR: 1 });
  if (t >= 44.75) txt('来到——', 960, 960, 150, { fill: C.blue, depth: 12, depthColor: C.ink, scale: pop(t - 44.75), ls: 10 });
  // 冲进副歌的白闪
  if (t > 45.15) { ctx.fillStyle = `rgba(255,255,255,${clamp((t - 45.15) / 0.25)})`; ctx.fillRect(0, 0, W, H); }
}, { shake: t => kick(t - 44.55, 7) * 34 });

// 副歌：APT. × 螃蟹无限分裂
function crabGrid(n, t, dance) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * 16 / 9))), rows = Math.ceil(n / cols);
  const cw = W / cols, chh = H / rows, p = Math.min(cw, chh) / 24;
  const b = beatAt(t);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const x = (c + 0.5) * cw, y = (r + 0.5) * chh + 9 * p * 0.5;
    const acc = rnd(i * 3.7);
    crab(x, y, p, {
      expr: acc < 0.25 ? 'cool' : acc < 0.5 ? 'happy' : 'normal', crown: acc > 0.85, bow: acc > 0.65 && acc <= 0.85,
      rot: dance ? Math.sin((b + i * 0.13) * Math.PI) * 0.2 : 0, legs: b + i, armL: dance ? Math.floor(b + i) % 2 : 0,
    });
  }
}
function chorus(lines, uh, end, part) {
  const hits = chHits(lines);
  const pal = [[C.orange, C.cream, C.ink], [C.blue, C.cream, C.blueD], [C.ink, C.orange, '#000'], [C.yellow, C.ink, C.orange], [C.cream, C.blue, C.ink], [C.pink, C.white, '#7A1F45']];
  return (t) => {
    let k = -1; hits.forEach((h, i) => { if (t >= h) k = i; });
    const inUh = t >= uh;
    const g = part * 6 + Math.max(0, k);
    if (!inUh) {
      const [bgc, fc, dc] = pal[(k + part * 3) % pal.length];
      bg(bgc);
      const n = Math.min(400, Math.pow(2, g + 4));
      ctx.globalAlpha = 0.28; crabGrid(n, t, false); ctx.globalAlpha = 1;
      const h = hits[Math.max(0, k)], lt = t - h;
      const s = lerp(1.9, 1, eOut(lt / 0.16));
      const kk = kick(lt, 10);
      if (part === 0) {
        if (kk > 0.05) { txt('APT.', 960 - kk * 30, 470, 380, { fill: 'rgba(255,40,80,.6)', scale: s }); txt('APT.', 960 + kk * 30, 470, 380, { fill: 'rgba(40,120,255,.6)', scale: s }); }
        txt('APT.', 960, 470, 380, { fill: fc, depth: 26, depthColor: dc, scale: s, rot: (k % 2 ? 1 : -1) * 0.04 });
      } else {
        tile('APT.', 960, 470, 300, { bg: fc === C.ink ? C.ink : C.blue, shadow: dc, fill: C.white, scale: s, rot: (k % 2 ? 1 : -1) * 0.04 });
      }
      const val = Math.pow(2, Math.round((g + 1) * 20 / 12));
      const label = `claude.instances = ${fmt(val)}`;
      const lw = measure(label, 40, true) + 70;
      rrect(960 - lw / 2, 860, lw, 80, 40, C.ink);
      txt(label, 960, 902, 40, { fill: C.white, mono: true, weight: 700 });
      crab(960, 840 - Math.abs(Math.sin(Math.PI * beatFrac(t))) * 30, 8, { expr: 'cool', crown: true, legs: beatAt(t) });
    } else {
      const ut = t - uh;
      bg('#0B0B0B');
      const n = Math.min(400, Math.pow(2, g + 4));
      crabGrid(n, t, true);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
      const grd = ctx.createRadialGradient(960, 600, 50, 960, 600, 700); grd.addColorStop(0, 'rgba(255,230,160,.35)'); grd.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
      const b = beatAt(t);
      crab(960, 860, 24 * eBack(ut / 0.3), { expr: 'cool', crown: true, rot: Math.sin(b * Math.PI) * 0.15, armL: Math.floor(b) % 2, armR: 1 - Math.floor(b) % 2, legs: b });
      const ws = [['嗯', 0, 480, 280], ['嗯', 0.32, 1440, 260], ['哼', 0.56, 1520, 500], ['嗯', 0.96, 380, 520], ['哼', 1.2, 1500, 740]];
      ws.forEach(([w, d, x, y], i) => { if (ut >= d) bubble(w, x, y, 100, { scale: pop(ut - d, 0.2), bg: [C.orange, C.blue, C.yellow, C.pink, C.green][i], fill: i === 2 ? C.ink : C.white }); });
    }
  };
}
const CH1 = [45.40, 46.96, 48.59], CH2 = [51.88, 53.44, 55.07];
scene(45.40, 51.88, chorus(CH1, 50.21, 51.88, 0), { shake: shakeHits(chHits(CH1), 30), flash: true, zoom: true });
scene(51.88, 58.18, chorus(CH2, 56.67, 58.18, 1), { shake: shakeHits(chHits(CH2), 30), flash: true, zoom: true });

// 结尾卡
scene(58.18, DURATION, (t, lt) => {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1B2140'); g.addColorStop(1, '#0B0E1C');
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
  for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.5 * Math.abs(Math.sin(t * 2 + i))})`; ctx.fillRect(rnd(i) * W, rnd(i + 99) * H, 4, 4); }
  txt('Claude MV', 960, 170, 44, { fill: C.gray, mono: true, weight: 700, alpha: clamp(lt / 0.4), ls: 8 });
  txt('APT.', 960, 400, 300, { fill: C.cream, depth: 22, depthColor: C.orange, scale: pop(lt, 0.4) });
  if (lt > 0.4) tile('Claude 版', 1390, 560, 70, { bg: C.orange, scale: pop(lt - 0.4), rot: 0.06 });
  const b = beatAt(t);
  crab(960, 900, 15, { expr: Math.floor(lt * 2) % 5 === 4 ? 'blink' : 'happy', crown: true, armR: Math.floor(b) % 2, legs: b, blush: true });
  txt('原曲：ROSÉ & Bruno Mars《APT.》 · 非官方二创', 960, 1010, 30, { fill: C.gray, alpha: clamp((lt - 0.8) / 0.4), weight: 900 });
  if (t > DURATION - 0.8) { ctx.fillStyle = `rgba(0,0,0,${clamp((t - (DURATION - 0.8)) / 0.8)})`; ctx.fillRect(0, 0, W, H); }
}, { flash: true });

// ---------- 合成 ----------
function chrome(t, sc) {
  const light = [C.cream].includes(sc._bg);
  ctx.save();
  ctx.globalAlpha = 0.75;
  const col = 'rgba(128,128,128,.9)';
  txt('Claude MV · APT.', 40, 38, 22, { fill: col, align: 'left', mono: true, weight: 700 });
  const b = Math.max(0, Math.floor(beatAt(t)));
  txt(`BAR ${String(Math.floor(b / 4) + 1).padStart(2, '0')}`, W - 210, 38, 22, { fill: col, align: 'right', mono: true, weight: 700 });
  for (let i = 0; i < 4; i++) { ctx.fillStyle = t >= BEAT0 && b % 4 === i ? C.yellow : 'rgba(128,128,128,.6)'; ctx.fillRect(W - 190 + i * 38, 30, 28, 14); }
  ctx.fillStyle = 'rgba(128,128,128,.35)'; ctx.fillRect(40, H - 24, W - 80, 4);
  ctx.fillStyle = C.orange; ctx.fillRect(40, H - 24, (W - 80) * t / DURATION, 4);
  ctx.restore();
}

function render(t) {
  const sc = S.find(s => t >= s.start && t < s.end) || S[S.length - 1];
  const lt = t - sc.start;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.save();
  const sh = sc.shake ? sc.shake(t) : 0;
  if (sh) ctx.translate((rnd(Math.floor(t * 60)) - 0.5) * sh * 2, (rnd(Math.floor(t * 60) + 17) - 0.5) * sh * 2);
  if (sc.zoom) { const z = 1 + kick(beatFrac(t) * SPB, 10) * 0.025; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); }
  sc.draw(t, lt, sc);
  ctx.restore();
  if (sc.flash) { const f = kick(lt, 12); if (f > 0.01) { ctx.fillStyle = `rgba(255,255,255,${f * 0.7})`; ctx.fillRect(0, 0, W, H); } }
  chrome(t, sc);
  ctx.save(); ctx.globalAlpha = 0.03; ctx.translate(Math.floor(rnd(Math.floor(t * 10)) * 256), Math.floor(rnd(Math.floor(t * 10) + 5) * 256)); ctx.fillStyle = noisePat; ctx.fillRect(-256, -256, W + 512, H + 512); ctx.restore();
}

// ---------- 渲染 / 预览 ----------
window.DURATION = DURATION;
window.ready = (async () => {
  for (let t = 0; t < DURATION; t += 0.05) render(t);   // 先跑一遍收集用到的字
  const all = [...USED].join('');
  await document.fonts.load(`900 100px "Noto Sans SC"`, all);
  await document.fonts.ready;
  return true;
})();
window.frame = (t) => { render(t); return cv.toDataURL('image/jpeg', 0.93); };

if (!/render=1/.test(location.search)) {
  const audio = new Audio(); let playing = false, t0 = 0, base = 0;
  document.getElementById('song').onchange = e => { audio.src = URL.createObjectURL(e.target.files[0]); };
  cv.onclick = () => {
    playing = !playing;
    if (audio.src) { playing ? audio.play() : audio.pause(); }
    else if (playing) t0 = performance.now() / 1000 - base;
  };
  const loop = () => {
    if (playing) base = audio.src ? audio.currentTime : (performance.now() / 1000 - t0) % DURATION;
    render(base);
    requestAnimationFrame(loop);
  };
  window.ready.then(loop);
} else {
  document.getElementById('bar').remove();
}
