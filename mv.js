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
let LINES = [], RUNS = [], GROUPS = [], END_START = 97;
const CUT = 96.9;   // 只做前半首：第二段副歌结束（“Hey so now you know the game” 之前）
let NOW = 0;

function kindOf(s) {
  const r = [
    [/club/i, 'club'], [/아파트/, 'chant'], [/^uh/i, 'uh'], [/meet me/i, 'meet'],
    [/kissy/i, 'kissy'], [/phone/i, 'phone'], [/lips/i, 'kissReal'], [/hearts/i, 'hearts'], [/what i'?m on/i, 'on'],
    [/feel/i, 'feel'], [/^oh/i, 'oh'], [/want me/i, 'want'], [/need me/i, 'need'], [/sleep/i, 'sleep'],
    [/whatever/i, 'whatever'], [/party/i, 'party'], [/건배/, 'cheers'],
  ];
  for (const [re, k] of r) if (re.test(s)) return k;
  return 'plain';
}
const JOIN_PREV = new Set(['on', 'oh']);

function setLyrics(src) {
  const dec = s => s.replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).trim();
  const raw = [];
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (m) raw.push({ t: +m[1] * 60 + +m[2], text: dec(m[3]) });
  }
  LINES = raw.filter(l => l.t >= 6.5 && l.text);          // 跳过歌名、作词作曲
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
  LINES = LINES.filter(L => L.t < CUT);
  // “아파트”段落
  RUNS = [];
  LINES.forEach((L, i) => {
    const prev = LINES[i - 1];
    if (L.kind === 'chant' || (L.kind === 'uh' && prev && prev.run)) {
      let run = prev && prev.run;
      if (!run) { run = { start: L.t, idx: RUNS.length, uhSeen: 0, hits: [] }; RUNS.push(run); }
      L.run = run; L.sub = run.uhSeen;
      if (L.kind === 'uh') run.uhSeen++;
      if (L.kind === 'chant') L.words.forEach(w => run.hits.push(w.t));
    }
  });
  // 画面分组：一组歌词共用一个版面，元素逐步累积
  GROUPS = []; let g = null;
  LINES.forEach(L => {
    if (L.run) {
      const key = `run${L.run.idx}-${L.sub}`;
      if (!g || g.key !== key) { g = { key, kind: L.run.idx === 0 ? 'chant0' : 'chorus', sub: L.sub, run: L.run, lines: [], start: L.t }; GROUPS.push(g); }
    } else if (!(JOIN_PREV.has(L.kind) && g && !g.run)) { g = { key: null, kind: L.kind, lines: [], start: L.t }; GROUPS.push(g); }
    g.lines.push(L); g.end = L.end; L.group = g;
  });
  END_START = LINES[LINES.length - 1].end;
  DURATION = END_START + 3.6;
  window.DURATION = DURATION;
}

// ---------- 排版工具 ----------
const wt = (L, i) => (L && L.words[i] ? L.words[i].t : 1e9);
const lastIdx = (arr, t) => { let k = -1; arr.forEach((x, i) => { if (t >= x.t) k = i; }); return k; };

// 小字：逐字打出来
function typeWords(L, i0, i1, x, y, size, o = {}) {
  if (!L) return;
  const ws = L.words.slice(i0, i1); if (!ws.length) return;
  const full = ws.map(w => w.w).join(' ');
  USED.add(full);
  let vis = '';
  ws.forEach((w, j) => {
    if (NOW < w.t) return;
    const ch = [...w.w], n = Math.min(ch.length, Math.floor((NOW - w.t) / 0.035) + 1);
    vis += (j ? ' ' : '') + ch.slice(0, n).join('');
  });
  if (!vis) return;
  const fw = measure(full, size);
  const x0 = o.align === 'right' ? x - fw : o.align === 'center' ? x - fw / 2 : x;
  txt(vis, x0, y, size, { fill: o.fill || C.ink, align: 'left', alpha: o.alpha });
}
function typeStr(s, t0, x, y, size, o = {}) {
  USED.add(s);
  if (NOW < t0) return;
  const ch = [...s], n = Math.min(ch.length, Math.floor((NOW - t0) / (o.cps ?? 0.035)) + 1);
  const fw = measure(s, size, o.mono);
  const x0 = o.align === 'right' ? x - fw : o.align === 'center' ? x - fw / 2 : x;
  txt(ch.slice(0, n).join(''), x0, y, size, { fill: o.fill || C.ink, align: 'left', mono: o.mono, weight: o.weight });
}

// 大字：从大到小砸进来，带运动模糊和立体厚度
function bigWord(s, x, y, size, t0, o = {}) {
  const k = (NOW - t0) / 0.22; if (k < 0) return;
  const e = eOut(k), blur = (1 - e) * 26;
  const sc = lerp(o.from ?? 2.3, 1, e) * (1 + (o.retrig != null ? kick(NOW - o.retrig, 10) * 0.07 : 0));
  ctx.save();
  if (blur > 0.6) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.globalAlpha *= clamp(k * 4) * (o.alpha ?? 1);
  txt(s, x, y, size, { fill: o.face || C.orange, depth: Math.round(size * (o.depthK ?? 0.085)), depthColor: o.side || C.ink, dx: 0.8, dy: 1, scale: sc, rot: o.rot || 0 });
  ctx.restore();
}

// 背景
function paper() {
  const g = ctx.createRadialGradient(960, 470, 150, 960, 540, 1250);
  g.addColorStop(0, '#F5F3EF'); g.addColorStop(0.6, '#E6E3DD'); g.addColorStop(1, '#BDB8B0');
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
}
function darkBG(c0 = '#2A2A30', c1 = '#0B0B0D') {
  const g = ctx.createRadialGradient(960, 500, 100, 960, 540, 1200);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
}
function splitBG(left = '#E9E6E0', right = C.blue, dim = 0) {
  paper();
  if (left !== '#E9E6E0') { ctx.fillStyle = left; ctx.fillRect(-200, -200, W + 400, H + 400); }
  ctx.fillStyle = right; ctx.beginPath(); ctx.moveTo(1010, -50); ctx.lineTo(W + 50, -50); ctx.lineTo(W + 50, H + 50); ctx.lineTo(900, H + 50); ctx.fill();
  if (dim) { ctx.fillStyle = `rgba(0,0,0,${dim})`; ctx.fillRect(-200, -200, W + 400, H + 400); }
}
// 波点：越靠近中心越大
function dotField(cx, cy, R, color, step = 30, base = 2.2) {
  for (let x = step / 2; x < W; x += step) for (let y = step / 2; y < H; y += step) {
    const d = Math.hypot(x - cx, y - cy), s = Math.max(0, 1 - d / R) * 9 + base * (d < R * 1.6 ? 1 : 0);
    if (s < 0.6) continue;
    ctx.fillStyle = d < R ? color : 'rgba(120,115,110,.35)';
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
}
function plus(x, y, s, c) { ctx.fillStyle = c; ctx.fillRect(x - s * 1.5, y - s / 2, s * 3, s); ctx.fillRect(x - s / 2, y - s * 1.5, s, s * 3); }
function sparkles(cx, cy, R, cols = [C.orange, C.ink]) {
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * 6.28 + 0.4, on = Math.sin(NOW * 5 + i * 2.1) > -0.2;
    if (on) plus(cx + Math.cos(a) * R * (0.9 + rnd(i) * 0.3), cy + Math.sin(a) * R * 0.75, 6, cols[i % cols.length]);
  }
}
function star4(x, y, s, c) {
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
}

// 聊天气泡一排，越来越大
function bubbleRow(L, i0, i1, x, y, sizes, col = C.blue) {
  for (let j = i0; j < i1; j++) {
    const s = sizes[Math.min(j - i0, sizes.length - 1)], w = measure(L.words[j].w, s) + s * 0.8;
    if (NOW >= wt(L, j)) bubble(L.words[j].w, x + w / 2, y + (sizes[sizes.length - 1] - s) * 0.4, s, { scale: pop(NOW - wt(L, j), 0.2), bg: col });
    x += w + 16;
  }
  return x;
}

// 对话框
function dialog(cx, cy, w, h, title, t0, o = {}) {
  const a = eOut((NOW - t0) / 0.2); if (NOW < t0) return null;
  const y = cy + (1 - a) * 40;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(cx - w / 2 + 16, y - h / 2 + 16, w, h);
  ctx.fillStyle = '#FAFAF8'; ctx.fillRect(cx - w / 2, y - h / 2, w, h);
  ctx.fillStyle = '#E4E2DD'; ctx.fillRect(cx - w / 2, y - h / 2, w, 46);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.strokeRect(cx - w / 2, y - h / 2, w, h);
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx - w / 2 + 30 + i * 28, y - h / 2 + 23, 9, 0, 7); ctx.fill(); });
  ctx.restore();
  txt(title, cx, y - h / 2 + 24, 20, { fill: '#555', mono: true, weight: 700, alpha: a });
  return { x: cx - w / 2, y: y - h / 2, w, h, a };
}
function button(x, y, w, h, label, hot, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = C.ink; ctx.fillRect(x + 5, y + 5, w, h);
  ctx.fillStyle = hot ? C.ink : '#FAFAF8'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(x, y, w, h);
  ctx.restore();
  txt(label, x + w / 2, y + h / 2 + 2, h * 0.5, { fill: hot ? C.white : C.ink, alpha: a });
}
function cursor(x, y) {
  ctx.fillStyle = C.ink; ctx.strokeStyle = C.white; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 52); ctx.lineTo(x + 14, y + 40); ctx.lineTo(x + 24, y + 62); ctx.lineTo(x + 32, y + 58); ctx.lineTo(x + 22, y + 37); ctx.lineTo(x + 38, y + 37); ctx.closePath(); ctx.stroke(); ctx.fill();
}
function heartLine(s, cx, y, size, t0, color = C.pink) {
  if (NOW < t0) return;
  const sc = pop(NOW - t0, 0.25), w = measure(s, size);
  txt(s, cx, y, size, { fill: color, scale: sc });
  heart(cx - (w / 2 + 50) * sc, y, 6 * sc, color); heart(cx + (w / 2 + 50) * sc, y, 6 * sc, color);
}

// 卡片
const ICONS = {
  code: ['XXXXXXXX', 'X......X', 'X.X....X', 'X..X...X', 'X.X.XX.X', 'X......X', 'XXXXXXXX'],
  art: ['XXXXXXXX', 'X.....XX', 'X......X', 'X..X...X', 'X.XXX.XX', 'XXXXXXXX', 'XXXXXXXX'],
  chat: ['XXXXXXX.', 'X.....X.', 'X.X.X.X.', 'X.....X.', 'XXXXXXX.', 'XX......', 'X.......'],
  hug: HEART,
};
// 卡片（sx 用来做翻牌）
function card(cx, cy, word, label, icon, color, t0, rot = 0, sx = 1) {
  if (NOW < t0) return;
  const s = pop(NOW - t0, 0.25);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s * sx, s);
  rrect(-120 + 10, -160 + 10, 240, 320, 22, C.ink);
  rrect(-120, -160, 240, 320, 22, '#FBFAF7', color, 10);
  if (icon) { rrect(-90, -130, 180, 110, 10, '#2A2A30'); pixelArt(ICONS[icon], -ICONS[icon][0].length * 6, -75 - ICONS[icon].length * 6, 12, color); }
  ctx.restore();
  txt(word, cx, cy + (icon ? 50 : 0) * s, icon ? 70 : 62, { fill: C.ink, scale: s, sx, rot });
  if (label) { const lw = measure(label, 26) + 30; ctx.save(); ctx.translate(cx, cy + 122 * s); ctx.scale(s * sx, s); rrect(-lw / 2, -20, lw, 40, 20, color); ctx.restore(); txt(label, cx, cy + 123 * s, 26, { fill: C.white, scale: s, sx }); }
}
Object.assign(ICONS, {
  cup: ['X......X', 'X......X', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..'],
  note: ['...XXXX', '...X..X', '...X..X', 'XXXX.XX', 'XXX..XX'],
  cloud: ['..XXX...', '.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.'],
  spiral: ['XXXXXXX', 'X.....X', 'X.XXX.X', 'X.X.X.X', 'X.X...X', 'X.XXXXX'],
});
const ITEMS = {
  duck: { px: ['..XX....', '.XXXX...', '.XXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..'], c: C.yellow },
  ufo: { px: ['...XX...', '..XXXX..', 'XXXXXXXX', 'X.X..X.X', '.XXXXXX.', '..X..X..'], c: '#9AA3B5' },
  cactus: { px: ['...XX...', 'X..XX...', 'X..XX..X', 'XXXXX..X', '...XXXXX', '...XX...', '...XX...'], c: C.green },
  sock: { px: ['..XXX', '..XXX', '..XXX', '..XXX', 'XXXXX', 'XXXX.'], c: C.red },
  tooth: { px: ['XXXXXX', 'XXXXXX', 'XXXXXX', 'XX..XX', 'X....X'], c: C.white },
  fish: { px: ['..XXX..X', '.XXXXXXX', 'XXX.XXX.', '.XXXXXXX', '..XXX..X'], c: C.orange },
};

function kissFace(x, y, r, o = {}) {
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.lineWidth = r * 0.07; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.12, r * 0.16, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.22, -r * 0.3); ctx.lineTo(r * 0.45, -r * 0.15); ctx.lineTo(r * 0.22, 0); ctx.stroke();
  ctx.fillStyle = '#E2245A'; ctx.beginPath(); ctx.ellipse(0, r * 0.4, r * 0.16, r * 0.12, 0, 0, 7); ctx.fill();
  ctx.restore();
  heart(x + r * 0.95, y + r * 0.3, r * 0.07, C.red);
}
function lips(x, y, s, rot = 0, a = 0.85) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = `rgba(220,30,80,${a})`;
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.quadraticCurveTo(-30, -38, 0, -10); ctx.quadraticCurveTo(30, -38, 60, 0); ctx.quadraticCurveTo(0, 8, -60, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-60, 4); ctx.quadraticCurveTo(0, 58, 60, 4); ctx.quadraticCurveTo(0, 16, -60, 4); ctx.fill();
  ctx.restore();
}
function phoneBody(x, y, s, screen = '#F7F5F0') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(-205 + 14, -400 + 14, 410, 800, 56, 'rgba(0,0,0,.25)');
  rrect(-205, -400, 410, 800, 56, C.ink);
  rrect(-185, -370, 370, 740, 40, screen);
  rrect(-60, -362, 120, 26, 13, C.ink);
  rrect(-40, 385, 80, 12, 6, '#555');
  ctx.restore();
}
const MOOD = ['normal', 'happy', 'shock', 'squint'];

// ---------- 公寓 / 叠楼 ----------
const BLD = [C.orange, C.blue, C.yellow, '#E8789A', C.cream, C.green];
function bldg(x, by, w, h, ci, o = {}) {
  const col = BLD[ci % BLD.length];
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - w / 2 + 10, by - h + 10, w, h);
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, by - h, w, h);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.strokeRect(x - w / 2, by - h, w, h);
  ctx.fillStyle = C.ink; ctx.fillRect(x - w / 2 - 10, by - h - 12, w + 20, 14);
  const cols = Math.max(2, Math.floor(w / 85)), rows = Math.max(1, Math.floor((h - 24) / 62));
  const cw = (w - 40) / cols, rh = (h - 24) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const lit = o.hue != null ? `hsl(${(o.hue + c * 60 + r * 40) % 360},90%,62%)` : (rnd(ci * 31 + r * 7 + c) > 0.35 ? C.yellow : '#3A3F63');
    ctx.fillStyle = lit; ctx.fillRect(x - w / 2 + 20 + c * cw + 8, by - h + 16 + r * rh, cw - 16, rh - 16);
  }
  if (o.face) {   // 楼也会唱歌
    const ey = by - h * 0.62, m = o.mouth ?? 0.5;
    ctx.fillStyle = C.ink;
    ctx.fillRect(x - w * 0.22 - 12, ey - 26, 24, 52); ctx.fillRect(x + w * 0.22 - 12, ey - 26, 24, 52);
    ctx.beginPath(); ctx.ellipse(x, by - h * 0.28, w * 0.13, Math.max(4, h * 0.16 * m), 0, 0, 7); ctx.fill();
  }
}
const towerSpec = i => ({ w: 300 + rnd(i * 1.7) * 150, h: 125 + rnd(i * 2.3 + 5) * 55, dx: (rnd(i * 3.1 + 9) - 0.5) * 80 });
// 楼一栋栋砸到小螃蟹头上
function tower(cx, baseY, hits, t, o = {}) {
  const n = hits.filter(h => t >= h.t).length;
  const last = n ? hits[n - 1].t : -9;
  const land = (t - last) / 0.22;
  const hitK = land >= 1 ? kick(t - last - 0.22, 8) : 0;
  let total = 0; for (let i = 0; i < n; i++) total += towerSpec(i).h + 12;
  const cam = Math.max(0, total - 640);
  ctx.save(); ctx.translate(0, cam);
  const p = 12, headY = baseY - 9 * p * (1 - hitK * 0.25);
  crab(cx, baseY, p, { expr: n > 3 ? 'squint' : n ? 'shock' : 'normal', sweat: n > 2, squash: hitK * 0.25 + Math.min(0.12, n * 0.02), legs: o.dance ? beatAt(t) : 0 });
  const sway = Math.sin(t * 2.4) * 0.008 * n + (o.dance ? Math.sin(beatAt(t) * Math.PI) * 0.05 : 0);
  ctx.translate(cx, headY); ctx.rotate(sway);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const sp = towerSpec(i);
    let off = 0;
    if (i === n - 1 && land < 1) off = -(1 - land) * (1 - land) * 1100;
    ctx.save();
    if (o.dance) { ctx.translate(sp.dx, y); ctx.rotate(Math.sin(beatAt(t) * Math.PI + i * 0.8) * 0.06); ctx.translate(-sp.dx, -y); }
    bldg(sp.dx, y + off, sp.w, sp.h, i, { face: o.dance, mouth: Math.abs(Math.sin((t + i * 0.13) * 9)) });
    ctx.restore();
    y -= sp.h + 12;
  }
  ctx.restore();
  return { n, landed: land >= 1 && land < 1.6 ? 1 - (land - 1) / 0.6 : 0, top: headY + y + cam };
}

// ---------- 版面 ----------
const P = {};

// “아파트” × 开头两段
P.chant0 = (t, G) => {
  const uh = G.lines.find(L => L.kind === 'uh');
  const hits = G.lines.filter(L => L.kind === 'chant').flatMap(L => L.words);
  const k = lastIdx(hits, t), inUh = uh && t >= uh.t;
  if (G.sub === 0) {
    paper(); dotField(960, 560, 520, 'rgba(217,119,87,.7)');
    const slots = [[110, 150, 'left'], [1810, 150, 'right'], [110, 290, 'left'], [1810, 290, 'right'], [110, 960, 'left'], [1810, 960, 'right']];
    hits.forEach((h, i) => typeStr(h.w, h.t, slots[i][0], slots[i][1], 96, { align: slots[i][2] }));
    tower(960, 1040, hits.map(h => ({ t: h.t + 0.0 })), t, { dance: inUh });
    if (k >= 0 && !inUh) bigWord(hits[k].w, k % 2 ? 1530 : 390, 600, 190, hits[k].t, { face: k % 2 ? C.ink : C.orange, side: k % 2 ? C.orange : C.ink, rot: (k % 2 ? 1 : -1) * 0.05 });
    if (inUh) uh.words.forEach((w, i) => { if (t >= w.t) bubble(w.w, i % 2 ? 1450 : 470, 520 - i * 50, 70 + i * 12, { scale: pop(t - w.t, 0.2), bg: [C.blue, C.orange][i % 2] }); });
  } else {
    // 钳子一层层往上叠，一直叠到戳中月亮
    splitBG();
    const n = hits.filter(h => t >= h.t).length;
    const moonHit = n >= hits.length ? hits[hits.length - 1].t : 1e9;
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0, y = 1000 - i * 92, kk = eOut((t - hits[i].t) / 0.15);
      const tip = left ? lerp(-300, 900, kk) : lerp(W + 300, 1020, kk);
      const wob = inUh ? Math.sin(beatAt(t) * Math.PI + i) * 20 : 0;
      ctx.fillStyle = left ? C.orange : '#E8789A';
      if (left) ctx.fillRect(-50, y - 26 + wob, tip + 50, 52); else ctx.fillRect(tip, y - 26 + wob, W + 50 - tip, 52);
      const px = left ? tip : tip - 110;
      ctx.fillRect(px, y - 48 + wob, 110, 96);
      ctx.fillStyle = left ? '#E9E6E0' : C.blue; ctx.fillRect(left ? px + 55 : px, y - 10 + wob, 55, 20);
    }
    // 月亮
    const mk = t >= moonHit ? kick(t - moonHit, 5) : 0;
    ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(960 + mk * 20, 210 - mk * 40, 120, 0, 7); ctx.fill();
    ctx.fillStyle = C.ink;
    if (t >= moonHit) { ctx.fillRect(915, 175, 22, 22); ctx.fillRect(985, 175, 22, 22); ctx.beginPath(); ctx.arc(960, 250, 22, 0, 7); ctx.fill(); txt('!', 1110, 120, 100, { fill: C.red, scale: pop(t - moonHit, 0.2) }); }
    else { ctx.fillRect(915, 190, 22, 8); ctx.fillRect(985, 190, 22, 8); }
    if (t >= moonHit) { ctx.fillStyle = C.orange; ctx.fillRect(930, 330, 60, eOut((t - moonHit) / 0.12) * 300); }
    const L1 = hits.filter((h, i) => i % 2 === 0);
    if (L1.length && t >= L1[0].t) typeStr('아파트', L1[0].t, 110, 150, 96);
    const R1 = hits.filter((h, i) => i % 2 === 1);
    if (R1.length && t >= R1[0].t) typeStr('APT.', R1[0].t, 1810, 150, 96, { fill: C.cream, align: 'right' });
    if (inUh) uh.words.forEach((w, i) => { if (t >= w.t) bubble(w.w, 1250 + (i % 3) * 170, 160 + Math.floor(i / 3) * 120 + i * 10, 60 + i * 10, { scale: pop(t - w.t, 0.2), bg: [C.orange, C.ink, C.pink][i % 3] }); });
  }
};

// Kissy face —— 😘 越长越大，满屏亲
P.kissy = (t, G) => {
  const L = G.lines[0], d = L.end - L.t, k = clamp((t - L.t) / d);
  paper(); dotField(1460, 560, 430, 'rgba(232,120,154,.8)');
  typeWords(L, 0, 2, 110, 150, 104);
  bigWord('KISSY', 620, 560, 290, wt(L, 2), { face: C.orange, side: C.ink, rot: -0.03 });
  typeWords(L, 3, 4, 1810, 150, 104, { align: 'right' });
  const marks = [[330, 150, -0.3, wt(L, 1)], [520, 500, 0.2, wt(L, 2) + 0.2], [820, 620, -0.15, wt(L, 3)], [1690, 150, 0.25, wt(L, 3) + 0.2]];
  crab(lerp(1460, 1760, k), 690 + Math.abs(Math.sin(t * 14)) * -10, 13, { expr: 'shock', sweat: true, legs: t * 12, blush: true });
  const r = lerp(40, 330, eIn(k));
  const ex = lerp(1460, 760, k) + Math.sin(k * 9) * 200, ey = 560 + Math.cos(k * 7) * 160;
  kissFace(ex, ey, r, { rot: Math.sin(t * 6) * 0.15 });
  marks.forEach(([x, y, rot, mt]) => { if (t >= mt) lips(x, y, 1.1 * pop(t - mt, 0.15), rot); });
};

// Sent to your phone —— 小螃蟹钻进充电口，被当成消息发出去
P.phone = (t, G) => {
  const L = G.lines[0], d = L.end - L.t, k = (t - L.t) / d;
  splitBG('#E9E6E0', C.blue);
  typeWords(L, 0, 3, 110, 150, 104);
  bigWord('PHONE', 540, 560, 230, wt(L, 3), { face: C.ink, side: C.orange, rot: -0.03 });
  typeWords(L, 4, 5, 540, 790, 120, { align: 'center' });
  phoneBody(1350, 560, 1);
  // 走向充电口，越来越小
  if (k < 0.5) {
    const wk = clamp(k / 0.5);
    crab(lerp(860, 1350, wk), lerp(1030, 975, wk), lerp(10, 1.5, eIn(wk)), { expr: 'happy', legs: t * 14 });
  }
  if (k > 0.45) {
    const sk = clamp((k - 0.45) / 0.35);
    const by = t >= wt(L, 4) ? lerp(lerp(860, 420, sk), -300, eIn((t - wt(L, 4)) / 0.35)) : lerp(860, 420, eOut(sk));
    ctx.save(); ctx.beginPath(); ctx.roundRect(1350 - 185, 560 - 370, 370, 740, 40); ctx.clip();
    rrect(1350 - 130, by - 110, 260, 200, 40, C.blue);
    crab(1350, by + 50, 7, { expr: 'happy', blush: true, armL: 1, armR: 1 });
    ctx.restore();
    if (t >= wt(L, 4)) {
      txt('✓✓ 已送达', 1350, 870, 30, { fill: '#888', mono: true, weight: 700 });
      for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(47,91,234,.6)'; ctx.fillRect(1240 + i * 50, 140 - ((t - wt(L, 4)) * 900 + i * 40) % 300, 8, 60); }
    }
  }
};

// I'm trying to kiss your lips for real —— 打碎屏幕钻出来亲镜头
P.kissReal = (t, G) => {
  const L = G.lines[0];
  const crack = wt(L, 5), brk = wt(L, 7);
  bg(brk <= t ? '#1A1416' : '#F7F5F0');
  if (t < brk) {
    const near = clamp((t - L.t) / (crack - L.t));
    crab(1360, 760 + near * 160, lerp(14, 34, eIn(near)), { expr: 'blink', blush: true });
    if (t >= crack) {
      ctx.strokeStyle = 'rgba(30,30,30,.8)'; ctx.lineWidth = 4;
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; ctx.beginPath(); ctx.moveTo(1360, 520); let x = 1360, y = 520; for (let j = 0; j < 4; j++) { x += Math.cos(a + (rnd(i * 4 + j) - 0.5)) * 90; y += Math.sin(a + (rnd(i * 4 + j + 1) - 0.5)) * 90; ctx.lineTo(x, y); } ctx.stroke(); }
    }
    // 手机边框（整个画面就是手机屏幕）
    ctx.strokeStyle = C.ink; ctx.lineWidth = 80; ctx.strokeRect(0, 0, W, H);
    rrect(860, 30, 200, 34, 17, C.ink);
    typeWords(L, 0, 3, 120, 170, 100);
    bigWord('KISS', 560, 560, 300, wt(L, 3), { face: C.orange, side: C.ink, rot: -0.03 });
    typeWords(L, 4, 6, 1800, 170, 100, { align: 'right' });
    typeWords(L, 6, 7, 960, 930, 120, { align: 'right' });
  } else {
    const bt = t - brk;
    // 碎片飞出
    for (let i = 0; i < 26; i++) {
      const a = rnd(i) * 6.28, d = bt * (900 + rnd(i + 1) * 900), x = 960 + Math.cos(a) * d, y = 540 + Math.sin(a) * d + bt * bt * 600;
      ctx.save(); ctx.translate(x, y); ctx.rotate(bt * 6 + i); ctx.fillStyle = 'rgba(240,240,245,.85)'; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(36, 30); ctx.lineTo(-30, 24); ctx.fill(); ctx.restore();
    }
    const z = eIn(clamp(bt / 0.35));
    if (bt < 0.4) crab(960, 900 + z * 900, 34 + z * 120, { expr: 'blink', blush: true });
    if (bt >= 0.32) {
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, 0, W, H);
      lips(960, 520, 4.2 * pop(bt - 0.32, 0.15), -0.08, 0.9);
      ctx.fillStyle = 'rgba(220,30,80,.18)'; ctx.beginPath(); ctx.ellipse(1060, 600, 380, 120, -0.2, 0, 7); ctx.fill();
    }
    typeWords(L, 6, 7, 760, 930, 120, { align: 'right', fill: C.cream });
    tile(L.words[7].w, 940, 930, 120, { bg: C.yellow, fill: C.ink, shadow: '#000', scale: pop(bt) });
  }
};

// Red hearts / That's what I'm on yeah —— 爱心火箭
P.hearts = (t, G) => {
  const L = G.lines.find(l => l.kind === 'hearts'), O = G.lines.find(l => l.kind === 'on');
  if (!O || t < O.t) {
    splitBG();
    typeWords(L, 0, 2, 110, 150, 104);
    bigWord('RED', 470, 560, 290, wt(L, 0), { face: C.ink, side: C.red, rot: -0.03 });
    const pump = 1 + kick(beatFrac(t) * SPB, 8) * 0.1;
    if (t >= wt(L, 1)) heart(1450, 560, 30 * pop(t - wt(L, 1), 0.3) * pump, C.red);
    if (t >= wt(L, 3)) heart(1450, 560, 18 * pop(t - wt(L, 3), 0.3) * pump, C.pink);
    typeWords(L, 2, 4, 1810, 150, 104, { align: 'right', fill: C.cream });
    crab(1450, 1000, 10, { expr: 'happy', blush: true });
  } else {
    const k = t - O.t;
    bg('#0E1230');
    for (let i = 0; i < 90; i++) { const y = (rnd(i) * H + k * (600 + rnd(i + 2) * 900)) % H; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(rnd(i + 5) * W, y, 3, 10 + k * 20); }
    ctx.fillStyle = '#C9A7FF'; ctx.beginPath(); ctx.arc(300, 1200 + k * 500, 300, 0, 7); ctx.fill();
    const rx = 1350 + Math.sin(t * 7) * 10, ry = 600 - eOut(k / 0.4) * 60;
    for (let i = 0; i < 6; i++) { ctx.fillStyle = [C.yellow, C.orange, C.red][i % 3]; const fl = 80 + rnd(Math.floor(t * 30) + i) * 120; ctx.fillRect(rx - 60 + i * 20, ry + 150, 16, fl); }
    heart(rx, ry, 30, C.red);
    crab(rx, ry - 160, 9, { expr: 'cool', armL: 1, armR: 1 });
    typeWords(O, 0, 4, 110, 150, 104, { fill: C.cream });
    bigWord('YEAH', 560, 600, 280, wt(O, 4), { face: C.yellow, side: '#000', rot: -0.05 });
  }
};

// Come give me something I can feel —— 天上伸下一根手指戳螃蟹
const FEELERR = ['无法感受', '我只是个模型', '缺少触觉驱动', 'feel.dll 未找到', '请稍后再摸'];
P.feel = (t, G) => {
  const L = G.lines.find(l => l.kind === 'feel'), O = G.lines.find(l => l.kind === 'oh');
  paper();
  typeWords(L, 0, 4, 110, 150, 100);
  bigWord('FEEL', 520, 600, 280, wt(L, L.words.length - 1), { face: C.orange, side: C.ink, rot: -0.04 });
  const pokeT = wt(L, L.words.length - 1);
  const fk = clamp((t - wt(L, 3)) / (pokeT - wt(L, 3)));
  const fy = lerp(-700, 560, eIn(fk)) - (t > pokeT ? Math.max(0, Math.sin((t - pokeT) * 12)) * 60 : 0);
  // 手指
  ctx.fillStyle = '#F1C6A0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(1330, fy - 900, 170, 900, 80); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FBE3D2'; ctx.beginPath(); ctx.roundRect(1360, fy - 140, 110, 110, 40); ctx.fill(); ctx.stroke();
  const poked = t >= pokeT;
  crab(1415, 1010, 14, { expr: poked ? 'squint' : 'normal', squash: poked ? kick(t - pokeT, 6) * 0.35 + 0.08 : 0, blush: poked });
  if (poked) for (let i = 0; i < 3; i++) txt('哈', 1640 + i * 50, 820 - i * 70 - ((t * 2 + i * 0.3) % 1) * 40, 50, { fill: C.orange, rot: 0.2 });
  const ohs = O ? O.words : [];
  const burst = ohs.length && t >= ohs[0].t ? ohs[0].t : 1e9;
  FEELERR.forEach((m, i) => {
    const at = wt(L, Math.min(L.words.length - 1, 3 + i)) + i * 0.05;
    if (t < at) return;
    const x = 560 + i * 90, y = 360 + i * 80;
    if (t < burst) errWin(x + 150, y, 560, 150, 'error', m, { scale: pop(t - at, 0.12), head: i % 2 ? C.red : C.blue });
  });
  ohs.forEach((w, j) => {
    if (t < w.t) return;
    const bt = t - w.t;
    for (let i = 0; i < 40; i++) { const a = rnd(i + j * 50) * 6.28, d = bt * (500 + rnd(i) * 700); ctx.save(); ctx.translate(800 + j * 200 + Math.cos(a) * d, 500 + Math.sin(a) * d + bt * bt * 700); ctx.rotate(bt * 8 + i); ctx.fillStyle = [C.orange, C.blue, C.yellow, C.pink, C.green][i % 5]; ctx.fillRect(-12, -6, 24, 12); ctx.restore(); }
    txt(w.w, 700 + j * 280, 380 + (j % 2) * 120, 160, { fill: C.ink, depth: 12, depthColor: C.orange, scale: pop(bt, 0.2) });
  });
};

// Don't you want me like I want you baby —— 聊天气泡打拳击
P.want = (t, G) => {
  const L = G.lines[0];
  paper();
  typeWords(L, 0, 4, 110, 150, 96);
  typeWords(L, 4, 8, 1810, 150, 96, { align: 'right' });
  const t1 = wt(L, 2), t2 = wt(L, 6), baby = wt(L, 8);
  const lk = eOut(clamp((t - t1) / 0.3)), rk = eOut(clamp((t - t2) / 0.3));
  const knock = t >= t2 + 0.3 ? kick(t - t2 - 0.3, 4) : 0;
  const lx = lerp(420, 800, lk) - knock * 260 * (t >= t2 ? 1 : 0), rx = lerp(1500, 1120, rk);
  crab(300, 960, 13, { expr: knock > 0.3 ? 'dead' : 'squint', armR: 1, blush: t >= baby });
  crab(1620, 960, 13, { expr: 'squint', armL: 1, color: '#E8789A', bow: true, blush: t >= baby });
  if (t >= t1) bubble('want', lx, 700, 100, { bg: C.blue, scale: 1 + kick(t - t1 - 0.3, 8) * 0.2 });
  if (t >= t2) bubble('want', rx, 700, 100, { bg: C.pink, scale: 1 + kick(t - t2 - 0.3, 8) * 0.2 });
  if (t >= t2 + 0.3 && t < t2 + 0.8) { const s = pop(t - t2 - 0.3, 0.12); ctx.save(); ctx.translate(960, 640); ctx.scale(s, s); ctx.fillStyle = C.yellow; ctx.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 90 : 190, a = i / 16 * 6.28; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.7); } ctx.fill(); ctx.restore(); txt('POW!', 960, 645, 80, { fill: C.red, scale: s }); }
  bigWord('baby', 960, 420, 280, baby, { face: C.pink, side: C.ink, rot: -0.04 });
  if (t >= baby) for (let i = 0; i < 8; i++) heart(960 + Math.cos(i + t * 2) * 420, 420 + Math.sin(i + t * 2) * 180, 7, C.pink);
};

// Don't you need me like I need you now —— 卡片全换成“抱抱”
P.need = (t, G) => {
  const L = G.lines[0];
  paper();
  typeWords(L, 0, 4, 110, 150, 96);
  typeWords(L, 4, 8, 1810, 150, 96, { align: 'right' });
  const now = wt(L, 8);
  const cards = [['code', 'code?', C.blue], ['art', 'art?', C.green], ['chat', 'words?', C.orange], ['hug', 'hug?', C.pink]];
  cards.forEach(([ic, lb, col], i) => {
    const ft = now + i * 0.06, fk = clamp((t - ft) / 0.25), sx = Math.abs(Math.cos(fk * Math.PI));
    const flipped = fk > 0.5;
    card(420 + i * 300, 560, 'need', flipped ? 'hug!' : lb, flipped ? 'hug' : ic, flipped ? C.pink : col, wt(L, 4 + i), (i - 1.5) * 0.04, Math.max(0.02, sx));
  });
  bigWord('NOW', 1600, 640, 230, now, { face: C.orange, side: C.ink, rot: 0.05 });
  const hugging = t >= now + 0.3;
  crab(hugging ? 1600 : 1640, 1010, 12, { expr: hugging ? 'happy' : 'normal', armL: hugging ? 1 : 0, armR: hugging ? 1 : 0, blush: hugging });
  if (hugging) for (let i = 0; i < 4; i++) heart(420 + i * 300, 330 - ((t - now) * 120 + i * 30) % 120, 7, C.pink);
};

// Sleep tomorrow but tonight go crazy —— 砸闹钟，月亮当 DJ，星星蹦迪
P.sleep = (t, G) => {
  const L = G.lines[0];
  const smash = wt(L, 3), go = wt(L, 4), crazy = wt(L, 5);
  const party = t >= crazy;
  bg(party ? ['#2A0F3A', '#0F2A3A', '#3A0F1A'][Math.floor(beatAt(t) * 2) % 3] : '#141933');
  // 星星
  for (let i = 0; i < 18; i++) {
    const x = 120 + (i * 211) % 1700, y = 240 + (i * 97) % 300, j = party ? Math.abs(Math.sin(beatAt(t) * Math.PI + i)) * 40 : 0;
    star4(x, y - j, 16, C.yellow);
    if (party) { ctx.fillStyle = C.yellow; ctx.fillRect(x - 8, y - j + 14, 4, 16); ctx.fillRect(x + 4, y - j + 14, 4, 16); }
  }
  // 月亮 DJ
  ctx.fillStyle = '#F4E7B0'; ctx.beginPath(); ctx.arc(1480, 330, 120, 0, 7); ctx.fill();
  ctx.fillStyle = C.ink;
  if (t >= go) { ctx.fillRect(1395, 300, 70, 36); ctx.fillRect(1495, 300, 70, 36); ctx.fillRect(1465, 310, 30, 8); rrect(1300, 450, 360, 70, 10, '#333'); for (let i = 0; i < 2; i++) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(1380 + i * 200, 470, 50, 0, 7); ctx.fill(); ctx.strokeStyle = '#666'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(1380 + i * 200, 470, 30, t * 9, t * 9 + 4); ctx.stroke(); } }
  else { ctx.fillRect(1420, 320, 40, 8); ctx.fillRect(1500, 320, 40, 8); }
  // 床
  rrect(240, 860, 760, 110, 16, '#5D6BB0'); rrect(240, 820, 200, 80, 20, C.cream);
  const up = t >= smash;
  crab(up ? 640 : 380, up ? 860 - (party ? Math.abs(Math.sin(t * 9)) * 80 : 0) : 850, up ? 12 : 9, { expr: party ? 'cool' : up ? 'squint' : 'blink', horns: party, armR: up ? 1 : 0, rot: up ? 0 : -0.1 });
  if (!up) { rrect(420, 790, 560, 100, 30, C.blue); for (let i = 0; i < 3; i++) { const k = ((t - L.t) * 0.8 + i * 0.33) % 1; txt('Z', 420 + k * 120 + i * 30, 720 - k * 200, 40 + i * 14, { fill: C.cream, alpha: 1 - k, mono: true }); } }
  // 闹钟
  const shake = t < smash ? Math.sin(t * 60) * 6 : 0;
  if (t < smash) { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(1110 + shake, 800, 70, 0, 7); ctx.fill(); ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(1110 + shake, 800, 52, 0, 7); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(1110 + shake, 800); ctx.lineTo(1110 + shake, 765); ctx.moveTo(1110 + shake, 800); ctx.lineTo(1135 + shake, 812); ctx.stroke(); txt('RING!', 1110, 690, 40, { fill: C.red, rot: Math.sin(t * 30) * 0.1 }); }
  else { const k = t - smash; for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (rnd(i) - 0.5) * 3, d = k * (500 + rnd(i + 3) * 400); ctx.save(); ctx.translate(1110 + Math.cos(a) * d, 800 + Math.sin(a) * d + k * k * 1400); ctx.rotate(k * 10 + i); ctx.fillStyle = i % 3 ? C.red : '#888'; ctx.fillRect(-14, -14, 28, 28); ctx.restore(); } txt('BANG', 1110, 720, 70, { fill: C.yellow, depth: 6, scale: pop(k, 0.15), alpha: clamp(1 - k) }); }
  typeWords(L, 0, 2, 110, 150, 100, { fill: C.cream });
  typeWords(L, 2, 4, 1810, 150, 100, { align: 'right', fill: C.cream });
  typeWords(L, 4, 5, 420, 980, 110, { align: 'right', fill: C.cream });
  if (party) {
    const o = 6 + kick(beatFrac(t) * SPB, 8) * 18, s = 'CRAZY';
    bigWord(s, 980 - o, 960, 220, crazy, { face: 'rgba(255,40,90,.8)', side: 'rgba(0,0,0,0)', depthK: 0.001 });
    bigWord(s, 980 + o, 960, 220, crazy, { face: 'rgba(40,200,255,.8)', side: 'rgba(0,0,0,0)', depthK: 0.001 });
    bigWord(s, 980, 960, 220, crazy, { face: C.yellow, side: '#000' });
  }
};

// All you gotta do is just meet me at the —— 眼睛变成电梯门
P.meet = (t, G) => {
  const L = G.lines[0];
  bg(C.orange);
  ctx.fillStyle = 'rgba(0,0,0,.05)'; for (let x = 0; x < W; x += 60) for (let y = 0; y < H; y += 60) ctx.fillRect(x, y, 6, 6);
  const openT = L.end - 0.55, open = eOut(clamp((t - openT) / 0.25)), zoom = clamp((t - (L.end - 0.3)) / 0.3);
  ctx.save();
  if (zoom > 0) { const z = 1 + eIn(zoom) * 6; ctx.translate(620, 500); ctx.scale(z, z); ctx.translate(-620, -500); }
  const floor = Math.min(99, 1 + Math.floor(eIn(clamp((t - L.t) / (openT - L.t))) * 98));
  [[620, 'MEET', 6], [1300, 'ME', 7]].forEach(([x, word, wi]) => {
    // 楼层显示
    rrect(x - 70, 210, 140, 60, 8, C.ink);
    txt(`▲${String(floor).padStart(2, '0')}`, x, 242, 40, { fill: C.orange, mono: true, weight: 700 });
    // 电梯门
    ctx.fillStyle = C.ink; ctx.fillRect(x - 100, 300, 200, 420);
    ctx.fillStyle = '#FFF4C9'; ctx.fillRect(x - 85, 315, 170, 390);
    const dw = 85 * (1 - open);
    ctx.fillStyle = '#B9B6B0'; ctx.fillRect(x - 85, 315, dw, 390); ctx.fillRect(x + 85 - dw, 315, dw, 390);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(x - 85, 315, dw, 390); ctx.strokeRect(x + 85 - dw, 315, dw, 390);
    if (t >= wt(L, wi) && open < 0.5) [...word].forEach((c, i) => txt(c, x, 380 + i * 85 + (word.length < 4 ? 80 : 0), 76, { fill: C.ink, scale: pop(t - wt(L, wi) - i * 0.04, 0.18), alpha: 1 - open * 2 }));
  });
  if (t >= wt(L, 7)) { ctx.fillStyle = 'rgba(255,95,162,.55)'; ctx.fillRect(470, 760, 300, 40); ctx.fillRect(1150, 760, 300, 40); }
  ctx.restore();
  typeWords(L, 0, 6, 960, 130, 92, { align: 'center', fill: C.cream });
  typeWords(L, 8, 10, 960, 900, 150, { align: 'center', fill: C.ink });
  if (t >= openT) bubble('叮!', 1650, 260, 80, { bg: C.yellow, fill: C.ink, scale: pop(t - openT, 0.15) });
  if (zoom > 0) { ctx.fillStyle = `rgba(255,244,201,${eIn(zoom)})`; ctx.fillRect(0, 0, W, H); }
};

// 副歌：小螃蟹变成摩天楼，每层一个离谱房间 / 镜头拉远到螃蟹星球
const ROOMS = [['水族馆', 'aqua'], ['下雨的客厅', 'rain'], ['服务器机房', 'server'], ['迪斯科', 'disco'], ['室内森林', 'forest'], ['外太空', 'space'], ['泡泡浴', 'bath'], ['猫咪会议室', 'cats']];
function room(x, by, w, h, type, t) {
  const X = x - w / 2, Y = by - h;
  ctx.save(); ctx.beginPath(); ctx.rect(X, Y, w, h); ctx.clip();
  const R = (c) => { ctx.fillStyle = c; ctx.fillRect(X, Y, w, h); };
  if (type === 'aqua') { R('#3B8FD9'); for (let i = 0; i < 5; i++) pixelArt(ITEMS.fish.px, X + ((t * 120 + i * 140) % (w + 100)) - 100, Y + 20 + (i % 3) * 38, 5, [C.orange, C.yellow, C.pink][i % 3]); for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X + 40 + i * 80, Y + h - ((t * 60 + i * 30) % h), 6, 0, 7); ctx.stroke(); } }
  else if (type === 'rain') { R('#8A97A8'); ctx.fillStyle = '#DDE3EA'; ctx.beginPath(); ctx.ellipse(x, Y + 20, 120, 26, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#2F5BEA'; ctx.lineWidth = 3; for (let i = 0; i < 18; i++) { const rx = X + 40 + (i * 53) % (w - 80), ry = Y + 40 + ((t * 400 + i * 37) % (h - 50)); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 14); ctx.stroke(); } rrect(x - 110, by - 50, 220, 40, 8, C.orange); }
  else if (type === 'server') { R('#1A1D24'); for (let i = 0; i < 5; i++) { ctx.fillStyle = '#2E333D'; ctx.fillRect(X + 30 + i * 95, Y + 16, 70, h - 32); for (let j = 0; j < 6; j++) { ctx.fillStyle = Math.sin(t * 13 + i * 3 + j * 7) > 0 ? C.green : '#0F3'; ctx.globalAlpha = Math.sin(t * 13 + i * 3 + j * 7) > 0 ? 1 : 0.2; ctx.fillRect(X + 42 + i * 95, Y + 26 + j * 18, 10, 6); ctx.globalAlpha = 1; } } }
  else if (type === 'disco') { R(`hsl(${(t * 300) % 360},80%,55%)`); for (let i = 0; i < 4; i++) crab(X + 80 + i * 120, by - 10, 3, { expr: 'cool', rot: Math.sin(t * 9 + i) * 0.3 }); ctx.fillStyle = '#DDD'; ctx.beginPath(); ctx.arc(x, Y + 20, 18, 0, 7); ctx.fill(); }
  else if (type === 'forest') { R('#BFE3A7'); for (let i = 0; i < 6; i++) { ctx.fillStyle = '#2E7D32'; ctx.beginPath(); ctx.moveTo(X + 40 + i * 85, by - 20); ctx.lineTo(X + 80 + i * 85, Y + 20 + (i % 2) * 20); ctx.lineTo(X + 120 + i * 85, by - 20); ctx.fill(); } ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(X + w - 40, Y + 30, 16, 0, 7); ctx.fill(); }
  else if (type === 'space') { R('#0C1030'); for (let i = 0; i < 20; i++) { ctx.fillStyle = C.white; ctx.fillRect(X + rnd(i) * w, Y + rnd(i + 9) * h, 3, 3); } ctx.fillStyle = '#C9A7FF'; ctx.beginPath(); ctx.arc(X + w * 0.7, Y + h * 0.5, 30, 0, 7); ctx.fill(); crab(X + w * 0.3, Y + h * 0.6 + Math.sin(t * 2) * 10, 3, { expr: 'shock', rot: t }); }
  else if (type === 'bath') { R('#FCE4EC'); for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(X + 30 + (i * 41) % (w - 40), by - 30 - ((t * 50 + i * 23) % (h - 30)), 10 + (i % 3) * 5, 0, 7); ctx.fill(); } rrect(x - 140, by - 50, 280, 44, 20, C.white); }
  else if (type === 'cats') { R('#F3E0C4'); rrect(x - 200, by - 60, 400, 30, 6, '#8D6E63'); for (let i = 0; i < 4; i++) { const cx = x - 150 + i * 100; ctx.fillStyle = [C.ink, C.orange, '#888', C.white][i]; ctx.fillRect(cx - 18, by - 100, 36, 40); ctx.fillRect(cx - 18, by - 110, 8, 12); ctx.fillRect(cx + 10, by - 110, 8, 12); } }
  ctx.restore();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.strokeRect(X, Y, w, h);
}
P.chorus = (t, G) => {
  const uh = G.lines.find(L => L.kind === 'uh'), inUh = uh && t >= uh.t;
  const hits = G.lines.filter(L => L.kind === 'chant').flatMap(L => L.words);
  const k = lastIdx(hits, t), n = k + 1;
  const b = beatAt(t);
  if (G.sub === 0) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#FF9E7A'); g.addColorStop(1, '#FFE0A8');
    ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
    const fh = 150, fw = 560, last = k >= 0 ? hits[k].t : -9, land = (t - last) / 0.22;
    const cam = Math.max(0, 144 + n * fh - 780);
    const camA = k >= 0 ? lerp(Math.max(0, 144 + (n - 1) * fh - 780), cam, eOut(land)) : 0;
    ctx.save(); ctx.translate(0, camA);
    const hit = land >= 1 ? kick(t - last - 0.22, 8) : 0;
    crab(960, 1060, 16, { expr: inUh ? 'cool' : 'squint', squash: hit * 0.2, legs: b, sweat: !inUh, rot: inUh ? Math.sin(b * Math.PI) * 0.05 : 0 });
    const off = (G.run.idx - 1) * 3;
    for (let i = 0; i < n; i++) {
      const by = 1060 - 16 * 9 - i * fh + (i === n - 1 && land < 1 ? -(1 - land) * (1 - land) * 1200 : 0);
      ctx.save();
      if (inUh) { ctx.translate(960, by); ctx.rotate(Math.sin(b * Math.PI + i * 0.7) * 0.05); ctx.translate(-960, -by); }
      const [name, type] = ROOMS[(i + off) % ROOMS.length];
      room(960, by, fw, fh, type, t);
      txt(`${i + 1}F · ${name}`, 960 + fw / 2 + 20, by - fh / 2, 26, { fill: C.ink, align: 'left', mono: false });
      ctx.restore();
    }
    ctx.restore();
    if (!inUh) hits.forEach((h, i) => { if (t >= h.t && i >= k - 1) bigWord(h.w, i % 2 ? 1620 : 330, i % 2 ? 640 : 420, 170, h.t, { face: i % 2 ? C.blue : C.pink, side: C.ink, rot: (i % 2 ? 1 : -1) * 0.05 }); });
  } else {
    // 镜头拉远：整栋楼立在一颗螃蟹星球上
    bg('#0B0E24');
    for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t + i))})`; ctx.fillRect(rnd(i) * W, rnd(i + 50) * H, 3, 3); }
    const zk = eOut(clamp((t - G.start) / 1.4));
    const sc = lerp(3.2, 1, zk);
    ctx.save(); ctx.translate(960, 760); ctx.scale(sc, sc); ctx.translate(-960, -760);
    const cy = 1250, R = 470, rot = t * 0.15 + (inUh ? Math.sin(b * Math.PI) * 0.05 : 0);
    const count = Math.pow(2, Math.min(9, n + 2 + (G.run.idx - 1) * 2));
    const towers = Math.min(60, count);
    ctx.save(); ctx.translate(960, cy); ctx.rotate(rot);
    for (let i = 0; i < towers; i++) {
      const a = (i / towers) * 6.28, hgt = 60 + rnd(i) * 160 + (i === 0 ? 260 : 0);
      ctx.save(); ctx.rotate(a); ctx.translate(0, -R);
      if (inUh) ctx.rotate(Math.sin(b * Math.PI + i) * 0.15);
      ctx.fillStyle = BLD[i % BLD.length]; ctx.fillRect(-18 - (i === 0 ? 20 : 0), -hgt, 36 + (i === 0 ? 40 : 0), hgt);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(-18 - (i === 0 ? 20 : 0), -hgt, 36 + (i === 0 ? 40 : 0), hgt);
      ctx.restore();
    }
    ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
    ctx.restore();
    // 星球的脸
    ctx.fillStyle = C.ink; ctx.fillRect(960 - 170, cy - 330, 50, 110); ctx.fillRect(960 + 120, cy - 330, 50, 110);
    ctx.fillStyle = C.orange; ctx.fillRect(960 - R - 70, cy - 120, 80, 80); ctx.fillRect(960 + R - 10, cy - 120, 80, 80);
    ctx.restore();
    if (k >= 0) tile(hits[k].w, 960, 220, 170, { bg: C.blue, shadow: C.ink, scale: lerp(1.6, 1, eOut((t - hits[k].t) / 0.16)), rot: -0.03 });
    const tot = (G.run.idx - 1) * 6 + n;
    const val = Math.pow(2, Math.round(clamp(tot / 12) * 20));
    const label = `claude.instances = ${fmt(val)}`, lw = measure(label, 36, true) + 60;
    rrect(960 - lw / 2, 360, lw, 70, 35, C.ink);
    txt(label, 960, 396, 36, { fill: C.white, mono: true, weight: 700 });
  }
  if (inUh) {
    const sp = [[330, 520], [1600, 480], [400, 760], [1560, 760], [960, 600]];
    uh.words.forEach((w, i) => { if (t >= w.t) bubble(w.w, sp[i % 5][0], sp[i % 5][1], 80 + i * 8, { scale: pop(t - w.t, 0.2), bg: [C.blue, C.orange, C.pink, C.green, C.ink][i % 5] }); });
  }
};

// It's whatever —— 老虎机
P.whatever = (t, G) => {
  const L = G.lines[0];
  spaceBG('#1A0B1E', '#2A1030', 0, t); glow(960, 580, 700, 'rgba(229,72,77,.3)');
  typeWords(L, 0, 6, 960, 150, 84, { align: 'center', fill: C.cream });
  const stops = [wt(L, 1), wt(L, 3), wt(L, 5)], res = ['duck', 'ufo', 'cactus'], keys = Object.keys(ITEMS);
  const jack = wt(L, 7);
  // 机身
  rrect(560 + 14, 300 + 14, 800, 560, 40, C.ink);
  rrect(560, 300, 800, 560, 40, C.red, C.ink, 8);
  rrect(600, 330, 720, 80, 16, C.ink);
  txt(t >= jack ? '★ JACKPOT ★' : 'WHATEVER', 960, 372, 50, { fill: t >= jack && Math.floor(t * 8) % 2 ? C.yellow : C.white, mono: true, weight: 700 });
  for (let r = 0; r < 3; r++) {
    const x = 640 + r * 220;
    rrect(x, 450, 200, 260, 14, C.white, C.ink, 6);
    ctx.save(); ctx.beginPath(); ctx.rect(x, 450, 200, 260); ctx.clip();
    if (t < stops[r]) { for (let j = -1; j < 3; j++) { const it = ITEMS[keys[(Math.floor(t * 18) + j + r * 2) % keys.length]]; const yy = 480 + j * 130 + ((t * 18) % 1) * 130; pixelArt(it.px, x + 100 - it.px[0].length * 9, yy, 18, it.c); } }
    else { const it = ITEMS[res[r]], s = pop(t - stops[r], 0.2); pixelArt(it.px, x + 100 - it.px[0].length * 10 * s, 580 - it.px.length * 10 * s, 20 * s, it.c); }
    ctx.restore();
  }
  // 拉杆
  const pull = t < L.t + 0.4 ? Math.sin(clamp((t - L.t) / 0.4) * Math.PI) : 0;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(1380, 560); ctx.lineTo(1450, 560 - 200 * (1 - pull * 1.6)); ctx.stroke();
  ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(1450, 560 - 200 * (1 - pull * 1.6), 34, 0, 7); ctx.fill();
  crab(1560, 1000, 11, { expr: t >= jack ? 'happy' : 'normal', armL: 1, blush: t >= jack });
  typeWords(L, 6, 7, 760, 960, 120, { align: 'right', fill: C.cream });
  bigWord('LIKE', 1000, 960, 200, jack, { face: C.orange, side: C.ink, rot: -0.03 });
  if (t >= jack) for (let i = 0; i < 30; i++) { const k2 = t - jack; ctx.fillStyle = i % 2 ? C.yellow : C.pink; ctx.fillRect(560 + rnd(i) * 800, 300 + (k2 * (400 + rnd(i + 1) * 500)) % 700, 16, 16); }
};

// Turn this 아파트 into a club —— 楼顶装打碟台，整栋楼跳起来
P.club = (t, G) => {
  const L = G.lines[0];
  const on = t >= wt(L, 5), hue = (t * 240) % 360;
  darkBG(on ? '#2A1A3A' : '#1E2240', '#08080C');
  for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(rnd(i) * W, rnd(i + 3) * 600, 3, 3); }
  if (on) [C.pink, C.blue, C.yellow, C.green].forEach((c, i) => { const a = Math.sin(t * 2 + i * 1.7) * 0.8 - Math.PI / 2; ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(960, 300); ctx.lineTo(960 + Math.cos(a - 0.1) * 1600, 300 + Math.sin(a - 0.1) * 1600); ctx.lineTo(960 + Math.cos(a + 0.1) * 1600, 300 + Math.sin(a + 0.1) * 1600); ctx.fill(); ctx.restore(); });
  const bf = beatFrac(t), jump = on ? Math.abs(Math.sin(bf * Math.PI)) * 70 : 0, sq = on && bf < 0.15 ? 0.1 : 0;
  ctx.save(); ctx.translate(960, 1060 - jump); ctx.scale(1 + sq, 1 - sq); ctx.translate(-960, -1060);
  bldg(960, 1060, 460, 640, 0, { hue: on ? hue : null, face: on, mouth: Math.abs(Math.sin(t * 8)) });
  // 楼顶 DJ
  rrect(820, 375, 280, 50, 8, '#333');
  crab(960, 380, 7, { expr: on ? 'cool' : 'normal', armL: on ? Math.floor(t * 6) % 2 : 0, armR: on ? 1 - Math.floor(t * 6) % 2 : 0 });
  if (on) { ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(960, 320, 60, Math.PI, 0); ctx.stroke(); }
  ctx.restore();
  typeWords(L, 0, 2, 110, 150, 104, { fill: C.cream });
  bigWord(L.words[2].w, 380, 560, 200, wt(L, 2), { face: C.orange, side: '#000', rot: -0.04 });
  typeWords(L, 3, 5, 1810, 150, 104, { align: 'right', fill: C.cream });
  if (on) tile('CLUB', 1560, 560, 160, { bg: `hsl(${hue},85%,55%)`, fill: C.white, shadow: '#000', scale: pop(t - wt(L, 5)), rot: 0.05 });
};

// I'm talking ... party all night —— 太阳想升起，被一脚踩回去
P.party = (t, G) => {
  const L = G.lines[0];
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2B1B4A'); g.addColorStop(1, '#F28C6B');
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
  const stomps = [wt(L, 7), wt(L, 8)];
  let sunY = 820 - clamp((t - L.t) / (stomps[0] - L.t)) * 260;
  let sq = 0;
  stomps.forEach(s => { if (t >= s) { const k = t - s; sunY = 820 + 60 - Math.min(1, k * 0.8) * 120; sq = Math.max(sq, kick(k, 6)); } });
  ctx.save(); ctx.translate(1500, sunY); ctx.scale(1 + sq * 0.4, 1 - sq * 0.4);
  ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(0, 0, 130, 0, 7); ctx.fill();
  ctx.fillStyle = C.ink; ctx.fillRect(-50, -30, 20, sq > 0.2 ? 6 : 26); ctx.fillRect(30, -30, 20, sq > 0.2 ? 6 : 26);
  ctx.restore();
  ctx.fillStyle = '#1E1430'; ctx.fillRect(-200, 820, W + 400, 400);
  const sTime = stomps.filter(s => t >= s).pop();
  const cx = sTime ? 1500 : 300, cy = sTime ? sunY - 130 - Math.max(0, 1 - (t - sTime) * 6) * 200 : 820;
  crab(cx, cy, 11, { expr: sTime ? 'squint' : 'cool', legs: beatAt(t), armL: Math.floor(beatAt(t)) % 2 });
  typeWords(L, 0, 2, 110, 150, 104, { fill: C.cream });
  const ic = ['cup', 'note', 'cloud', 'spiral'], cols = [C.orange, C.blue, '#8A8680', C.pink];
  for (let i = 0; i < 4; i++) card(470 + i * 290, 470, L.words[2 + i].w, null, ic[i], cols[i], wt(L, 2 + i), (i - 1.5) * 0.05);
  bigWord('PARTY', 560, 900, 200, wt(L, 6), { face: C.orange, side: C.ink, rot: -0.03 });
  typeWords(L, 7, 9, 1810, 980, 100, { align: 'right', fill: C.cream });
};

// 건배 —— 两栋公寓当酒杯碰杯
P.cheers = (t, G) => {
  const L = G.lines.find(l => l.kind === 'cheers'), O = G.lines.find(l => l.kind === 'oh');
  spaceBG('#1A1230', '#3A2350', 0, t); glow(960, 560, 600, 'rgba(242,193,78,.35)');
  const hitsT = [wt(L, 0), wt(L, 1)];
  let c = 0; hitsT.forEach(h => { if (t >= h) c = Math.max(c, kick(t - h, 5)); });
  const tilt = t >= hitsT[0] ? 0.32 : eOut((t - L.t) / 0.3) * 0.15;
  [[-1, 0], [1, 3]].forEach(([s, ci]) => {
    ctx.save(); ctx.translate(960 + s * (300 - c * 40), 1080); ctx.rotate(-s * (tilt - c * 0.1)); bldg(0, 0, 300, 560, ci); ctx.restore();
  });
  hitsT.forEach((h, j) => { if (t >= h) for (let i = 0; i < 18; i++) { const k = t - h, a = -Math.PI / 2 + (rnd(i + j * 30) - 0.5) * 2.4; const x = 960 + Math.cos(a) * k * 900, y = 520 + Math.sin(a) * k * 900 + k * k * 1300; ctx.save(); ctx.translate(x, y); ctx.rotate(k * 8 + i); ctx.fillStyle = C.yellow; ctx.fillRect(-20, -26, 40, 52); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(-20, -26, 40, 52); ctx.restore(); } });
  bigWord(L.words[0].w, 380, 300, 200, hitsT[0], { face: C.cream, side: C.orange, rot: -0.05 });
  bigWord(L.words[1].w, 1540, 300, 200, hitsT[1], { face: C.orange, side: C.ink, rot: 0.05 });
  const wave = wt(L, 2);
  if (t >= wave) crab(960, 520 - eOut((t - wave) / 0.25) * 60, 11, { expr: 'cool', armL: Math.floor(t * 6) % 2, armR: 1 });
  typeWords(L, 2, 5, 960, 160, 100, { align: 'center', fill: C.cream });
  if (O) O.words.forEach((w, i) => { if (t >= w.t) errWin(1420 + i * 60, 760 + i * 50, 420, 140, 'error', w.w, { scale: pop(t - w.t, 0.12), head: i === 2 ? C.red : C.blue }); });
};

P.plain = (t, G) => {
  paper();
  G.lines.forEach(L => typeWords(L, 0, L.words.length, 110, 150, 100));
  crab(1460, 690, 15, { expr: 'happy' });
};


// ===== 第五版：统一成“暗色 + 发光 + 镜头动感 + Claude 梗 + 数字狂涨”的风格 =====
function glow(x, y, r, c = 'rgba(255,214,120,.35)') { const g = ctx.createRadialGradient(x, y, 10, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
function spaceBG(c0 = '#0B0E24', c1 = '#241A48', speed = 0, t = NOW) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
  for (let i = 0; i < 110; i++) {
    const y = ((rnd(i) * H + t * speed * (0.4 + rnd(i + 2))) % H);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + i))})`;
    ctx.fillRect(rnd(i + 5) * W, y, 3, 3 + Math.min(40, speed * 0.02));
  }
}
function pill(label, x, y, size = 36, bgc = C.ink, fc = C.white) {
  const lw = measure(label, size, true) + size * 1.6;
  rrect(x - lw / 2, y - size, lw, size * 2, size, bgc);
  txt(label, x, y + 2, size, { fill: fc, mono: true, weight: 700 });
}
function mirror(cx, cy, r, look, t, o = {}) {
  glow(cx, cy, r * 1.6, o.glow || 'rgba(255,214,120,.35)');
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28 + t * 0.4; if (Math.sin(t * 4 + i * 1.7) > -0.3) { ctx.fillStyle = o.dot || C.yellow; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (r + 35), cy + Math.sin(a) * (r + 35), r * 0.03, 0, 7); ctx.fill(); } }
  ctx.fillStyle = '#F3EFE6'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = o.rim || '#D9B45A'; ctx.lineWidth = r * 0.05; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r * 0.97, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(160,190,230,.25)'; ctx.beginPath(); ctx.moveTo(cx - r * 0.7, cy - r); ctx.lineTo(cx - r * 0.3, cy - r); ctx.lineTo(cx - r, cy + r); ctx.lineTo(cx - r * 1.4, cy + r); ctx.fill();
  crab(cx, cy + r * 0.45, r * 0.068, look);
  ctx.restore();
}
function editor(x, y, w, h, file, lines, n, o = {}) {
  rrect(x, y, w, h, 16, '#1E1D25', '#3A3945', 3);
  rrect(x + 20, y + 20, measure(file, 22, true) + 50, 40, 8, '#2D2C36');
  txt(file, x + 45, y + 41, 22, { fill: '#BBB', mono: true, weight: 700, align: 'left' });
  for (let i = 0; i < Math.min(n, lines.length); i++) {
    const s = lines[i], col = s.startsWith('//') || s.startsWith('#') ? '#6A6A78' : s.startsWith('ERROR') || s.startsWith('✗') ? C.red : s.startsWith('✓') ? C.green : s.startsWith('$') ? C.orange : s.includes(':') ? '#E8C27A' : '#8FB4FF';
    txt(String(i + 1), x + 30, y + 100 + i * (o.lh || 50), 20, { fill: '#555', align: 'left', mono: true, weight: 400 });
    txt(s, x + 75, y + 100 + i * (o.lh || 50), o.size || 26, { fill: col, align: 'left', mono: true, weight: 400 });
  }
  if (Math.floor(NOW * 3) % 2) { ctx.fillStyle = C.orange; ctx.fillRect(x + 75, y + 82 + Math.min(n, lines.length) * (o.lh || 50), 14, 30); }
}

// 아파트 第一轮：坐着楼顶一路往上冲（摄像机跟着楼长高）
P.chant0 = (t, G) => {
  const uh = G.lines.find(L => L.kind === 'uh'), inUh = uh && t >= uh.t;
  const hits = G.lines.filter(L => L.kind === 'chant').flatMap(L => L.words);
  const k = lastIdx(hits, t), n = k + 1, b = beatAt(t);
  if (G.sub === 0) {
    const last = k >= 0 ? hits[k].t : G.start, rise = eOut((t - last) / 0.3);
    const climb = (Math.max(0, n - 1) + rise) * 150;
    spaceBG('#0B0E24', '#3A2350', 300 + n * 120, t);
    // 远处城市
    for (let i = 0; i < 14; i++) { const bh = 120 + rnd(i) * 260, by = 1080 + climb * 0.25; ctx.fillStyle = 'rgba(58,63,99,.7)'; ctx.fillRect(i * 145, by - bh, 120, bh); }
    // 云
    for (let i = 0; i < 4; i++) { const cy2 = ((i * 380 + climb * 0.8) % 1500) - 200; ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(300 + i * 450, cy2, 220, 50, 0, 0, 7); ctx.fill(); }
    // 楼：每喊一声长一层
    const roofY = 700;
    for (let i = 0; i < n; i++) {
      const y = roofY + (n - 1 - i) * 150 + (1 - rise) * 150 * (i === n - 1 ? 0 : 1) - (i === n - 1 ? 0 : 0);
      const yy = roofY + (n - 1 - i + (1 - rise)) * 150;
      if (yy > H + 20) continue;
      ctx.fillStyle = 'rgba(255,214,120,.18)'; ctx.fillRect(700, yy, 520, 150);
      bldg(960, yy + 150, 520, 140, i, { hue: inUh ? (t * 300 + i * 40) % 360 : null });
      txt(`${i + 1}F`, 680, yy + 75, 28, { fill: C.cream, align: 'right', mono: true, weight: 700 });
      void y;
    }
    glow(960, roofY, 420, 'rgba(255,214,120,.25)');
    const j = k >= 0 ? kick(t - last, 9) : 0;
    crab(960, roofY + (1 - rise) * 150 - j * 40, 13, { expr: inUh ? 'cool' : 'happy', squash: j * 0.2, legs: b, rot: inUh ? Math.sin(b * Math.PI) * 0.12 : 0, armL: inUh ? Math.floor(b) % 2 : 1, armR: inUh ? 1 - Math.floor(b) % 2 : 1 });
    pill(`ALTITUDE  ${n}F ↑`, 1660, 980, 30);
    if (!inUh && k >= 0) bigWord(hits[k].w, k % 2 ? 1560 : 360, 470, 200, hits[k].t, { face: k % 2 ? C.yellow : C.pink, side: '#3A0F25', rot: (k % 2 ? 1 : -1) * 0.05 });
    if (inUh) uh.words.forEach((w, i) => { if (t >= w.t) bubble(w.w, [360, 1560, 420, 1500, 960][i % 5], [380, 360, 620, 600, 200][i % 5], 80 + i * 8, { scale: pop(t - w.t, 0.2), bg: [C.blue, C.orange, C.pink, C.green, C.ink][i % 5] }); });
  } else {
    // 아파트 第二轮：整面公寓外墙，每喊一声点亮更多窗户，住户越来越多
    bg('#2A1712');
    const cols = 8, rows = 4, cw = 230, chh = 200, ox = (W - cols * cw) / 2 + cw / 2, oy = 180;
    const lit = Math.min(cols * rows, n <= 0 ? 0 : Math.round(Math.pow(2, n - 1) * 1.1));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = ox + c * cw, y = oy + r * chh * 1.15;
      const order = Math.floor(rnd(i * 7.3) * 1000) % (cols * rows);
      const on = rankOf(i) < lit;
      ctx.fillStyle = '#5A3428'; ctx.fillRect(x - 100, y + 92, 200, 14);
      ctx.fillStyle = on ? '#FFD983' : '#1A1A28'; ctx.fillRect(x - 85, y - 80, 170, 170);
      ctx.strokeStyle = '#140B08'; ctx.lineWidth = 8; ctx.strokeRect(x - 85, y - 80, 170, 170);
      if (on) {
        glow(x, y, 140, 'rgba(255,214,120,.25)');
        const a = rnd(i * 3.7);
        crab(x, y + 80, 6, { expr: a < 0.3 ? 'cool' : 'happy', bow: a > 0.55 && a < 0.8, crown: a >= 0.8, rot: inUh ? Math.sin(b * Math.PI + i) * 0.2 : 0, armL: inUh ? Math.floor(b + i) % 2 : 0 });
      }
      ctx.fillStyle = '#140B08'; ctx.fillRect(x - 4, y - 80, 8, 170);
      void order;
    }
    if (k >= 0 && !inUh) tile(hits[k].w, 960, 560, 200, { bg: C.blue, shadow: C.ink, scale: lerp(1.6, 1, eOut((t - hits[k].t) / 0.16)), rot: -0.03 });
    const res = n <= 0 ? 0 : Math.pow(2, n * 2);
    pill(`residents = ${fmt(res)}`, 960, 1010, 34);
    if (inUh) uh.words.forEach((w, i) => { if (t >= w.t) bubble(w.w, [360, 1560, 600, 1320, 960][i % 5], [520, 500, 760, 740, 560][i % 5], 84 + i * 8, { scale: pop(t - w.t, 0.2), bg: [C.blue, C.orange, C.pink, C.green, C.ink][i % 5] }); });
  }
};
const RANKS = (() => { const a = [...Array(32).keys()].sort((x, y) => rnd(x * 7.3) - rnd(y * 7.3)); const r = []; a.forEach((v, i) => { r[v] = i; }); return r; })();
const rankOf = i => RANKS[i];

// Kissy face：聚光灯下狂发飞吻，飞吻砸在镜头上，计数器狂涨
P.kissy = (t, G) => {
  const L = G.lines[0], k = clamp((t - L.t) / (L.end - L.t));
  spaceBG('#1A0B1E', '#3A1030', 0, t);
  glow(1400, 600, 520, 'rgba(255,95,162,.3)');
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(1300, 0); ctx.lineTo(1500, 0); ctx.lineTo(1750, H); ctx.lineTo(1050, H); ctx.fill();
  const kisses = 24;
  for (let i = 0; i < kisses; i++) {
    const st = L.t + i * (L.end - L.t) / kisses, a = t - st; if (a < 0 || a > 0.7) continue;
    const z = a / 0.7, x = lerp(1400, 300 + rnd(i) * 1300, eOut(z)), y = lerp(560, 150 + rnd(i + 3) * 800, eOut(z));
    if (a < 0.55) heart(x, y, 8 + z * 30, i % 2 ? C.pink : C.red);
    else { ctx.globalAlpha = 1 - (a - 0.55) / 0.15; lips(x, y, 1.6, rnd(i) - 0.5); ctx.globalAlpha = 1; }
  }
  crab(1400, 700, 16, { expr: 'blink', blush: true, armL: Math.floor(t * 6) % 2, armR: 1 - Math.floor(t * 6) % 2 });
  typeWords(L, 0, 2, 110, 150, 104, { fill: C.cream });
  bigWord('KISSY', 600, 560, 280, wt(L, 2), { face: C.pink, side: '#3A0F25', rot: -0.03 });
  typeWords(L, 3, 4, 1810, 150, 104, { align: 'right', fill: C.cream });
  pill(`kisses sent = ${fmt(Math.floor(Math.pow(k, 2) * 99999))}`, 600, 900, 32, '#000', C.pink);
};

// Sent to your phone：手机被飞吻通知刷爆
P.phone = (t, G) => {
  const L = G.lines[0], k = clamp((t - L.t) / (L.end - L.t));
  spaceBG('#0E1230', '#1D2752', 0, t);
  glow(1350, 560, 600, 'rgba(47,91,234,.35)');
  const shake = Math.sin(t * 50) * 6 * k;
  phoneBody(1350 + shake, 560, 1.05, '#101218');
  ctx.save(); ctx.beginPath(); ctx.roundRect(1350 - 194 + shake, 560 - 388, 388, 776, 40); ctx.clip();
  txt('9:41', 1350 + shake, 230, 26, { fill: C.white, mono: true, weight: 700 });
  const nN = Math.floor(eIn(k) * 40) + 1;
  for (let i = 0; i < Math.min(nN, 9); i++) {
    const y = 290 + i * 76 - (nN > 9 ? ((t * 300) % 76) : 0);
    rrect(1350 - 175 + shake, y, 350, 66, 16, 'rgba(255,255,255,.14)');
    crab(1350 - 135 + shake, y + 50, 2.6, { expr: 'happy' });
    txt('Claude', 1350 - 95 + shake, y + 22, 20, { fill: C.white, align: 'left', weight: 900 });
    txt('😘 kissy face', 1350 - 95 + shake, y + 46, 18, { fill: '#BBB', align: 'left', mono: true, weight: 400 });
  }
  ctx.restore();
  // 角标
  rrect(1350 + 150 + shake, 140, 110, 64, 32, C.red);
  txt(nN >= 40 ? '99+' : String(nN), 1350 + 205 + shake, 173, 34, { fill: C.white, mono: true, weight: 700 });
  // 小螃蟹扒着手机偷看
  crab(1350 - 230, 900, 9, { expr: 'happy', blush: true, armR: 1 });
  typeWords(L, 0, 3, 110, 150, 104, { fill: C.cream });
  bigWord('PHONE', 560, 560, 230, wt(L, 3), { face: C.cream, side: C.blue, rot: -0.03 });
  typeWords(L, 4, 5, 560, 800, 120, { align: 'center', fill: C.cream });
};

// Come give me something I can feel：pip install feelings 失败 → 心电图拉满 → Oh oh oh 炸开
const FEEL_LOG = ['$ pip install feelings', 'Collecting feelings...', '██████████░░░░ 71%', 'ERROR: No matching distribution', '        found for feelings', '$ claude --feel', '✗ Segmentation fault (heart)', '$ sudo feel', '✓ heartbeat detected'];
P.feel = (t, G) => {
  const L = G.lines.find(l => l.kind === 'feel'), O = G.lines.find(l => l.kind === 'oh');
  const feelT = wt(L, L.words.length - 1);
  spaceBG('#0A0F14', '#10202A', 0, t);
  const n = Math.min(FEEL_LOG.length, Math.floor((t - L.t) / ((feelT - L.t) / 8)) + 1);
  editor(1000, 120, 860, 560, 'terminal', FEEL_LOG, n, { size: 26, lh: 52 });
  // 心电图
  const beating = t >= feelT;
  ctx.save(); ctx.shadowColor = C.red; ctx.shadowBlur = 20;
  ctx.strokeStyle = C.red; ctx.lineWidth = 8; ctx.beginPath();
  for (let x = 0; x <= W; x += 6) {
    let y = 860;
    if (beating) { const ph = ((x + t * 600) / 380) % 1; y += ph > 0.45 && ph < 0.5 ? -260 : ph > 0.5 && ph < 0.56 ? 170 : ph > 0.4 && ph < 0.45 ? 40 : 0; }
    x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke(); ctx.restore();
  mirror(480, 470, 230, { expr: beating ? 'happy' : 'normal', blush: beating }, t, { glow: beating ? 'rgba(229,72,77,.45)' : 'rgba(120,160,255,.25)', dot: beating ? C.red : '#6A8BFF' });
  if (beating) heart(480, 190, 16 * (1 + kick(beatFrac(t) * SPB, 7) * 0.3), C.red);
  typeWords(L, 0, 4, 110, 150, 96, { fill: C.cream });
  bigWord('FEEL', 1430, 920, 200, feelT, { face: C.red, side: '#000', rot: -0.03 });
  if (O) O.words.forEach((w, j) => {
    if (t < w.t) return;
    const bt = t - w.t, cx = 500 + j * 460, cy = 470;
    for (let i = 0; i < 46; i++) { const a = rnd(i + j * 60) * 6.28, d = eOut(bt / 0.6) * (300 + rnd(i) * 500); ctx.fillStyle = [C.yellow, C.pink, C.orange, C.white][i % 4]; ctx.globalAlpha = clamp(1 - bt / 1.2); ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 12, 12); ctx.globalAlpha = 1; }
    bigWord(w.w, cx, cy, 240, w.t, { face: C.yellow, side: '#3A0F25' });
    if (bt < 0.1) { ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - bt / 0.1)})`; ctx.fillRect(0, 0, W, H); }
  });
};

// Don't you want me：两面镜子对望，心动值拉满
P.want = (t, G) => {
  const L = G.lines[0], baby = wt(L, 8), k = clamp((t - L.t) / (baby - L.t));
  spaceBG('#1A1028', '#2A1030', 0, t);
  mirror(470, 560, 250, { expr: t >= baby ? 'happy' : 'normal', blush: k > 0.5 }, t, { glow: 'rgba(217,119,87,.35)' });
  mirror(1450, 560, 250, { expr: t >= baby ? 'happy' : 'normal', blush: k > 0.5, color: '#E8789A', bow: true }, t, { glow: 'rgba(255,95,162,.35)', dot: C.pink });
  for (let i = 0; i < 10; i++) { const p = ((t * 0.8 + i / 10) % 1), dir = i % 2; const x = dir ? lerp(1180, 740, p) : lerp(740, 1180, p); heart(x, 560 - Math.sin(p * Math.PI) * 160, 8, dir ? C.pink : C.red); }
  typeWords(L, 0, 4, 110, 150, 96, { fill: C.cream });
  typeWords(L, 4, 8, 1810, 150, 96, { align: 'right', fill: C.cream });
  // 心动值
  const v = t >= baby ? 100 : k * 99.9;
  rrect(560, 930, 800, 40, 20, '#2A2238'); rrect(560, 930, 800 * v / 100, 40, 20, C.pink);
  txt(`compatibility = ${v.toFixed(1)}%`, 960, 885, 32, { fill: C.cream, mono: true, weight: 700 });
  if (t >= baby) {
    bigWord('baby', 960, 560, 260, baby, { face: C.pink, side: '#3A0F25', rot: -0.04 });
    for (let i = 0; i < 30; i++) { const a = rnd(i) * 6.28, d = eOut((t - baby) / 0.6) * (300 + rnd(i + 1) * 500); heart(960 + Math.cos(a) * d, 560 + Math.sin(a) * d * 0.7, 6, i % 2 ? C.pink : C.red); }
  }
};

// Don't you need me：在 package.json 里把“你”加成依赖，npm install you
P.need = (t, G) => {
  const L = G.lines[0], now = wt(L, 8);
  spaceBG('#0E0D14', '#1C1B26', 0, t);
  const lines = ['{', '  "name": "claude",', '  "version": "4.5.0",', '  "dependencies": {', '    "code": "^1.0",', '    "art": "^1.0",', '    "words": "^1.0",', '    "you": "^∞" ❤', '  }', '}'];
  const n = Math.min(lines.length, 1 + Math.floor((t - L.t) / ((now - L.t) / 9)));
  editor(990, 230, 870, 540, 'package.json', lines, n, { size: 26, lh: 44 });
  // 终端
  rrect(990, 790, 870, 190, 16, '#000', '#3A3945', 3);
  typeStr('$ npm install you', L.t + 0.6, 1030, 835, 30, { mono: true, fill: C.orange, cps: 0.04 });
  const prog = clamp((t - L.t - 1.2) / (now - L.t - 1.2));
  if (t > L.t + 1.2) txt('█'.repeat(Math.floor(prog * 24)) + '░'.repeat(24 - Math.floor(prog * 24)) + ` ${Math.floor(prog * 100)}%`, 1030, 885, 26, { fill: '#8FB4FF', align: 'left', mono: true, weight: 400 });
  if (t >= now) txt('✓ added 1 package: you ❤', 1030, 935, 30, { fill: C.green, align: 'left', mono: true, weight: 700 });
  mirror(420, 560, 220, { expr: t >= now ? 'happy' : 'normal', blush: t >= now, crown: t >= now }, t);
  typeWords(L, 0, 4, 110, 150, 96, { fill: C.cream });
  typeWords(L, 4, 8, 110, 270, 96, { fill: C.cream });
  bigWord('NOW', 420, 900, 200, now, { face: C.orange, side: '#000', rot: 0.05 });
};

// 副歌：镜子 + 代码编辑器 / 小螃蟹圆章网格（用回之前那版）

const CSS = ['/* apt.css — written by Claude */', '.apt {', '  floors: ∞;', '  lights: on;', '  vibe: max;', '}', '.claude {', '  mirror: true;', '  crown: gold;', '  dance: forever;', '}', '@keyframes apateu { to { jump: 1 } }'];
P.chorus = (t, G) => {
  const uh = G.lines.find(L => L.kind === 'uh');
  const hits = G.lines.filter(L => L.kind === 'chant').flatMap(L => L.words);
  const k = lastIdx(hits, t);
  if (G.sub === 0) {
    darkBG('#26242E', '#0E0D12');
    txt('● LIVE PREVIEW', 110, 150, 26, { fill: C.green, align: 'left', mono: true, weight: 700 });
    // 编辑器
    rrect(1060, 130, 780, 840, 16, '#1E1D25', '#3A3945', 3);
    rrect(1080, 150, 200, 40, 8, '#2D2C36'); txt('apt.css', 1180, 171, 22, { fill: '#BBB', mono: true, weight: 700 });
    const nl = Math.min(CSS.length, 2 + (k + 1) * 2);
    for (let i = 0; i < nl; i++) {
      txt(String(i + 1), 1100, 240 + i * 52, 22, { fill: '#555', align: 'left', mono: true, weight: 400 });
      txt(CSS[i], 1150, 240 + i * 52, 26, { fill: i === 0 ? '#6A6A78' : CSS[i].startsWith(' ') ? '#E8C27A' : '#8FB4FF', align: 'left', mono: true, weight: 400 });
    }
    // 镜子
    const g = ctx.createRadialGradient(600, 560, 200, 600, 560, 470); g.addColorStop(0, 'rgba(255,214,120,.35)'); g.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1060, H);
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28 + t * 0.4; if (Math.sin(t * 4 + i * 1.7) > -0.3) { ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(600 + Math.cos(a) * 345, 560 + Math.sin(a) * 345, 9, 0, 7); ctx.fill(); } }
    ctx.fillStyle = '#F3EFE6'; ctx.beginPath(); ctx.arc(600, 560, 310, 0, 7); ctx.fill();
    ctx.strokeStyle = '#D9B45A'; ctx.lineWidth = 16; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(600, 560, 302, 0, 7); ctx.clip();
    ctx.fillStyle = 'rgba(160,190,230,.25)'; ctx.beginPath(); ctx.moveTo(380, 260); ctx.lineTo(500, 260); ctx.lineTo(300, 900); ctx.lineTo(180, 900); ctx.fill();
    const looks = [{ expr: 'cool' }, { expr: 'happy', bow: true }, { expr: 'happy', crown: true }, { expr: 'cool', crown: true }, { expr: 'happy', blush: true, bow: true }, { expr: 'glow', crown: true }];
    crab(600, 700 - (k >= 0 ? kick(t - hits[k].t, 9) * 30 : 0), 21, looks[Math.max(0, k) % looks.length]);
    ctx.restore();
    star4(250, 260, 26, C.white); star4(960, 320, 18, C.white); star4(330, 900, 20, C.white);
    hits.forEach((h, i) => { if (t >= h.t && i >= k - 1) bigWord(h.w, 1450, i % 2 ? 720 : 430, 230, h.t, { face: i % 2 ? C.yellow : C.pink, side: '#3A0F25', rot: (i % 2 ? 1 : -1) * 0.04 }); });
  } else {
    bg('#3A2A24');
    const sy = 240, sx = 250, off = (t * 40) % sy, base = Math.floor(t * 40 / sy);
    for (let r = -1; r < 6; r++) for (let c = -1; c < 9; c++) {
      const row = r + base, x = c * sx + (row % 2 ? sx / 2 : 0) + 90, y = r * sy - off + 140;
      ctx.fillStyle = '#F3EFE6'; ctx.beginPath(); ctx.arc(x, y, 100, 0, 7); ctx.fill();
      ctx.strokeStyle = '#D9B45A'; ctx.lineWidth = 8; ctx.stroke();
      const a = rnd(row * 13.1 + c * 7.7);
      crab(x, y + 42, 5, { expr: a < 0.3 ? 'cool' : 'happy', bow: a > 0.5 && a < 0.75, crown: a >= 0.75 });
    }
    ctx.fillStyle = 'rgba(30,20,15,.35)'; ctx.fillRect(0, 0, W, H);
    if (k >= 0) tile(hits[k].w, 960, 470, 230, { bg: C.blue, shadow: C.ink, scale: lerp(1.6, 1, eOut((t - hits[k].t) / 0.16)), rot: -0.03 });
    const count = (G.run.idx - 1) * 6 + k + 1;
    const val = Math.pow(2, Math.round(clamp(count / 12) * 20));
    const label = `claude.instances = ${fmt(val)}`, lw = measure(label, 40, true) + 70;
    rrect(960 - lw / 2, 660, lw, 80, 40, C.ink);
    txt(label, 960, 702, 40, { fill: C.white, mono: true, weight: 700 });
  }
  if (uh && t >= uh.t) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
    const b = beatAt(t);
    crab(960, 940, 20, { expr: 'cool', crown: true, rot: Math.sin(b * Math.PI) * 0.14, armL: Math.floor(b) % 2, armR: 1 - Math.floor(b) % 2, legs: b });
    bubbleRow(uh, 0, uh.words.length, 110, 230, [64, 80, 96, 112, 128], G.sub ? C.orange : C.blue);
  }
};

// ---------- 开场 & 结尾 ----------
function intro(t) {
  bg('#0E0E0E');
  ctx.globalAlpha = clamp(t / 0.5);
  crab(220, 230, 7, { expr: t % 3 > 2.85 ? 'blink' : 'normal' });
  txt('Claude Code v2.1', 300, 165, 30, { fill: C.white, align: 'left', mono: true, weight: 700 });
  txt('Opus · Claude Pro', 300, 202, 26, { fill: C.gray, align: 'left', mono: true, weight: 400 });
  txt('~/Claude MV/APT', 300, 236, 26, { fill: C.gray, align: 'left', mono: true, weight: 400 });
  rrect(150, 320, 1300, 220, 12, null, '#4A4A4A', 3);
  txt('>', 220, 430, 90, { fill: C.orange, mono: true });
  const word = t < 4.7 ? 'random game' : 'game start';
  typeStr(word, t < 4.7 ? 1.2 : 4.7, 300, 435, 130, { cps: 0.07 });
  txt('? for shortcuts', 160, 570, 22, { fill: '#666', align: 'left', mono: true, weight: 400 });
  txt('ROSÉ & Bruno Mars — APT.', 160, 640, 26, { fill: '#777', align: 'left', mono: true, weight: 400 });
  ctx.globalAlpha = 1;
  if (t >= 5.3) {
    const k = t - 5.3, s = lerp(2.2, 1, eOut(k / 0.2));
    ctx.fillStyle = `rgba(0,0,0,${clamp(k * 3) * 0.55})`; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(960, 470); ctx.rotate(-0.05); ctx.scale(s, s); rrect(-500, -140, 1000, 280, 26, 'rgba(229,72,77,.12)', C.red, 18); ctx.restore();
    txt('GAME START', 960, 478, 170, { fill: C.red, rot: -0.05, scale: s });
    for (let i = 0; i < 20; i++) { const a = rnd(i) * 6.28, d = eOut(k / 0.5) * (420 + rnd(i + 3) * 200); ctx.fillStyle = `rgba(229,72,77,${clamp(1 - k)})`; ctx.fillRect(960 + Math.cos(a) * d * 1.3, 470 + Math.sin(a) * d * 0.6, 12, 12); }
    ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(960, 930, 230, 40, 0, 0, 7); ctx.stroke();
    crab(960, 935, 11, { expr: 'squint', squash: kick(k, 8) * 0.3 });
  }
}
function endCard(t) {
  const lt = t - END_START;
  paper(); dotField(960, 760, 420, C.orange);
  txt('Claude MV', 960, 160, 40, { fill: C.gray, mono: true, weight: 700, alpha: clamp(lt / 0.4) });
  bigWord('APT.', 960, 420, 300, END_START, { face: C.orange, side: C.ink });
  typeStr('ROSÉ & Bruno Mars', END_START + 0.4, 960, 610, 50, { align: 'center' });
  crab(960, 900, 15, { expr: 'happy', crown: true, blush: true, armR: Math.floor(beatAt(t)) % 2, legs: beatAt(t) });
  sparkles(960, 780, 230);
  if (t > DURATION - 1) { ctx.fillStyle = `rgba(0,0,0,${clamp(t - (DURATION - 1))})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- 合成 ----------
function chrome(t) {
  ctx.save();
  const col = 'rgba(120,120,120,.85)';
  txt('ROSÉ & Bruno Mars — APT.', 40, 38, 20, { fill: col, align: 'left', mono: true, weight: 700 });
  const b = Math.max(0, Math.floor(beatAt(t)));
  txt(`BAR ${String(Math.floor(b / 4) + 1).padStart(2, '0')}`, W - 200, 38, 20, { fill: col, align: 'right', mono: true, weight: 700 });
  for (let i = 0; i < 4; i++) { ctx.fillStyle = t >= BEAT0 && b % 4 === i ? C.blue : 'rgba(120,120,120,.55)'; ctx.fillRect(W - 182 + i * 38, 31, 28, 14); }
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  txt(`${m}:${String(s).padStart(2, '0')}`, 48, H - 48, 18, { fill: col, align: 'left', mono: true, weight: 400 });
  ctx.fillStyle = 'rgba(120,120,120,.35)'; ctx.fillRect(48, H - 30, W - 96, 3);
  ctx.fillStyle = 'rgba(30,30,30,.8)'; ctx.fillRect(48, H - 30, (W - 96) * t / DURATION, 3);
  ctx.restore();
}

function render(t) {
  NOW = t;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  let G = null; for (const g of GROUPS) if (t >= g.start) G = g;
  ctx.save();
  if (!G) intro(t);
  else if (t >= END_START) endCard(t);
  else {
    const pg = t - G.start, z = 1 + (1 - eOut(pg / 0.3)) * 0.05;
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    (P[G.kind] || P.plain)(t, G);
  }
  ctx.restore();
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
