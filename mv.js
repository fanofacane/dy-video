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
function card(cx, cy, word, label, icon, color, t0, rot = 0) {
  if (NOW < t0) return;
  const s = pop(NOW - t0, 0.25);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s);
  rrect(-120 + 10, -160 + 10, 240, 320, 22, C.ink);
  rrect(-120, -160, 240, 320, 22, '#FBFAF7', color, 10);
  if (icon) rrect(-90, -130, 180, 110, 10, '#2A2A30');
  if (icon) pixelArt(ICONS[icon], -icon_w(icon) * 6, -112, 12, color);
  ctx.restore();
  txt(word, cx, cy + (icon ? 50 : 0) * s, icon ? 74 : 64, { fill: C.ink, scale: s, rot });
  if (label) { const lw = measure(label, 26) + 30; ctx.save(); ctx.translate(cx, cy + 122 * s); ctx.scale(s, s); rrect(-lw / 2, -20, lw, 40, 20, color); ctx.restore(); txt(label, cx, cy + 123 * s, 26, { fill: C.white, scale: s }); }
}
const icon_w = k => ICONS[k][0].length;

// ---------- 版面 ----------
const P = {};

// “아파트” 合唱（开头两段）
P.chant0 = (t, G) => {
  const uh = G.lines.find(L => L.kind === 'uh');
  if (uh && t >= uh.t) return uhPage(t, uh, G.sub);
  const hits = G.lines.filter(L => L.kind === 'chant').flatMap(L => L.words);
  const k = lastIdx(hits, t);
  if (G.sub === 0) {
    paper(); dotField(1460, 560, 430, C.orange);
    const slots = [[110, 150, 'left'], [1810, 150, 'right'], [110, 960, 'left'], [1810, 960, 'right'], [110, 290, 'left'], [1810, 290, 'right']];
    hits.forEach((h, i) => { if (t >= h.t) { const [x, y, al] = slots[i]; typeStr(h.w, h.t, x, y, 104, { align: al }); } });
    if (k >= 0) bigWord(hits[k].w, 640, 560, 290, hits[0].t, { face: k % 2 ? C.ink : C.orange, side: k % 2 ? C.orange : C.ink, retrig: hits[k].t, rot: (k % 2 ? 1 : -1) * 0.03 });
    const j = k >= 0 ? kick(t - hits[k].t, 9) : 0;
    crab(1460, 690 - j * 50, 15, { expr: 'normal', squash: j * 0.2, legs: beatAt(t) });
    sparkles(1460, 560, 220);
  } else {
    splitBG();
    const L1 = hits.filter((h, i) => i % 2 === 0), R1 = hits.filter((h, i) => i % 2 === 1);
    const lk = lastIdx(L1, t), rk = lastIdx(R1, t);
    if (lk >= 0) { typeStr('아파트', L1[0].t, 110, 150, 96); bigWord('아파트', 470, 560, 240, L1[0].t, { face: C.ink, side: C.orange, retrig: L1[lk].t, rot: -0.03 }); }
    if (rk >= 0) { typeStr('APT.', R1[0].t, 1810, 150, 96, { fill: C.cream, align: 'right' }); bigWord('APT.', 1450, 560, 300, R1[0].t, { face: C.white, side: C.blueD, retrig: R1[rk].t, rot: 0.03 }); }
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + t; if (rk >= 0 && Math.sin(t * 6 + i) > 0) ctx.fillStyle = C.yellow, ctx.fillRect(1450 + Math.cos(a) * 330, 560 + Math.sin(a) * 200, 10, 10); }
    crab(210, 1010, 11, { expr: 'happy', legs: beatAt(t) });
  }
};

// “Uh uh huh” —— 蓝色气泡越来越大（像参考视频的“那 那 那”）
function uhPage(t, L, variant) {
  paper();
  const b = beatAt(t);
  crab(250, 680, 15, { expr: Math.floor(b) % 2 ? 'happy' : 'normal', rot: Math.sin(b * Math.PI) * 0.1, armL: Math.floor(b) % 2, armR: 1 - Math.floor(b) % 2, legs: b });
  const end = bubbleRow(L, 0, L.words.length, 110, 230, [64, 80, 96, 112, 128], variant ? C.orange : C.blue);
  txt('…', end + 20, 250, 70, { fill: '#888', align: 'left', alpha: Math.sin(t * 8) > 0 ? 1 : 0.3 });
  for (let i = 0; i < 3; i++) { const k = (t * 1.3 + i / 3) % 1; ctx.fillStyle = [C.blue, C.orange, C.yellow][i]; ctx.fillRect(250 + (i - 1) * 100, 480 - k * 80, 12, 12); }
}

// Kissy face kissy face
P.kissy = (t, G) => {
  const L = G.lines[0];
  paper(); dotField(1460, 560, 430, '#E8789A');
  typeWords(L, 0, 2, 110, 150, 104);
  bigWord(L.words[2].w.toUpperCase(), 640, 560, 290, wt(L, 2), { face: C.orange, side: C.ink, rot: -0.03 });
  typeWords(L, 3, 4, 1810, 150, 104, { align: 'right' });
  crab(1460, 690, 15, { expr: t >= wt(L, 2) ? 'happy' : 'normal', blush: t >= wt(L, 1) });
  sparkles(1460, 560, 230, [C.pink, C.ink]);
  if (t >= wt(L, 1)) for (let i = 0; i < 4; i++) { const k = ((t - wt(L, 1)) * 0.9 + i / 4) % 1; heart(1460 + Math.sin(i * 2 + k * 6) * 120, 450 - k * 260, 7, C.pink); }
};

// Sent to your phone but —— 对话框
P.phone = (t, G) => {
  const L = G.lines[0];
  splitBG('#E9E6E0', C.blue, 0.2);
  const d = dialog(960, 520, 980, 470, 'claude — send message', L.t);
  if (d) {
    typeWords(L, 0, 3, d.x + 70, d.y + 150, 96);
    heartLine(L.words[3].w, 960, d.y + 270, 96, wt(L, 3));
    const hot = t >= wt(L, 4) - 0.1;
    button(960 - 250, d.y + 360, 220, 70, 'Send', hot, d.a);
    button(960 + 30, d.y + 360, 220, 70, 'Cancel', false, d.a);
    const k = eOut((t - L.t - 0.3) / 0.8);
    cursor(lerp(1300, 870, k), lerp(980, d.y + 395, k));
  }
  typeWords(L, 4, 5, 1810, 150, 96, { align: 'right', fill: C.cream });
  crab(200, 1010, 11, { expr: t >= wt(L, 4) ? 'happy' : 'normal', blush: true });
};

// I'm trying to kiss your lips for real
P.kissReal = (t, G) => {
  const L = G.lines[0];
  darkBG(); dotField(1460, 560, 460, C.yellow, 30, 1.6);
  typeWords(L, 0, 3, 110, 150, 104, { fill: C.cream });
  bigWord(L.words[3].w.toUpperCase(), 640, 540, 300, wt(L, 3), { face: C.orange, side: '#000', rot: -0.03 });
  typeWords(L, 4, 6, 1810, 150, 104, { align: 'right', fill: C.cream });
  typeWords(L, 6, 7, 880, 930, 120, { align: 'right', fill: C.cream });
  if (t >= wt(L, 7)) tile(L.words[7].w, 1060, 930, 120, { bg: C.yellow, fill: C.ink, shadow: '#000', scale: pop(t - wt(L, 7)) });
  const glow = t >= wt(L, 7);
  if (glow) { const g = ctx.createRadialGradient(1460, 600, 20, 1460, 600, 360); g.addColorStop(0, 'rgba(255,230,150,.55)'); g.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  crab(1460, 690, 15, { expr: glow ? 'blink' : 'normal', blush: true, color: glow ? '#F4EBDD' : C.orange });
  sparkles(1460, 560, 240, [C.yellow, C.cream]);
  if (glow) heart(1460, 420 - (t - wt(L, 7)) * 40, 14 * pop(t - wt(L, 7), 0.3), C.red);
};

// Red hearts red hearts / That's what I'm on yeah
P.hearts = (t, G) => {
  const L = G.lines.find(l => l.kind === 'hearts'), O = G.lines.find(l => l.kind === 'on');
  const dialogOn = O && t >= O.t;
  splitBG('#E9E6E0', C.blue, dialogOn ? 0.35 : 0);
  typeWords(L, 0, 2, 110, 150, 104);
  bigWord(L.words[0].w.toUpperCase(), 470, 560, 280, wt(L, 0), { face: C.ink, side: C.red, rot: -0.03 });
  if (t >= wt(L, 1)) { const pump = 1 + kick(beatFrac(t) * SPB, 8) * 0.1; heart(1450, 560, 34 * pop(t - wt(L, 1), 0.3) * pump, C.red); }
  typeWords(L, 2, 4, 1810, 150, 104, { align: 'right', fill: C.cream });
  if (t >= wt(L, 3)) heart(1450 + 230, 380, 14 * pop(t - wt(L, 3), 0.3), C.pink);
  crab(200, 1010, 11, { expr: dialogOn ? 'happy' : 'normal', blush: true });
  if (dialogOn) {
    const d = dialog(960, 500, 1000, 470, 'claude — confirm', O.t);
    typeWords(O, 0, 4, d.x + 70, d.y + 150, 92);
    heartLine(O.words[4].w, 960, d.y + 270, 100, wt(O, 4));
    button(960 - 250, d.y + 360, 220, 70, 'Yes', t >= wt(O, 4), d.a);
    button(960 + 30, d.y + 360, 220, 70, 'No', false, d.a);
    const k = eOut((t - O.t - 0.2) / 0.6);
    cursor(lerp(1250, 860, k), lerp(980, d.y + 400, k));
  }
};

// Come give me something I can feel / Oh oh oh —— 报错弹窗刷屏
P.feel = (t, G) => {
  const L = G.lines.find(l => l.kind === 'feel'), O = G.lines.find(l => l.kind === 'oh');
  splitBG('#2B2B2F', '#1D2752');
  typeWords(L, 0, 3, 110, 150, 96, { fill: C.cream });
  // 顶部红色警告条
  if (t >= wt(L, 3)) {
    const a = pop(t - wt(L, 3), 0.2);
    ctx.save(); ctx.translate(1180, 150); ctx.scale(a, a); ctx.rotate(-0.01);
    rrect(-360, -42, 720, 84, 8, C.red); rrect(230, -26, 100, 52, 6, C.white);
    ctx.restore();
    txt('⚠  HEART OVERLOAD', 1180 - 330 * a, 150, 40 * a, { fill: C.white, align: 'left' });
    txt('申诉', 1180 + 280 * a, 152, 26 * a, { fill: C.red });
  }
  const pops = [];
  L.words.slice(3).forEach((w, i) => pops.push({ w: w.w, t: w.t, big: i === L.words.length - 4 }));
  if (O) O.words.forEach(w => { for (let r = 0; r < 4; r++) pops.push({ w: r === 3 ? w.w : '', t: w.t + r * 0.035 }); });
  pops.forEach((p, i) => {
    if (t < p.t) return;
    const x = 560 + i * 34 + (i % 3) * 40, y = 360 + i * 30;
    errWin(x + 200, y + 70, 560, 160, 'error', p.w, { scale: pop(t - p.t, 0.12), head: i % 3 === 2 ? C.red : C.blue });
  });
  const shake = O && t >= O.t ? Math.sin(t * 60) * 6 : 0;
  crab(200 + shake, 1010, 11, { expr: O && t >= O.t ? 'squint' : 'shock', sweat: true });
};

// Don't you want me like I want you baby
P.want = (t, G) => {
  const L = G.lines[0];
  paper();
  const baby = t >= wt(L, 8);
  crab(250, 760, 15, { expr: baby ? 'happy' : 'normal', blush: baby });
  if (!baby) ['?', '?', '?'].forEach((q, i) => { if (t >= wt(L, 4) + i * 0.15) txt(q, 170 + i * 80, 560 - i * 30, 60 + i * 10, { fill: [C.orange, C.blue, C.ink][i], scale: pop(t - wt(L, 4) - i * 0.15, 0.2) }); });
  bubbleRow(L, 0, 4, 110, 210, [70, 86, 104, 122]);
  typeWords(L, 4, 8, 110, 430, 120);
  bigWord(L.words[8].w, 1340, 760, 300, wt(L, 8), { face: C.pink, side: C.ink, rot: -0.04 });
  if (baby) for (let i = 0; i < 6; i++) heart(1340 + Math.cos(i + t * 2) * 380, 760 + Math.sin(i + t * 2) * 200, 6, C.pink);
};

// Don't you need me like I need you now —— 卡片
P.need = (t, G) => {
  const L = G.lines[0];
  paper();
  crab(230, 800, 13, { expr: t >= wt(L, 8) ? 'happy' : 'normal', legs: beatAt(t) });
  bubbleRow(L, 0, 4, 110, 210, [70, 86, 104, 122], C.blue);
  typeWords(L, 4, 8, 110, 430, 110);
  const cards = [['code', 'code?', C.blue], ['art', 'art?', C.green], ['chat', 'words?', C.orange], ['hug', 'hug?', C.pink]];
  cards.forEach(([ic, lb, col], i) => card(620 + i * 290, 770, L.words[6].w, lb, ic, col, wt(L, 4 + i), (i - 1.5) * 0.04));
  bigWord(L.words[8].w.toUpperCase(), 1580, 430, 260, wt(L, 8), { face: C.orange, side: C.ink, rot: 0.04 });
};

// Sleep tomorrow but tonight go crazy —— 故障风 + 小螃蟹变身
const RAIN = ['WARNING sleep.exe 未响应', 'FATAL bedtime.dll 已停止工作', 'Traceback (most recent call last):', '>>> import party', 'Segmentation fault (core dumped)', 'exit code 0xDEADBEEF', 'rm -rf ./tomorrow', 'ERROR 404 sleep not found', 'while (true) { dance(); }', 'kill -9 alarm'];
P.sleep = (t, G) => {
  const L = G.lines[0];
  darkBG('#4A1428', '#12040A');
  for (let i = 0; i < 26; i++) txt(RAIN[i % RAIN.length], 60 + (i * 337) % 1500, ((i * 47 + t * 70) % (H + 60)) - 30, 22, { fill: 'rgba(255,90,110,.22)', align: 'left', mono: true, weight: 400 });
  const evil = t >= wt(L, 3), crazy = t >= wt(L, 5);
  if (evil) { const g = ctx.createRadialGradient(960, 600, 30, 960, 600, 520); g.addColorStop(0, 'rgba(255,90,60,.35)'); g.addColorStop(1, 'rgba(255,90,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  const jx = crazy ? (rnd(Math.floor(t * 30)) - 0.5) * 16 : 0;
  crab(960 + jx, 760, 26, { expr: crazy ? 'glow' : evil ? 'squint' : 'blink', horns: evil });
  typeWords(L, 0, 2, 110, 150, 104, { fill: C.cream });
  typeWords(L, 2, 4, 1810, 150, 104, { align: 'right', fill: C.cream });
  typeWords(L, 4, 5, 440, 920, 120, { align: 'right', fill: C.cream });
  if (crazy) {
    const s = L.words[5].w.toUpperCase(), o = 6 + kick(beatFrac(t) * SPB, 8) * 18;
    bigWord(s, 980 - o, 920, 260, wt(L, 5), { face: 'rgba(255,40,90,.8)', side: 'rgba(0,0,0,0)', depthK: 0.001 });
    bigWord(s, 980 + o, 920, 260, wt(L, 5), { face: 'rgba(40,200,255,.8)', side: 'rgba(0,0,0,0)', depthK: 0.001 });
    bigWord(s, 980, 920, 260, wt(L, 5), { face: C.yellow, side: '#000' });
  }
};

// All you gotta do is just meet me at the —— 小螃蟹脸部特写
P.meet = (t, G) => {
  const L = G.lines[0];
  bg(C.orange);
  ctx.fillStyle = 'rgba(0,0,0,.05)'; for (let x = 0; x < W; x += 60) for (let y = 0; y < H; y += 60) ctx.fillRect(x, y, 6, 6);
  const zoom = clamp((t - (L.end - 0.35)) / 0.35);
  ctx.save();
  if (zoom > 0) { const z = 1 + eIn(zoom) * 5; ctx.translate(620, 470); ctx.scale(z, z); ctx.translate(-620, -470); }
  const blink = Math.abs(((t - L.t) % 2.2) - 0.1) < 0.06;
  [[620, 'MEET', 6], [1300, 'ME', 7]].forEach(([x, word, wi]) => {
    ctx.fillStyle = C.ink; ctx.fillRect(x - 70, blink ? 460 : 280, 140, blink ? 30 : 380);
    if (!blink && t >= wt(L, wi)) [...word].forEach((c, i) => txt(c, x, 330 + i * 92 * (4 / Math.max(4, word.length)) + (word.length < 4 ? 60 : 0), 84, { fill: C.cream, scale: pop(t - wt(L, wi) - i * 0.04, 0.18) }));
  });
  if (t >= wt(L, 7)) { ctx.fillStyle = 'rgba(255,95,162,.55)'; ctx.fillRect(470, 700, 300, 40); ctx.fillRect(1150, 700, 300, 40); }
  ctx.restore();
  typeWords(L, 0, 6, 960, 150, 96, { align: 'center', fill: C.cream });
  typeWords(L, 8, 10, 960, 900, 150, { align: 'center', fill: C.ink });
  if (zoom > 0) { ctx.fillStyle = `rgba(21,21,21,${eIn(zoom)})`; ctx.fillRect(0, 0, W, H); }
};

// 副歌：镜子 + 代码编辑器 / 小螃蟹圆章网格
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

// It's whatever it's whatever it's whatever you like
P.whatever = (t, G) => {
  const L = G.lines[0];
  paper();
  let x = 110, y = 230;
  L.words.slice(0, 6).forEach((w, j) => {
    const isB = /whatever/i.test(w.w), s = isB ? 70 + (j >> 1) * 18 : 84;
    const ww = isB ? measure(w.w, s) + s * 0.8 : measure(w.w, s);
    if (x + ww > 1820) { x = 110; y += 170; }
    if (t >= w.t) { if (isB) bubble(w.w, x + ww / 2, y, s, { scale: pop(t - w.t, 0.2) }); else txt(w.w, x + ww / 2, y, s, { fill: C.ink, scale: pop(t - w.t, 0.2) }); }
    x += ww + 22;
  });
  typeWords(L, 6, 7, 900, 780, 130, { align: 'right' });
  bigWord(L.words[7].w.toUpperCase(), 1300, 780, 280, wt(L, 7), { face: C.orange, side: C.ink, rot: -0.03 });
  crab(260, 800, 14, { expr: t >= wt(L, 7) ? 'happy' : 'normal', blush: t >= wt(L, 7) });
  if (t >= wt(L, 7)) heart(260, 560 - Math.abs(Math.sin(t * 5)) * 20, 9, C.red);
};

// Turn this 아파트 into a club
P.club = (t, G) => {
  const L = G.lines[0];
  const on = t >= wt(L, 5);
  darkBG(on ? '#2A1A3A' : '#2A2A30', '#08080C');
  const hue = (t * 240) % 360;
  dotField(1460, 560, 470, on ? `hsl(${hue},90%,60%)` : C.yellow, 30, 1.6);
  typeWords(L, 0, 2, 110, 150, 104, { fill: C.cream });
  bigWord(L.words[2].w, 620, 540, 290, wt(L, 2), { face: C.orange, side: '#000', rot: -0.03 });
  typeWords(L, 3, 5, 1810, 150, 104, { align: 'right', fill: C.cream });
  if (on) tile(L.words[5].w.toUpperCase(), 960, 920, 140, { bg: `hsl(${hue},85%,55%)`, fill: C.white, shadow: '#000', scale: pop(t - wt(L, 5)) });
  crab(1460, 690 - (on ? Math.abs(Math.sin(t * 9)) * 40 : 0), 15, { expr: on ? 'cool' : 'normal', armL: on ? Math.floor(t * 4) % 2 : 0, armR: on ? 1 - Math.floor(t * 4) % 2 : 0 });
  sparkles(1460, 560, 240, [C.yellow, C.pink, C.cream]);
};

// I'm talking drink dance smoke freak party all night
P.party = (t, G) => {
  const L = G.lines[0];
  paper(); dotField(960, 560, 600, 'rgba(217,119,87,.5)', 34, 1.4);
  typeWords(L, 0, 2, 110, 150, 104);
  const cols = [C.orange, C.blue, '#8A8680', C.pink];
  for (let i = 0; i < 4; i++) card(560 + i * 290, 520, L.words[2 + i].w, null, null, cols[i], wt(L, 2 + i), (i - 1.5) * 0.05);
  bigWord(L.words[6].w.toUpperCase(), 620, 900, 210, wt(L, 6), { face: C.orange, side: C.ink, rot: -0.03 });
  typeWords(L, 7, 9, 1810, 900, 110, { align: 'right' });
  if (t >= wt(L, 7)) { ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(1760, 760, 50, 0, 7); ctx.fill(); ctx.fillStyle = '#E6E3DD'; ctx.beginPath(); ctx.arc(1785, 745, 45, 0, 7); ctx.fill(); }
  crab(180, 640, 9, { expr: 'cool', armL: Math.floor(beatAt(t)) % 2, armR: 1 - Math.floor(beatAt(t)) % 2, legs: beatAt(t) });
};

// 건배 건배 girl what's up / Oh oh oh
function cup(x, y, s, rot, fill) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 9;
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(-80, -120); ctx.lineTo(80, -120); ctx.lineTo(60, 120); ctx.lineTo(-60, 120); ctx.closePath(); ctx.fill();
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(-72, -60); ctx.lineTo(72, -60); ctx.lineTo(60, 116); ctx.lineTo(-60, 116); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-80, -120); ctx.lineTo(80, -120); ctx.lineTo(60, 120); ctx.lineTo(-60, 120); ctx.closePath(); ctx.stroke();
  ctx.restore();
}
P.cheers = (t, G) => {
  const L = G.lines.find(l => l.kind === 'cheers'), O = G.lines.find(l => l.kind === 'oh');
  bg(C.yellow); ctx.fillStyle = 'rgba(21,21,21,.07)'; for (let x = 15; x < W; x += 30) for (let y = 15; y < H; y += 30) ctx.fillRect(x, y, 4, 4);
  bigWord(L.words[0].w, 470, 480, 270, wt(L, 0), { face: C.ink, side: C.orange, rot: -0.04 });
  bigWord(L.words[1].w, 1450, 480, 270, wt(L, 1), { face: C.orange, side: C.ink, rot: 0.04 });
  let c = 0; [wt(L, 0), wt(L, 1)].forEach(h => { if (t >= h) c = Math.max(c, kick(t - h, 6)); });
  const close = t >= wt(L, 0) ? 1 : 0;
  cup(960 - 90 - c * 15, 560, 0.75, 0.22 * close - c * 0.1, C.orange);
  cup(960 + 90 + c * 15, 560, 0.75, -0.22 * close + c * 0.1, C.pink);
  if (t >= wt(L, 0)) for (let i = 0; i < 14; i++) { const k = t - wt(L, 0), a = -Math.PI / 2 + (rnd(i) - 0.5) * 2.2; ctx.fillStyle = i % 2 ? C.white : C.orange; ctx.fillRect(960 + Math.cos(a) * k * 600, 430 + Math.sin(a) * k * 600 + k * k * 900, 14, 14); }
  typeWords(L, 2, 5, 960, 880, 110, { align: 'center' });
  crab(1720, 1010, 10, { expr: 'happy', armL: t >= wt(L, 3) ? Math.floor(t * 6) % 2 : 0 });
  if (O) O.words.forEach((w, i) => { if (t >= w.t) errWin(1420 + i * 60, 760 + i * 50, 420, 140, 'error', w.w, { scale: pop(t - w.t, 0.12), head: i === 2 ? C.red : C.blue }); });
};

P.plain = (t, G) => {
  paper();
  G.lines.forEach(L => typeWords(L, 0, L.words.length, 110, 150, 100));
  crab(1460, 690, 15, { expr: 'happy' });
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
  typeStr(word, t < 4.7 ? 1.2 : 4.7, 300, 435, 130, { cps: 0.07, fill: C.white });
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
