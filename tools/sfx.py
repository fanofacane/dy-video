# 0–6.46s 开场音效：全部用代码合成（8-bit 游戏风），并在 IB(1) 接入原曲
import numpy as np, sys, wave
SR = 44100
SPB = 60 / 149; BEAT0 = 6.866
IB = lambda n: BEAT0 - n * SPB
LEN = float(sys.argv[2]) if len(sys.argv) > 2 else 7.6
out = np.zeros(int(SR * 8.0))
rng = np.random.default_rng(7)

def add(sig, t, vol=1.0):
    i = int(t * SR); n = min(len(sig), len(out) - i)
    if n > 0: out[i:i + n] += sig[:n] * vol
def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.003, decay=8.0):
    x = tt(d); return np.minimum(1, x / a) * np.exp(-x * decay)
def sweep(f0, f1, d, kind='sine', curve=1.0):
    x = tt(d); f = f0 + (f1 - f0) * (x / d) ** curve; ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == 'square': return np.sign(np.sin(ph))
    if kind == 'tri': return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph)
def tone(f, d, kind='square', decay=8.0, a=0.003): return sweep(f, f, d, kind) * env(d, a, decay)
def noise(d): return rng.uniform(-1, 1, int(d * SR))
def lowpass(x, k):  # 简单滑动平均
    k = max(1, int(k)); c = np.cumsum(np.insert(x, 0, 0)); y = (c[k:] - c[:-k]) / k; return np.concatenate([y, np.zeros(k - 1)])
def highpass(x): return np.diff(x, prepend=0)

# 鼓
def kick(): d = 0.35; return sweep(160, 42, d, curve=0.35) * env(d, 0.001, 9) * 1.1
def snare(): d = 0.18; return (lowpass(noise(d), 3) * 0.8 + sweep(220, 160, d) * 0.4) * env(d, 0.001, 22)
def hat(): d = 0.05; return highpass(noise(d)) * env(d, 0.0005, 70) * 0.5
def boom(): d = 0.9; return sweep(90, 30, d, curve=0.5) * env(d, 0.001, 4) * 1.2 + lowpass(noise(d), 8) * env(d, 0.001, 10) * 0.6
def whoosh(d, up=True):
    n = noise(d); x = tt(d); e = np.sin(np.pi * x / d) ** 2
    lo = lowpass(n, 30); hi = n - lowpass(n, 6)
    mix = (x / d) if up else (1 - x / d)
    return (lo * (1 - mix) + hi * mix) * e
def crack(): d = 0.5; n = noise(d); return (n * env(d, 0.0005, 14) + lowpass(n, 2) * env(d, 0.01, 4) * 0.5)
def chord(fs, d, kind='square', decay=5): return sum(tone(f, d, kind, decay) for f in fs) / len(fs)

N = {'C5': 523.25, 'E5': 659.25, 'G5': 783.99, 'B5': 987.77, 'C6': 1046.5, 'E6': 1318.5, 'G6': 1568.0, 'C7': 2093.0, 'G4': 392.0, 'C4': 261.6, 'E4': 329.6}

# ---- 0–1.4 投币 ----
add(sweep(3000, 120, 0.18, curve=0.4) * env(0.18, 0.001, 6) * 0.5 + highpass(noise(0.18)) * env(0.18, 0.001, 20) * 0.3, 0.0)   # 电视开机
add(sweep(300, 900, 0.12, 'tri') * env(0.12, 0.002, 12), 0.45, 0.5)                                                             # 螃蟹睁眼
add(whoosh(0.6, True), 0.62, 0.35)                                                                                               # 金币飞
add(tone(N['B5'], 0.08, 'square', 30), IB(14), 0.35); add(tone(N['E6'], 0.5, 'square', 6), IB(14) + 0.08, 0.35)                 # 投币“叮”
for i, f in enumerate([N['C5'], N['E5'], N['G5'], N['C6']]): add(tone(f, 0.12, 'square', 14), IB(14) + 0.16 + i * 0.05, 0.18)  # PLAYER 1 READY
# ---- 1.4–2.84 选角色：每跳一下“嘀” ----
step = (IB(11) - 1.4) / 15
for k in range(1, 16):
    add(tone([880, 660, 990, 740][k % 4], 0.04, 'square', 50), 1.4 + k * step, 0.22)
add(sweep(1200, 300, 0.25, 'square') * env(0.25, 0.002, 8), IB(11), 0.25)                                                     # 选中“?”
add(whoosh(0.4, True), IB(10) - 0.4, 0.5)
# ---- 2.84–4.05 VS ----
add(boom(), IB(10), 0.9); add(crack(), IB(10) + 0.02, 0.5)
add(chord([N['C4'], N['E4'], N['G4']], 0.3, 'square', 7), IB(10) + 0.08, 0.25)
add(boom(), IB(9), 0.8); add(chord([N['C5'], N['E5'], N['G5']], 0.35, 'square', 6), IB(9), 0.25)                               # RANDOM
add(boom(), IB(8), 0.8); add(chord([N['E5'], N['G5'], N['C6']], 0.35, 'square', 6), IB(8), 0.25)                               # GAME
# ---- 4.05–5.66 匹配：转轮越转越慢的咔哒声 ----
lock = IB(4) - IB(7); prev = 0
for i in range(1, 3000):
    lt = i / 1000 * lock / 3
    if lt >= lock: break
    k = lt / lock; pos = (1 - (1 - k) ** 3) * 23
    if int(pos) > prev: prev = int(pos); add(highpass(noise(0.02)) * env(0.02, 0.0005, 120) + tone(1800, 0.02, 'square', 120) * 0.3, IB(7) + lt, 0.35)
for i, f in enumerate([N['C6'], N['E6'], N['G6'], N['C7']]): add(tone(f, 0.25, 'tri', 8), IB(4) + i * 0.04, 0.3)              # MATCH!
add(boom(), IB(4), 0.6)
# ---- 5.66–6.46 来电铃声 ----
for b in [IB(3), IB(2)]:
    for i, f in enumerate([N['E5'], N['G5'], N['B5'], N['E6'], N['B5'], N['E6']]): add(tone(f, 0.18, 'sine', 10) + tone(f * 2, 0.18, 'sine', 18) * 0.3, b + i * SPB / 6, 0.3)
# ---- 节拍：从 VS 开始底鼓，越往后越密，最后军鼓滚奏推进原曲 ----
for n in range(10, 1, -1): add(kick(), IB(n), 0.7)
for n in range(7, 1, -1):
    for h in range(2): add(hat(), IB(n) + h * SPB / 2, 0.6)
roll_s, roll_e = IB(3), IB(1)
x = roll_s; i = 0
while x < roll_e - 0.01:
    prog = (x - roll_s) / (roll_e - roll_s)
    add(snare(), x, 0.25 + 0.45 * prog)
    x += SPB / (2 if prog < 0.5 else 4); i += 1
add(whoosh(roll_e - roll_s, True), roll_s, 0.45)                                                                            # 上扬的噪声

# 归一化
sfx = out[:int(IB(1) * SR)]
sfx = sfx / (np.abs(sfx).max() + 1e-9)
sfx = np.tanh(sfx * 2.8) * 0.88   # 提响 + 软限幅，接近原曲响度

# 接入原曲：原曲从 IB(1) 开始，对齐视频时间
song = np.frombuffer(open(sys.argv[1], 'rb').read(), dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
OFF = 8.1815
cut = int(IB(1) * SR)
total = int(LEN * SR)
mix = np.zeros((total, 2))
mix[:len(sfx), 0] += sfx; mix[:len(sfx), 1] += sfx
seg = song[int((OFF + IB(1)) * SR): int((OFF + LEN) * SR)]
fade = int(0.012 * SR); ramp = np.linspace(0, 1, fade)[:, None]
seg = seg.copy(); seg[:fade] *= ramp
mix[cut:cut + len(seg)] += seg
mix = np.clip(mix, -1, 1)
with wave.open(sys.argv[3], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok', LEN, 'cut at', round(IB(1), 3))
