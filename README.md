# Claude MV · APT.

仿“Claude MV”风格的《APT.》二创动画（像素小螃蟹 + 动态大字），时间轴对齐原曲歌词。

- `index.html` / `mv.js`：Canvas 动画，浏览器打开可预览（可选择歌曲文件同步播放）
- `render.cjs`：用 Playwright 逐帧渲染并用 ffmpeg 合成 1080p30 视频
- `claude-mv-apt-small.mp4`：渲染好的无声成片，配原曲从 0:00 对齐

```bash
NODE_PATH=$(npm root -g) node render.cjs claude-mv-apt.mp4
```

字体：Noto Sans SC（SIL OFL）。原曲：ROSÉ & Bruno Mars《APT.》，本项目为非官方二创，不含音频。
