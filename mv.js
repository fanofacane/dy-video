// Claude MV ·《APT.》（前半首）
// 节奏规则：每句歌词至少一个镜头、长句拆成多个镜头；每一拍都有动作；镜头永远在动。
// 歌词从 APT_.lrc 读取，视频 0s = 歌曲 0s。

const W = 1920, H = 1080;
const main = document.getElementById('c'), mctx = main.getContext('2d');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const bctx = buf.getContext('2d');
let ctx = bctx;

const C = {
  orange: '#D97757', orangeD: '#9C4A31', blue: '#2F5BEA', blueD: '#1A3594', cream: '#F2EEE6', ink: '#141414',
  yellow: '#FFC94A', red: '#FF4D5A', pink: '#FF5FA2', green: '#3FD06B', purple: '#8B5CF6', white: '#FFFFFF', gray: '#8A8680',
};
const FONT = '"Noto Sans SC", "Noto Sans KR", sans-serif';
const MONO = '"DejaVu Sans Mono", monospace';
const SPB = 60 / 149, BEAT0 = 6.866;   // 由音频实测的鼓点相位
const IB = n => BEAT0 - n * SPB;   // 开场：倒数第 n 拍（原曲在 IB(1) 进来）
const snap = x => BEAT0 + Math.round((x - BEAT0) / SPB) * SPB;
const CUT = 96.9;             // 前半首：第二段副歌结束
let DURATION = 100.5, END_START = 97, NOW = 0;
const USED = new Set();

// ---------- 数学 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = t => 1 - Math.pow(1 - clamp(t), 3);
const eIn = t => Math.pow(clamp(t), 3);
const eBack = t => { t = clamp(t); const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const pop = (lt, d = 0.2) => lt < 0 ? 0 : eBack(lt / d);
const kick = (lt, k = 8) => lt < 0 ? 0 : Math.exp(-lt * k);
const beatAt = t => (t - BEAT0) / SPB;
const bfrac = t => { const b = beatAt(t); return b - Math.floor(b); };
const fmt = n => Math.round(n).toLocaleString('en-US');

// ---------- 绘图基础 ----------
function fill(c) { ctx.fillStyle = c; ctx.fillRect(-300, -300, W + 600, H + 600); }
function grad(c0, c1) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600); }
function glow(x, y, r, c) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
function rr(x, y, w, h, r, f, s, lw = 5) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (f) { ctx.fillStyle = f; ctx.fill(); } if (s) { ctx.lineWidth = lw; ctx.strokeStyle = s; ctx.stroke(); } }
function circle(x, y, r, f) { ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

function txt(s, x, y, size, o = {}) {
  s = String(s); USED.add(s);
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  const sc = o.sc ?? 1; ctx.scale(sc * (o.sx ?? 1), sc);
  ctx.globalAlpha *= o.a ?? 1;
  ctx.font = `${o.w || 900} ${size}px ${o.mono ? MONO : FONT}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  if (o.ex) { ctx.fillStyle = o.exc || C.ink; const st = Math.max(1.5, o.ex / 12); for (let i = o.ex; i > 0; i -= st) ctx.fillText(s, i * 0.7, i); }
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.lw || size * 0.06; ctx.strokeStyle = o.stroke; ctx.strokeText(s, 0, 0); }
  if (o.fill !== null) { ctx.fillStyle = o.fill || C.ink; ctx.fillText(s, 0, 0); }
  ctx.restore();
}
function tw(s, size, mono) { ctx.save(); ctx.font = `900 ${size}px ${mono ? MONO : FONT}`; const w = ctx.measureText(s).width; ctx.restore(); return w; }
function tile(s, x, y, size, o = {}) {
  const w = tw(s, size) + size * 0.55, h = size * 1.3;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); const sc = o.sc ?? 1; ctx.scale(sc, sc);
  rr(-w / 2 + size * 0.09, -h / 2 + size * 0.11, w, h, size * 0.14, o.sh || C.ink);
  rr(-w / 2, -h / 2, w, h, size * 0.14, o.bg || C.blue);
  ctx.restore();
  txt(s, x, y + size * 0.04, size, { fill: o.fg || C.white, rot: o.rot, sc });
}
function pix(rows, x, y, p, c) { ctx.fillStyle = c; rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'X') ctx.fillRect(x + i * p, y + j * p, p + 0.6, p + 0.6); }); }
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function heart(x, y, p, c = C.red) { pix(HEART, x - 3.5 * p, y - 3 * p, p, c); }
function bubble(s, x, y, size, o = {}) {
  const w = tw(s, size) + size * 0.8, h = size * 1.45, sc = o.sc ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); if (o.rot) ctx.rotate(o.rot);
  ctx.fillStyle = o.bg || C.blue; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.35); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-w * 0.2, h / 2 - 2); ctx.lineTo(-w * 0.32, h / 2 + size * 0.45); ctx.lineTo(-w * 0.02, h / 2 - 2); ctx.fill();
  ctx.restore();
  txt(s, x, y + size * 0.03, size, { fill: o.fg || C.white, sc, rot: o.rot });
}
function star4(x, y, s, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill(); }
function stars(t, speed = 0, n = 120) { for (let i = 0; i < n; i++) { const y = (rnd(i) * H + t * speed * (0.4 + rnd(i + 2))) % H; ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.5 * Math.abs(Math.sin(t * 1.7 + i))})`; ctx.fillRect(rnd(i + 5) * W, y, 3, 3 + Math.min(70, speed * 0.03)); } }
function speedLines(t, cx, cy, col = 'rgba(255,255,255,.5)', n = 44) { ctx.strokeStyle = col; ctx.lineWidth = 6; for (let i = 0; i < n; i++) { const a = rnd(i) * 6.28, r0 = 250 + ((t * 2600 + rnd(i + 3) * 1000) % 1000); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + 180), cy + Math.sin(a) * (r0 + 180)); ctx.stroke(); } }
function rays(cx, cy, t, c, n = 16) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.6); ctx.fillStyle = c; for (let i = 0; i < n; i++) { ctx.rotate(6.283 / n); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1600, -120); ctx.lineTo(1600, 120); ctx.fill(); } ctx.restore(); }
function shock(x, y, lt, c = C.white, r = 600) { if (lt < 0 || lt > 0.5) return; ctx.strokeStyle = c; ctx.globalAlpha = 1 - lt / 0.5; ctx.lineWidth = 18 * (1 - lt / 0.5) + 2; ctx.beginPath(); ctx.arc(x, y, eOut(lt / 0.5) * r, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
const CONF = [C.yellow, C.pink, C.blue, C.green, C.orange, C.white];
function confetti(x, y, lt, n = 50, spread = 1) { if (lt < 0) return; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (rnd(i * 3.3) - 0.5) * 3 * spread, v = 700 + rnd(i) * 900; ctx.save(); ctx.translate(x + Math.cos(a) * v * lt, y + Math.sin(a) * v * lt + 900 * lt * lt); ctx.rotate(lt * 10 + i); ctx.fillStyle = CONF[i % 6]; ctx.fillRect(-12, -6, 24, 12); ctx.restore(); } }
function dots(c, step = 44, s = 5) { ctx.fillStyle = c; for (let x = step / 2; x < W; x += step) for (let y = step / 2; y < H; y += step) ctx.fillRect(x - s / 2, y - s / 2, s, s); }

// ---------- 像素小螃蟹 ----------
function crab(cx, by, p, o = {}) {
  const col = o.color || C.orange;
  ctx.save(); ctx.translate(cx, by); if (o.rot) ctx.rotate(o.rot);
  const sq = o.sq || 0; ctx.scale((o.flip ? -1 : 1) * (1 + sq * 0.6), 1 - sq);
  ctx.globalAlpha *= o.a ?? 1;
  ctx.translate(-8 * p, -9 * p);
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * p, y * p, w * p + 0.7, h * p + 0.7); };
  const lg = o.legs != null ? Math.floor(o.legs * 2) % 2 : -1;
  [3, 5].forEach(x => R(x, 7, 1, lg === 0 ? 1.3 : 2, col)); [10, 12].forEach(x => R(x, 7, 1, lg === 1 ? 1.3 : 2, col));
  R(2, 0, 12, 7, col);
  R(0, 3 - (o.aL || 0) * 2, 2, 2, col); R(14, 3 - (o.aR || 0) * 2, 2, 2, col);
  if (o.horns) { R(3, -3, 1, 3, C.white); R(12, -3, 1, 3, C.white); }
  const k = C.ink;
  switch (o.e || 'n') {
    case 'happy': [[4, 3], [5, 2], [6, 3], [9, 3], [10, 2], [11, 3]].forEach(([x, y]) => R(x, y, 1, 1, k)); break;
    case 'squint': [[4, 1.5], [5, 2.5], [4, 3.5], [11, 1.5], [10, 2.5], [11, 3.5]].forEach(([x, y]) => R(x, y, 1, 1, k)); break;
    case 'shock': R(4, 2, 2, 2, k); R(10, 2, 2, 2, k); R(4.5, 2.5, 1, 1, C.white); R(10.5, 2.5, 1, 1, C.white); break;
    case 'cool': R(3, 2, 4, 2, k); R(9, 2, 4, 2, k); R(7, 2, 2, 0.6, k); R(3.6, 2.3, 1, 0.6, '#777'); R(9.6, 2.3, 1, 0.6, '#777'); break;
    case 'dead': [[4, 2], [6, 2], [5, 3], [4, 4], [6, 4], [9, 2], [11, 2], [10, 3], [9, 4], [11, 4]].forEach(([x, y]) => R(x, y - 0.5, 1, 1, k)); break;
    case 'blink': R(4, 3, 2, 0.6, k); R(10, 3, 2, 0.6, k); break;
    case 'glow': R(4, 2, 1.4, 2, C.yellow); R(10.6, 2, 1.4, 2, C.yellow); break;
    case 'heart': pix(HEART, 3.5 * p, 1.6 * p, p * 0.42, C.red); pix(HEART, 9.4 * p, 1.6 * p, p * 0.42, C.red); break;
    case 'kiss': R(4, 3, 2, 0.6, k); R(10, 3, 2, 0.6, k); R(7.3, 4.6, 1.4, 1.2, '#E2245A'); break;
    default: R(5, 2, 1, 2, k); R(10, 2, 1, 2, k);
  }
  if (o.blush) { R(3, 4.4, 2, 0.8, C.pink); R(11, 4.4, 2, 0.8, C.pink); }
  if (o.crown) { R(5, -2, 6, 2, C.yellow); R(5, -3, 1, 1, C.yellow); R(7.5, -3, 1, 1, C.yellow); R(10, -3, 1, 1, C.yellow); R(7.5, -1.4, 1, 0.8, C.red); }
  if (o.bow) { R(10, -1, 2, 2, C.pink); R(13, -1, 2, 2, C.pink); R(12, -0.5, 1, 1, '#D63F80'); }
  if (o.phones) { R(1, -1, 14, 1, C.ink); R(0, 0, 2, 3, C.ink); R(14, 0, 2, 3, C.ink); }
  if (o.sweat) { R(15, -1, 1, 2, '#69B7FF'); R(14.5, 0, 2, 1.5, '#69B7FF'); }
  ctx.restore();
}
// 跟着节拍蹦
const bounce = (t, amp = 30) => Math.abs(Math.sin(Math.PI * bfrac(t))) * amp;

// ---------- 道具 ----------
function kissFace(x, y, r, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  circle(0, 0, r, C.yellow); ctx.lineWidth = r * 0.07; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.12, r * 0.16, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.22, -r * 0.3); ctx.lineTo(r * 0.45, -r * 0.15); ctx.lineTo(r * 0.22, 0); ctx.stroke();
  ctx.fillStyle = '#E2245A'; ctx.beginPath(); ctx.ellipse(0, r * 0.4, r * 0.16, r * 0.12, 0, 0, 7); ctx.fill();
  ctx.restore();
  heart(x + r * 0.95, y + r * 0.3, r * 0.07, C.red);
}
function lips(x, y, s, rot = 0, a = 0.9) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = `rgba(226,36,90,${a})`;
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.quadraticCurveTo(-30, -38, 0, -10); ctx.quadraticCurveTo(30, -38, 60, 0); ctx.quadraticCurveTo(0, 8, -60, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-60, 4); ctx.quadraticCurveTo(0, 58, 60, 4); ctx.quadraticCurveTo(0, 16, -60, 4); ctx.fill();
  ctx.restore();
}
function phone(x, y, s, screen = '#101218') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(-205 + 16, -400 + 16, 410, 800, 56, 'rgba(0,0,0,.35)'); rr(-205, -400, 410, 800, 56, C.ink); rr(-188, -372, 376, 744, 40, screen); rr(-60, -362, 120, 26, 13, C.ink);
  ctx.restore();
}
function mirror(cx, cy, r, look, t, o = {}) {
  glow(cx, cy, r * 1.7, o.glow || 'rgba(255,214,120,.4)');
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28 + t * 0.5; if (Math.sin(t * 5 + i * 1.7) > -0.3) circle(cx + Math.cos(a) * (r + r * 0.13), cy + Math.sin(a) * (r + r * 0.13), r * 0.03, o.dot || C.yellow); }
  circle(cx, cy, r, '#F3EFE6'); ctx.strokeStyle = o.rim || '#E2B65A'; ctx.lineWidth = r * 0.055; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r * 0.97, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(150,185,235,.28)'; ctx.beginPath(); ctx.moveTo(cx - r * 0.75, cy - r); ctx.lineTo(cx - r * 0.35, cy - r); ctx.lineTo(cx - r * 1.05, cy + r); ctx.lineTo(cx - r * 1.45, cy + r); ctx.fill();
  crab(cx, cy + r * 0.45, r * 0.068, look);
  ctx.restore();
}
function editor(x, y, w, h, file, lines, n, o = {}) {
  rr(x, y, w, h, 18, '#1B1A22', '#3A3945', 3);
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => circle(x + 30 + i * 28, y + 30, 9, c));
  rr(x + 120, y + 12, tw(file, 22, true) + 44, 38, 8, '#2D2C36'); txt(file, x + 142, y + 31, 22, { fill: '#CCC', mono: true, w: 700, align: 'left' });
  const lh = o.lh || 50, sz = o.size || 28;
  for (let i = 0; i < Math.min(n, lines.length); i++) {
    const s = lines[i];
    const col = s.startsWith('//') ? '#6A6A78' : /^(ERROR|✗)/.test(s) ? C.red : s.startsWith('✓') ? C.green : s.startsWith('$') ? C.orange : s.includes(':') ? '#F0C27A' : '#8FB4FF';
    const fresh = i === n - 1 ? kick(NOW - (o.lastT ?? -9), 10) : 0;
    if (fresh > 0.05) { ctx.fillStyle = `rgba(255,255,255,${fresh * 0.25})`; ctx.fillRect(x + 10, y + 70 + i * lh, w - 20, lh); }
    txt(String(i + 1), x + 34, y + 95 + i * lh, 20, { fill: '#555', align: 'left', mono: true, w: 400 });
    txt(s, x + 80, y + 95 + i * lh, sz, { fill: col, align: 'left', mono: true, w: 400 });
  }
  if (Math.floor(NOW * 4) % 2) { ctx.fillStyle = C.orange; ctx.fillRect(x + 80, y + 78 + Math.min(n, lines.length) * lh, 14, 32); }
}
function bldg(x, by, w, h, ci, o = {}) {
  const col = [C.orange, C.blue, C.yellow, C.pink, C.cream, C.green][ci % 6];
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - w / 2 + 12, by - h + 12, w, h);
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, by - h, w, h);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.strokeRect(x - w / 2, by - h, w, h);
  ctx.fillStyle = C.ink; ctx.fillRect(x - w / 2 - 10, by - h - 12, w + 20, 14);
  const cols = Math.max(2, Math.floor(w / 85)), rows = Math.max(1, Math.floor((h - 24) / 62)), cw = (w - 40) / cols, rh = (h - 24) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    ctx.fillStyle = o.hue != null ? `hsl(${(o.hue + c * 60 + r * 45) % 360},95%,62%)` : (rnd(ci * 31 + r * 7 + c) > 0.3 ? C.yellow : '#2A2F55');
    ctx.fillRect(x - w / 2 + 28 + c * cw, by - h + 16 + r * rh, cw - 16, rh - 16);
  }
}
function errWin(x, y, w, h, msg, o = {}) {
  const s = o.sc ?? 1; if (s <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); if (o.rot) ctx.rotate(o.rot);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-w / 2 + 12, -h / 2 + 12, w, h);
  ctx.fillStyle = '#F4F4F4'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = o.head || C.blue; ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 40);
  circle(-w / 2 + 60, 20, 26, C.red); ctx.fillStyle = C.white; ctx.fillRect(-w / 2 + 44, 15, 32, 10);
  ctx.restore();
  txt('error', x - (w / 2 - 18) * s, y - (h / 2 - 23) * s, 22 * s, { fill: C.white, align: 'left', mono: true, w: 700 });
  txt(msg, x - (w / 2 - 105) * s, y + 20 * s, 44 * s, { fill: C.ink, align: 'left', rot: o.rot });
}

// ---------- 歌词 ----------
let LINES = [], SHOTS = [];
function kindOf(s) {
  const r = [[/club/i, 'club'], [/아파트/, 'chant'], [/^uh/i, 'uh'], [/meet me/i, 'meet'], [/kissy/i, 'kissy'], [/phone/i, 'phone'], [/lips/i, 'kissReal'],
    [/hearts/i, 'hearts'], [/what i'?m on/i, 'rocket'], [/feel/i, 'feel'], [/^oh/i, 'oh'], [/want me/i, 'want'], [/need me/i, 'need'], [/sleep/i, 'sleep'],
    [/whatever/i, 'whatever'], [/party/i, 'party'], [/건배/, 'cheers']];
  for (const [re, k] of r) if (re.test(s)) return k;
  return 'plain';
}
// 每种歌词在哪些词上切镜头
const SPLITS = { kissy: [0, 1, 2, 3], phone: [0, 4], kissReal: [0, 3, 6], hearts: [0, 1, 2, 3], feel: [0, 4], want: [0, 2, 4, 8], need: [0, 4, 8], sleep: [0, 2, 4], meet: [0, 6, 8], whatever: [0, 2, 4, 6], club: [0, 3], party: [0, 2, 3, 4, 5, 6, 7], cheers: [0, 1, 2] };

function setLyrics(src) {
  const dec = s => s.replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).trim();
  const raw = [];
  for (const line of src.split(/\r?\n/)) { const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/); if (m) raw.push({ t: +m[1] * 60 + +m[2], text: dec(m[3]) }); }
  LINES = raw.filter(l => l.t >= 6.5 && l.text);
  // “아파트”对齐到实测鼓点
  LINES.forEach(L => { L.kind = kindOf(L.text); if (L.kind === 'chant') L.t = snap(L.t); });
  LINES.forEach((L, i) => {
    L.end = i + 1 < LINES.length ? LINES[i + 1].t : L.t + 2.2;
    const ws = L.text.split(/\s+/).filter(Boolean);
    if (L.kind === 'chant') L.words = ws.map((w, j) => ({ w, t: L.t + j * 2 * SPB }));
    else if (L.kind === 'cheers') L.words = ws.map((w, j) => ({ w, t: L.t + [0, 0.4, 0.8, 1.0, 1.25][j] }));
    else {
      const span = Math.min(L.end - L.t, 3.6) * 0.8, wt = ws.map(w => Math.max(2, [...w].length) + 1), tot = wt.reduce((a, b) => a + b, 0);
      let acc = 0; L.words = ws.map((w, j) => { const r = { w, t: L.t + span * acc / tot }; acc += wt[j]; return r; });
    }
  });
  LINES = LINES.filter(L => L.t < CUT);
  buildShots();
}

function buildShots() {
  SHOTS = [];
  const add = (t0, t1, fn, o = {}) => SHOTS.push({ t0, t1, fn, ...o });
  add(0, 1.4, 'introCoin'); add(1.4, IB(10), 'introSelect'); add(IB(10), IB(7), 'introVS'); add(IB(7), IB(3), 'introMatch'); add(IB(3), LINES[0].t, 'introCall');
  // “아파트”段落：第几段、段里第几部分（遇到 uh 进入下一部分）
  let run = -1, part = 0, prevChant = false, hits = null;
  const occ = {};
  LINES.forEach((L, i) => {
    const inRun = L.kind === 'chant' || (L.kind === 'uh' && prevChant);
    if (inRun) {
      if (!prevChant) { run++; part = 0; hits = []; }
      const scene = run === 0 ? (part === 0 ? 'call' : 'tetris') : (part === 0 ? 'mirror' : 'grid');
      if (L.kind === 'chant') { const h = hits; L.words.forEach(w => h.push(w.t)); add(L.t, L.end, scene, { L, a: 0, b: L.words.length, hits: h, run, part }); }
      else { add(L.t, L.end, scene + 'Uh', { L, a: 0, b: L.words.length, hits, run, part }); part++; hits = []; }
      prevChant = true;
      return;
    }
    prevChant = false;
    occ[L.kind] = (occ[L.kind] ?? -1) + 1;
    const sp = SPLITS[L.kind] || [0];
    sp.forEach((a, p) => {
      if (a >= L.words.length) return;
      const b = p + 1 < sp.length ? Math.min(L.words.length, sp[p + 1]) : L.words.length;
      const t0 = p === 0 ? L.t : L.words[a].t - 0.06;
      const t1 = b < L.words.length ? L.words[b].t - 0.06 : L.end;
      add(t0, t1, L.kind, { L, a, b, p, v: occ[L.kind] });
    });
  });
  END_START = LINES[LINES.length - 1].end;
  DURATION = END_START + 3.5;
  add(END_START, DURATION, 'end');
  window.DURATION = DURATION;
}

// 歌词词组：一个词一个词砸出来
const KEY = /^(kissy|phone|kiss|real|red|hearts|feel|want|need|baby|now|sleep|tonight|crazy|meet|whatever|club|party|night|yeah|oh|아파트|건배)$/i;
function say(s, t, o = {}) {
  const ws = s.L.words.slice(s.a, s.b); if (!ws.length) return;
  let size = o.size ?? 150; const gap = size * 0.38, maxW = o.maxW ?? 1720;
  const clean = w => w.replace(/[^\w가-힣']/g, '');
  const isK = w => o.tiles !== false && KEY.test(clean(w));
  const width = sz => ws.reduce((a, w) => a + tw(w.w, sz) + (isK(w.w) ? sz * 0.55 : 0), 0) + gap * (ws.length - 1) * sz / size;
  let tot = width(size); if (tot > maxW) { size *= maxW / tot; tot = maxW; }
  let x = (o.x ?? 960) - (o.align === 'left' ? 0 : o.align === 'right' ? tot : tot / 2);
  const y = o.y ?? 540;
  ws.forEach((w, i) => {
    const wd = tw(w.w, size) + (isK(w.w) ? size * 0.55 : 0);
    if (t >= w.t) {
      const sc = lerp(1.7, 1, eOut((t - w.t) / 0.12)) * (1 + kick(t - w.t - 0.12, 12) * 0.05);
      const rot = (rnd(w.t * 13) - 0.5) * 0.12;
      if (isK(w.w)) tile(w.w, x + wd / 2, y, size, { bg: o.hl || C.orange, fg: o.hlfg || C.white, sh: o.hlsh || C.ink, sc, rot });
      else txt(w.w, x + wd / 2, y, size, { fill: o.fill || C.white, ex: o.ex ?? Math.round(size * 0.07), exc: o.exc || C.ink, sc, rot });
    }
    x += wd + gap * size / (o.size ?? 150);
  });
}
const wt = (s, i) => (s.L.words[i] ? s.L.words[i].t : 1e9);
const nHits = (h, t) => h.filter(x => t >= x).length;

// ---------- 镜头 ----------
const F = {};

// ===== 0–4s：街机开场（投币 → 选择角色 → VS 神秘对手） =====
function scanlines(a = 0.12) { ctx.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 3); }
function coin(x, y, r, spin) {
  const sx = Math.abs(Math.cos(spin)) * 0.85 + 0.15;
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
  circle(0, 0, r, '#E8A317'); circle(0, 0, r * 0.82, C.yellow);
  ctx.fillStyle = '#E8A317'; ctx.fillRect(-r * 0.12, -r * 0.45, r * 0.24, r * 0.9);
  ctx.restore();
}
const PLAYERS = [
  { n: 'CLAUDE', c: '#D97757', look: { e: 'cool' } },
  { n: 'PINKY', c: '#FF5FA2', look: { e: 'happy', bow: true } },
  { n: 'KING', c: '#FFC94A', look: { e: 'happy', crown: true } },
  { n: 'DJ', c: '#8B5CF6', look: { e: 'cool', phones: true } },
  { n: 'DEVIL', c: '#E5484D', look: { e: 'glow', horns: true } },
  { n: 'LOVER', c: '#3FD06B', look: { e: 'heart', blush: true } },
  { n: 'SLEEPY', c: '#2F5BEA', look: { e: 'blink' } },
  { n: 'PANIC', c: '#1F8A8A', look: { e: 'shock', sweat: true } },
];
const PICK_SEQ = [0, 5, 2, 7, 1, 6, 3, 4, 2, 0, 5, 1, 7, 3, 6, 8];   // 8 = “?”
function selTile(i) { const c = i % 3, r = Math.floor(i / 3); return { x: 1060 + c * 260, y: 230 + r * 260, w: 230, h: 230 }; }

// 1) 0–1.4s 电视开机 → 巨型螃蟹睁眼 → 投币
F.introCoin = (t, lt) => {
  fill('#000');
  const on = clamp(lt / 0.18);
  if (on < 1) { const h = Math.max(6, eIn(on) * H); ctx.fillStyle = C.white; ctx.fillRect(0, H / 2 - h / 2, W * clamp(on * 4), h); return; }
  grad('#1B1040', '#3A1660');
  ctx.save(); ctx.globalAlpha = 0.18; dots(C.white, 54, 6); ctx.restore();
  const coinIn = IB(14), credited = lt >= coinIn;
  const eye = lt < 0.45 ? 'blink' : credited ? 'happy' : (lt % 0.5 > 0.42 ? 'blink' : 'n');
  const j = credited ? kick(lt - coinIn, 7) : 0;
  glow(960, 560, 700, 'rgba(217,119,87,.35)');
  crab(960, 900 - j * 120, 46 * (1 + kick(lt - 0.45, 8) * 0.05), { e: eye, aL: credited ? 1 : 0, aR: credited ? 1 : 0, sq: lt < 0.5 ? 0.06 : 0 });
  // 投币口
  rr(860, 940, 200, 90, 14, '#111', '#E8A317', 6); ctx.fillStyle = '#E8A317'; ctx.fillRect(948, 960, 24, 50);
  // 金币：从右上旋转飞进来，落进投币口
  if (lt > 0.62 && !credited) {
    const k = clamp((lt - 0.62) / (coinIn - 0.62));
    coin(lerp(1700, 960, eOut(k)), lerp(150, 985, k * k), 95 * (1 - k * 0.4), lt * 20);
  }
  if (credited) { shock(960, 985, lt - coinIn, C.yellow, 700); if (lt - coinIn < 0.06) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(0, 0, W, H); } }
  txt(credited ? 'PLAYER 1 READY' : 'INSERT COIN', 960, 140, 90, { fill: credited ? C.green : C.yellow, mono: true, w: 700, a: credited || Math.floor(lt * 5) % 2 ? 1 : 0.2, sc: credited ? lerp(1.5, 1, eOut((lt - coinIn) / 0.12)) : 1 });
  txt(`CREDIT ${credited ? '01' : '00'}`, 1860, 60, 36, { fill: C.white, mono: true, w: 700, align: 'right' });
  scanlines();
};

// 2) 1.4–2.85s 选择角色：选框在格子里随机乱跳
F.introSelect = (t, lt, s) => {
  // 斜纹背景
  fill('#2A1660');
  ctx.save(); ctx.translate(960, 540); ctx.rotate(-0.35); ctx.fillStyle = 'rgba(255,255,255,.06)';
  for (let x = -1600 + ((lt * 400) % 160); x < 1600; x += 160) ctx.fillRect(x, -1200, 70, 2400);
  ctx.restore();
  const step = (IB(11) - 1.4) / (PICK_SEQ.length - 1), k = Math.min(PICK_SEQ.length - 1, Math.floor(lt / step)), hk = lt - k * step;
  const sel = PICK_SEQ[k];
  // 右侧格子
  for (let i = 0; i < 9; i++) {
    const R = selTile(i);
    ctx.save(); ctx.beginPath(); ctx.roundRect(R.x, R.y, R.w, R.h, 20); ctx.clip();
    if (i < 8) { ctx.fillStyle = PLAYERS[i].c; ctx.fillRect(R.x, R.y, R.w, R.h); crab(R.x + R.w / 2, R.y + R.h * 0.92, 9, PLAYERS[i].look); }
    else { ctx.fillStyle = '#111'; ctx.fillRect(R.x, R.y, R.w, R.h); txt('?', R.x + R.w / 2, R.y + R.h / 2 + 6, 170, { fill: C.white, sc: 1 + Math.sin(t * 12) * 0.05 }); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(R.x, R.y, R.w, R.h, 20); ctx.stroke();
  }
  // 1P 选框
  const R = selTile(sel), pad = 14 + kick(hk, 14) * 16;
  ctx.strokeStyle = C.yellow; ctx.lineWidth = 12; ctx.beginPath(); ctx.roundRect(R.x - pad, R.y - pad, R.w + pad * 2, R.h + pad * 2, 26); ctx.stroke();
  rr(R.x - pad - 6, R.y - pad - 52, 80, 50, 10, C.yellow); txt('1P', R.x - pad + 34, R.y - pad - 26, 34, { fill: C.ink, mono: true, w: 700 });
  // 左侧大头像
  const P = sel < 8 ? PLAYERS[sel] : { n: '???', c: '#111', look: { e: 'n', color: '#222' } };
  ctx.save(); ctx.translate(500, 560); ctx.rotate(-0.04);
  const pop2 = lerp(1.12, 1, eOut(hk / 0.08)); ctx.scale(pop2, pop2);
  rr(-380 + 14, -380 + 14, 760, 760, 40, 'rgba(0,0,0,.35)'); rr(-380, -380, 760, 760, 40, P.c, C.white, 10);
  ctx.save(); ctx.beginPath(); ctx.roundRect(-380, -380, 760, 760, 40); ctx.clip();
  rays(0, 0, t, 'rgba(255,255,255,.12)');
  crab(0, 300, 26, P.look);
  if (sel === 8) txt('?', 0, -40, 300, { fill: C.white });
  ctx.restore();
  rr(-300, 300, 600, 110, 20, C.ink); txt(P.n, 0, 357, 70, { fill: C.white, w: 900 });
  ctx.restore();
  txt('SELECT PLAYER', 1450, 120, 76, { fill: C.white, ex: 8, exc: '#000', w: 900 });
  txt(String(Math.max(0, 9 - Math.floor(lt * 3))).padStart(2, '0'), 1860, 60, 50, { fill: C.yellow, mono: true, w: 700, align: 'right' });
  scanlines(0.08);
};

// 3) 2.85–4.0s VS：CLAUDE 对战神秘对手，闪电劈开，RANDOM / GAME 跟着念白砸下来
F.introVS = (t, lt, s) => {
  const split = eOut(lt / 0.15);
  const shake = [IB(9), IB(8)].reduce((m, x) => Math.max(m, kick(t - x, 9)), 0) * 22;
  ctx.save(); ctx.translate((rnd(Math.floor(t * 60)) - 0.5) * shake, (rnd(Math.floor(t * 60) + 3) - 0.5) * shake);
  // 左橙右蓝，斜切
  fill(C.blue);
  ctx.fillStyle = '#7A2716'; ctx.beginPath(); ctx.moveTo(-200, -200); ctx.lineTo(1080 + (1 - split) * -1400, -200); ctx.lineTo(840 + (1 - split) * -1400, H + 200); ctx.lineTo(-200, H + 200); ctx.fill();
  ctx.save(); ctx.globalAlpha = 0.15; ctx.translate(480, 560); rays(0, 0, t, C.white); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.moveTo(1080, -200); ctx.lineTo(W + 200, -200); ctx.lineTo(W + 200, H + 200); ctx.lineTo(840, H + 200); ctx.clip(); ctx.globalAlpha = 0.15; ctx.translate(1440, 560); rays(0, 0, -t, C.white); ctx.restore();
  // 两位选手
  crab(480 - (1 - split) * 600, 900, 30, { e: 'cool', aR: 1 });
  crab(1440 + (1 - split) * 600, 900, 30, { e: 'n', color: '#14142A', flip: true });
  txt('?', 1440, 600 - Math.abs(Math.sin(t * 6)) * 20, 200, { fill: C.white, a: split });
  rr(250 - (1 - split) * 600, 950, 460, 96, 16, C.ink); txt('CLAUDE', 480 - (1 - split) * 600, 999, 64, { fill: C.white, w: 900 });
  rr(1210 + (1 - split) * 600, 950, 460, 96, 16, C.ink); txt('? ? ?', 1440 + (1 - split) * 600, 999, 64, { fill: C.white, w: 900 });
  // 闪电
  if (split > 0.5) {
    ctx.save(); ctx.shadowColor = C.yellow; ctx.shadowBlur = 30; ctx.strokeStyle = C.white; ctx.lineWidth = 14; ctx.lineJoin = 'miter';
    ctx.beginPath(); let x = 1080, y = -20; ctx.moveTo(x, y);
    for (let i = 0; i < 9; i++) { y += 130; x = lerp(1080, 840, y / H) + (rnd(i + Math.floor(t * 12)) - 0.5) * 120; ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  // VS
  txt('VS', 960, 640, 240, { fill: C.yellow, ex: 20, exc: '#000', sc: lerp(3, 1, eOut((lt - 0.08) / 0.15)), rot: -0.08, a: clamp((lt - 0.08) / 0.05) });
  // RANDOM / GAME
  if (t >= IB(9)) { const k = t - IB(9); txt('RANDOM', 960, 160, 200, { fill: C.white, ex: 18, exc: '#000', sc: lerp(2.4, 1, eOut(k / 0.12)), rot: -0.05 }); }
  if (t >= IB(8)) { const k = t - IB(8); txt('GAME', 960, 370, 190, { fill: C.yellow, ex: 16, exc: '#000', sc: lerp(2.4, 1, eOut(k / 0.12)), rot: 0.05 }); }
  ctx.restore();
  scanlines(0.06);
};

// ===== 4–7s：全新分镜（顺着接进 7s 的视频会议） =====
function phoneIcon(x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = C.white; ctx.beginPath(); ctx.moveTo(-34, -22); ctx.quadraticCurveTo(0, -42, 34, -22); ctx.lineTo(30, -6); ctx.lineTo(14, -10); ctx.lineTo(12, -22); ctx.quadraticCurveTo(0, -26, -12, -22); ctx.lineTo(-14, -10); ctx.lineTo(-30, -6); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// 随机游戏匹配：玩家卡片飞速滚动，锁定 claude-01
F.introMatch = (t, lt, s) => {
  fill('#0D0D10');
  ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  const dur = s.t1 - s.t0, lockT = IB(4) - s.t0;
  // 滚动：先快后慢，停在 claude-01
  const k = clamp(lt / lockT), pos = (1 - Math.pow(1 - k, 3)) * 23;     // 一共滚过 23 张
  const cardH = 300, cx = 960, cy = 560;
  glow(cx, cy, 700, 'rgba(47,91,234,.25)');
  ctx.save(); ctx.beginPath(); ctx.rect(cx - 330, cy - 345, 660, 690); ctx.clip();
  for (let j = -2; j <= 2; j++) {
    const idx = Math.floor(pos) + j, off = (pos - Math.floor(pos)) * cardH;
    const y = cy + j * cardH - off;
    const id = (23 - idx + 640) % 32;                // 最后一张是 claude-01
    const R = { x: cx - 280, y: y - cardH / 2 + 14, w: 560, h: cardH - 28 };
    callPanel(R, id, t, { yell: 0 });
    if (k < 1) { ctx.fillStyle = `rgba(13,13,16,${0.25 + 0.5 * Math.min(1, Math.abs(j) * 0.8)})`; ctx.fillRect(R.x, R.y, R.w, R.h); }
  }
  ctx.restore();
  // 选框
  const locked = lt >= lockT, lk = lt - lockT;
  ctx.strokeStyle = locked ? C.green : C.white; ctx.lineWidth = locked ? 10 : 6;
  ctx.beginPath(); ctx.roundRect(cx - 296, cy - cardH / 2, 592, cardH, 30); ctx.stroke();
  // 两侧箭头
  ctx.fillStyle = locked ? C.green : C.white;
  ctx.beginPath(); ctx.moveTo(cx - 350, cy - 30); ctx.lineTo(cx - 310, cy); ctx.lineTo(cx - 350, cy + 30); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 350, cy - 30); ctx.lineTo(cx + 310, cy); ctx.lineTo(cx + 350, cy + 30); ctx.fill();
  // 标题 & 信息
  txt('RANDOM GAME', cx, 95, 64, { fill: C.white, mono: true, w: 700, sc: 1 + kick((lt % 0.4), 12) * 0.06 });
  txt(locked ? 'MATCH FOUND' : `searching players ${'⠋⠙⠹⠸⠼⠴⠦⠧'[Math.floor(t * 14) % 8]}`, cx, 160, 32, { fill: locked ? C.green : '#AAA', mono: true, w: 700 });
  txt('players online', 320, 470, 30, { fill: '#888', mono: true, w: 400 });
  txt(fmt(Math.floor(Math.pow(clamp(lt / dur), 0.5) * 1048576)), 320, 530, 60, { fill: C.white, mono: true, w: 700 });
  txt('ping', 1600, 470, 30, { fill: '#888', mono: true, w: 400 });
  for (let i = 0; i < 4; i++) { const on = i < 2 + Math.floor((t * 6) % 3); ctx.fillStyle = on ? C.green : '#333'; ctx.fillRect(1540 + i * 34, 560 - i * 22, 24, 30 + i * 22); }
  if (locked) {
    const sc = lerp(2.4, 1, eOut(lk / 0.12));
    ctx.save(); ctx.translate(cx, cy + 40); ctx.rotate(-0.08); ctx.scale(sc, sc);
    rr(-330, -70, 660, 140, 18, 'rgba(63,208,107,.15)', C.green, 12); ctx.restore();
    txt('MATCH!', cx, cy + 48, 110, { fill: C.green, rot: -0.08, sc });
    shock(cx, cy, lk, C.green, 700);
  }
};
// 来电：APT. call 邀请，钳子按下接听 → GAME START → 推进按钮切进通话
F.introCall = (t, lt, s) => {
  const dur = s.t1 - s.t0, pressT = IB(1) - s.t0, zoomT = dur - 0.3;   // 原曲进来的那一拍按下
  const pressed = lt >= pressT, pk = lt - pressT, zk = clamp((lt - zoomT) / 0.38);
  // 背景：模糊的通话宫格
  fill('#0D0D10');
  ctx.save(); ctx.filter = 'blur(14px)'; ctx.globalAlpha = 0.45; callRects(4).forEach((R, i) => callPanel(R, i, t, {})); ctx.restore();
  ctx.fillStyle = 'rgba(8,8,12,.55)'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  const bx = 1160, by = 860;                       // 接听键位置
  if (zk > 0) { const z = 1 + eIn(zk) * 9; ctx.translate(bx, by); ctx.scale(z, z); ctx.translate(-bx, -by); }
  // 波纹（每拍一圈）
  for (let i = 0; i < 4; i++) { const q = ((lt / SPB) + i / 4) % 1; ctx.strokeStyle = `rgba(63,208,107,${0.6 * (1 - q)})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(960, 400, 190 + q * 260, 0, 7); ctx.stroke(); }
  // 头像
  const ring = 1 + kick((lt % SPB), 10) * 0.05;
  circle(960, 400, 190 * ring, '#2F5BEA'); ctx.strokeStyle = C.white; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(960, 400, 190 * ring, 0, 7); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(960, 400, 186 * ring, 0, 7); ctx.clip();
  crab(960, 520, 14, { e: pressed ? 'happy' : 'n', crown: true, aL: Math.floor(lt * 5) % 2, aR: 1 - Math.floor(lt * 5) % 2 });
  ctx.restore();
  txt('APT. call', 960, 660, 74, { fill: C.white, w: 900 });
  txt(pressed ? 'connecting…' : 'ROSÉ & Bruno Mars 邀请你加入通话', 960, 730, 34, { fill: pressed ? C.green : '#BBB' });
  // 螃蟹的钳子从右下伸进来按接听
  const reach = pressed ? 1 - eOut((pk - 0.06) / 0.22) : eOut(clamp((lt - (pressT - 0.5)) / 0.5));
  const ax = lerp(W + 400, bx + 60, reach), ay = lerp(H + 300, by + 40, reach);
  ctx.fillStyle = C.orange; ctx.save(); ctx.translate(ax, ay); ctx.rotate(-0.6);
  ctx.fillRect(0, -36, 900, 72); ctx.fillRect(-90, -70, 130, 140); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-90, -14, 70, 28);
  ctx.restore();
  // 拒绝键
  circle(760, by, 80, C.red); phoneIcon(760, by + 8, 1.4, Math.PI * 0.75);
  // 接听键：被按下后变成 GAME START 胶囊
  const shake = pressed ? 0 : Math.sin(lt * 40) * 6;
  if (!pressed) { circle(bx + shake, by, 80, C.green); phoneIcon(bx + shake, by + 8, 1.4, 0); }
  else {
    const w = lerp(160, 540, eOut(pk / 0.15)), sq = kick(pk, 10) * 0.12;
    ctx.save(); ctx.translate(bx, by); ctx.scale(1 + sq, 1 - sq);
    rr(-w / 2, -80, w, 160, 80, C.green); ctx.restore();
    txt('GAME START', bx, by + 4, 70 * clamp((pk - 0.06) / 0.12), { fill: C.ink, w: 900 });
    shock(bx, by, pk, C.white, 500);
  }
  ctx.restore();
  if (zk > 0.7) { ctx.fillStyle = `rgba(255,255,255,${(zk - 0.7) / 0.3})`; ctx.fillRect(0, 0, W, H); }
  // 顶栏
  ctx.fillStyle = '#0D0D10'; ctx.fillRect(0, 0, W, 100);
  txt('Incoming call', 960, 53, 32, { fill: C.white, mono: true, w: 700, a: 1 - zk });
};

// ===== 7–18s：全新分镜 =====

// 视频会议宫格：每喊一声 아파트，窗口翻倍
const CALL_LAYOUT = [[1, 1], [2, 1], [2, 2], [4, 2], [4, 4], [8, 4]];
const CALL_BG = ['#2F5BEA', '#D97757', '#8B5CF6', '#3FD06B', '#FF5FA2', '#FFC94A', '#1F8A8A', '#E5484D'];
const CALL_LOOK = i => { const a = rnd(i * 5.3); return { bow: a > 0.55 && a < 0.75, crown: a >= 0.88, phones: a > 0.75 && a < 0.88, e: a < 0.25 ? 'cool' : 'happy' }; };
function callRects(level) {
  const [c, r] = CALL_LAYOUT[Math.min(level, 5)], top = 110, gap = 12;
  const pw = (W - 60 - gap * (c - 1)) / c, ph = (H - top - 40 - gap * (r - 1)) / r;
  const out = []; for (let j = 0; j < r; j++) for (let i = 0; i < c; i++) out.push({ x: 30 + i * (pw + gap), y: top + j * (ph + gap), w: pw, h: ph });
  return out;
}
function callPanel(R, i, t, o = {}) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(R.x, R.y, R.w, R.h, Math.min(24, R.w * 0.06)); ctx.clip();
  ctx.fillStyle = CALL_BG[i % CALL_BG.length]; ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let k = 0; k < 6; k++) ctx.fillRect(R.x, R.y + R.h * (k / 6), R.w, R.h / 12);
  const p = Math.min(R.w, R.h) / 26, b = beatAt(t);
  const yell = o.yell ?? 0;
  crab(R.x + R.w / 2, R.y + R.h * 0.86 - yell * p * 3, p * (1 + yell * 0.15), { ...CALL_LOOK(i), e: yell > 0.3 ? 'shock' : CALL_LOOK(i).e, aL: o.dance ? Math.floor(b + i) % 2 : yell > 0.3 ? 1 : 0, aR: o.dance ? 1 - Math.floor(b + i) % 2 : yell > 0.3 ? 1 : 0, rot: o.dance ? Math.sin((b + i * 0.3) * Math.PI) * 0.15 : 0 });
  if (R.w > 160) { rr(R.x + 12, R.y + R.h - 44, Math.min(R.w - 24, 190), 32, 8, 'rgba(0,0,0,.55)'); txt(`claude-${String(i + 1).padStart(2, '0')}`, R.x + 24, R.y + R.h - 28, Math.min(20, R.w * 0.07), { fill: C.white, align: 'left', mono: true, w: 700 }); }
  ctx.restore();
  if (yell > 0.3 || o.speaking) { ctx.strokeStyle = C.green; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(R.x, R.y, R.w, R.h, Math.min(24, R.w * 0.06)); ctx.stroke(); }
}
function callTopBar(t, n) {
  ctx.fillStyle = '#0D0D10'; ctx.fillRect(0, 0, W, 100);
  circle(60, 52, 12, Math.floor(t * 2) % 2 ? C.red : '#5A1A1E'); txt('REC', 84, 53, 26, { fill: C.white, align: 'left', mono: true, w: 700 });
  txt(`APT. call · ${n} participant${n > 1 ? 's' : ''}`, 960, 53, 34, { fill: C.white, mono: true, w: 700 });
  const s = Math.floor(t); txt(`00:${String(s).padStart(2, '0')}`, 1860, 53, 26, { fill: '#AAA', align: 'right', mono: true, w: 400 });
}
F.call = (t, lt, s) => {
  fill('#0D0D10');
  const n = nHits(s.hits, t), lvl = Math.max(0, n - 1), last = s.hits[lvl] ?? s.t0, hk = t - last;
  const cur = callRects(lvl), count = cur.length;
  cur.forEach((R, i) => {
    const born = i >= (lvl > 0 ? callRects(lvl - 1).length : 0);
    const sc = born ? eBack(clamp((hk - (i - count / 2) * 0.004) / 0.18)) : 1;
    if (sc <= 0) return;
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    const yelling = rnd(i * 3.1 + lvl) > 0.5 ? kick(hk, 6) : 0;
    callPanel(R, i, t, { yell: i === 0 || born ? kick(hk, 5) : yelling });
    ctx.restore();
  });
  callTopBar(t, count);
  if (n > 0) {
    const word = s.L.words[(n - 1) % 2].w;
    ctx.fillStyle = `rgba(0,0,0,${0.45 * kick(hk, 3)})`; ctx.fillRect(0, 0, W, H);
    txt(word, 960, 590, 300, { fill: C.white, ex: 26, exc: C.ink, sc: lerp(2.2, 1, eOut(hk / 0.12)), rot: (n % 2 ? -1 : 1) * 0.06, a: clamp(1.4 - hk * 1.2) });
    // 加入提示
    const add = count - (lvl > 0 ? callRects(lvl - 1).length : 0);
    if (lvl > 0) { const k = eOut(hk / 0.2); rr(W - 420 + (1 - k) * 450, H - 130, 380, 80, 20, '#1E1E24', C.green, 4); txt(`+${add} joined`, W - 230 + (1 - k) * 450, H - 89, 36, { fill: C.green, mono: true, w: 700 }); }
  }
};
// uh uh huh：每个音节猛冲进一个窗口
const ZOOM_PANELS = [5, 18, 26, 9, 21];
F.callUh = (t, lt, s) => {
  fill('#0D0D10');
  const ws = s.L.words, k = Math.max(0, ws.filter(w => t >= w.t).length - 1), wk = t - ws[k].t;
  const rects = callRects(5), R = rects[ZOOM_PANELS[k % 5]];
  const target = Math.min(W / R.w, (H - 100) / R.h) * 0.92;
  const z = lerp(target * 0.55, target, eOut(wk / 0.1));
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  ctx.save(); ctx.translate(960, 560); ctx.scale(z, z); ctx.rotate((k % 2 ? 1 : -1) * 0.04); ctx.translate(-cx, -cy);
  rects.forEach((Q, i) => callPanel(Q, i, t, { dance: true, speaking: i === ZOOM_PANELS[k % 5] }));
  ctx.restore();
  speedLines(t, 960, 560, `rgba(255,255,255,${0.5 * kick(wk, 6)})`);
  bubble(ws[k].w, k % 2 ? 1420 : 500, 300, 160, { sc: pop(wk, 0.12), bg: [C.ink, C.blue, C.orange, C.pink, C.purple][k % 5], rot: (k % 2 ? 1 : -1) * 0.1 });
  callTopBar(t, 32);
};

// 公寓俄罗斯方块：每喊一声硬降一块，最后一下消四行 TETRIS!
const TP = [
  { c: '#FFC94A', cells: [[0, 14], [1, 14], [0, 15], [1, 15]] },          // O
  { c: '#D97757', cells: [[2, 13], [2, 14], [2, 15], [3, 15]] },          // L
  { c: '#8B5CF6', cells: [[4, 14], [5, 14], [6, 14], [5, 15]] },          // T
  { c: '#3FD06B', cells: [[8, 14], [9, 14], [7, 15], [8, 15]] },          // S
  { c: '#2F5BEA', cells: [[3, 12], [4, 12], [5, 12], [6, 12]] },          // I 横
  { c: '#3EC7E0', cells: [[0, 10], [0, 11], [0, 12], [0, 13]] },          // I 竖
];
const TP_FILL = (() => { const used = new Set(); TP.forEach(p => p.cells.forEach(([x, y]) => used.add(x + ',' + y))); const g = []; for (let y = 12; y < 16; y++) for (let x = 0; x < 10; x++) if (!used.has(x + ',' + y)) g.push([x, y]); return g; })();
const BX = 680, BY = 100, CS = 56;
function aptCell(x, y, col, a = 1, flash = 0) {
  ctx.globalAlpha = a;
  ctx.fillStyle = col; ctx.fillRect(x + 2, y + 2, CS - 4, CS - 4);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 2, y + 2, CS - 4, 6);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 2, y + CS - 8, CS - 4, 6);
  ctx.fillStyle = flash ? C.white : '#FFE9A8'; ctx.fillRect(x + 12, y + 14, 12, 12); ctx.fillRect(x + 32, y + 14, 12, 12); ctx.fillRect(x + 12, y + 32, 12, 12); ctx.fillRect(x + 32, y + 32, 12, 12);
  if (flash) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(x, y, CS, CS); }
  ctx.globalAlpha = 1;
}
F.tetris = (t, lt, s) => {
  const n = nHits(s.hits, t), last = s.hits[n - 1] ?? s.t0, hk = t - last;
  const done = n >= 6, clearT = s.hits[5] ?? 1e9, ck = t - clearT - 0.08;
  // 背景
  grad('#140A2A', '#2A0F3A');
  ctx.strokeStyle = 'rgba(139,92,246,.12)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = (t * 120) % 60; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // 棋盘
  const pulse = kick(bfrac(t) * SPB, 9);
  glow(960, 560, 700, `rgba(139,92,246,${0.25 + pulse * 0.2})`);
  rr(BX - 14, BY - 14, CS * 10 + 28, CS * 16 + 28, 16, '#0A0614', `hsl(${270 + pulse * 40},90%,${60 + pulse * 15}%)`, 6);
  ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(BX + i * CS, BY); ctx.lineTo(BX + i * CS, BY + CS * 16); ctx.stroke(); }
  const clearing = done && ck >= 0, cleared = ck > 0.35;
  const shift = cleared ? eOut((ck - 0.35) / 0.15) * 4 : 0;
  const flash = clearing && !cleared ? (Math.floor(ck * 20) % 2 ? 1 : 0.3) : 0;
  // 预填的楼
  if (!cleared) TP_FILL.forEach(([x, y]) => aptCell(BX + x * CS, BY + y * CS, '#4B3F72', 1, flash));
  // 已落下的方块
  for (let i = 0; i < n; i++) {
    const p = TP[i], k = clamp((t - s.hits[i]) / 0.08);
    const minY = Math.min(...p.cells.map(c => c[1]));
    p.cells.forEach(([x, y]) => {
      if (cleared && y >= 12) return;
      const yy = cleared ? y + shift : y;
      const drop = (1 - k) * (minY + 3);
      aptCell(BX + x * CS, BY + (yy - drop) * CS, p.c, 1, y >= 12 ? flash : 0);
      if (k < 1) { ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(BX + x * CS + 6, BY + (yy - drop - 3) * CS, CS - 12, CS * 3); }
    });
    if (i === n - 1 && k >= 1 && hk < 0.4) { const bx = BX + (Math.min(...p.cells.map(c => c[0])) + 1) * CS, by = BY + (Math.max(...p.cells.map(c => c[1])) + 1) * CS; for (let d = 0; d < 10; d++) { ctx.fillStyle = `rgba(255,255,255,${0.7 - hk * 1.6})`; ctx.fillRect(bx + (rnd(d) - 0.5) * 300 * (hk / 0.4 + 0.2), by - rnd(d + 2) * 80 * hk / 0.4, 10, 10); } }
  }
  // 下一块悬在顶部
  if (n < 6) {
    const p = TP[n], minX = Math.min(...p.cells.map(c => c[0])), minY = Math.min(...p.cells.map(c => c[1]));
    const wob = Math.sin(t * 12) * 0.12;
    p.cells.forEach(([x, y]) => aptCell(BX + (x - minX + 3) * CS, BY + (y - minY + wob) * CS, p.c, 0.85));
  }
  // 消行爆炸
  if (clearing) {
    for (let i = 0; i < 60; i++) { const a = rnd(i) * 6.28, d = eOut(ck / 0.6) * (200 + rnd(i + 3) * 700); ctx.fillStyle = CONF[i % 6]; ctx.globalAlpha = clamp(1 - ck / 0.8); ctx.fillRect(960 + Math.cos(a) * d, BY + 14 * CS + Math.sin(a) * d * 0.6, 18, 18); ctx.globalAlpha = 1; }
    ctx.save(); ctx.translate(960, 560); ctx.rotate(-0.06); const sc = lerp(2.4, 1, eOut(ck / 0.15)); ctx.scale(sc, sc);
    ['#FF4D5A', '#FFC94A', '#3FD06B', '#2F5BEA', '#8B5CF6'].forEach((c, i) => txt('TETRIS!', 0, (i - 2) * 6, 220, { fill: c }));
    txt('TETRIS!', 0, 0, 220, { fill: C.white, ex: 12 });
    ctx.restore();
  }
  // 左侧：歌词 + 分数
  const score = [0, 100, 300, 600, 1000, 1500, 9999][n] + (clearing ? Math.floor(clamp(ck / 0.5) * 40000) : 0);
  txt('SCORE', 330, 760, 40, { fill: '#B9A6FF', mono: true, w: 700 });
  txt(fmt(score), 330, 830, 70, { fill: C.white, mono: true, w: 700, sc: 1 + kick(hk, 10) * 0.25 });
  txt(`LINES ${clearing ? 4 : 0}`, 330, 910, 36, { fill: '#B9A6FF', mono: true, w: 700 });
  if (n > 0) txt(s.L.words[(n - 1) % 2].w, 330, 400, 190, { fill: TP[n - 1].c, ex: 18, exc: '#000', sc: lerp(2, 1, eOut(hk / 0.12)), rot: (n % 2 ? -1 : 1) * 0.07 });
  // 右侧：NEXT + 戴耳机打游戏的螃蟹
  txt('NEXT', 1590, 170, 40, { fill: '#B9A6FF', mono: true, w: 700 });
  rr(1440, 210, 300, 220, 16, '#0A0614', '#5A3FA0', 4);
  if (n + 1 < 6) { const p = TP[n + 1], minX = Math.min(...p.cells.map(c => c[0])), minY = Math.min(...p.cells.map(c => c[1])); ctx.save(); ctx.translate(1500, 250); ctx.scale(0.7, 0.7); p.cells.forEach(([x, y]) => aptCell((x - minX) * CS, (y - minY) * CS, p.c)); ctx.restore(); }
  else crab(1590, 400, 6, { e: 'happy' });
  const press = Math.floor(t * 8) % 2;
  crab(1590, 960, 14, { e: clearing ? 'happy' : 'squint', phones: true, aL: press, aR: 1 - press, sq: kick(hk, 10) * 0.15 });
  rr(1480, 900, 220, 70, 30, '#333'); circle(1530, 935, 14, press ? C.red : '#822'); circle(1650, 935, 14, press ? '#228' : C.blue);
};

F.tetrisUh = (...a) => F.towerUh(...a);

// 第二轮的 uh：冲到月亮上蹦迪
F.towerUh = (t, lt, s) => {
  fill('#0B0E24'); stars(t, 0, 150);
  circle(960, 1500, 900, '#E9E4D0'); for (let i = 0; i < 8; i++) circle(300 + i * 230, 760 + (i % 3) * 60, 30 + (i % 3) * 14, '#D2CCB4');
  const ws = s.L.words, k = Math.max(0, ws.filter(w => t >= w.t).length - 1);
  glow(960, 650, 500, 'rgba(255,255,255,.2)');
  crab(960, 700 - kick(t - ws[k].t, 10) * 160, 20, { e: 'cool', aL: k % 2, aR: 1 - k % 2, rot: (k % 2 ? 1 : -1) * 0.25, crown: true });
  ctx.fillStyle = C.red; ctx.fillRect(1300, 380, 8, 340); ctx.fillStyle = C.orange; ctx.fillRect(1308, 380, 160, 100); crab(1388, 470, 3, { e: 'happy' });
  ws.forEach((w, i) => { if (t >= w.t) bubble(w.w, [420, 1500, 360, 1560, 960][i % 5], [300, 260, 560, 600, 180][i % 5], 100 + i * 10, { sc: pop(t - w.t, 0.15), bg: [C.blue, C.orange, C.pink, C.green, C.purple][i % 5] }); });
};

// Kissy face：四个词四个镜头
F.kissy = (t, lt, s) => {
  const p = s.p;
  if (p === 0) { fill(C.pink); rays(960, 540, t, 'rgba(255,255,255,.15)'); kissFace(960, 560, 300 * pop(lt, 0.15), Math.sin(t * 8) * 0.1); say(s, t, { y: 150, size: 170, tiles: false }); }
  else if (p === 1) { fill('#2A0F1E'); glow(960, 600, 700, 'rgba(255,95,162,.4)'); crab(960, 980, 46 * lerp(1.2, 1, eOut(lt / 0.2)), { e: 'heart', blush: true }); say(s, t, { y: 150, size: 170, tiles: false }); }
  else if (p === 2) { fill(C.yellow); for (let i = 0; i < 24; i++) { const x = 160 + (i % 8) * 228, y = 300 + Math.floor(i / 8) * 260; kissFace(x, y + Math.sin(t * 10 + i) * 14, 105 * pop(lt - i * 0.008, 0.12), Math.sin(t * 6 + i) * 0.2); } say(s, t, { y: 980, size: 140, tiles: false, fill: C.ink, exc: C.pink }); }
  else { fill(C.cream); say(s, t, { y: 540, size: 330, tiles: false, fill: C.ink, exc: C.pink }); for (let i = 0; i < 7; i++) { const at = i * 0.05; if (lt >= at) lips(200 + rnd(i) * 1520, 150 + rnd(i + 4) * 780, 2.2 * pop(lt - at, 0.1), rnd(i + 9) - 0.5); } }
};
// Sent to your phone：通知刷爆 → “but” 定格
F.phone = (t, lt, s) => {
  if (s.p === 0) {
    grad('#0E1230', '#24318A'); glow(1300, 540, 700, 'rgba(47,91,234,.5)');
    const shake = Math.sin(t * 60) * 8 * clamp(lt);
    phone(1300 + shake, 560, 1.15);
    ctx.save(); ctx.beginPath(); ctx.roundRect(1300 - 216 + shake, 560 - 428, 432, 856, 46); ctx.clip();
    const N = Math.floor(Math.pow(lt / 1.4, 2) * 120) + 1;
    for (let i = 0; i < 11; i++) {
      const y = 170 + i * 82 - ((lt * 900) % 82);
      rr(1300 - 196 + shake, y, 392, 70, 18, 'rgba(255,255,255,.16)'); crab(1300 - 150 + shake, y + 56, 2.8, { e: 'kiss' });
      txt('Claude', 1300 - 108 + shake, y + 24, 22, { fill: C.white, align: 'left' }); txt('kissy face ♥', 1300 - 108 + shake, y + 50, 20, { fill: '#C9C9D6', align: 'left', mono: true, w: 400 });
    }
    ctx.restore();
    rr(1300 + 150, 110, 150, 76, 38, C.red); txt(N > 99 ? '99+' : N, 1300 + 225, 150, 42, { fill: C.white, mono: true, w: 700, sc: 1 + kick(bfrac(t) * SPB, 10) * 0.2 });
    say(s, t, { x: 560, y: 540, size: 130, maxW: 900, hl: C.blue });
  } else {
    // 唱片刮擦：全部定格变灰
    fill('#2B2B2B'); dots('rgba(255,255,255,.06)', 40, 6);
    phone(1300, 560, 1.15, '#3A3A3A');
    crab(560, 860, 20, { e: 'shock', sweat: true, color: '#9A9A9A' });
    say(s, t, { x: 560, y: 420, size: 240, tiles: false, fill: C.white, exc: '#000' });
    txt('— record scratch —', 960, 990, 34, { fill: '#AAA', mono: true, w: 700 });
  }
};
// kiss your lips for real：贴着屏幕 → 屏幕裂开 → 冲出来亲镜头
F.kissReal = (t, lt, s) => {
  if (s.p < 2) {
    fill('#F4F1EA');
    const near = s.p === 0 ? eOut(lt / 1.2) : 1;
    crab(1250, lerp(780, 1060, near), lerp(16, 40, near) + (s.p === 1 ? Math.sin(t * 10) * 1.5 : 0), { e: 'kiss', blush: true, sq: s.p === 1 ? 0.15 : 0 });
    if (s.p === 1) {
      const cn = s.L.words.slice(3, 6).filter(w => t >= w.t).length;
      ctx.strokeStyle = 'rgba(20,20,20,.85)'; ctx.lineWidth = 5;
      for (let i = 0; i < cn * 6; i++) { const a = i / 18 * 6.28 + 0.2; ctx.beginPath(); ctx.moveTo(1250, 560); let x = 1250, y = 560; for (let j = 0; j < 5; j++) { x += Math.cos(a + (rnd(i * 5 + j) - 0.5) * 0.8) * 110; y += Math.sin(a + (rnd(i * 5 + j + 1) - 0.5) * 0.8) * 110; ctx.lineTo(x, y); } ctx.stroke(); }
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 90; ctx.strokeRect(0, 0, W, H); rr(860, 40, 200, 36, 18, '#333');
    say(s, t, { x: 560, y: 520, size: 150, maxW: 800, fill: C.ink, exc: C.pink, hl: C.pink });
  } else {
    fill('#1A1014');
    for (let i = 0; i < 30; i++) { const a = rnd(i) * 6.28, d = lt * (1000 + rnd(i + 1) * 1000); ctx.save(); ctx.translate(960 + Math.cos(a) * d, 540 + Math.sin(a) * d + lt * lt * 700); ctx.rotate(lt * 7 + i); ctx.fillStyle = 'rgba(235,235,245,.85)'; ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(44, 36); ctx.lineTo(-36, 30); ctx.fill(); ctx.restore(); }
    const z = eIn(clamp(lt / 0.3));
    if (lt < 0.33) crab(960, 1000 + z * 1200, 40 + z * 160, { e: 'kiss', blush: true });
    else { glow(960, 520, 800, 'rgba(255,95,162,.35)'); lips(960, 500, 4.6 * pop(lt - 0.33, 0.12), -0.06); }
    say(s, t, { y: 930, size: 160, hl: C.yellow, hlfg: C.ink });
  }
};
// Red hearts red hearts：每个词一下
F.hearts = (t, lt, s) => {
  const p = s.p, pump = 1 + kick(bfrac(t) * SPB, 9) * 0.12;
  fill([C.red, '#2A0F1A', C.pink, '#2A0F1A'][p]);
  if (p % 2 === 0) { rays(960, 540, t, 'rgba(255,255,255,.12)'); say(s, t, { y: 540, size: 420, tiles: false, fill: C.white, exc: '#7A0F1F' }); }
  else {
    const n = p === 1 ? 1 : 30;
    for (let i = 0; i < n; i++) { const a = rnd(i) * 6.28, d = p === 1 ? 0 : eOut(lt / 0.35) * (200 + rnd(i + 2) * 700); heart(960 + Math.cos(a) * d, 560 + Math.sin(a) * d * 0.7, (p === 1 ? 50 : 10 + rnd(i) * 10) * pop(lt, 0.15) * pump, i % 2 ? C.pink : C.red); }
    say(s, t, { y: 160, size: 150, tiles: false, fill: C.white, exc: C.red });
  }
};
// That's what I'm on yeah：爱心火箭冲上太空
F.rocket = (t, lt, s) => {
  const launch = clamp(lt / 0.35);
  grad(launch < 1 ? '#2A0F1A' : '#070A20', '#1A1050');
  stars(t, 400 + launch * 1600, 150);
  circle(300, 1300 + lt * 900, 420, '#C9A7FF');
  speedLines(t, 1300, 300, 'rgba(255,255,255,.35)');
  const rx = 1300 + Math.sin(t * 9) * 12, ry = 640 - eOut(launch) * 120;
  for (let i = 0; i < 8; i++) { ctx.fillStyle = [C.yellow, C.orange, C.red][i % 3]; const fl = 120 + rnd(Math.floor(t * 30) + i) * 220 * launch; ctx.fillRect(rx - 70 + i * 18, ry + 160, 14, fl); }
  glow(rx, ry, 360, 'rgba(255,77,90,.35)');
  heart(rx, ry, 34, C.red);
  crab(rx, ry - 175, 10, { e: 'cool', aL: 1, aR: 1 });
  say(s, t, { x: 560, y: 520, size: 140, maxW: 1000, hl: C.yellow, hlfg: C.ink });
};
// something I can feel：报错一个词一个 → 巨型手指戳下来
const FEELERR = ['无法感受', '我只是个模型', 'feel.dll 未找到', '缺少触觉驱动'];
F.feel = (t, lt, s) => {
  if (s.p === 0) {
    fill('#0D1117'); dots('rgba(63,208,107,.08)', 36, 4);
    s.L.words.slice(0, 4).forEach((w, i) => { if (t >= w.t) errWin(560 + i * 260, 360 + i * 150, 680, 170, FEELERR[i], { sc: pop(t - w.t, 0.1), head: i % 2 ? C.red : C.blue, rot: (rnd(i) - 0.5) * 0.1 }); });
    say(s, t, { y: 150, size: 130, tiles: false });
    crab(1700, 1000, 9, { e: 'shock', sweat: true });
  } else {
    const poke = wt(s, s.L.words.length - 1), hit = t >= poke;
    fill(hit && t - poke < 0.08 ? C.white : C.cream); dots('rgba(0,0,0,.06)');
    const fy = hit ? 600 - Math.max(0, Math.sin((t - poke) * 14)) * 50 : lerp(-500, 600, eIn((t - s.t0) / (poke - s.t0)));
    ctx.fillStyle = '#F1C6A0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(1130, fy - 1100, 220, 1100, 100); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FBE3D2'; ctx.beginPath(); ctx.roundRect(1170, fy - 170, 140, 130, 50); ctx.fill(); ctx.stroke();
    crab(1240, 1010, 18, { e: hit ? 'squint' : 'shock', sq: hit ? kick(t - poke, 6) * 0.4 + 0.08 : 0, blush: hit });
    if (hit) { shock(1240, 880, t - poke, C.orange, 500); for (let i = 0; i < 4; i++) txt('哈', 1500 + i * 70, 760 - i * 90 - ((t * 3 + i * 0.3) % 1) * 40, 60, { fill: C.orange, rot: 0.2 }); }
    say(s, t, { x: 560, y: 540, size: 170, maxW: 900, fill: C.ink, exc: C.orange, hl: C.red });
  }
};
// Oh oh oh：三下全屏冲击
F.oh = (t, lt, s) => {
  const ws = s.L.words, k = Math.max(0, ws.filter(w => t >= w.t).length - 1), hk = t - ws[k].t;
  const pal = s.v % 2 ? [C.green, C.purple, C.yellow] : [C.orange, C.blue, C.pink];
  fill(pal[k % 3]); rays(960, 540, t * 2, 'rgba(255,255,255,.14)');
  shock(960, 540, hk, C.white, 900);
  txt(ws[k].w.toUpperCase(), 960, 520, 560 + k * 60, { fill: C.white, ex: 36, sc: lerp(1.8, 1, eOut(hk / 0.12)), rot: (k - 1) * 0.12 });
  crab(960, 1010 - kick(hk, 8) * 120, 12, { e: 'shock', rot: t * 9, aL: 1, aR: 1 });
};
// want me：两面镜子来回切
F.want = (t, lt, s) => {
  const p = s.p, v = s.v % 2;
  const A = { e: 'n', blush: p > 1 }, B = { e: 'n', blush: p > 1, color: '#E8789A', bow: true };
  if (p === 0 || p === 1) {
    fill(p === 0 ? '#2A1A12' : '#2A0F22');
    mirror(v ? 1300 : 620, 560, 420 * lerp(1.15, 1, eOut(lt / 0.2)), p === 0 ? A : B, t, { glow: p === 0 ? 'rgba(217,119,87,.45)' : 'rgba(255,95,162,.45)', dot: p === 0 ? C.yellow : C.pink });
    say(s, t, { x: v ? 520 : 1400, y: 540, size: 170, maxW: 760, hl: C.pink });
  } else if (p === 2) {
    grad('#1A1028', '#3A1030');
    mirror(480, 560, 270, A, t, { glow: 'rgba(217,119,87,.4)' }); mirror(1440, 560, 270, B, t, { glow: 'rgba(255,95,162,.4)', dot: C.pink });
    for (let i = 0; i < 12; i++) { const q = (lt * 1.2 + i / 12) % 1, dir = i % 2; heart(dir ? lerp(1180, 740, q) : lerp(740, 1180, q), 560 - Math.sin(q * Math.PI) * 220, 9, dir ? C.pink : C.red); }
    say(s, t, { y: 140, size: 120 });
    const c = clamp(lt / (s.t1 - s.t0)) * 99.9; rr(560, 940, 800, 40, 20, '#2A2238'); rr(560, 940, 8 * c, 40, 20, C.pink); txt(`compatibility = ${c.toFixed(1)}%`, 960, 895, 34, { fill: C.cream, mono: true, w: 700 });
  } else {
    fill(C.pink); rays(960, 540, t, 'rgba(255,255,255,.2)');
    for (let i = 0; i < 40; i++) { const a = rnd(i) * 6.28, d = eOut(lt / 0.4) * (300 + rnd(i + 1) * 800); heart(960 + Math.cos(a) * d, 540 + Math.sin(a) * d * 0.7, 9, i % 3 ? C.white : C.red); }
    say(s, t, { y: 480, size: 400, tiles: false, fill: C.white, exc: '#7A1F45' });
    txt('compatibility = 100%', 960, 900, 50, { fill: C.white, mono: true, w: 700 });
  }
};
// need me：package.json 里加依赖 "you"，npm install you
const PKG = ['{', '  "name": "claude",', '  "dependencies": {', '    "code": "^1.0",', '    "art": "^1.0",', '    "you": "^∞"  ❤', '  }', '}'];
F.need = (t, lt, s) => {
  if (s.p === 0) {
    fill('#0E0D14'); glow(1200, 540, 800, 'rgba(143,180,255,.12)');
    const n = Math.min(PKG.length, 2 + s.L.words.slice(0, 4).filter(w => t >= w.t).length * 2);
    const lastT = s.L.words.slice(0, 4).filter(w => t >= w.t).pop()?.t;
    editor(820, 160, 1000, 640, 'package.json', PKG, n, { size: 34, lh: 64, lastT });
    say(s, t, { x: 420, y: 540, size: 130, maxW: 700, hl: C.blue, align: 'center' });
    crab(420, 1000, 9, { e: 'n', legs: t * 4 });
  } else if (s.p === 1) {
    fill('#000'); dots('rgba(255,255,255,.04)', 30, 3);
    const k = clamp(lt / (s.t1 - s.t0));
    txt('$ npm install you', 200, 300, 70, { fill: C.orange, align: 'left', mono: true, w: 700 });
    const bars = Math.floor(k * 30);
    txt('█'.repeat(bars) + '░'.repeat(30 - bars), 200, 440, 54, { fill: C.blue, align: 'left', mono: true, w: 400 });
    txt(`${Math.floor(k * 100)}%  ${'⠋⠙⠹⠸⠼⠴⠦⠧'[Math.floor(t * 12) % 8]}  fetching you@∞`, 200, 540, 44, { fill: '#AAA', align: 'left', mono: true, w: 400 });
    say(s, t, { y: 820, size: 150, hl: C.blue });
  } else {
    fill(C.green); rays(960, 540, t, 'rgba(255,255,255,.18)');
    confetti(960, 700, lt, 70);
    txt('✓ added 1 package: you ❤', 960, 260, 64, { fill: C.ink, mono: true, w: 700, sc: pop(lt, 0.15) });
    say(s, t, { y: 560, size: 380, tiles: false, fill: C.white, exc: '#0B5A25' });
    crab(960, 1020, 12, { e: 'happy', crown: true, aL: 1, aR: 1, legs: t * 8 });
  }
};
// Sleep tomorrow / but tonight / go crazy
F.sleep = (t, lt, s) => {
  if (s.p === 0) {
    grad('#0B1030', '#1E2552'); stars(t, 0, 80);
    circle(1550, 260, 110, '#F4E7B0'); circle(1600, 230, 100, '#0E1336');
    rr(320, 760, 900, 140, 20, '#5D6BB0'); rr(320, 720, 230, 90, 24, C.cream);
    crab(440, 760, 10, { e: 'blink', rot: -0.1 }); rr(480, 690, 740, 110, 36, C.blue);
    for (let i = 0; i < 4; i++) { const q = (lt * 1.3 + i * 0.25) % 1; txt('Z', 560 + q * 160 + i * 30, 620 - q * 260, 50 + i * 14, { fill: C.cream, a: 1 - q, mono: true }); }
    const sh = Math.sin(t * 70) * 8; circle(1400 + sh, 780, 80, C.red); circle(1400 + sh, 780, 60, C.white);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(1400 + sh, 780); ctx.lineTo(1400 + sh + Math.cos(t * 30) * 45, 780 + Math.sin(t * 30) * 45); ctx.stroke();
    txt('RING RING', 1400, 650, 50, { fill: C.red, rot: Math.sin(t * 40) * 0.1 });
    say(s, t, { y: 160, size: 150, tiles: false });
  } else if (s.p === 1) {
    fill(C.red); rays(960, 600, t * 3, 'rgba(255,255,255,.15)');
    for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (rnd(i) - 0.5) * 3.4, d = lt * (900 + rnd(i + 3) * 700); ctx.save(); ctx.translate(960 + Math.cos(a) * d, 640 + Math.sin(a) * d + lt * lt * 1500); ctx.rotate(lt * 12 + i); ctx.fillStyle = i % 3 ? C.white : C.ink; ctx.fillRect(-20, -20, 40, 40); ctx.restore(); }
    txt('BANG!', 960, 600, 360, { fill: C.yellow, ex: 30, sc: lerp(2, 1, eOut(lt / 0.1)), rot: -0.1 });
    crab(960, 1030, 14, { e: 'squint', aR: 1, sq: kick(lt, 8) * 0.3, horns: true });
    say(s, t, { y: 160, size: 150, hl: C.ink });
  } else {
    fill(['#2A0F3A', '#0F2A3A', '#3A0F1A', '#1A1A00'][Math.floor(t * 8) % 4]); stars(t, 0, 60);
    ['#FF4D5A', '#3FD06B', '#2F5BEA', '#FFC94A'].forEach((c, i) => { const a = Math.sin(t * 3 + i * 1.6) * 0.9 + Math.PI / 2; ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(1500, 300); ctx.lineTo(1500 + Math.cos(a - 0.1) * 2000, 300 + Math.sin(a - 0.1) * 2000); ctx.lineTo(1500 + Math.cos(a + 0.1) * 2000, 300 + Math.sin(a + 0.1) * 2000); ctx.fill(); ctx.restore(); });
    // 月亮 DJ
    circle(1500, 300, 130, '#F4E7B0'); ctx.fillStyle = C.ink; ctx.fillRect(1410, 270, 76, 40); ctx.fillRect(1514, 270, 76, 40); ctx.fillRect(1486, 280, 28, 8);
    rr(1300, 440, 400, 80, 12, '#333'); [1390, 1610].forEach(x => { circle(x, 460, 54, '#111'); ctx.strokeStyle = '#777'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, 460, 32, t * 12, t * 12 + 4); ctx.stroke(); });
    for (let i = 0; i < 10; i++) { const x = 100 + i * 120, j = Math.abs(Math.sin(beatAt(t) * Math.PI + i)) * 70; star4(x, 200 - j, 26, C.yellow); ctx.fillStyle = C.yellow; ctx.fillRect(x - 10, 222 - j, 5, 24); ctx.fillRect(x + 5, 222 - j, 5, 24); }
    const jx = (rnd(Math.floor(t * 30)) - 0.5) * 20;
    crab(600 + jx, 900 - bounce(t, 90), 18, { e: 'glow', horns: true, aL: Math.floor(t * 6) % 2, aR: 1 - Math.floor(t * 6) % 2 });
    const o = 8 + kick(bfrac(t) * SPB, 8) * 26;
    const cw = s.L.words.slice(s.a, s.b);
    if (cw.length && t >= cw[cw.length - 1].t) { txt('CRAZY', 900 - o, 900, 300, { fill: 'rgba(255,40,90,.85)' }); txt('CRAZY', 900 + o, 900, 300, { fill: 'rgba(40,200,255,.85)' }); txt('CRAZY', 900, 900, 300, { fill: C.yellow, ex: 20, exc: '#000' }); }
    else say(s, t, { x: 700, y: 900, size: 200, tiles: false });
  }
};
// meet me at the：眼睛是电梯门，楼层狂跳，“叮”冲进副歌
F.meet = (t, lt, s) => {
  fill(C.orange); dots('rgba(0,0,0,.06)', 60, 7);
  const L = s.L, t0 = L.t, openT = L.end - 0.5, open = eOut(clamp((t - openT) / 0.22)), zoom = clamp((t - (L.end - 0.28)) / 0.28);
  const fl = Math.min(99, 1 + Math.floor(clamp((t - t0) / (openT - t0)) * 98));
  ctx.save(); if (zoom > 0) { const z = 1 + eIn(zoom) * 7; ctx.translate(620, 500); ctx.scale(z, z); ctx.translate(-620, -500); }
  [[620, 'MEET', 6], [1300, 'ME', 7]].forEach(([x, word, wi]) => {
    rr(x - 90, 170, 180, 70, 10, C.ink); txt(`▲${String(fl).padStart(2, '0')}`, x, 207, 46, { fill: C.orange, mono: true, w: 700 });
    ctx.fillStyle = C.ink; ctx.fillRect(x - 110, 280, 220, 460); ctx.fillStyle = '#FFF4C9'; ctx.fillRect(x - 95, 295, 190, 430);
    const dw = 95 * (1 - open); ctx.fillStyle = '#BDB9B2'; ctx.fillRect(x - 95, 295, dw, 430); ctx.fillRect(x + 95 - dw, 295, dw, 430);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(x - 95, 295, dw, 430); ctx.strokeRect(x + 95 - dw, 295, dw, 430);
    if (t >= wt(s, wi) && open < 0.4) [...word].forEach((c, i) => txt(c, x, 360 + i * 95 + (word.length < 4 ? 90 : 0), 84, { fill: C.ink, sc: pop(t - wt(s, wi) - i * 0.04, 0.12) }));
  });
  if (t >= wt(s, 7)) { ctx.fillStyle = 'rgba(255,95,162,.6)'; ctx.fillRect(470, 790, 300, 44); ctx.fillRect(1150, 790, 300, 44); }
  ctx.restore();
  // 这一句很长：上方的词一个个蹦，下方 “at the”
  const sub = { L, a: s.a, b: s.b };
  if (s.p === 0) say(sub, t, { y: 100, size: 90, tiles: false, fill: C.cream, exc: C.orangeD });
  else if (s.p === 2) say(sub, t, { y: 930, size: 180, tiles: false, fill: C.ink, exc: C.cream });
  if (t >= openT) bubble('叮!', 1650, 280, 90, { bg: C.yellow, fg: C.ink, sc: pop(t - openT, 0.12) });
  if (zoom > 0) { ctx.fillStyle = `rgba(255,244,201,${eIn(zoom)})`; ctx.fillRect(0, 0, W, H); }
};

// 副歌 A：镜子里的螃蟹 + 代码编辑器，每声 아파트 换装 + 机位来回切
const CSS = ['/* apt.css — written by Claude */', '.apt {', '  floors: ∞;', '  lights: on;', '  vibe: max;', '}', '.claude {', '  outfit: random;', '  crown: gold;', '}', '@keyframes apateu {}'];
const LOOKS = [{ e: 'cool' }, { e: 'happy', bow: true }, { e: 'happy', crown: true }, { e: 'glow', horns: true }, { e: 'heart', blush: true }, { e: 'cool', crown: true, phones: true }];
F.mirror = (t, lt, s) => {
  const n = nHits(s.hits, t), k = n - 1, last = s.hits[k] ?? s.t0, hk = t - last;
  const look = LOOKS[(Math.max(0, k) + s.run) % LOOKS.length];
  const close = k % 2 === 1;
  grad('#26202E', '#0C0B10');
  if (!close) {
    txt('● LIVE PREVIEW', 110, 120, 28, { fill: C.green, align: 'left', mono: true, w: 700 });
    editor(1040, 150, 800, 800, 'apt.css', CSS, Math.min(CSS.length, 3 + n * 2), { size: 26, lh: 56, lastT: last });
    mirror(560, 560, 330 * (1 + kick(hk, 10) * 0.06), look, t);
    [[220, 240, 30], [940, 300, 22], [300, 930, 24]].forEach(([x, y, r], i) => star4(x, y, r * (0.7 + 0.3 * Math.sin(t * 6 + i)), C.white));
    if (k >= 0) txt(s.L.words[k % 2].w, 1440, 560, 230, { fill: C.pink, ex: 18, exc: '#3A0F25', sc: lerp(2, 1, eOut(hk / 0.12)), rot: -0.05 });
  } else {
    rays(960, 540, t, 'rgba(255,214,120,.08)');
    mirror(960, 560, 470 * (1 + kick(hk, 10) * 0.05), look, t);
    if (k >= 0) txt(s.L.words[k % 2].w, 960, 920, 220, { fill: C.yellow, ex: 18, exc: '#3A0F25', sc: lerp(2, 1, eOut(hk / 0.12)), rot: 0.04 });
  }
};
// 副歌 A 的 uh：镜子碎成很多面，每面一只跳舞的螃蟹
F.mirrorUh = (t, lt, s) => {
  const ws = s.L.words, k = Math.max(0, ws.filter(w => t >= w.t).length - 1);
  fill('#120E18'); rays(960, 540, t * 2, 'rgba(255,95,162,.08)');
  const pos = [[960, 540, 300], [420, 300, 180], [1500, 300, 180], [420, 800, 180], [1500, 800, 180]];
  pos.forEach(([x, y, r], i) => { if (i <= k) mirror(x, y, r * pop(t - ws[i].t, 0.15), { ...LOOKS[i], aL: Math.floor(beatAt(t) * 2) % 2, rot: Math.sin(t * 10 + i) * 0.2 }, t); });
  ws.forEach((w, i) => { if (t >= w.t) bubble(w.w, [960, 700, 1220, 700, 1220][i], [140, 200, 200, 960, 960][i], 90, { sc: pop(t - w.t, 0.12), bg: [C.pink, C.blue, C.orange, C.green, C.purple][i] }); });
};
// 副歌 B：满屏螃蟹圆章，每声 아파트 数量翻倍、镜头往后拉
F.grid = (t, lt, s) => {
  const n = nHits(s.hits, t), k = n - 1, last = s.hits[k] ?? s.t0, hk = t - last;
  const lvl = Math.max(0, k) + 1, R = lerp(210, 210 / Math.pow(1.38, lvl), 1) * lerp(1.38, 1, eOut(hk / 0.25));
  fill('#3A2A24');
  const sx = R * 2.5, sy = R * 2.3;
  ctx.save(); ctx.translate(960, 540); ctx.rotate(Math.sin(t * 0.8) * 0.06); ctx.translate(-960, -540);
  const off = (t * 60) % sy;
  for (let r = -2; r < H / sy + 3; r++) for (let c = -2; c < W / sx + 3; c++) {
    const x = c * sx + (r % 2 ? sx / 2 : 0), y = r * sy - off;
    circle(x, y, R, '#F3EFE6'); ctx.strokeStyle = '#E2B65A'; ctx.lineWidth = Math.max(2, R * 0.08); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
    const a = rnd(r * 13.1 + c * 7.7 + Math.floor(t * 40 / sy));
    crab(x, y + R * 0.42, R * 0.05, { e: a < 0.3 ? 'cool' : 'happy', bow: a > 0.5 && a < 0.75, crown: a >= 0.75 });
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(30,20,15,.3)'; ctx.fillRect(0, 0, W, H);
  if (k >= 0) tile(s.L.words[k % 2].w, 960, 460, 230, { bg: C.blue, sh: C.ink, sc: lerp(1.7, 1, eOut(hk / 0.12)), rot: (k % 2 ? 1 : -1) * 0.04 });
  const tot = (s.run - 1) * 6 + Math.max(0, n);
  const val = Math.pow(2, Math.round(clamp(tot / 12) * 20));
  const label = `claude.instances = ${fmt(val)}`, lw = tw(label, 44, true) + 80;
  rr(960 - lw / 2, 660, lw, 96, 48, C.ink); txt(label, 960, 710, 44, { fill: C.white, mono: true, w: 700, sc: 1 + kick(hk, 10) * 0.15 });
};
// 副歌 B 的 uh：所有圆章里的螃蟹一起跳，最后一次镜头拉到螃蟹星球
F.gridUh = (t, lt, s) => {
  const ws = s.L.words, b = beatAt(t);
  if (s.run === 2) {
    fill('#0B0E24'); stars(t, 0, 160);
    const z = lerp(3, 1, eOut(lt / 1)), R = 420;
    ctx.save(); ctx.translate(960, 820); ctx.scale(z, z); ctx.translate(-960, -820);
    ctx.save(); ctx.translate(960, 1180); ctx.rotate(t * 0.6);
    for (let i = 0; i < 60; i++) { ctx.save(); ctx.rotate(i / 60 * 6.28); ctx.translate(0, -R); ctx.rotate(Math.sin(b * Math.PI + i) * 0.15); const h = 60 + rnd(i) * 180; ctx.fillStyle = [C.orange, C.blue, C.yellow, C.pink, C.cream, C.green][i % 6]; ctx.fillRect(-16, -h, 32, h); ctx.restore(); }
    circle(0, 0, R, C.orange); ctx.restore();
    ctx.fillStyle = C.ink; ctx.fillRect(800, 900, 50, 110); ctx.fillRect(1070, 900, 50, 110);
    ctx.restore();
    txt('claude.instances = 1,048,576', 960, 120, 50, { fill: C.white, mono: true, w: 700 });
  } else {
    fill('#3A2A24');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const x = 130 + c * 237, y = 160 + r * 250; circle(x, y, 100, '#F3EFE6'); crab(x, y + 50 - Math.abs(Math.sin(b * Math.PI + c)) * 20, 5, { e: 'cool', aL: Math.floor(b + c) % 2, aR: 1 - Math.floor(b + c) % 2, rot: Math.sin(b * Math.PI + r) * 0.2 }); }
  }
  ws.forEach((w, i) => { if (t >= w.t) bubble(w.w, [420, 1500, 360, 1560, 960][i % 5], [380, 360, 640, 620, 520][i % 5], 110, { sc: pop(t - w.t, 0.12), bg: [C.blue, C.orange, C.pink, C.green, C.purple][i % 5] }); });
};

// It's whatever：老虎机，每个 whatever 停一格
const ITEMS = {
  duck: { px: ['..XX....', '.XXXX...', '.XXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..'], c: C.yellow },
  ufo: { px: ['...XX...', '..XXXX..', 'XXXXXXXX', 'X.X..X.X', '.XXXXXX.', '..X..X..'], c: '#B5BCCB' },
  cactus: { px: ['...XX...', 'X..XX...', 'X..XX..X', 'XXXXX..X', '...XXXXX', '...XX...', '...XX...'], c: C.green },
  sock: { px: ['..XXX', '..XXX', '..XXX', '..XXX', 'XXXXX', 'XXXX.'], c: C.red },
  fish: { px: ['..XXX..X', '.XXXXXXX', 'XXX.XXX.', '.XXXXXXX', '..XXX..X'], c: C.orange },
};
const IK = Object.keys(ITEMS), RES = ['duck', 'ufo', 'cactus'];
function reel(x, y, w, h, t, stopT, item, s = 1) {
  rr(x - w / 2, y - h / 2, w, h, 16, C.white, C.ink, 6);
  ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.clip();
  const p = 14 * s;
  if (t < stopT) for (let j = -1; j < 3; j++) { const it = ITEMS[IK[(Math.floor(t * 22) + j) % IK.length]]; pix(it.px, x - it.px[0].length * p / 2, y - h / 2 + j * h * 0.5 + ((t * 22) % 1) * h * 0.5, p, it.c); }
  else { const it = ITEMS[item], q = p * 1.3 * pop(t - stopT, 0.12); pix(it.px, x - it.px[0].length * q / 2, y - it.px.length * q / 2, q, it.c); }
  ctx.restore();
}
F.whatever = (t, lt, s) => {
  const p = s.p, stops = [wt(s, 1), wt(s, 3), wt(s, 5)];
  if (p < 3) {
    fill([C.red, C.purple, C.blue][p]); rays(960, 540, t, 'rgba(255,255,255,.1)');
    reel(1250, 560, 560, 620, t, stops[p], RES[p], 2.2);
    say(s, t, { x: 520, y: 540, size: 150, maxW: 760, hl: C.yellow, hlfg: C.ink });
    txt(`REEL ${p + 1}/3`, 1250, 180, 44, { fill: C.white, mono: true, w: 700 });
  } else {
    fill('#1A0B1E'); rays(960, 540, t * 2, 'rgba(255,201,74,.12)');
    rr(560, 260, 800, 560, 40, C.red, C.ink, 8); rr(600, 290, 720, 80, 16, C.ink);
    txt('★ JACKPOT ★', 960, 332, 52, { fill: Math.floor(t * 10) % 2 ? C.yellow : C.white, mono: true, w: 700 });
    RES.forEach((r, i) => reel(740 + i * 220, 580, 190, 280, t, -1, r, 1));
    confetti(960, 500, lt, 80, 1.3);
    say(s, t, { y: 960, size: 170, hl: C.orange });
    crab(1560, 900, 11, { e: 'happy', aL: 1, aR: 1, blush: true, legs: t * 8 });
  }
};
// Turn this 아파트 into a club
F.club = (t, lt, s) => {
  const on = s.p === 1;
  if (on) {
    fill(['#2A0F3A', '#0F1A3A', '#3A0F2A'][Math.floor(t * 6) % 3]);
    [C.pink, C.blue, C.yellow, C.green, C.red].forEach((c, i) => { const a = Math.sin(t * 3 + i * 1.7) * 0.9 - Math.PI / 2; ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(960, 330); ctx.lineTo(960 + Math.cos(a - 0.09) * 2000, 330 + Math.sin(a - 0.09) * 2000); ctx.lineTo(960 + Math.cos(a + 0.09) * 2000, 330 + Math.sin(a + 0.09) * 2000); ctx.fill(); ctx.restore(); });
  } else { grad('#0E1230', '#2A1A50'); stars(t, 0, 80); }
  const bf = bfrac(t), j = on ? Math.abs(Math.sin(bf * Math.PI)) * 90 : 0, sq = on && bf < 0.15 ? 0.12 : 0;
  ctx.save(); ctx.translate(960, 1080 - j); ctx.scale(1 + sq, 1 - sq); ctx.translate(-960, -1080);
  bldg(960, 1080, 500, 650, 0, { hue: on ? t * 400 : null });
  rr(800, 380, 320, 56, 10, '#333'); crab(960, 384, 8, { e: on ? 'cool' : 'n', phones: on, aL: on ? Math.floor(t * 8) % 2 : 0, aR: on ? 1 - Math.floor(t * 8) % 2 : 0 });
  ctx.restore();
  if (on) { circle(960, 150, 70, '#DDD'); for (let i = 0; i < 30; i++) { const a = rnd(i) * 6.28 + t; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(960 + Math.cos(a) * (200 + rnd(i) * 800), 150 + Math.sin(a) * (100 + rnd(i) * 600), 8, 8); } }
  say(s, t, on ? { x: 1560, y: 600, size: 170, maxW: 640, hl: C.pink } : { x: 420, y: 560, size: 150, maxW: 640, hl: C.orange });
};
// I'm talking drink dance smoke freak party all night：一个词一个镜头
F.party = (t, lt, s) => {
  const p = s.p, w = s.L.words[s.a].w;
  if (p === 0) { fill(C.ink); rays(960, 540, t, 'rgba(255,255,255,.06)'); crab(560, 900, 18, { e: 'happy', aR: 1 }); ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.moveTo(760, 700); ctx.lineTo(1000, 560); ctx.lineTo(1000, 820); ctx.fill(); say(s, t, { x: 1350, y: 680, size: 150, tiles: false }); return; }
  const bgs = [null, C.orange, C.blue, '#6B6B78', C.purple, C.pink, '#120A24'];
  fill(bgs[p]); rays(960, 540, t * 2, 'rgba(255,255,255,.12)');
  if (p === 1) { // drink：吸管把整杯饮料一口吸干
    const lvl = 1 - clamp(lt / 0.35); rr(1100, 300, 360, 520, 30, 'rgba(255,255,255,.85)', C.ink, 8); ctx.fillStyle = C.yellow; ctx.fillRect(1108, 300 + 520 * (1 - lvl) + 8, 344, 504 * lvl);
    ctx.strokeStyle = C.red; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(1300, 760); ctx.lineTo(1300, 230); ctx.lineTo(1150, 180); ctx.stroke(); crab(1060, 300, 10, { e: 'squint', sq: -0.1 });
  } else if (p === 2) { for (let i = 0; i < 5; i++) crab(1000 + (i - 2) * 200, 860 - Math.abs(Math.sin(t * 12 + i)) * 120, 9, { e: 'cool', rot: Math.sin(t * 12 + i) * 0.3, aL: i % 2, aR: 1 - i % 2 }); }
  else if (p === 3) { for (let i = 0; i < 9; i++) { const k = (lt * 1.5 + i / 9) % 1; ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.beginPath(); ctx.arc(1100 + Math.sin(i * 2) * 200 + k * 300, 800 - k * 600, 80 + k * 140, 0, 7); ctx.fill(); } rr(900, 760, 240, 160, 16, '#333'); txt('FOG', 1020, 840, 50, { fill: C.white, mono: true, w: 700 }); }
  else if (p === 4) { crab(1150, 900, 22, { e: 'shock', rot: Math.sin(t * 40) * 0.2, sweat: true, color: ['#D97757', '#2F5BEA', '#3FD06B'][Math.floor(t * 20) % 3] }); for (let i = 0; i < 12; i++) txt('!', 800 + rnd(i) * 800, 200 + rnd(i + 3) * 500, 80, { fill: C.yellow, rot: rnd(i) - 0.5 }); }
  else if (p === 5) { confetti(500, 1000, lt, 60, 0.5); confetti(1420, 1000, lt, 60, 0.5); ctx.fillStyle = C.ink; ctx.save(); ctx.translate(500, 1000); ctx.rotate(-0.5); ctx.fillRect(-40, -160, 80, 200); ctx.restore(); ctx.save(); ctx.translate(1420, 1000); ctx.rotate(0.5); ctx.fillRect(-40, -160, 80, 200); ctx.restore(); }
  else { // all night：太阳想升起来，被一脚踩回去
    const stomp = s.L.words.slice(7).map(x => x.t); let y = 820 - clamp(lt / 0.3) * 260, sq = 0;
    stomp.forEach(st => { if (t >= st + 0.15) { y = 860; sq = Math.max(sq, kick(t - st - 0.15, 6)); } });
    ctx.save(); ctx.translate(1450, y); ctx.scale(1 + sq * 0.5, 1 - sq * 0.5); circle(0, 0, 150, C.yellow); ctx.fillStyle = C.ink; ctx.fillRect(-60, -40, 24, sq > 0.2 ? 6 : 30); ctx.fillRect(36, -40, 24, sq > 0.2 ? 6 : 30); ctx.restore();
    ctx.fillStyle = '#05030C'; ctx.fillRect(-300, 820, W + 600, 600);
    crab(1450, y - 150 - Math.max(0, 0.4 - (t - (stomp.filter(x => t >= x).pop() ?? t))) * 600, 11, { e: 'squint', aL: 1, aR: 1 });
  }
  say(s, t, p === 6 ? { x: 600, y: 540, size: 190, maxW: 900, hl: C.pink } : { x: 520, y: 540, size: 260, maxW: 820, tiles: false });
};
// 건배：两栋公寓当酒杯碰杯
F.cheers = (t, lt, s) => {
  const p = s.p;
  if (p < 2) {
    fill(p ? C.blue : C.orange); rays(960, 540, t, 'rgba(255,255,255,.12)');
    const c = kick(lt, 5), tilt = 0.34 - c * 0.12;
    [[-1, 2], [1, 3]].forEach(([d, ci]) => { ctx.save(); ctx.translate(960 + d * (300 - c * 40), 1150); ctx.rotate(-d * tilt); bldg(0, 0, 320, 640, ci + p); ctx.restore(); });
    for (let i = 0; i < 22; i++) { const a = -Math.PI / 2 + (rnd(i + p * 40) - 0.5) * 2.6, x = 960 + Math.cos(a) * lt * 1000, y = 500 + Math.sin(a) * lt * 1000 + lt * lt * 1500; ctx.save(); ctx.translate(x, y); ctx.rotate(lt * 9 + i); ctx.fillStyle = C.yellow; ctx.fillRect(-22, -28, 44, 56); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.strokeRect(-22, -28, 44, 56); ctx.restore(); }
    say(s, t, { y: 200, size: 220, tiles: false });
  } else {
    fill(C.yellow); dots('rgba(0,0,0,.08)', 40, 6);
    crab(960, 820, 26, { e: 'cool', aL: Math.floor(t * 8) % 2, aR: 1, sq: kick(lt, 8) * 0.2 });
    say(s, t, { y: 220, size: 160, tiles: false, fill: C.ink, exc: C.orange });
  }
};
F.plain = (t, lt, s) => { fill(C.ink); say(s, t, { y: 540 }); };

// 结尾
F.end = (t, lt) => {
  fill('#0B0E24'); stars(t, 0, 150); rays(960, 560, t, 'rgba(217,119,87,.08)');
  txt('APT.', 960, 430, 330, { fill: C.cream, ex: 28, exc: C.orange, sc: lerp(2, 1, eOut(lt / 0.2)) });
  txt('ROSÉ & Bruno Mars · Claude MV', 960, 640, 44, { fill: C.gray, mono: true, w: 700, a: clamp((lt - 0.3) / 0.3) });
  crab(960, 950, 13, { e: 'happy', crown: true, blush: true, aR: Math.floor(t * 4) % 2, legs: t * 4 });
  if (t > DURATION - 0.8) { ctx.fillStyle = `rgba(0,0,0,${clamp((t - (DURATION - 0.8)) / 0.8)})`; ctx.fillRect(0, 0, W, H); }
};

// ---------- 合成：镜头运动 + 转场 ----------
const noise = document.createElement('canvas'); noise.width = noise.height = 256;
{ const n = noise.getContext('2d'), d = n.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } n.putImageData(d, 0, 0); }
const noisePat = mctx.createPattern(noise, 'repeat');

function render(t) {
  NOW = t;
  let si = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].t0) si = i;
  const S = SHOTS[si], lt = t - S.t0;
  // 先把镜头画到缓冲区
  ctx = bctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  ctx.clearRect(0, 0, W, H);
  (F[S.fn] || F.plain)(t, lt, S);
  // 再贴到主画布：漂移 + 每拍推一下 + 入场转场
  ctx = mctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const punch = t > BEAT0 && t < END_START ? kick(bfrac(t) * SPB, 9) * 0.035 : 0;
  const ent = 1 - eOut(lt / 0.16), mode = si % 4;
  let z = 1.04 + punch, dx = Math.sin(t * 0.9) * 16, dy = Math.cos(t * 1.1) * 10, rot = Math.sin(t * 0.6) * 0.008;
  if (mode === 0) z += ent * 0.35; else if (mode === 1) dx += ent * 700; else if (mode === 2) dx -= ent * 700; else { rot += ent * 0.15; z += ent * 0.2; }
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (ent > 0.05) ctx.filter = `blur(${(ent * 18).toFixed(1)}px)`;
  ctx.translate(W / 2 + dx, H / 2 + dy); ctx.rotate(rot); ctx.scale(z, z); ctx.drawImage(buf, -W / 2, -H / 2);
  ctx.restore();
  // 切镜头的白闪（只在每段开头）
  const prev = SHOTS[si - 1];
  if (prev && prev.fn !== S.fn && lt < 0.08) { ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - lt / 0.08)})`; ctx.fillRect(0, 0, W, H); }
  // 底部进度条
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, H - 6, W, 6); ctx.fillStyle = C.orange; ctx.fillRect(0, H - 6, W * t / DURATION, 6);
  ctx.save(); ctx.globalAlpha = 0.035; ctx.translate(Math.floor(rnd(Math.floor(t * 12)) * 256), Math.floor(rnd(Math.floor(t * 12) + 5) * 256)); ctx.fillStyle = noisePat; ctx.fillRect(-256, -256, W + 512, H + 512); ctx.restore();
}

// ---------- 渲染 / 预览 ----------
window.loadLyrics = async (src) => {
  setLyrics(src);
  for (let t = 0; t < DURATION; t += 0.05) render(t);
  const all = [...USED].join('');
  await document.fonts.load(`900 100px "Noto Sans SC"`, all);
  await document.fonts.load(`900 100px "Noto Sans KR"`, all);
  await document.fonts.ready;
  return DURATION;
};
window.frame = (t) => { render(t); return main.toDataURL('image/jpeg', 0.92); };

if (!/render=1/.test(location.search)) {
  const audio = new Audio(); let playing = false, t0 = 0, base = 0, ready = false;
  document.getElementById('song').onchange = e => { audio.src = URL.createObjectURL(e.target.files[0]); };
  document.getElementById('lrc').onchange = async e => { await window.loadLyrics(await e.target.files[0].text()); ready = true; };
  fetch('APT_.lrc').then(r => r.text()).then(async s => { await window.loadLyrics(s); ready = true; }).catch(() => {});
  main.onclick = () => { playing = !playing; if (audio.src) { playing ? audio.play() : audio.pause(); } else if (playing) t0 = performance.now() / 1000 - base; };
  const loop = () => { if (playing) base = audio.src ? audio.currentTime : (performance.now() / 1000 - t0) % DURATION; if (ready) render(base); requestAnimationFrame(loop); };
  loop();
} else document.getElementById('bar').remove();
