# Claude MV · APT.

仿“Claude MV”风格的《APT.》歌词动画：像素小螃蟹按每句歌词的意思表演，歌词逐词跟唱出现，“아파트”段每唱一声盖一层公寓楼。

- `index.html` / `mv.js`：Canvas 动画；浏览器打开后选择歌词文件（和歌曲）即可同步预览
- `render.cjs`：Playwright 逐帧渲染 + ffmpeg 合成 1080p30 视频
- 歌词文件 `APT_.lrc` 不在仓库里，渲染前放到项目根目录（或用 `LRC=路径` 指定）

```bash
NODE_PATH=$(npm root -g) node render.cjs claude-mv-apt.mp4
```

成片无音频，配原曲从 0:00 对齐。字体：Noto Sans SC / KR（SIL OFL）。原曲：ROSÉ & Bruno Mars《APT.》，非官方二创。
