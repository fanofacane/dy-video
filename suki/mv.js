// Claude MV ·『ユイカ』「好きだから。」（0:00–1:26）
// 小螃蟹暗恋记：一句歌词一个镜头，日文歌词逐字出现 + 中文翻译。视频 0s = 歌曲 0s。

const W = 1920, H = 1080;
const main = document.getElementById('c'), mctx = main.getContext('2d');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const bctx = buf.getContext('2d');
let ctx = bctx;

const C = {
  cream: '#FFF4EC', pink: '#FFB3C7', hot: '#FF5F8F', rose: '#E8437A', sky: '#A8D8FF', blue: '#5B8DEF', lav: '#CDBEFF', mint: '#BFF0D4',
  lemon: '#FFE9A0', peach: '#FFD3B6', night: '#2B2350', ink: '#2A1A2E', orange: '#D97757', white: '#FFFFFF', gray: '#9A8F99', red: '#FF4D5A', yellow: '#FFC94A', green: '#3FD06B',
};
const JP = '"Noto Sans JP", "Noto Sans SC", sans-serif';
const MONO = '"DejaVu Sans Mono", monospace';
const SPB = 60 / 165, BEAT0 = 1.082;
const CUT = 86.5;
let DURATION = 89.2, END_START = 86.6, NOW = 0;
const USED = new Set();

// ---------- 数学 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = t => 1 - Math.pow(1 - clamp(t), 3);
const eIn = t => Math.pow(clamp(t), 3);
const eIO = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eBack = t => { t = clamp(t); const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const pop = (lt, d = 0.25) => lt < 0 ? 0 : eBack(lt / d);
const kick = (lt, k = 8) => lt < 0 ? 0 : Math.exp(-lt * k);
const beatAt = t => (t - BEAT0) / SPB;
const bfrac = t => { const b = beatAt(t); return b - Math.floor(b); };
const bob = (t, a = 12, sp = 1) => Math.sin(beatAt(t) * Math.PI * sp) * a;

// ---------- 绘图基础 ----------
function fill(c) { ctx.fillStyle = c; ctx.fillRect(-300, -300, W + 600, H + 600); }
function grad(c0, c1) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(-300, -300, W + 600, H + 600); }
function glow(x, y, r, c) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
function rr(x, y, w, h, r, f, s, lw = 5) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (f) { ctx.fillStyle = f; ctx.fill(); } if (s) { ctx.lineWidth = lw; ctx.strokeStyle = s; ctx.stroke(); } }
function circle(x, y, r, f) { ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7); ctx.fill(); }
function txt(s, x, y, size, o = {}) {
  s = String(s); USED.add(s);
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  const sc = o.sc ?? 1; ctx.scale(sc, sc); ctx.globalAlpha *= o.a ?? 1;
  ctx.font = `${o.w || 900} ${size}px ${o.mono ? MONO : JP}`;
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  if (o.ex) { ctx.fillStyle = o.exc || C.ink; const st = Math.max(1.5, o.ex / 10); for (let i = o.ex; i > 0; i -= st) ctx.fillText(s, i * 0.6, i); }
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.lw || size * 0.16; ctx.strokeStyle = o.stroke; ctx.strokeText(s, 0, 0); }
  ctx.fillStyle = o.fill || C.ink; ctx.fillText(s, 0, 0);
  ctx.restore();
}
function tw(s, size, mono) { ctx.save(); ctx.font = `900 ${size}px ${mono ? MONO : JP}`; const w = ctx.measureText(s).width; ctx.restore(); return w; }
function pix(rows, x, y, p, c) { ctx.fillStyle = c; rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'X') ctx.fillRect(x + i * p, y + j * p, p + 0.6, p + 0.6); }); }
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function heart(x, y, p, c = C.hot) { pix(HEART, x - 3.5 * p, y - 3 * p, p, c); }
function softHeart(x, y, s, c) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(-80, -20, -40, -80, 0, -40); ctx.bezierCurveTo(40, -80, 80, -20, 0, 30); ctx.fill(); ctx.restore(); }
function bubble(s, x, y, size, o = {}) {
  const w = tw(s, size) + size * 0.9, h = size * 1.5, sc = o.sc ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); if (o.rot) ctx.rotate(o.rot);
  ctx.fillStyle = o.bg || C.white; ctx.strokeStyle = o.line || C.ink; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.45); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w * 0.15, h / 2 - 3); ctx.lineTo(-w * 0.3, h / 2 + size * 0.5); ctx.lineTo(-w * 0.0, h / 2 - 3); ctx.fill();
  ctx.restore();
  txt(s, x, y + size * 0.04, size, { fill: o.fg || C.ink, sc, rot: o.rot });
}
function sparkle(x, y, s, c = C.white) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill(); }
function sparkles(cx, cy, R, t, c = C.white, n = 8) { for (let i = 0; i < n; i++) { const a = i / n * 6.28 + t * 0.6, s = 10 + 12 * Math.abs(Math.sin(t * 4 + i * 1.9)); sparkle(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.7, s, c); } }
function floatHearts(t, n = 14, c = 'rgba(255,95,143,.5)', speed = 80) { for (let i = 0; i < n; i++) { const y = H + 50 - ((t * speed * (0.6 + rnd(i))) + rnd(i + 3) * H) % (H + 100); heart(rnd(i + 7) * W + Math.sin(t + i) * 20, y, 5 + rnd(i) * 6, c); } }
function dots(c, step = 50, s = 6) { ctx.fillStyle = c; for (let x = step / 2; x < W; x += step) for (let y = step / 2; y < H; y += step) { ctx.beginPath(); ctx.arc(x, y, s / 2, 0, 7); ctx.fill(); } }
function stars(t, n = 90) { for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * Math.abs(Math.sin(t * 1.4 + i))})`; ctx.fillRect(rnd(i + 5) * W, rnd(i) * H * 0.8, 3, 3); } }
function confetti(x, y, lt, n = 50) { if (lt < 0) return; const cs = [C.hot, C.pink, C.lemon, C.sky, C.lav, C.white]; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (rnd(i * 3.3) - 0.5) * 3, v = 600 + rnd(i) * 800; ctx.save(); ctx.translate(x + Math.cos(a) * v * lt, y + Math.sin(a) * v * lt + 700 * lt * lt); ctx.rotate(lt * 8 + i); ctx.fillStyle = cs[i % 6]; ctx.fillRect(-12, -6, 24, 12); ctx.restore(); } }
function rays(cx, cy, t, c, n = 18) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.3); ctx.fillStyle = c; for (let i = 0; i < n; i++) { ctx.rotate(6.283 / n); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1700, -110); ctx.lineTo(1700, 110); ctx.fill(); } ctx.restore(); }

// ---------- 角色 ----------
// 主角：橙色小螃蟹（蝴蝶结）；英雄：蓝色小螃蟹
function crab(cx, by, p, o = {}) {
  const col = o.color || C.orange;
  ctx.save(); ctx.translate(cx, by); if (o.rot) ctx.rotate(o.rot);
  const sq = o.sq || 0; ctx.scale((o.flip ? -1 : 1) * (1 + sq * 0.6), 1 - sq);
  ctx.globalAlpha *= o.a ?? 1; ctx.translate(-8 * p, -9 * p);
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * p, y * p, w * p + 0.7, h * p + 0.7); };
  const lg = o.legs != null ? Math.floor(o.legs * 2) % 2 : -1;
  [3, 5].forEach(x => R(x, 7, 1, lg === 0 ? 1.3 : 2, col)); [10, 12].forEach(x => R(x, 7, 1, lg === 1 ? 1.3 : 2, col));
  if (o.cape) { R(1, 1, 14, 7.5, C.red); }
  R(2, 0, 12, 7, col);
  R(0, 3 - (o.aL || 0) * 2, 2, 2, col); R(14, 3 - (o.aR || 0) * 2, 2, 2, col);
  const k = C.ink;
  switch (o.e || 'n') {
    case 'happy': [[4, 3], [5, 2], [6, 3], [9, 3], [10, 2], [11, 3]].forEach(([x, y]) => R(x, y, 1, 1, k)); break;
    case 'squint': [[4, 1.5], [5, 2.5], [4, 3.5], [11, 1.5], [10, 2.5], [11, 3.5]].forEach(([x, y]) => R(x, y, 1, 1, k)); break;
    case 'shock': R(4, 2, 2, 2, k); R(10, 2, 2, 2, k); R(4.5, 2.5, 1, 1, C.white); R(10.5, 2.5, 1, 1, C.white); break;
    case 'cool': R(3, 2, 4, 2, k); R(9, 2, 4, 2, k); R(7, 2, 2, 0.6, k); R(3.6, 2.3, 1, 0.6, '#777'); R(9.6, 2.3, 1, 0.6, '#777'); break;
    case 'sleepy': R(4, 3, 2, 0.6, k); R(10, 3, 2, 0.6, k); R(4, 2.4, 2, 0.6, col); break;
    case 'blink': R(4, 3, 2, 0.6, k); R(10, 3, 2, 0.6, k); break;
    case 'heart': pix(HEART, 3.4 * p, 1.6 * p, p * 0.42, C.hot); pix(HEART, 9.3 * p, 1.6 * p, p * 0.42, C.hot); break;
    case 'sad': R(4, 2.5, 2, 0.6, k); R(10, 2.5, 2, 0.6, k); R(4.5, 3.1, 1, 1, '#69B7FF'); R(10.5, 3.1, 1, 1, '#69B7FF'); break;
    case 'melt': [[4, 2], [5, 3], [6, 2], [9, 2], [10, 3], [11, 2]].forEach(([x, y]) => R(x, y, 1, 1, k)); R(7, 4.4, 2, 1, C.hot); break;
    case 'dead': [[4, 2], [6, 2], [5, 3], [4, 4], [6, 4], [9, 2], [11, 2], [10, 3], [9, 4], [11, 4]].forEach(([x, y]) => R(x, y - 0.5, 1, 1, k)); break;
    default: R(5, 2, 1, 2, k); R(10, 2, 1, 2, k);
  }
  if (o.blush) { R(3, 4.4, 2, 0.8, C.hot); R(11, 4.4, 2, 0.8, C.hot); }
  if (o.bow) { R(10, -1, 2, 2, C.hot); R(13, -1, 2, 2, C.hot); R(12, -0.5, 1, 1, '#C2185B'); }
  if (o.sweat) { R(15, -1, 1, 2, '#69B7FF'); R(14.5, 0, 2, 1.5, '#69B7FF'); }
  ctx.restore();
}
const me = (x, y, p, o = {}) => crab(x, y, p, { bow: true, ...o });
const hero = (x, y, p, o = {}) => crab(x, y, p, { color: C.blue, ...o });
function dog(x, y, s, t) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); pix(['X......XX', 'XXXXXXXXX.', 'XXXXXXXXX', '.X.X..X.X', '.X.X..X.X'], -45, -25, 10, C.white); pix(['XX', 'XX'], 35, -45, 10, '#E9D9C8'); ctx.fillStyle = C.ink; ctx.fillRect(50, -20, 6, 6); ctx.restore(); ctx.save(); ctx.translate(x - 45 * s, y - 25 * s); ctx.rotate(Math.sin(t * 20) * 0.5); ctx.fillStyle = C.white; ctx.fillRect(-20 * s, -6 * s, 20 * s, 10 * s); ctx.restore(); }

// ---------- 歌词 ----------
const ZH = {
  'かっこいいから好きなんじゃない': '不是因为你帅才喜欢你',
  '好きだからかっこいいんだよ': '是因为喜欢，你才那么帅',
  '誰かにばかにされても何ともない': '就算被谁取笑也无所谓',
  'だって私の「ヒーロー」': '因为你是我的「英雄」',
  'いつも「眠い」って言うくせに': '明明总说着「好困」',
  '授業は起きているとことか': '上课却一直醒着',
  'みんなの前ではクールなのに': '在大家面前那么酷',
  '犬の前ではデレデレなとことか': '见到小狗却一脸宠溺',
  'あぁ 本当に愛してやまない': '啊 真的好喜欢好喜欢',
  '貴方のこと': '你啊',
  '私だけの「ヒーロー」になってよ': '做我一个人的「英雄」吧',
  'LINEだってしていたいし': '想一直和你聊天',
  '一緒に帰ったりしたいよ': '也想和你一起回家',
  '放課後部活に行く貴方に': '放学后去社团的你',
  '「またね」ってひとりごと': '我小声自言自语「明天见」',
  '休みの日だって会いたいし': '放假的日子也想见你',
  '寝落ち電話もしてみたいけど': '也想打电话打到睡着',
  'そんな勇気はちっともなくて': '可我一点勇气都没有',
  'あきれるなぁ': '真拿自己没办法',
  '振り向いてほしくて': '想让你回头看看我',
  '意識してほしくて': '想让你注意到我',
  '香水をつけて': '喷了香水',
  '１人でむせて': '结果自己呛到',
  '貴方が欲しくて': '好想要你',
  '貴方のものになりたくて': '好想成为你的人',
  '「明日こそは」って': '「明天一定要……」',
  'ベッドの上でシミュレーション': '在床上反复演练',
  '貴方を考えながら': '一边想着你',
  'また明日': '明天见',
};
// 每句歌词对应的镜头（长句拆成多个）
const SCENES = ['notCool', 'loveFilter', 'mocked', 'heroFly', 'sleepy', 'classroom', 'cool', 'dogMelt', 'loveBoom', 'heartFrame', ['onlyMine', 'medal'],
  'line', 'walkHome', 'club', 'mataneSolo', 'calendar', 'callSleep', 'courage', 'facepalm', 'turnAround', 'noticeMe', 'perfume', 'cough', 'wantYou', 'giftBox',
  'tomorrow', 'simulate', 'pillow', 'goodnight'];
let LINES = [], SHOTS = [];
function setLyrics(src) {
  const raw = [];
  for (const line of src.split(/\r?\n/)) { const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/); if (m) raw.push({ t: +m[1] * 60 + +m[2], text: m[3].trim() }); }
  const all = raw.filter(l => l.t >= 1 && l.text);
  all.forEach((L, i) => { L.end = i + 1 < all.length ? all[i + 1].t : L.t + 3; });
  LINES = all.filter(L => L.t < CUT);
  LINES[LINES.length - 1].end = Math.min(LINES[LINES.length - 1].end, LINES[LINES.length - 1].t + 1.0);
  SHOTS = [{ t0: 0, t1: LINES[0].t, fn: 'intro' }];
  LINES.forEach((L, i) => {
    L.zh = ZH[L.text] || '';
    const sc = SCENES[i] || 'plain';
    if (Array.isArray(sc)) { const mid = L.t + (L.end - L.t) * 0.45; SHOTS.push({ t0: L.t, t1: mid, fn: sc[0], L, part: 0 }, { t0: mid, t1: L.end, fn: sc[1], L, part: 1 }); }
    else SHOTS.push({ t0: L.t, t1: L.end, fn: sc, L });
  });
  END_START = LINES[LINES.length - 1].end;
  DURATION = END_START + 2.6;
  SHOTS.push({ t0: END_START, t1: DURATION, fn: 'end' });
  window.DURATION = DURATION;
}

// 字幕：日文逐字蹦出 + 中文
let PENDING = null;
const lyric = (L, t, o = {}) => { PENDING = [L, t, o]; };   // 先记下，最后不缩放地画在最上层
function drawLyric(L, t, o = {}) {
  if (!L) return;
  const chars = [...L.text], d = Math.min(L.end - L.t, 3) * 0.55;
  let size = o.size ?? 80; const maxW = 1720;
  let full = tw(L.text, size); if (full > maxW) { size *= maxW / full; full = maxW; }
  const y = o.y ?? 958;
  let x = 960 - full / 2;
  ctx.save(); ctx.globalAlpha = 0.85; const g = ctx.createLinearGradient(0, y - 90, 0, H); g.addColorStop(0, 'rgba(42,26,46,0)'); g.addColorStop(1, 'rgba(42,26,46,.6)'); ctx.fillStyle = g; ctx.fillRect(0, y - 90, W, H - y + 90); ctx.restore();
  chars.forEach((ch, i) => {
    const cw = tw(ch, size), at = L.t + d * i / chars.length;
    if (t >= at) txt(ch, x + cw / 2, y - kick(t - at, 10) * 20, size, { fill: C.white, stroke: o.stroke || C.rose, lw: size * 0.18, sc: lerp(1.6, 1, eOut((t - at) / 0.14)) });
    x += cw;
  });
  if (L.zh && t >= L.t + 0.25) txt(L.zh, 960, y + 72, 36, { fill: C.cream, a: clamp((t - L.t - 0.25) / 0.3), stroke: 'rgba(42,26,46,.7)', lw: 10 });
}

// ---------- 镜头 ----------
const F = {};
// 0–1.1s 片头
F.intro = (t, lt) => {
  grad(C.pink, C.cream); dots('rgba(255,255,255,.5)', 60, 10);
  const k = eOut(lt / 0.5);
  softHeart(960, 470, 4 * pop(lt, 0.4) * (1 + kick(lt % 0.36, 10) * 0.05), C.hot);
  txt('好きだから。', 960, 470, 130, { fill: C.white, sc: k, stroke: C.rose, lw: 22 });
  me(960 + Math.sin(lt * 6) * 10, 900, 10, { e: 'blink', blush: true, a: k });
};
// 不是因为你帅才喜欢你：帅气英雄闪闪发光，“かっこいい”被打叉
F.notCool = (t, lt, s) => {
  grad(C.lav, C.cream); rays(1300, 480, t, 'rgba(255,255,255,.25)');
  hero(1300, 760 + bob(t, 8), 22, { e: 'cool', aR: 1 });
  sparkles(1300, 560, 300, t, C.white, 10);
  me(420, 780, 14, { e: lt > 1.4 ? 'squint' : 'n', blush: true });
  const x = lt > 1.2;
  txt('かっこいい', 1300, 230, 110, { fill: C.white, stroke: C.blue, lw: 18, sc: pop(lt - 0.2, 0.2) });
  if (x) { const k = eOut((lt - 1.2) / 0.15); ctx.strokeStyle = C.red; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1060, 160); ctx.lineTo(1060 + 480 * k, 160 + 140 * k); ctx.stroke(); ctx.beginPath(); ctx.moveTo(1540, 160); ctx.lineTo(1540 - 480 * k, 160 + 140 * k); ctx.stroke(); }
  if (lt > 1.5) { [-1, 1].forEach((d, i) => { const a = Math.sin(t * 14 + i) * 0.4; ctx.fillStyle = C.ink; ctx.save(); ctx.translate(420 + d * 150, 620); ctx.rotate(a); ctx.fillRect(-6, -40, 12, 40); ctx.restore(); }); txt('ちがう！', 420, 520, 60, { fill: C.hot, stroke: C.white, lw: 14, sc: pop(lt - 1.5, 0.2) }); }
  lyric(s.L, t);
};
// 是因为喜欢你才帅：戴上恋爱滤镜，英雄瞬间闪闪发光
F.loveFilter = (t, lt, s) => {
  const on = lt > 0.9, k = eOut((lt - 0.9) / 0.3);
  grad(on ? C.hot : C.lav, on ? C.pink : C.cream);
  if (on) { rays(1250, 520, t, 'rgba(255,255,255,.3)'); floatHearts(t, 20, 'rgba(255,255,255,.7)', 120); }
  hero(1250, 760 + bob(t, 8), 22 * (1 + k * 0.08), { e: on ? 'cool' : 'n', cape: on });
  if (on) sparkles(1250, 560, 330, t, C.lemon, 12);
  me(430, 800, 14, { e: on ? 'heart' : 'n', blush: true });
  // 滤镜开关 UI
  rr(160, 160, 560, 120, 60, C.white, C.ink, 6);
  txt('LOVE FILTER', 330, 220, 46, { fill: C.ink, mono: true });
  rr(560, 180, 130, 80, 40, on ? C.hot : '#CCC'); circle(on ? lerp(600, 650, k) : 600, 220, 32, C.white);
  if (on && lt - 0.9 < 0.08) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-300, -300, W + 600, H + 600); }
  if (on) txt('かっこいい!!', 1250, 220, 110, { fill: C.white, stroke: C.rose, lw: 20, sc: pop(lt - 1.0, 0.2), rot: -0.05 });
  lyric(s.L, t);
};
// 就算被谁取笑也无所谓：一群螃蟹指着笑，主角举起盾牌
F.mocked = (t, lt, s) => {
  grad('#E6E0F0', C.cream);
  hero(960, 760, 16, { e: 'n' });
  for (let i = 0; i < 4; i++) { const x = [260, 480, 1440, 1660][i]; crab(x, 760 + Math.abs(Math.sin(t * 10 + i)) * -20, 9, { color: '#B9AFC0', e: 'happy', aR: i < 2 ? 1 : 0, aL: i >= 2 ? 1 : 0 }); if (lt > 0.2 + i * 0.12) bubble(['笑', 'w', 'ダサ', '笑'][i], x, 520 - i * 10, 50, { sc: pop(lt - 0.2 - i * 0.12, 0.15), bg: '#EEE' }); }
  if (lt > 1.4) {
    const k = eBack((lt - 1.4) / 0.25);
    me(960, 760, 13 * k, { e: 'cool', aL: 1, aR: 1, a: k > 0 ? 1 : 0 });
    ctx.save(); ctx.translate(960, 500); ctx.scale(k, k); rr(-200, -150, 400, 300, 60, 'rgba(168,216,255,.55)', C.white, 10); ctx.restore();
    txt('何ともない', 960, 500, 64, { fill: C.white, stroke: C.blue, lw: 14, sc: k });
  }
  lyric(s.L, t);
};
// 因为你是我的英雄：漫画爆炸框 HERO!
F.heroFly = (t, lt, s) => {
  fill(C.lemon); rays(960, 480, t * 2, 'rgba(255,95,143,.25)', 24);
  const k = eOut(lt / 0.4);
  hero(lerp(-200, 1100, k), 560 - Math.sin(lt * 3) * 40, 20, { e: 'cool', cape: true, aR: 1, rot: -0.15 });
  ctx.save(); ctx.translate(560, 300); ctx.rotate(-0.12); const sc = pop(lt - 0.5, 0.2); ctx.scale(sc, sc);
  ctx.fillStyle = C.hot; ctx.beginPath(); for (let i = 0; i < 20; i++) { const r = i % 2 ? 150 : 270, a = i / 20 * 6.28; ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.8); } ctx.closePath(); ctx.fill();
  ctx.restore();
  txt('HERO!', 560, 300, 120, { fill: C.white, stroke: C.ink, lw: 14, sc, rot: -0.12 });
  // 主角挥荧光棒
  me(1560, 840, 12, { e: 'heart', blush: true, aL: Math.floor(t * 5) % 2, aR: 1 - Math.floor(t * 5) % 2 });
  [-1, 1].forEach(d => { ctx.save(); ctx.translate(1560 + d * 120, 700); ctx.rotate(d * 0.3 + Math.sin(t * 10) * 0.4 * d); ctx.fillStyle = C.hot; ctx.fillRect(-10, -110, 20, 110); glow(0, -110, 60, 'rgba(255,95,143,.7)'); ctx.restore(); });
  lyric(s.L, t);
};
// 明明总说好困
F.sleepy = (t, lt, s) => {
  grad('#CFC4FF', '#F3EEFF');
  hero(960, 800, 26, { e: 'sleepy', sq: Math.sin(t * 2.5) * 0.03 });
  for (let i = 0; i < 3; i++) { const q = (lt * 0.8 + i / 3) % 1; txt('Z', 1250 + q * 160 + i * 30, 380 - q * 220, 60 + i * 20, { fill: C.white, a: 1 - q, stroke: C.lav, lw: 10 }); }
  bubble('眠い…', 600, 360, 80, { sc: pop(lt - 0.3, 0.25), bg: C.white });
  // 哈欠
  if (lt > 1.2) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(960, 720, 50, 30 * Math.abs(Math.sin((lt - 1.2) * 3)), 0, 0, 7); ctx.fill(); }
  lyric(s.L, t);
};
// 上课却一直醒着：教室，英雄认真记笔记，主角躲在书后偷看
F.classroom = (t, lt, s) => {
  fill('#F7EBDD'); rr(260, 80, 1400, 360, 20, '#2F5D50', '#8B5E3C', 18);
  txt('2 + 2 = ?', 600, 200, 70, { fill: C.white, mono: true }); txt('好き = ∞', 1200, 330, 60, { fill: C.lemon, a: lt > 1 ? 1 : 0 });
  rr(1050, 700, 560, 40, 6, '#B07A4F'); rr(250, 700, 560, 40, 6, '#B07A4F');
  hero(1330, 700, 15, { e: 'n', aR: Math.floor(t * 6) % 2 });
  ctx.save(); ctx.translate(1440, 640); ctx.rotate(-0.4); ctx.fillStyle = C.yellow; ctx.fillRect(-6, -60, 12, 60); ctx.restore();
  me(530, 700, 15, { e: 'heart', blush: true });
  const peek = Math.sin(lt * 2.5) * 0.5 + 0.5;
  rr(400, 560 - peek * 60, 260, 150, 8, C.hot, C.ink, 5); txt('教科書', 530, 635 - peek * 60, 40, { fill: C.white });
  if (lt > 0.6) heart(700, 520 - (lt % 1) * 80, 6, C.hot);
  txt('じーっ', 300, 500, 54, { fill: C.hot, stroke: C.white, lw: 12, a: lt > 0.8 ? 1 : 0, rot: -0.1 });
  lyric(s.L, t);
};
// 在大家面前很酷：COOL 指数 100%
F.cool = (t, lt, s) => {
  grad('#A8D8FF', '#E8F4FF');
  for (let i = 0; i < 10; i++) { const x = 140 + i * 180; crab(x, 840, 6, { color: '#B9AFC0', e: 'heart', blush: true }); }
  hero(960, 640 + bob(t, 6), 22, { e: 'cool' });
  for (let i = 0; i < 12; i++) { const a = rnd(i) * 6.28 + t; sparkle(960 + Math.cos(a) * 380, 450 + Math.sin(a) * 200, 14 + 8 * Math.sin(t * 6 + i), C.white); }
  rr(1420, 140, 380, 70, 35, C.white, C.ink, 5); const v = Math.min(100, Math.floor(eOut(lt / 0.8) * 100)); rr(1430, 150, 360 * v / 100, 50, 25, C.blue);
  txt(`COOL ${v}%`, 1610, 176, 36, { fill: C.ink, mono: true });
  txt('クール…', 960, 220, 100, { fill: C.white, stroke: C.blue, lw: 18, sc: pop(lt - 0.4, 0.2) });
  lyric(s.L, t);
};
// 见到小狗瞬间融化：COOL 掉到 0，デレデレ 满格
F.dogMelt = (t, lt, s) => {
  grad(C.pink, C.cream); floatHearts(t, 20);
  const meltK = eOut((lt - 0.5) / 0.4);
  dog(1350 + Math.sin(t * 8) * 10, 760, 1.4, t);
  hero(780, 760, 22, { e: meltK > 0.5 ? 'melt' : 'cool', blush: meltK > 0.5, sq: meltK * 0.25 + Math.sin(t * 12) * 0.03 * meltK });
  rr(1420, 140, 380, 70, 35, C.white, C.ink, 5); const v = Math.max(0, 100 - Math.floor(meltK * 100)); rr(1430, 150, 360 * v / 100, 50, 25, C.blue); txt(`COOL ${v}%`, 1610, 176, 36, { fill: C.ink, mono: true });
  rr(1420, 230, 380, 70, 35, C.white, C.ink, 5); rr(1430, 240, 360 * meltK, 50, 25, C.hot); txt(`デレ ${Math.floor(meltK * 100)}%`, 1610, 266, 36, { fill: C.ink });
  if (lt > 0.6) txt('デレデレ♡', 600, 260, 110, { fill: C.white, stroke: C.hot, lw: 20, sc: pop(lt - 0.6, 0.2), rot: -0.06 });
  lyric(s.L, t);
};
// 啊 真的好喜欢：心跳越来越快，爱心撑满屏幕
F.loveBoom = (t, lt, s) => {
  fill(C.hot); rays(960, 500, t, 'rgba(255,255,255,.18)');
  const beat = kick(bfrac(t) * SPB, 7);
  softHeart(960, 520, (2 + eIn(lt / 3) * 10) * (1 + beat * 0.12), C.white);
  me(960, 640, 13, { e: 'heart', blush: true, sq: beat * 0.1 });
  const n = Math.floor(lt / 0.12);
  txt(`好き ×${Math.min(9999, Math.floor(Math.pow(1.6, n)))}`, 960, 200, 70, { fill: C.white, mono: false, stroke: C.rose, lw: 14 });
  lyric(s.L, t);
};
// 你啊：心形相框里是英雄
F.heartFrame = (t, lt, s) => {
  grad('#FFD6E2', C.cream); floatHearts(t, 16);
  const k = eBack(lt / 0.4);
  ctx.save(); ctx.translate(960, 480); ctx.scale(k, k);
  softHeart(0, 0, 5.2, C.hot); softHeart(0, -6, 4.6, C.white);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.translate(960, 474); ctx.scale(4.6 * k, 4.6 * k); ctx.moveTo(0, 30); ctx.bezierCurveTo(-80, -20, -40, -80, 0, -40); ctx.bezierCurveTo(40, -80, 80, -20, 0, 30); ctx.restore(); ctx.save(); ctx.clip();
  fill(C.sky); hero(960, 640, 16 * k, { e: 'cool', blush: true }); ctx.restore();
  sparkles(960, 470, 420, t, C.white, 10);
  lyric(s.L, t);
};
// 做我一个人的英雄吧（上）：主角举着灯牌
F.onlyMine = (t, lt, s) => {
  fill('#3A2360'); stars(t);
  me(960, 900, 16, { e: 'heart', blush: true, aL: 1, aR: 1 });
  const sw = Math.sin(t * 3) * 0.05;
  ctx.save(); ctx.translate(960, 420); ctx.rotate(sw); rr(-460, -170, 920, 340, 40, C.white, C.hot, 14);
  ctx.restore();
  txt('私だけの', 960, 360, 120, { fill: C.hot, rot: sw, sc: pop(lt - 0.1, 0.2) });
  txt('♡ HERO ♡', 960, 480, 80, { fill: C.blue, rot: sw, a: Math.floor(t * 4) % 2 ? 1 : 0.4 });
  glow(960, 420, 700, 'rgba(255,95,143,.25)');
  lyric(s.L, t);
};
// 做我一个人的英雄吧（下）：给英雄挂上“我的英雄”奖牌
F.medal = (t, lt, s) => {
  fill(C.lemon); rays(960, 480, t, 'rgba(255,255,255,.4)');
  hero(960, 820, 22, { e: lt > 0.8 ? 'happy' : 'shock', cape: true, blush: lt > 0.8 });
  const k = eOut(lt / 0.6);
  ctx.strokeStyle = C.hot; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(880, 300 + (1 - k) * -500); ctx.lineTo(960, 470 + (1 - k) * -500); ctx.lineTo(1040, 300 + (1 - k) * -500); ctx.stroke();
  circle(960, 520 + (1 - k) * -500, 90, '#E8A317'); circle(960, 520 + (1 - k) * -500, 72, C.yellow);
  txt('MY', 960, 495 + (1 - k) * -500, 40, { fill: C.rose }); txt('HERO', 960, 540 + (1 - k) * -500, 40, { fill: C.rose });
  me(1560, 860, 11, { e: 'happy', blush: true, aL: 1, aR: 1 });
  confetti(960, 400, lt - 0.6, 70);
  lyric(s.L, t);
};
// 想一直聊 LINE：打了又删
const DRAFTS = ['おはよ！', '今日なにしてる？', 'あのね、実は…', 'すき'];
F.line = (t, lt, s) => {
  fill('#C9E8D2'); dots('rgba(255,255,255,.5)', 54, 8);
  rr(560, 60, 800, 960, 50, C.ink); rr(580, 90, 760, 900, 36, '#F2F5F0');
  rr(580, 90, 760, 100, 0, '#4CC764'); txt('ヒーロー', 960, 140, 44, { fill: C.white });
  hero(660, 175, 3.2, { e: 'cool' });
  rr(610, 230, 420, 80, 30, C.white, '#DDD', 2); txt('明日の宿題なんだっけ', 630, 270, 30, { fill: C.ink, align: 'left' });
  rr(860, 340, 450, 80, 30, '#8DE08F'); txt('数学のプリント！', 890, 380, 30, { fill: C.ink, align: 'left' });
  rr(610, 450, 260, 80, 30, C.white, '#DDD', 2); txt('さんきゅ', 630, 490, 30, { fill: C.ink, align: 'left' });
  txt('既読', 840, 400, 20, { fill: C.gray });
  // 打字 → 删掉
  const cyc = 0.75, i = Math.min(DRAFTS.length - 1, Math.floor(lt / cyc)), q = (lt % cyc) / cyc, d = DRAFTS[i];
  const shown = q < 0.6 ? [...d].slice(0, Math.ceil(q / 0.6 * d.length)).join('') : [...d].slice(0, Math.ceil((1 - (q - 0.6) / 0.4) * d.length)).join('');
  rr(600, 880, 600, 80, 40, C.white, '#CCC', 3); txt(shown + (Math.floor(t * 4) % 2 ? '|' : ''), 630, 920, 40, { fill: C.ink, align: 'left' });
  rr(1220, 880, 100, 80, 40, '#4CC764'); txt('↑', 1270, 918, 44, { fill: C.white });
  txt(q > 0.6 ? '⌫ 消す…' : '', 960, 820, 36, { fill: C.gray });
  me(300, 900, 13, { e: q > 0.6 ? 'sad' : 'blink', blush: true, sweat: q > 0.6 });
  lyric(s.L, t);
};
// 想一起回家：想象 vs 现实
F.walkHome = (t, lt, s) => {
  grad('#FF9E7A', '#FFD7A8');
  circle(1500, 640, 160, '#FFE7B0');
  ctx.fillStyle = '#E07A5F'; for (let i = 0; i < 9; i++) ctx.fillRect(i * 230, 520 - (i % 3) * 60, 180, 400);
  ctx.fillStyle = '#B5594A'; ctx.fillRect(0, 800, W, 300);
  // 想象：并肩走（气泡里）
  ctx.save(); rr(1080, 120, 700, 360, 60, 'rgba(255,255,255,.85)', C.ink, 5); circle(1120, 520, 22, 'rgba(255,255,255,.85)'); circle(1080, 570, 14, 'rgba(255,255,255,.85)');
  hero(1360, 420, 8, { e: 'happy', legs: t * 4, blush: true }); me(1520, 420, 8, { e: 'heart', blush: true, legs: t * 4 }); heart(1440, 220, 7, C.hot); txt('想像', 1170, 170, 36, { fill: C.gray });
  ctx.restore();
  // 现实：英雄在前面走，主角躲在电线杆后
  hero(lerp(700, 1000, lt / 3), 830, 11, { e: 'n', legs: t * 4, flip: true });
  ctx.fillStyle = '#5B3A2E'; ctx.fillRect(320, 300, 50, 530);
  me(330 + Math.sin(lt * 2) * 30, 830, 11, { e: 'heart', blush: true });
  txt('現実', 345, 260, 40, { fill: C.white });
  lyric(s.L, t);
};
// 放学后去社团：英雄抱着球跑远
F.club = (t, lt, s) => {
  grad('#9ED2FF', '#E6F4FF');
  rr(0, 640, W, 440, 0, '#7CC47F'); ctx.strokeStyle = C.white; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(960, 900, 200, 0, 7); ctx.stroke();
  rr(160, 260, 220, 400, 6, '#E9E4DC', C.ink, 6); txt('部活', 270, 330, 50, { fill: C.ink });
  const x = lerp(1500, 520, eIO(lt / 2.6));
  hero(x, 760, 13, { e: 'happy', legs: t * 8, flip: true, aL: 1 });
  circle(x - 140, 640 - Math.abs(Math.sin(t * 8)) * 60, 40, C.white); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x - 140, 640 - Math.abs(Math.sin(t * 8)) * 60, 40, 0, 7); ctx.stroke();
  me(1700, 780, 9, { e: 'n', blush: true });
  lyric(s.L, t);
};
// 我小声自言自语“明天见”
F.mataneSolo = (t, lt, s) => {
  grad('#F6C3B5', '#FCE6DD');
  me(960, 820, 22, { e: 'blink', blush: true, aR: Math.floor(lt * 3) % 2 });
  const k = clamp(lt / 2.7);
  txt('またね…', 1350, 420, lerp(70, 34, k), { fill: C.rose, a: 1 - k * 0.6, rot: 0.1 });
  txt('またね…', 1500, 300, lerp(50, 24, k), { fill: C.rose, a: 0.6 - k * 0.5, rot: 0.15 });
  txt('（小声）', 960, 280, 40, { fill: C.gray });
  // 远处的英雄背影越来越小
  hero(lerp(400, 160, k), 600, lerp(5, 2, k), { e: 'n', flip: true, legs: t * 4 });
  lyric(s.L, t);
};
// 放假也想见：日历狂翻，周末全是爱心
F.calendar = (t, lt, s) => {
  fill(C.peach); dots('rgba(255,255,255,.5)', 56, 8);
  const days = ['月', '火', '水', '木', '金', '土', '日'];
  for (let i = 0; i < 7; i++) {
    const x = 260 + i * 230, on = i >= 5, k = pop(lt - i * 0.12, 0.2);
    ctx.save(); ctx.translate(x, 420); ctx.scale(k, k);
    rr(-100, -140, 200, 280, 20, C.white, C.ink, 5); rr(-100, -140, 200, 70, 20, on ? C.hot : C.blue);
    ctx.restore();
    txt(days[i], x, 315, 44 * k, { fill: C.white });
    if (on && lt > 1.0) heart(x, 450, 14 * pop(lt - 1.0 - (i - 5) * 0.15, 0.2), C.hot); else if (k > 0.5) txt(String(10 + i), x, 450, 80 * k, { fill: C.ink });
  }
  me(1660, 880, 10, { e: lt > 1 ? 'heart' : 'n', blush: true });
  txt('会いたい', 760, 760, 90, { fill: C.white, stroke: C.hot, lw: 16, sc: pop(lt - 1.2, 0.2), a: lt > 1.2 ? 1 : 0 });
  lyric(s.L, t);
};
// 想打电话打到睡着
F.callSleep = (t, lt, s) => {
  fill(C.night); stars(t);
  rr(260, 640, 1400, 220, 30, '#7A6FB0'); rr(260, 600, 320, 120, 40, C.cream);
  me(520, 660, 10, { e: 'blink', blush: true, rot: -0.15 });
  rr(400, 620 - 10, 1220, 90, 40, '#C7B8FF');
  // 手机在枕边
  rr(700, 470, 160, 280, 24, C.ink); rr(712, 486, 136, 248, 16, '#4CC764'); hero(780, 640, 3.2, { e: 'sleepy' });
  const secs = Math.floor(lt * 3600 / 3);
  txt(`通話中 ${Math.floor(secs / 3600)}:${String(Math.floor(secs / 60) % 60).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, 780, 440, 34, { fill: C.lemon, mono: true });
  for (let i = 0; i < 4; i++) { const q = (lt * 0.7 + i / 4) % 1; txt('z', 600 + q * 200 + i * 40, 520 - q * 220, 40 + i * 12, { fill: C.white, a: 1 - q }); }
  ctx.fillStyle = '#F4E7B0'; ctx.beginPath(); ctx.arc(1550, 220, 90, 0, 7); ctx.fill(); ctx.fillStyle = C.night; ctx.beginPath(); ctx.arc(1590, 195, 82, 0, 7); ctx.fill();
  lyric(s.L, t);
};
// 一点勇气都没有：勇气电量 0%
F.courage = (t, lt, s) => {
  fill('#E9E3EE');
  const v = Math.max(0, 1 - lt / 1.2);
  rr(560, 260, 760, 340, 40, C.white, C.ink, 14); rr(1320, 360, 60, 140, 14, C.ink);
  rr(590, 290, 700 * v, 280, 24, v > 0.3 ? C.green : C.red);
  txt(`勇気 ${Math.round(v * 100)}%`, 940, 430, 96, { fill: v < 0.05 ? C.red : C.ink, a: v < 0.05 && Math.floor(t * 6) % 2 ? 0.3 : 1 });
  me(960, 900 + (v < 0.05 ? 0 : 0), lerp(12, 7, 1 - v), { e: v < 0.05 ? 'sad' : 'shock', blush: true, sweat: true });
  lyric(s.L, t);
};
// 真拿自己没办法：捂脸叹气
F.facepalm = (t, lt, s) => {
  grad('#D9D2E9', '#F4F0FA');
  me(960, 820, 24, { e: 'blink', aL: 1, aR: 1, sweat: true });
  for (let i = 0; i < 3; i++) { const q = (lt * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(160,150,180,${0.6 * (1 - q)})`; ctx.beginPath(); ctx.arc(1240 + q * 120, 500 - q * 80, 30 + q * 50, 0, 7); ctx.fill(); }
  txt('はぁ…', 1350, 360, 90, { fill: C.gray, sc: pop(lt - 0.2, 0.3) });
  lyric(s.L, t);
};
// 想让你回头：箭头全指向英雄，英雄差一点就回头
F.turnAround = (t, lt, s) => {
  grad('#FFE1EA', C.cream);
  const turn = Math.sin(lt * 2.6) * 0.5 + 0.5;
  hero(1250, 800, 20, { e: 'n', flip: turn < 0.6 });
  me(420, 820, 13, { e: 'heart', blush: true, aL: 1, aR: 1 });
  for (let i = 0; i < 5; i++) { const x = 650 + i * 110 + ((lt * 300) % 110); ctx.fillStyle = C.hot; ctx.beginPath(); ctx.moveTo(x, 640); ctx.lineTo(x + 50, 680); ctx.lineTo(x, 720); ctx.fill(); }
  txt('こっち向いて！', 700, 300, 100, { fill: C.white, stroke: C.hot, lw: 18, sc: 1 + kick(bfrac(t) * SPB, 8) * 0.06, rot: -0.04 });
  if (turn > 0.85) txt('!?', 1300, 470, 80, { fill: C.blue });
  lyric(s.L, t);
};
// 想让你注意到我：霓虹灯牌 NOTICE ME，英雄毫无察觉
F.noticeMe = (t, lt, s) => {
  fill('#1E1433');
  const on = Math.floor(t * 6) % 2;
  ctx.save(); ctx.shadowColor = C.hot; ctx.shadowBlur = on ? 40 : 10;
  rr(420, 160, 1080, 300, 30, null, on ? C.hot : '#7A2E4A', 14);
  txt('NOTICE ME', 960, 310, 150, { fill: on ? '#FFD1E0' : '#7A2E4A' });
  ctx.restore();
  me(560, 880, 13, { e: 'heart', blush: true, aL: 1, aR: 1 });
  hero(1360, 880, 14, { e: 'sleepy', flip: true });
  txt('…?', 1360, 640, 60, { fill: C.white, a: 0.7 });
  lyric(s.L, t);
};
// 喷了香水
F.perfume = (t, lt, s) => {
  grad(C.lav, '#FBE8FF');
  ctx.save(); ctx.translate(1300, 600); rr(-110, -100, 220, 300, 40, 'rgba(255,179,199,.8)', C.ink, 6); rr(-40, -170, 80, 70, 10, C.yellow, C.ink, 5); txt('LOVE', 0, 50, 46, { fill: C.white }); ctx.restore();
  const puffs = Math.floor(lt / 0.36);
  for (let i = 0; i <= puffs; i++) { const q = lt - i * 0.36; if (q < 0) continue; for (let j = 0; j < 10; j++) { const a = Math.PI + (rnd(i * 10 + j) - 0.5) * 1; const d = eOut(q / 0.8) * 500; ctx.fillStyle = `rgba(255,182,213,${0.6 * clamp(1 - q / 1.2)})`; ctx.beginPath(); ctx.arc(1300 + Math.cos(a) * d, 430 + Math.sin(a) * d * 0.6, 30 + q * 50, 0, 7); ctx.fill(); } }
  sparkles(800, 450, 250, t, C.white, 8);
  me(620, 820, 15, { e: 'blink', blush: true, aR: 1 });
  txt('シュッ', 1080, 300, 70, { fill: C.hot, rot: -0.2, sc: 1 + kick((lt % 0.36), 10) * 0.3 });
  lyric(s.L, t);
};
// 结果自己呛到
F.cough = (t, lt, s) => {
  fill('#E6D6F0');
  for (let i = 0; i < 18; i++) { ctx.fillStyle = `rgba(226,170,215,${0.55})`; ctx.beginPath(); ctx.arc(rnd(i) * W, rnd(i + 3) * 800 + Math.sin(t * 2 + i) * 30, 120 + rnd(i) * 100, 0, 7); ctx.fill(); }
  const c = Math.floor(lt / 0.36), ck = kick(lt % 0.36, 10);
  me(960 + Math.sin(t * 40) * 6 * ck, 820, 22, { e: 'squint', sq: ck * 0.2, sweat: true, color: '#D98F77' });
  ['ゴホッ', 'ケホッ', 'ゴホッ', 'ケホ…'].forEach((w, i) => { if (i <= c && i < 4) txt(w, [600, 1320, 700, 1260][i], [360, 320, 560, 560][i], 80, { fill: C.rose, stroke: C.white, lw: 14, rot: (i % 2 ? 1 : -1) * 0.15, sc: pop(lt - i * 0.36, 0.15) }); });
  lyric(s.L, t);
};
// 好想要你：伸长钳子，英雄在远处
F.wantYou = (t, lt, s) => {
  grad(C.hot, C.pink); floatHearts(t, 18, 'rgba(255,255,255,.6)');
  const reach = eOut(lt / 2);
  me(380, 820, 16, { e: 'heart', blush: true });
  ctx.fillStyle = C.orange; ctx.fillRect(500, 640, 200 + reach * 700, 50); ctx.fillRect(680 + reach * 700, 610, 90, 110);
  hero(1600, 820, 12, { e: 'shock', blush: true });
  const beat = kick(bfrac(t) * SPB, 8); softHeart(380, 420, 1.6 * (1 + beat * 0.3), C.white);
  lyric(s.L, t);
};
// 好想成为你的人：把自己包成礼物
F.giftBox = (t, lt, s) => {
  fill(C.lemon); rays(960, 520, t, 'rgba(255,95,143,.2)');
  const k = eOut(lt / 0.8);
  me(960, 760, 16, { e: 'heart', blush: true, a: 1 });
  ctx.save(); ctx.translate(960, 760 + (1 - k) * -600);
  rr(-260, -340, 520, 340, 20, 'rgba(255,95,143,.92)', C.ink, 6); ctx.fillStyle = C.lemon; ctx.fillRect(-30, -340, 60, 340); ctx.fillRect(-260, -200, 520, 50);
  ctx.restore();
  // 蝴蝶结 + 标签
  softHeart(960 - 70, 420 + (1 - k) * -600, 1, C.lemon); softHeart(960 + 70, 420 + (1 - k) * -600, 1, C.lemon);
  if (k > 0.9) { rr(1260, 420, 300, 120, 20, C.white, C.ink, 5); txt('for you♡', 1410, 480, 50, { fill: C.hot }); }
  hero(1650, 860, 9, { e: 'shock' });
  lyric(s.L, t);
};
// 明天一定要：日历圈出明天，燃起斗志
F.tomorrow = (t, lt, s) => {
  fill('#FFE4D6');
  rr(1100, 180, 560, 520, 30, C.white, C.ink, 8); rr(1100, 180, 560, 120, 30, C.red); txt('明日', 1380, 240, 60, { fill: C.white }); txt('★', 1380, 480, 220, { fill: C.hot });
  ctx.strokeStyle = C.red; ctx.lineWidth = 14; ctx.beginPath(); ctx.ellipse(1380, 470, 210, 170, 0, -1.4, -1.4 + eOut(lt / 0.6) * 6.3); ctx.stroke();
  for (let i = 0; i < 12; i++) { const q = (lt * 2 + i / 12) % 1; ctx.fillStyle = `rgba(255,${120 + i * 8},60,${1 - q})`; ctx.beginPath(); ctx.arc(520 + Math.sin(i * 2) * 150, 860 - q * 500, 40 * (1 - q) + 10, 0, 7); ctx.fill(); }
  me(520, 860, 16, { e: 'cool', aR: 1, sq: kick(lt % 0.72, 8) * 0.1 });
  txt('明日こそは！', 560, 300, 110, { fill: C.white, stroke: C.red, lw: 18, sc: pop(lt - 0.2, 0.2), rot: -0.06 });
  lyric(s.L, t);
};
// 在床上反复演练：告白模拟器跑了 99 次全失败（Claude 梗）
F.simulate = (t, lt, s) => {
  fill(C.night); stars(t);
  rr(200, 700, 900, 180, 30, '#7A6FB0'); rr(200, 660, 260, 110, 40, C.cream);
  me(640 + Math.sin(lt * 4) * 160, 720, 11, { e: 'squint', rot: Math.sin(lt * 4) * 0.4, blush: true });
  rr(1060, 120, 780, 600, 24, '#14121C', '#3A3945', 4);
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => circle(1095 + i * 28, 150, 9, c)); txt('confession.sim', 1450, 150, 22, { fill: '#AAA', mono: true, w: 700 });
  const n = Math.min(99, Math.floor(Math.pow(lt / 3, 1.6) * 99) + 1);
  for (let i = 0; i < 9; i++) { const id = n - 8 + i; if (id < 1) continue; const ok = id === 99; txt(`> 告白 #${String(id).padStart(2, '0')}  ${ok ? '…保存して寝る' : '✗ 失敗'}`, 1100, 220 + i * 54, 30, { fill: ok ? C.lemon : (i === 8 ? C.red : '#B07A8A'), align: 'left', mono: true, w: 400 }); }
  txt(`attempts: ${n}`, 1450, 680, 30, { fill: C.lemon, mono: true, w: 700 });
  lyric(s.L, t);
};
// 一边想着你：抱着印着英雄的枕头
F.pillow = (t, lt, s) => {
  fill(C.night); stars(t); floatHearts(t, 14, 'rgba(255,179,199,.6)', 50);
  ctx.fillStyle = '#F4E7B0'; ctx.beginPath(); ctx.arc(1550, 230, 110, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(900, 600); ctx.rotate(Math.sin(t * 1.5) * 0.08);
  rr(-260, -200, 520, 400, 120, C.white, C.pink, 10); hero(0, 140, 12, { e: 'cool', blush: true });
  ctx.restore();
  me(700, 840, 14, { e: 'heart', blush: true, aR: 1, rot: 0.2 });
  lyric(s.L, t);
};
// 明天见：关灯，心跳一闪
F.goodnight = (t, lt, s) => {
  fill('#120C24'); stars(t);
  const k = clamp(lt / 1.0);
  ctx.fillStyle = `rgba(255,214,120,${0.25 * (1 - k)})`; ctx.fillRect(-300, -300, W + 600, H + 600);
  me(960, 820, 16, { e: 'blink', blush: true });
  softHeart(960, 520, 1.4 * (1 + kick(lt % 0.72, 8) * 0.3), C.hot);
  lyric(s.L, t);
};
// 结尾卡
F.end = (t, lt) => {
  fill('#120C24'); stars(t);
  txt('好きだから。', 960, 430, 150, { fill: C.white, stroke: C.rose, lw: 24, a: clamp(lt / 0.5) });
  txt('『ユイカ』 · Claude MV', 960, 600, 40, { fill: C.pink, a: clamp((lt - 0.4) / 0.4), mono: true, w: 700 });
  me(860, 900, 9, { e: 'blink', blush: true }); hero(1060, 900, 9, { e: 'sleepy', flip: true });
  heart(960, 760 - Math.abs(Math.sin(t * 3)) * 20, 6, C.hot);
  if (t > DURATION - 1.2) { ctx.fillStyle = `rgba(0,0,0,${clamp((t - (DURATION - 1.2)) / 1.2)})`; ctx.fillRect(-300, -300, W + 600, H + 600); }
};
F.plain = (t, lt, s) => { grad(C.pink, C.cream); me(960, 760, 16, { e: 'heart', blush: true }); lyric(s.L, t); };

// ---------- 合成 ----------
function render(t) {
  NOW = t;
  let si = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].t0) si = i;
  const S = SHOTS[si], lt = t - S.t0;
  ctx = bctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
  PENDING = null;
  // 画面整体缩到 86%，靠上放，底部留给字幕
  ctx.save(); ctx.translate(W * 0.07, 14); ctx.scale(0.86, 0.86);
  (F[S.fn] || F.plain)(t, lt, S);
  ctx.restore();
  if (PENDING) drawLyric(...PENDING);
  ctx = mctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  // 镜头：缓慢漂移 + 每两拍轻推 + 入场
  const b = beatAt(t), punch = t > BEAT0 && t < END_START ? kick(((b / 2) - Math.floor(b / 2)) * SPB * 2, 8) * 0.018 : 0;
  const ent = 1 - eOut(lt / 0.22), mode = si % 3;
  let z = 1.03 + punch, dx = Math.sin(t * 0.7) * 14, dy = Math.cos(t * 0.9) * 8, rot = Math.sin(t * 0.5) * 0.006;
  if (mode === 0) z += ent * 0.12; else if (mode === 1) dx += ent * 300; else dx -= ent * 300;
  ctx.fillStyle = '#000'; ctx.fillRect(-300, -300, W + 600, H + 600);
  ctx.save(); if (ent > 0.05) ctx.filter = `blur(${(ent * 10).toFixed(1)}px)`;
  ctx.translate(W / 2 + dx, H / 2 + dy); ctx.rotate(rot); ctx.scale(z, z); ctx.drawImage(buf, -W / 2, -H / 2); ctx.restore();
  // 每句开头一层淡粉色闪光
  if (lt < 0.2 && si > 0) { ctx.fillStyle = `rgba(255,214,226,${0.55 * (1 - lt / 0.2)})`; ctx.fillRect(-300, -300, W + 600, H + 600); }
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(0, H - 6, W, 6); ctx.fillStyle = C.hot; ctx.fillRect(0, H - 6, W * t / DURATION, 6);
}

window.loadLyrics = async (src) => {
  setLyrics(src);
  for (let t = 0; t < DURATION; t += 0.05) render(t);
  const all = [...USED].join('');
  await document.fonts.load(`900 100px "Noto Sans JP"`, all);
  await document.fonts.load(`900 100px "Noto Sans SC"`, all);
  await document.fonts.ready;
  return DURATION;
};
window.frame = (t) => { render(t); return main.toDataURL('image/jpeg', 0.92); };

if (!/render=1/.test(location.search)) {
  const audio = new Audio(); let playing = false, t0 = 0, base = 0, ready = false;
  document.getElementById('song').onchange = e => { audio.src = URL.createObjectURL(e.target.files[0]); };
  document.getElementById('lrc').onchange = async e => { await window.loadLyrics(await e.target.files[0].text()); ready = true; };
  fetch('suki.lrc').then(r => r.text()).then(async s => { await window.loadLyrics(s); ready = true; }).catch(() => {});
  main.onclick = () => { playing = !playing; if (audio.src) { playing ? audio.play() : audio.pause(); } else if (playing) t0 = performance.now() / 1000 - base; };
  const loop = () => { if (playing) base = audio.src ? audio.currentTime : (performance.now() / 1000 - t0) % DURATION; if (ready) render(base); requestAnimationFrame(loop); };
  loop();
} else document.getElementById('bar').remove();
