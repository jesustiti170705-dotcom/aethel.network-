import { chromium } from 'playwright';
const [,, w, h, prefix] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, isMobile: +w < 800, hasTouch: +w < 800 });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8766/index.html');
await p.waitForTimeout(2500);
const vh = +h;
const segs = await p.evaluate(() => { let o=0; const out=[]; const S=[1.6,1.35,1.35,1.35,1.35,1.35,1.6]; S.forEach((s,i)=>{out.push(['dive',i,o,o+s]); o+=s; if(i<6){out.push(['conn',i,o,o+0.85]); o+=0.85;}}); return out; });
const shots = [];
for (const [k, i, a, z] of segs) shots.push([`${k}${i}_mid`, (a + z) / 2]);
shots.push(['seam_d0_end', segs[0][3] - 0.01], ['seam_c0_start', segs[1][2] + 0.01]);
for (const [name, at] of shots) {
  await p.evaluate(y => window.scrollTo(0, y), at * vh);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${prefix}_${name}.jpg`, quality: 70, type: 'jpeg' });
}
const info = await p.evaluate(() => [...document.querySelectorAll('video')].map(v => [v.src.slice(0,5), v.videoWidth, v.videoHeight, v.seekable.length ? +v.seekable.end(0).toFixed(2) : 0, +v.currentTime.toFixed(2)]));
console.log(JSON.stringify(info));
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(800);
await p.screenshot({ path: `${prefix}_dataroom.jpg`, quality: 70, type: 'jpeg', fullPage: false });
const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log('hscroll', overflow, 'errors', JSON.stringify(errs));
await b.close();
