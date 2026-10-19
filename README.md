# Claude MV · APT.

《APT.》前半首（约 1:40）的 Claude 像素小螃蟹 MV。画面用 Canvas 逐帧绘制，镜头按歌词切分并对齐 149 BPM 的鼓点。

- `index.html` / `mv.js`：动画本体（浏览器打开可预览，可选择歌词和歌曲同步播放）
- `render.cjs`：Playwright 逐帧渲染 + ffmpeg 合成 1080p30 视频（`START` / `END` 可只渲染一段）
- `tools/sfx.py`：合成 0–6.46s 的 8-bit 开场音效和鼓点，并在“GAME START”那一拍接入原曲

需要自备的文件（不在仓库里）：歌词 `APT_.lrc`、歌曲 mp3（原文件前 8.18s 是广告，脚本会跳过）。

```bash
# 1. 渲染画面
NODE_PATH=$(npm root -g) node render.cjs claude-mv-apt.mp4
# 2. 生成音轨：音效开场 + 原曲
ffmpeg -i APT_.mp3 -ac 2 -ar 44100 -f s16le song44.raw
python3 tools/sfx.py song44.raw 100.5 full.wav
# 3. 合成
ffmpeg -i claude-mv-apt.mp4 -i full.wav -map 0:v -map 1:a -c:v libx264 -crf 26 -af "afade=t=out:st=98:d=2.5" -c:a aac -shortest final.mp4
```

字体：Noto Sans SC / KR（SIL OFL）。原曲：ROSÉ & Bruno Mars《APT.》，非官方二创。
