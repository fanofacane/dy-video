// 用法：node render.cjs [out.mp4]        渲染整段视频
//      node render.cjs --shots 1,8,20   只截几张图检查
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('PAGE ERROR', e));
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render=1');
  await page.evaluate(() => window.ready);
  const dur = await page.evaluate(() => window.DURATION);

  if (args[0] === '--shots') {
    const dir = args[2] || 'shots';
    fs.mkdirSync(dir, { recursive: true });
    for (const t of args[1].split(',').map(Number)) {
      const b64 = await page.evaluate(t => window.frame(t), t);
      fs.writeFileSync(path.join(dir, `t${t.toFixed(2)}.jpg`), Buffer.from(b64.split(',')[1], 'base64'));
    }
  } else {
    const out = args[0] || 'claude-mv-apt.mp4';
    const fps = +(process.env.FPS || 30);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(dur * fps);
    for (let f = 0; f < n; f++) {
      const b64 = await page.evaluate(t => window.frame(t), f / fps);
      if (!ff.stdin.write(Buffer.from(b64.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log(`frame ${f}/${n}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('done ->', out);
  }
  await browser.close();
})();
