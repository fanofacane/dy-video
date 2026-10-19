// Claude MV ·《APT.》—— 歌词从 APT_.lrc 读取，画面按每句歌词的意思来演（视频 0s = 歌曲 0s）
const W = 1920, H = 1080;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const C = {
  orange: '#D97757', orangeD: '#A9533A', blue: '#2F5BEA', blueD: '#1A3594',
  cream: '#EEEBE4', ink: '#151515', yellow: '#F2C14E', red: '#E5484D',
  pink: '#FF5FA2', green: '#3FB950', navy: '#12162B', gray: '#8A8680', white: '#FFFFFF',
};
const FONT = '"Noto Sans SC", "Noto Sans KR", "WenQuanYi Zen Hei", sans-serif';
const MONO = '"DejaVu Sans Mono", "WenQuanYi Zen Hei Mono", monospace';
const SPB = 60 / 149;          // 一拍的秒数
const BEAT0 = 6.98;            // 第一句 APT 的时间
let DURATION = 172;
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

// ---------- 歌词 ----------
let LINES = [], RUNS = [], END_START = 168;
const BUILD_KINDS = new Set(['chant', 'uh', 'meetShort']);

function kindOf(s) {
  const r = [
    [/club/i, 'club'], [/아파트/, 'chant'], [/^uh/i, 'uh'], [/^just meet me/i, 'meetShort'], [/meet me/i, 'meet'],
    [/kissy/i, 'kissy'], [/phone/i, 'phone'], [/lips/i, 'kissReal'], [/hearts/i, 'hearts'], [/what i'?m on/i, 'on'],
    [/feel/i, 'feel'], [/^oh/i, 'oh'], [/want me/i, 'want'], [/need me/i, 'need'], [/sleep/i, 'sleep'],
    [/whatever/i, 'whatever'], [/party/i, 'party'], [/건배/, 'cheers'], [/game/i, 'game'], [/ready/i, 'ready'],
    [/get ya/i, 'getya'], [/hold on/i, 'hold'], [/my way/i, 'way'], [/^yeah/i, 'yeah'],
  ];
  for (const [re, k] of r) if (re.test(s)) return k;
  return 'plain';
}

function setLyrics(src) {
  const dec = s => s.replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).trim();
  const raw = [];
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (m) raw.push({ t: +m[1] * 60 + +m[2], text: dec(m[3]) });
  }
  // 跳过开头的歌名/作词作曲信息
  LINES = raw.filter(l => l.t >= 6.5 && l.text);
  LINES.forEach((L, i) => {
    L.end = i + 1 < LINES.length ? LINES[i + 1].t : L.t + 2.2;
    L.kind = kindOf(L.text);
    const ws = L.text.split(/\s+/).filter(Boolean);
    if (L.kind === 'chant') L.words = ws.map((w, j) => ({ w, t: L.t + j * 2 * SPB }));
    else {
      const span = Math.min(L.end - L.t, 3.6) * 0.8;
      const wt = ws.map(w => Math.max(2, [...w].length) + 1), tot = wt.reduce((a, b) => a + b, 0);
      let acc = 0;
      L.words = ws.map((w, j) => { const r = { w, t: L.t + span * acc / tot }; acc += wt[j]; return r; });
    }
  });
  // 连续的“아파트”段落合成一栋楼
  RUNS = [];
  LINES.forEach((L, i) => {
    if (!BUILD_KINDS.has(L.kind) || (L.kind !== 'chant' && !(LINES[i - 1] && LINES[i - 1].run) && !(LINES[i + 1] && LINES[i + 1].kind === 'chant'))) return;
    let run = LINES[i - 1] && LINES[i - 1].run;
    if (!run) { run = { start: L.t, hits: [], idx: RUNS.length }; RUNS.push(run); }
    L.run = run; run.end = L.end;
    if (L.kind === 'chant') L.words.forEach(w => run.hits.push(w.t));
  });
  END_START = LINES[LINES.length - 1].end;
  DURATION = END_START + 3.6;
  window.DURATION = DURATION;
}

// 关键词用色块强调
const KEY = new Set(['kissy', 'phone', 'kiss', 'lips', 'real', 'red', 'hearts', 'feel', 'want', 'need', 'baby', 'now', 'sleep', 'tonight', 'crazy',
  'meet', 'whatever', 'club', 'party', 'night', 'game', 'ready', 'hold', 'way', '아파트', '건배', 'yeah', 'oh', 'huh']);
const norm = w => w.toLowerCase().replace(/[^a-z가-힣]/g, '');
const isKey = w => KEY.has(norm(w));

function lyric(L, t, o = {}) {
  if (!L) return;
  const x0 = o.x ?? 960, y0 = o.y ?? 165, maxW = o.maxW ?? 1720;
  let size = o.size ?? 124;
  const words = L.words;
  const ww = (w, s) => measure(w, s) + (isKey(w) && o.tiles !== false ? s * 0.5 : 0);
  const rowW = (ws, s) => ws.reduce((a, w) => a + ww(w.w, s), 0) + (ws.length - 1) * s * 0.32;
  let rows = [words];
  if (rowW(words, size) > maxW && words.length > 1) {
    let best = 1, bd = 1e9;
    for (let k = 1; k < words.length; k++) { const d = Math.max(rowW(words.slice(0, k), size), rowW(words.slice(k), size)); if (d < bd) { bd = d; best = k; } }
    rows = [words.slice(0, best), words.slice(best)];
  }
  const widest = Math.max(...rows.map(r => rowW(r, size)));
  if (widest > maxW) size *= maxW / widest;
  const lh = size * 1.4;
  rows.forEach((r, ri) => {
    let x = x0 - rowW(r, size) / 2;
    const y = y0 + (ri - (rows.length - 1) / 2) * lh;
    r.forEach(w => {
      const wd = ww(w.w, size);
      if (t >= w.t) {
        const s = pop(t - w.t, 0.22);
        if (isKey(w.w) && o.tiles !== false) tile(w.w, x + wd / 2, y, size, { bg: o.hl || C.orange, shadow: o.hlShadow || C.ink, scale: s, rot: (rnd(w.t) - 0.5) * 0.08 });
        else txt(w.w, x + wd / 2, y, size, { fill: o.fill || C.ink, depth: o.depth ?? Math.round(size * 0.08), depthColor: o.depthColor || C.orange, scale: s });
      }
      x += wd + size * 0.32;
    });
  });
}
const wordT = (L, re) => { const w = L.words.find(w => re.test(w.w)); return w ? w.t : L.end; };
const wordsShown = (L, t) => L.words.filter(w => t >= w.t).length;

// ---------- 小道具 ----------
function dots(color, step = 48) { ctx.fillStyle = color; for (let x = 24; x < W; x += step) for (let y = 24; y < H; y += step) ctx.fillRect(x, y, 5, 5); }
function stars(t, n = 70) { for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * Math.abs(Math.sin(t * 1.5 + i))})`; ctx.fillRect(rnd(i) * W, rnd(i + 99) * H * 0.8, 4, 4); } }

function kissFace(x, y, r, o = {}) {
  ctx.save(); ctx.translate(x, y); const s = o.scale ?? 1; ctx.scale(s, s); if (o.rot) ctx.rotate(o.rot);
  ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.lineWidth = r * 0.08; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineWidth = r * 0.1;
  ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.12, r * 0.16, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();   // 闭眼
  ctx.beginPath(); ctx.moveTo(r * 0.22, -r * 0.3); ctx.lineTo(r * 0.45, -r * 0.15); ctx.lineTo(r * 0.22, 0); ctx.stroke(); // 眨眼
  ctx.beginPath(); ctx.moveTo(-r * 0.05, r * 0.25); ctx.quadraticCurveTo(r * 0.12, r * 0.33, -r * 0.03, r * 0.42); ctx.quadraticCurveTo(r * 0.14, r * 0.5, -r * 0.05, r * 0.6); ctx.stroke(); // 嘟嘴
  ctx.restore();
  heart(x + r * 0.95 * s, y + r * 0.3 * s, r * 0.075 * s, C.red);
}

function phoneBody(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(-205 + 14, -400 + 14, 410, 800, 56, 'rgba(0,0,0,.25)');
  rrect(-205, -400, 410, 800, 56, C.ink);
  rrect(-185, -370, 370, 740, 40, '#F7F5F0');
  rrect(-60, -362, 120, 26, 13, C.ink);
  ctx.restore();
}

function discoBall(x, y, r, t) {
  ctx.strokeStyle = '#999'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - r); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  const n = 8, cs = r * 2 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 150 + 100 * Math.abs(Math.sin(t * 6 + i * 1.7 + j * 2.3)); ctx.fillStyle = `rgb(${v},${v},${v + 10})`; ctx.fillRect(x - r + i * cs + ((t * 40) % cs), y - r + j * cs, cs - 3, cs - 3); }
  ctx.restore();
}
function beams(t, x, y, colors, alpha = 0.22) {
  colors.forEach((c, i) => {
    const a = Math.sin(t * 1.6 + i * 1.9) * 0.9 + Math.PI / 2;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - 0.1) * 2200, y + Math.sin(a - 0.1) * 2200); ctx.lineTo(x + Math.cos(a + 0.1) * 2200, y + Math.sin(a + 0.1) * 2200); ctx.fill(); ctx.restore();
  });
}

function cup(x, y, s, rot, fill = C.orange) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(-90, -130); ctx.lineTo(90, -130); ctx.lineTo(65, 130); ctx.lineTo(-65, 130); ctx.closePath(); ctx.fill();
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(-80, -70); ctx.lineTo(80, -70); ctx.lineTo(65, 125); ctx.lineTo(-65, 125); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-90, -130); ctx.lineTo(90, -130); ctx.lineTo(65, 130); ctx.lineTo(-65, 130); ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = C.red; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(30, -60); ctx.lineTo(55, -200); ctx.lineTo(95, -215); ctx.stroke();
  ctx.restore();
}

function road(t, speed = 900, sky = ['#7FB6FF', '#FFD9A8']) {
  const g = ctx.createLinearGradient(0, 0, 0, 800); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, 1100);
  for (let layer = 0; layer < 2; layer++) {
    const sp = speed * (layer ? 0.5 : 0.25), base = layer ? 820 : 760;
    ctx.fillStyle = layer ? '#3A3F63' : 'rgba(58,63,99,.45)';
    for (let i = -1; i < 14; i++) {
      const bw = 140 + rnd(i + layer * 50) * 80, bh = 180 + rnd(i * 3 + layer) * (layer ? 260 : 380);
      const x = ((i * 170 - t * sp) % (14 * 170) + 14 * 170) % (14 * 170) - 170;
      ctx.fillRect(x, base - bh, bw, bh);
      if (layer) { ctx.fillStyle = C.yellow; for (let wy = base - bh + 24; wy < base - 30; wy += 46) for (let wx = x + 20; wx < x + bw - 30; wx += 40) if (rnd(wx * 0.1 + wy) > 0.45) ctx.fillRect(wx, wy, 18, 22); ctx.fillStyle = '#3A3F63'; }
    }
  }
  ctx.fillStyle = '#2B2B33'; ctx.fillRect(-200, 820, W + 400, 300);
  ctx.fillStyle = C.yellow; for (let x = -((t * speed) % 240) - 240; x < W + 240; x += 240) ctx.fillRect(x, 945, 130, 14);
}
function speedLines(t, color = 'rgba(255,255,255,.6)', cx = 960, cy = 540) {
  ctx.strokeStyle = color; ctx.lineWidth = 6;
  for (let i = 0; i < 40; i++) { const a = rnd(i) * 6.28, r0 = 300 + ((t * 2200 + rnd(i + 3) * 900) % 900); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + 160), cy + Math.sin(a) * (r0 + 160)); ctx.stroke(); }
}

// ---------- 每句歌词的画面 ----------
const V = {};

V.kissy = (t, lt, L) => {
  bg(C.cream); dots('rgba(21,21,21,.07)');
  const n = wordsShown(L, t);
  const pos = [[480, 640], [1440, 640], [960, 560], [300, 380], [1620, 380]];
  for (let i = 0; i < Math.min(5, n * 2 + Math.floor(lt / SPB)); i++) {
    const [x, y] = pos[i % 5];
    kissFace(x, y + Math.sin(t * 5 + i) * 12, i === 2 ? 210 : 140, { scale: pop(lt - i * SPB * 0.5, 0.25), rot: Math.sin(t * 3 + i) * 0.1 });
  }
  crab(960, 1030, 9, { expr: 'happy', blush: true, legs: beatAt(t) });
  lyric(L, t, { y: 170, hl: C.pink });
};

V.phone = (t, lt, L) => {
  bg(C.blue); dots('rgba(255,255,255,.12)');
  const pIn = eOut(lt / 0.3);
  phoneBody(1220, 620 + (1 - pIn) * 600, 1);
  const sent = L.t + (L.end - L.t) * 0.45;
  if (t > L.t + 0.2) {
    const a = eOut((t - L.t - 0.2) / 0.3);
    rrect(1220 + 160 - 260 * a, 360, 220, 200, 40, C.blue);
    kissFace(1220 + 160 - 260 * a + 110, 460, 70);
  }
  if (t > sent) {
    txt('✓✓ 已送达', 1330, 600, 30, { fill: C.gray, mono: true, weight: 700, alpha: clamp((t - sent) / 0.2), align: 'right' });
    // 飞出去的小爱心
    for (let i = 0; i < 6; i++) { const k = (t - sent) * 1.4 - i * 0.12; if (k > 0 && k < 1) heart(1220 + k * 600, 420 - Math.sin(k * 3.14) * 200 - i * 20, 6, C.pink); }
  }
  crab(520, 900, 14, { expr: t > sent ? 'happy' : 'normal', armR: 1, blush: t > sent });
  lyric(L, t, { x: 560, y: 360, size: 120, fill: C.white, depthColor: C.blueD, hl: C.ink, hlShadow: C.orange, maxW: 900 });
};

V.kissReal = (t, lt, L) => {
  bg('#FFE3EC'); dots('rgba(255,95,162,.15)');
  const d = L.end - L.t, k = eOut(clamp((lt - 0.2) / (d * 0.75)));
  const lx = lerp(380, 845, k), rx = lerp(1540, 1075, k);
  crab(lx, 900, 14, { expr: k > 0.95 ? 'blink' : 'happy', blush: true, armR: 1, legs: k < 1 ? t * 6 : 0 });
  crab(rx, 900, 14, { expr: k > 0.95 ? 'blink' : 'happy', blush: true, armL: 1, legs: k < 1 ? t * 6 : 0, color: '#E8789A', bow: true });
  const realT = wordT(L, /real/i);
  if (t >= realT) {
    const s = pop(t - realT, 0.3);
    heart(960, 640 - (t - realT) * 60, 22 * s, C.red);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, r = eOut((t - realT) / 0.5) * 380; heart(960 + Math.cos(a) * r, 720 + Math.sin(a) * r * 0.6, 7, i % 2 ? C.pink : C.red); }
  }
  lyric(L, t, { y: 200, hl: C.red });
};

V.hearts = (t, lt, L) => {
  bg('#2A0F1A');
  for (let i = 0; i < 50; i++) { const sp = 200 + rnd(i) * 250, x = rnd(i + 7) * W, y = ((lt * sp + rnd(i + 3) * H * 1.3) % (H * 1.3)) - 100; heart(x, y, 4 + rnd(i + 11) * 7, i % 3 ? 'rgba(229,72,77,.6)' : 'rgba(255,95,162,.6)'); }
  const hs = L.words.filter(w => /hearts/i.test(w.w));
  hs.forEach((w, i) => { if (t >= w.t) { const pump = 1 + kick(beatFrac(t) * SPB, 8) * 0.12; heart(i ? 1340 : 580, 640, 46 * pop(t - w.t, 0.3) * pump, i ? C.red : C.pink); } });
  crab(960, 1040, 9, { expr: 'happy', blush: true, legs: beatAt(t) });
  lyric(L, t, { y: 170, fill: C.white, depthColor: '#7A1F45', hl: C.red });
};

V.on = (t, lt, L) => {
  bg('#2A0F1A'); stars(t, 40);
  const by = 700 + Math.sin(t * 2.4) * 30;
  heart(960, by, 50, C.red);
  crab(960, by - 150, 11, { expr: 'cool', armL: 1, armR: Math.floor(beatAt(t)) % 2, rot: Math.sin(t * 2.4) * 0.06 });
  for (let i = 0; i < 12; i++) { const a = t * 0.8 + i * 0.52; ctx.fillStyle = C.yellow; const s = 6 + 6 * Math.abs(Math.sin(t * 4 + i)); ctx.fillRect(960 + Math.cos(a) * 520 - s / 2, by - 100 + Math.sin(a) * 260 - s / 2, s, s); }
  lyric(L, t, { y: 170, fill: C.white, depthColor: '#7A1F45', hl: C.pink });
};

V.feel = (t, lt, L) => {
  bg('#111');
  ctx.strokeStyle = 'rgba(63,185,80,.15)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 1000); ctx.stroke(); }
  // 心电图
  const head = (lt / (L.end - L.t)) * (W + 200);
  ctx.strokeStyle = C.red; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let x = 0; x < Math.min(W, head); x += 6) {
    const ph = ((x / 300) % 1);
    const y = 640 + (ph > 0.45 && ph < 0.5 ? -220 : ph > 0.5 && ph < 0.55 ? 160 : ph > 0.4 && ph < 0.45 ? 40 : 0);
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  heart(1700, 860, 18 * (1 + kick(beatFrac(t) * SPB, 7) * 0.3), C.red);
  crab(260, 1040, 9, { expr: 'normal', armR: 1 });
  lyric(L, t, { y: 190, fill: C.white, depthColor: C.red, hl: C.red });
};

V.oh = (t, lt, L) => {
  const n = Math.max(1, wordsShown(L, t));
  bg([C.orange, C.blue, C.ink][(n - 1) % 3]);
  L.words.forEach((w, i) => {
    if (t < w.t) return; const x = 480 + i * 480, y = 520;
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 10 * (1 - clamp((t - w.t) / 0.5));
    ctx.beginPath(); ctx.arc(x, y, eOut((t - w.t) / 0.5) * 300, 0, 7); ctx.stroke();
    txt(w.w, x, y, 220, { fill: C.cream, depth: 16, scale: pop(t - w.t, 0.2) });
  });
  crab(960, 980 - Math.abs(Math.sin(lt * 8)) * 60, 11, { expr: 'shock', rot: lt * 5, armL: 1, armR: 1 });
};

function splitBG() {
  bg(C.cream);
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.moveTo(1010, 0); ctx.lineTo(W + 10, 0); ctx.lineTo(W + 10, H); ctx.lineTo(910, H); ctx.fill();
}
V.want = (t, lt, L) => {
  splitBG();
  crab(480, 940, 15, { expr: 'happy', blush: true, armR: 1, legs: beatAt(t) });
  crab(1440, 940, 15, { expr: 'happy', blush: true, armL: 1, legs: beatAt(t) + 1, color: '#E8789A', bow: true });
  for (let i = 0; i < 8; i++) {
    const k = ((lt * 0.9 + i / 8) % 1), dir = i % 2;
    const x = dir ? lerp(1300, 620, k) : lerp(620, 1300, k);
    heart(x, 700 - Math.sin(k * Math.PI) * 180, 9, dir ? C.pink : C.red);
  }
  lyric(L, t, { y: 330, size: 104, hl: C.pink });
};
V.need = (t, lt, L) => {
  splitBG();
  // 两半爱心拼起来
  const k = eOut(clamp((lt - 0.3) / ((L.end - L.t) * 0.7)));
  const cx = 960, cy = 690, p = 30;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cx, H); ctx.clip(); pixelArt(HEART, cx - 3.5 * p - (1 - k) * 420, cy - 3 * p, p, C.red); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(cx, 0, W, H); ctx.clip(); pixelArt(HEART, cx - 3.5 * p + (1 - k) * 420, cy - 3 * p, p, C.pink); ctx.restore();
  if (k > 0.98) { ctx.strokeStyle = C.yellow; ctx.lineWidth = 8; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 260, cy + Math.sin(a) * 220); ctx.lineTo(cx + Math.cos(a) * 320, cy + Math.sin(a) * 270); ctx.stroke(); } }
  crab(300, 1040, 9, { expr: 'normal', legs: beatAt(t) });
  crab(1620, 1040, 9, { expr: 'normal', legs: beatAt(t), color: '#E8789A', bow: true });
  lyric(L, t, { y: 250, size: 104, hl: C.red });
};

V.sleep = (t, lt, L) => {
  const party = t >= wordT(L, /tonight/i);
  if (!party) {
    bg(C.navy); stars(t);
    ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(1560, 300, 110, 0, 7); ctx.fill();
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(1610, 270, 100, 0, 7); ctx.fill();
    rrect(560, 820, 800, 120, 20, '#6B7AB8'); rrect(560, 780, 220, 80, 20, C.cream);
    crab(700, 830, 9, { expr: 'blink', rot: -1.57 * 0 });
    rrect(760, 760, 600, 110, 30, C.blue);
    for (let i = 0; i < 3; i++) { const k = (lt * 0.8 + i * 0.33) % 1; txt('Z', 780 + k * 160 + i * 20, 680 - k * 220, 50 + i * 16, { fill: C.cream, alpha: 1 - k, mono: true }); }
    lyric(L, t, { y: 190, fill: C.cream, depthColor: C.blueD, hl: C.blue, hlShadow: C.cream });
  } else {
    const k = t - wordT(L, /tonight/i);
    bg(['#2A0F3A', '#0F2A3A', '#3A0F1A'][Math.floor(beatAt(t)) % 3]);
    beams(t, 960, 120, [C.pink, C.blue, C.yellow, C.green, C.orange], 0.25);
    discoBall(960, 160, 70, t);
    crab(960, 1000 - Math.abs(Math.sin(t * 9)) * 80, 14, { expr: 'cool', armL: Math.floor(t * 4) % 2, armR: 1 - Math.floor(t * 4) % 2, rot: Math.sin(t * 8) * 0.12, squash: k < 0.1 ? 0.2 : 0 });
    lyric(L, t, { y: 420, fill: C.white, depthColor: C.pink, hl: C.pink });
  }
};

V.meet = (t, lt, L) => {
  bg('#F3EFE6');
  ctx.strokeStyle = '#DDD5C5'; ctx.lineWidth = 26;
  for (let x = 120; x < W; x += 300) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 60, H); ctx.stroke(); }
  for (let y = 380; y < H; y += 240) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 40); ctx.stroke(); }
  const pts = [[260, 960], [260, 720], [740, 700], [760, 500], [1320, 470], [1620, 460]];
  const k = eOut(clamp(lt / ((L.end - L.t) * 0.85)));
  const segs = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); tot += d; }
  let rem = k * tot, cx = pts[0][0], cy = pts[0][1];
  ctx.setLineDash([26, 18]); ctx.lineDashOffset = -t * 60; ctx.strokeStyle = C.orange; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(...pts[0]);
  for (let i = 1; i < pts.length && rem > 0; i++) { const f = Math.min(1, rem / segs[i - 1]); cx = lerp(pts[i - 1][0], pts[i][0], f); cy = lerp(pts[i - 1][1], pts[i][1], f); ctx.lineTo(cx, cy); rem -= segs[i - 1]; }
  ctx.stroke(); ctx.setLineDash([]);
  // 终点：公寓
  const [ex, ey] = pts[pts.length - 1];
  for (let f = 0; f < 4; f++) { rrect(ex - 90, ey - 40 - f * 70, 180, 70, 4, f % 2 ? C.cream : C.orange, C.ink, 5); ctx.fillStyle = C.yellow; ctx.fillRect(ex - 60, ey - 20 - f * 70, 30, 30); ctx.fillRect(ex + 30, ey - 20 - f * 70, 30, 30); }
  const pinY = ey - 380 - Math.abs(Math.sin(t * 5)) * 30;
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(ex, pinY, 50, Math.PI, 0); ctx.lineTo(ex, pinY + 110); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(ex, pinY, 20, 0, 7); ctx.fill();
  crab(cx, cy + 20, 6, { expr: 'happy', legs: t * 8 });
  lyric(L, t, { y: 170, hl: C.blue });
  if (t > L.end - 0.25) { ctx.fillStyle = `rgba(255,255,255,${clamp((t - (L.end - 0.25)) / 0.25)})`; ctx.fillRect(0, 0, W, H); }
};

V.whatever = (t, lt, L) => {
  bg(C.cream); dots('rgba(21,21,21,.07)');
  const icons = [
    ['..XX', '..XX', '..X.', '..X.', 'XXX.', 'XXX.'],                    // 音符
    ['.XXXXXX.', 'XX.XX.XX', 'X...X..X', 'XX.XX.XX', '.XXXXXX.'],         // 手柄
    HEART,
    ['...X...', '..XXX..', 'XXXXXXX', '.XXXXX.', '.XX.XX.', 'X.....X'], // 星星
  ];
  const cols = [C.blue, C.orange, C.red, C.yellow];
  const sel = Math.floor(beatAt(t)) % 4;
  for (let i = 0; i < 4; i++) {
    const x = 330 + i * 420, y = 650, on = i === sel;
    const s = pop(lt - i * 0.1, 0.25) * (on ? 1.1 : 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rrect(-150 + 12, -190 + 12, 300, 380, 24, C.ink);
    rrect(-150, -190, 300, 380, 24, on ? cols[i] : C.white, C.ink, 6);
    pixelArt(icons[i], -icons[i][0].length * 11, -90, 22, on ? C.white : cols[i]);
    ctx.restore();
    check(x, y + 130 * s, 50 * s, on ? C.white : C.green);
  }
  crab(960, 1060, 8, { expr: 'happy', armL: 1, armR: 1, legs: beatAt(t) });
  lyric(L, t, { y: 190, size: 100, hl: C.blue });
};

function apartment(x, by, floors, fw, fh, t, o = {}) {
  for (let i = 0; i < floors; i++) {
    const y = by - (i + 1) * fh;
    const neon = o.neon ? `hsl(${(i * 50 + t * 200) % 360},90%,60%)` : null;
    rrect(x - fw / 2, y, fw, fh, 6, o.neon ? '#1A1A2A' : (i % 2 ? C.cream : C.orange), neon || C.ink, 6);
    for (let w = 0; w < 4; w++) {
      const lit = o.neon ? `hsl(${(w * 80 + i * 40 + t * 300) % 360},90%,65%)` : (rnd(i * 7 + w) > 0.3 ? C.yellow : '#3A3F63');
      ctx.fillStyle = lit; ctx.fillRect(x - fw / 2 + 30 + w * (fw - 60) / 4, y + fh * 0.22, (fw - 60) / 4 - 26, fh * 0.56);
    }
  }
}

V.club = (t, lt, L) => {
  const neonOn = t >= wordT(L, /club/i);
  bg(neonOn ? '#0A0A16' : C.navy); stars(t, 40);
  if (neonOn) beams(t, 960, 60, [C.pink, C.blue, C.yellow, C.green], 0.2);
  apartment(960, 1060, 5, 560, 110, t, { neon: neonOn });
  if (neonOn) discoBall(960, 340, 60, t);
  crab(960, 1060 - 5 * 110, 8, { expr: neonOn ? 'cool' : 'normal', armL: neonOn ? Math.floor(t * 4) % 2 : 0, legs: beatAt(t) });
  lyric(L, t, { y: 170, fill: C.white, depthColor: C.pink, hl: C.pink });
};

V.party = (t, lt, L) => {
  bg('#120A1E');
  beams(t, 960, 0, [C.pink, C.blue, C.yellow, C.green, C.orange], 0.18);
  // 舞池
  for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = `hsl(${(i * 37 + j * 90 + Math.floor(beatAt(t)) * 60) % 360},80%,${45 + 10 * ((i + j) % 2)}%)`; ctx.fillRect(i * 160, 800 + j * 95, 156, 91); }
  discoBall(960, 150, 70, t);
  for (let i = 0; i < 7; i++) {
    const b = beatAt(t) + i * 0.5;
    crab(180 + i * 260, 900 - Math.abs(Math.sin(b * Math.PI)) * 50, 8, { expr: i % 2 ? 'cool' : 'happy', armL: Math.floor(b) % 2, armR: 1 - Math.floor(b) % 2, rot: Math.sin(b * Math.PI) * 0.15, crown: i === 3, bow: i === 1 || i === 5, color: i === 1 || i === 5 ? '#E8789A' : C.orange });
  }
  ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(1700, 180, 60, 0, 7); ctx.fill();
  lyric(L, t, { y: 400, size: 100, fill: C.white, depthColor: C.pink, hl: C.pink });
};

V.cheers = (t, lt, L) => {
  bg(C.yellow); dots('rgba(21,21,21,.08)');
  const hits = L.words.filter(w => /건배/.test(w.w)).map(w => w.t);
  let clink = 0; hits.forEach(h => { if (t >= h) clink = Math.max(clink, kick(t - h, 5)); });
  const close = hits.some(h => t >= h) ? 1 : eOut(lt / 0.3) * 0.3;
  cup(lerp(560, 840, close) - clink * 20, 640, 1.2, 0.25 * close - clink * 0.15, C.orange);
  cup(lerp(1360, 1080, close) + clink * 20, 640, 1.2, -0.25 * close + clink * 0.15, C.pink);
  hits.forEach(h => { if (t >= h) for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (rnd(i + h) - 0.5) * 2.4, r = (t - h) * (500 + rnd(i) * 300); ctx.fillStyle = i % 2 ? C.orange : C.white; ctx.fillRect(960 + Math.cos(a) * r, 470 + Math.sin(a) * r + (t - h) * (t - h) * 900, 16, 16); } });
  const up = t >= wordT(L, /what/i);
  crab(1700, 1040, 9, { expr: 'happy', armL: up ? Math.floor(t * 6) % 2 : 0, legs: beatAt(t) });
  lyric(L, t, { y: 170, hl: C.orange });
};

V.game = (t, lt, L) => {
  bg(C.cream); dots('rgba(21,21,21,.07)');
  // 叠手游戏：两边的钳子轮流往上叠
  const n = Math.min(8, Math.floor(lt / SPB) + 1);
  for (let i = 0; i < n; i++) {
    const left = i % 2 === 0, y = 980 - i * 80;
    const k = eOut((lt - i * SPB) / 0.15);
    const x0 = left ? -200 + k * 760 : W + 200 - k * 760;
    ctx.fillStyle = left ? C.orange : '#E8789A';
    ctx.fillRect(left ? -200 : x0, y - 28, left ? x0 + 200 : W + 200 - x0, 56);
    ctx.fillRect(left ? x0 : x0 - 90, y - 50, 90, 100);
    ctx.fillStyle = C.cream; ctx.fillRect(left ? x0 + 40 : x0 - 90, y - 12, 50, 24);
  }
  lyric(L, t, { y: 190, hl: C.blue });
};

V.ready = (t, lt, L) => {
  bg(C.ink);
  const n = Math.floor(lt / SPB);
  const num = ['3', '2', '1', 'GO'][Math.min(3, n)];
  ctx.strokeStyle = C.orange; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(960, 620, 250, -Math.PI / 2, -Math.PI / 2 + (beatFrac(t)) * 6.28); ctx.stroke();
  txt(num, 960, 630, 280, { fill: C.cream, scale: pop(lt - n * SPB, 0.2), depth: 16, depthColor: C.orange });
  crab(260, 1040, 9, { expr: 'shock', squash: 0.15 });
  lyric(L, t, { y: 190, fill: C.white, depthColor: C.orangeD, hl: C.orange });
};

V.getya = (t, lt, L) => {
  bg(C.red); speedLines(t, 'rgba(255,255,255,.5)');
  const k = eIn(clamp(lt / (L.end - L.t)));
  crab(960, 640 + 180 * (1 + k * 2), 10 + k * 26, { expr: 'squint', armL: 1, armR: 1, legs: t * 10 });
  lyric(L, t, { y: 170, fill: C.white, depthColor: '#7A0F15', hl: C.ink, hlShadow: C.white });
};

V.hold = (t, lt, L) => {
  bg(C.cream); dots('rgba(21,21,21,.07)');
  // 沙漏 + 转圈
  ctx.save(); ctx.translate(1300, 620); ctx.rotate(Math.floor(lt / 0.8) * Math.PI + Math.min(1, (lt % 0.8) / 0.25) * Math.PI);
  ctx.fillStyle = C.ink; ctx.fillRect(-120, -190, 240, 24); ctx.fillRect(-120, 166, 240, 24);
  ctx.fillStyle = C.blue; ctx.beginPath(); ctx.moveTo(-100, -166); ctx.lineTo(100, -166); ctx.lineTo(10, 0); ctx.lineTo(100, 166); ctx.lineTo(-100, 166); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
  crab(600, 960, 14, { expr: 'normal', armR: 1, legs: Math.floor(t * 5) % 2 ? 0.5 : 0 });
  lyric(L, t, { y: 190, hl: C.blue });
};

const BRIDGE = [103, 129];
function dist(t) { return lerp(5.2, 0.1, clamp((t - BRIDGE[0]) / (BRIDGE[1] - BRIDGE[0]))); }
V.way = (t, lt, L) => {
  road(t, 700);
  const b = beatAt(t);
  crab(700, 905 - Math.abs(Math.sin(b * Math.PI)) * 40, 12, { expr: 'happy', legs: t * 10, armR: Math.floor(b) % 2 });
  rrect(1340, 230, 460, 110, 55, C.ink);
  txt(`APT. ${dist(t).toFixed(1)} km`, 1570, 287, 48, { fill: C.white, mono: true, weight: 700 });
  lyric(L, t, { y: 470, size: 120, fill: C.white, depthColor: C.ink, hl: C.orange });
};
V.yeah = (t, lt, L) => {
  road(t, 1500, ['#FF9A62', '#FFD27A']);
  speedLines(t, 'rgba(255,255,255,.35)', 700, 800);
  const hits = L.words.map(w => w.t);
  let j = 0; hits.forEach(h => { if (t >= h) j = Math.max(j, kick(t - h, 7)); });
  crab(700, 905 - j * 160, 12, { expr: 'squint', legs: t * 16, armL: 1, armR: 1, rot: -0.15 });
  rrect(1340, 230, 460, 110, 55, C.ink);
  txt(`APT. ${dist(t).toFixed(1)} km`, 1570, 287, 48, { fill: C.white, mono: true, weight: 700 });
  lyric(L, t, { y: 470, size: 120, fill: C.white, depthColor: C.ink, hl: C.red });
};

V.plain = (t, lt, L) => {
  bg(C.cream); dots('rgba(21,21,21,.07)');
  crab(960, 980, 12, { expr: 'happy', legs: beatAt(t) });
  lyric(L, t, { y: 400, hl: C.orange });
};

// “아파트” 段：每唱一声盖一层楼
const PAL = [[C.orange, C.cream], [C.blue, C.cream], [C.yellow, C.ink], [C.pink, C.white], [C.ink, C.orange], [C.cream, C.blue]];
function building(t, L) {
  const run = L.run;
  const hits = run.hits.filter(h => t >= h), n = hits.length, last = hits[n - 1] ?? run.start;
  const night = run.idx === 0;
  const [bgc] = night ? ['#141428'] : PAL[(n + run.idx) % PAL.length];
  bg(bgc);
  if (night) stars(t); else dots(bgc === C.ink ? 'rgba(242,193,78,.2)' : 'rgba(21,21,21,.09)');
  const fh = 100, fw = 520, ground = 1050;
  const shown = Math.max(0, n);
  const off = Math.max(0, (shown * fh) - 560);
  const offAnim = n > 0 ? lerp(Math.max(0, ((n - 1) * fh) - 560), off, eOut((t - last) / 0.25)) : 0;
  ctx.save(); ctx.translate(0, offAnim);
  if (!night) for (let i = 0; i < 9; i++) crab(140 + i * 205 + (i > 3 ? 120 : 0) - (i > 3 ? 0 : 0), ground + 4, 5, { expr: 'happy', legs: beatAt(t) + i, armL: Math.floor(beatAt(t) + i) % 2 });
  for (let i = 0; i < n; i++) {
    const drop = i === n - 1 ? -(1 - eOut((t - last) / 0.16)) * 360 : 0;
    const y = ground - (i + 1) * fh + drop;
    rrect(960 - fw / 2, y, fw, fh, 6, i % 2 ? C.cream : C.orange, C.ink, 6);
    for (let w = 0; w < 4; w++) {
      const wx = 960 - fw / 2 + 28 + w * 120, lit = rnd(i * 7 + w + run.idx * 31) > 0.3;
      ctx.fillStyle = lit ? C.yellow : '#3A3F63'; ctx.fillRect(wx, y + 22, 90, 56);
      if (lit && rnd(i * 13 + w) > 0.6) crab(wx + 45, y + 76, 2.6, { expr: L.kind === 'uh' ? 'happy' : 'normal', rot: L.kind === 'uh' ? Math.sin(beatAt(t) * Math.PI) * 0.3 : 0 });
    }
    txt(`${i + 1}F`, 960 - fw / 2 - 20, y + fh / 2, 30, { fill: night || bgc === C.ink || bgc === C.blue ? C.cream : C.ink, align: 'right', mono: true, weight: 700 });
  }
  const roof = ground - n * fh;
  const b = beatAt(t), uh = L.kind === 'uh';
  crab(960, roof - Math.abs(Math.sin(Math.PI * beatFrac(t))) * 30, uh ? 12 : 9, { expr: uh ? 'cool' : night ? 'normal' : 'happy', squash: kick(t - last, 10) * 0.25, rot: uh ? Math.sin(b * Math.PI) * 0.15 : 0, armL: uh ? Math.floor(b) % 2 : 0, armR: uh ? 1 - Math.floor(b) % 2 : 0, legs: b, crown: n >= 10 });
  if (L.kind === 'meetShort') {
    const k = eOut((t - L.t) / 0.3), py = roof - 250 + (1 - k) * -400;
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(960, py, 60, Math.PI, 0); ctx.lineTo(960, py + 130); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(960, py, 24, 0, 7); ctx.fill();
  }
  ctx.restore();
  const dark = night || bgc === C.ink || bgc === C.blue;
  const fc = dark ? C.cream : C.ink;
  if (L.kind === 'chant') {
    L.words.forEach((w, i) => {
      if (t < w.t) return;
      const x = i % 2 ? 1500 : 420;
      txt(w.w, x, 470, 150, { fill: i % 2 ? C.orange : fc, depth: 12, depthColor: i % 2 ? C.ink : C.orange, scale: lerp(1.6, 1, eOut((t - w.t) / 0.16)), rot: (i % 2 ? 1 : -1) * 0.05 });
    });
    txt('APT.', 420, 620, 60, { fill: fc, alpha: 0.5, mono: true });
    txt('APT.', 1500, 620, 60, { fill: fc, alpha: t >= (L.words[1] ? L.words[1].t : 1e9) ? 0.5 : 0, mono: true });
  } else if (uh) {
    const sp = [[420, 330], [1500, 300], [1560, 560], [360, 580], [1480, 800], [440, 820]];
    L.words.forEach((w, i) => { if (t >= w.t) bubble(w.w, sp[i % 6][0], sp[i % 6][1], 76, { scale: pop(t - w.t, 0.2), bg: [C.orange, C.ink, C.pink, C.green, C.yellow, C.red][i % 6], fill: i % 6 === 4 ? C.ink : C.white }); });
  } else {
    lyric(L, t, { y: 150, size: 96, fill: fc, hl: C.red });
  }
}

// ---------- 开场 & 结尾 ----------
function intro(t) {
  bg(C.navy); stars(t);
  const a = clamp(t / 0.6);
  ctx.globalAlpha = a;
  apartment(960, 1060, 3, 520, 100, t);
  crab(960, 760, 8, { expr: t % 3 > 2.85 ? 'blink' : 'normal' });
  txt('APT.', 960, 330, 260, { fill: C.cream, depth: 20, depthColor: C.orange, scale: pop(t - 0.3, 0.4) });
  txt('ROSÉ & Bruno Mars', 960, 510, 50, { fill: C.gray, mono: true, weight: 700, alpha: clamp((t - 0.9) / 0.4) });
  ctx.globalAlpha = 1;
  if (t > 2.6 && t < 4.9) {
    const k = t - 2.6;
    txt('RANDOM GAME', 960, 640, 90, { fill: C.yellow, scale: pop(k, 0.25), depth: 8, mono: true });
  }
  if (t >= 4.9) {
    const k = t - 4.9, s = lerp(2.2, 1, eOut(k / 0.2));
    ctx.fillStyle = `rgba(0,0,0,${clamp(k * 3) * 0.6})`; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(960, 560); ctx.rotate(-0.06); ctx.scale(s, s); rrect(-470, -130, 940, 260, 26, null, C.red, 18); ctx.restore();
    txt('GAME START!', 960, 568, 150, { fill: C.red, rot: -0.06, scale: s, ls: 4 });
  }
}
function endCard(t) {
  const lt = t - END_START;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1B2140'); g.addColorStop(1, '#0B0E1C');
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400); stars(t);
  apartment(960, 1060, 3, 520, 100, t);
  txt('APT.', 960, 330, 260, { fill: C.cream, depth: 20, depthColor: C.orange, scale: pop(lt, 0.4) });
  txt('Claude MV', 960, 150, 44, { fill: C.gray, mono: true, weight: 700, ls: 8, alpha: clamp(lt / 0.4) });
  crab(960, 760, 12, { expr: 'happy', crown: true, armR: Math.floor(beatAt(t)) % 2, blush: true, legs: beatAt(t) });
  txt('ROSÉ & Bruno Mars《APT.》 · 非官方二创', 960, 520, 34, { fill: C.gray, alpha: clamp((lt - 0.6) / 0.4) });
  if (t > DURATION - 1) { ctx.fillStyle = `rgba(0,0,0,${clamp((t - (DURATION - 1)) / 1)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- 合成 ----------
function chrome(t) {
  ctx.save(); ctx.globalAlpha = 0.75;
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
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  let i = -1; for (let j = 0; j < LINES.length; j++) if (t >= LINES[j].t) i = j;
  const L = LINES[i], prev = LINES[i - 1];
  ctx.save();
  let sh = 0, flash = 0;
  if (!L) intro(t);
  else if (t >= END_START) { endCard(t); flash = kick(t - END_START, 10); }
  else {
    const lt = t - L.t;
    if (L.run) { L.run.hits.forEach(h => { sh = Math.max(sh, kick(t - h, 9) * 22); }); }
    if (sh) ctx.translate((rnd(Math.floor(t * 60)) - 0.5) * sh * 2, (rnd(Math.floor(t * 60) + 17) - 0.5) * sh * 2);
    if (L.run && L.run.idx > 0) { const z = 1 + kick(beatFrac(t) * SPB, 10) * 0.02; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); }
    L.run ? building(t, L) : (V[L.kind] || V.plain)(t, lt, L);
    const changed = !prev || (L.run ? prev.run !== L.run : prev.kind !== L.kind);
    if (changed) flash = kick(lt, 12);
  }
  ctx.restore();
  if (flash > 0.01) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`; ctx.fillRect(0, 0, W, H); }
  chrome(t);
  ctx.save(); ctx.globalAlpha = 0.03; ctx.translate(Math.floor(rnd(Math.floor(t * 10)) * 256), Math.floor(rnd(Math.floor(t * 10) + 5) * 256)); ctx.fillStyle = noisePat; ctx.fillRect(-256, -256, W + 512, H + 512); ctx.restore();
}

// ---------- 渲染 / 预览 ----------
window.DURATION = DURATION;
window.loadLyrics = async (src) => {
  setLyrics(src);
  for (let t = 0; t < DURATION; t += 0.05) render(t);   // 先跑一遍收集用到的字
  const all = [...USED].join('');
  await document.fonts.load(`900 100px "Noto Sans SC"`, all);
  await document.fonts.load(`900 100px "Noto Sans KR"`, all);
  await document.fonts.ready;
  return DURATION;
};
window.frame = (t) => { render(t); return cv.toDataURL('image/jpeg', 0.93); };

if (!/render=1/.test(location.search)) {
  const audio = new Audio(); let playing = false, t0 = 0, base = 0, ready = false;
  document.getElementById('song').onchange = e => { audio.src = URL.createObjectURL(e.target.files[0]); };
  document.getElementById('lrc').onchange = async e => { await window.loadLyrics(await e.target.files[0].text()); ready = true; };
  fetch('APT_.lrc').then(r => r.text()).then(async s => { await window.loadLyrics(s); ready = true; }).catch(() => {});
  cv.onclick = () => {
    playing = !playing;
    if (audio.src) { playing ? audio.play() : audio.pause(); }
    else if (playing) t0 = performance.now() / 1000 - base;
  };
  const loop = () => {
    if (playing) base = audio.src ? audio.currentTime : (performance.now() / 1000 - t0) % DURATION;
    if (ready) render(base); else { bg('#111'); txt('请先选择歌词文件 APT_.lrc', 960, 540, 60, { fill: C.cream }); }
    requestAnimationFrame(loop);
  };
  loop();
} else {
  document.getElementById('bar').remove();
}
