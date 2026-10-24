import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'frontend/package.json'));
const { chromium } = require('@playwright/test');
const scenes = JSON.parse(await readFile(path.join(root, 'artifacts/demo/timing.json'), 'utf8'));
const out = path.join(root, 'artifacts/demo');
await mkdir(out, { recursive: true });
const base = process.env.DEMO_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: out, size: { width: 1440, height: 900 } }, reducedMotion: 'reduce' });
const page = await context.newPage();
const origin = performance.now();
await page.goto(base);
await page.getByText('100.0% paired coverage').waitFor();
const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const excerpts = {
  selection: ['backend/app/services/analytics.py', 'def decision_time(', 13],
  validation: ['backend/app/services/analytics.py', 'def normalize(', 25],
  metrics: ['backend/app/services/analytics.py', 'def metrics(', 25],
  pipeline: ['backend/app/services/elexon.py', 'async def fetch_all(', 22],
  cache: ['backend/app/services/repository.py', '    async def _refresh(', 24],
};
async function deck(scene) {
  let body = '';
  if (excerpts[scene.action]) {
    const [file, start, count] = excerpts[scene.action];
    const code = await readFile(path.join(root,file),'utf8');
    const lines = code.slice(code.indexOf(start)).split('\n').slice(0,count).join('\n');
    body = `<div class="file-label">${file}</div><pre>${escape(lines)}</pre>`;
  } else if (scene.action === 'architecture') {
    body = '<div class="flow"><div><b>01</b><h2>React + TypeScript</h2><p>Views · shared filters · charts · table</p></div><span>↓</span><div><b>02</b><h2>FastAPI contract</h2><p>Validated requests · typed responses · safe errors</p></div><span>↓</span><div><b>03</b><h2>Pure analytics + repository</h2><p>Vintage selection · alignment · metrics · caching</p></div><span>↓</span><div><b>04</b><h2>Elexon Insights</h2><p>FUELHH / WIND · WINDFOR vintages</p></div></div>';
  } else if (scene.action === 'api') {
    body = '<div class="columns"><div><h2>Frontend boundaries</h2><ul><li>components / shell, filters, charts, table</li><li>pages / four focused analytics views</li><li>hooks / abort superseded requests</li><li>services / typed API and CSV client</li><li>types + utils / contracts and formatting</li></ul></div><div><h2>REST /api</h2><ul><li>GET health · config · dashboard</li><li>GET actuals · forecasts · comparison</li><li>GET accuracy · summary · export</li><li>POST refresh · server-side token</li><li>One filter contract across all endpoints</li></ul></div></div>';
  } else if (scene.action === 'tests') {
    body = '<div class="columns"><div><h2>Business logic & reliability</h2><ul><li>Latest eligible vintage, exact cutoff inclusive</li><li>No hindsight or cross-hour fill</li><li>Known errors and quantitative metrics</li><li>Nulls, zeros, conflicts, invalid timestamps</li><li>Cache fallback and failed-refresh recovery</li><li>Real Elexon snapshot API integration</li></ul></div><div><h2>Product verification</h2><ul><li>TypeScript production build</li><li>Critical component and filter tests</li><li>API-connected browser interactions</li><li>Mobile layout and navigation</li><li>WCAG contrast and semantics checks</li><li>Patched dependency audits</li></ul></div></div>';
  } else if (scene.action === 'deployment') {
    body = '<div class="columns"><div><h2>Docker Compose</h2><ul><li>Non-root Python backend</li><li>Unprivileged Nginx frontend</li><li>Same-origin /api proxy</li><li>Health-gated startup and cache volume</li><li>Runtime verification pending Docker engine</li></ul></div><div><h2>Vercel + submission</h2><ul><li>Python entrypoint + React production build</li><li>Real snapshot packaged for cold starts</li><li>Server-only refresh token</li><li>GitHub / Vercel publication needs account access</li><li>YouTube unlisted upload and URL checks remain</li></ul></div></div>';
  } else {
    body = '<div class="closing"><span>WINDWARD / PILOT 01</span><h2>Professional product.<br/>Inspectable assumptions.<br/>Reproducible evidence.</h2><p>Real Elexon data · React + Python · Explicit day-ahead logic</p><p class="small">Public repository, deployment and unlisted video links must be verified before submission.</p></div>';
  }
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="UTF-8"><style>*{box-sizing:border-box}body{margin:0;background:#f4f7f1;color:#234631;font-family:Arial,sans-serif;padding:45px 65px}.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #d9e3d1;padding-bottom:22px;color:#557945;font-size:13px;letter-spacing:2px}.brand{font-size:26px;font-weight:700;letter-spacing:-1px;color:#163d32}.eyebrow{font-size:11px;letter-spacing:2px;color:#688052;margin-top:28px}h1{font-size:35px;letter-spacing:-1px;margin:15px 0 24px;font-weight:600}.file-label{font-family:Consolas,monospace;background:#e4edd9;color:#476a36;font-size:14px;padding:12px 18px;border-radius:5px 5px 0 0}pre{margin:0;background:#123d36;color:#ebf3e4;padding:24px 28px;font:16px/1.55 Consolas,monospace;white-space:pre-wrap;overflow:hidden;height:565px;border-radius:0 0 6px 6px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:40px}.columns>div{border:1px solid #dce6d2;background:#fff;padding:30px;min-height:420px;border-radius:6px}h2{font-size:23px;letter-spacing:-.5px}li{margin:22px 0;font-size:17px;line-height:1.6;color:#5c7650}ul{padding-left:20px}.flow{max-width:900px;margin:auto;display:flex;flex-direction:column;align-items:center}.flow>div{width:100%;background:#fff;border:1px solid #dbe5d2;padding:15px 25px;border-radius:5px;display:flex;align-items:center;gap:25px}.flow h2{font-size:19px;margin:0}.flow p{font-size:15px;color:#718560;margin:0 0 0 auto}.flow b{color:#9ab47d;font-size:16px}.flow>span{font-size:24px;color:#8ba575;padding:4px}.closing{background:#123d36;color:#d3e5ae;padding:45px 55px;border-radius:7px;margin-top:35px}.closing>span{font-size:12px;letter-spacing:2px}.closing h2{font-size:45px;font-weight:500;line-height:1.45;color:white;margin:25px 0}.closing p{font-size:19px;line-height:1.7}.closing .small{font-size:14px;color:#b7cdb0;margin-top:30px}</style></head><body><div class="top"><span class="brand">windward.</span><span>PART 02 / TECHNICAL REVIEW</span></div><div class="eyebrow">IMPLEMENTATION & ENGINEERING DECISIONS</div><h1>${escape(scene.title)}</h1>${body}</body></html>`);
}
async function showOverview() {
  if (!page.url().startsWith(base)) await page.goto(base);
  await page.getByRole('link',{name:'Overview',exact:true}).click();
  await page.getByText('100.0% paired coverage').waitFor();
  await page.evaluate(() => window.scrollTo(0,0));
}
for (const scene of scenes) {
  const action = scene.action;
  if (scene.part === 2) await deck(scene);
  else if (action === 'overview' || action === 'kpis') await showOverview();
  else if (action === 'chart') {
    await page.locator('.forecast-panel').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.querySelector('.forecast-panel').getBoundingClientRect().top + window.scrollY - 60));
    const box = await page.locator('.generation-chart').boundingBox();
    await page.mouse.move(box.x+box.width*.62,box.y+box.height*.4);
  } else if (action === 'error') {
    await page.mouse.move(20,20);
    await page.locator('.error-panel').scrollIntoViewIfNeeded();
  } else if (action === 'filter') {
    await page.evaluate(() => window.scrollTo(0,0));
    await page.getByRole('button',{name:'1D',exact:true}).click();
    await page.getByText('48 matched intervals').waitFor();
    await page.getByRole('button',{name:'Decision settings'}).click();
  } else if (action === 'accuracy') {
    await page.getByRole('button',{name:'Reset',exact:true}).click();
    await page.getByText('1,488 matched intervals').waitFor();
    await page.getByRole('link',{name:'Accuracy analysis',exact:true}).click();
    await page.getByRole('heading',{name:'MAPE',exact:true}).waitFor();
  } else if (action === 'breakdowns') {
    await page.locator('.breakdown-chart').first().scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0,180));
  } else if (action === 'table') {
    await page.getByRole('link',{name:'Forecast analysis',exact:true}).click();
    await page.getByLabel('Search delivery or publication date').fill('2026-01-10');
    await page.getByRole('button',{name:'Abs. error MW',exact:true}).click();
    await page.locator('.table-panel').scrollIntoViewIfNeeded();
  } else if (action === 'methodology') {
    await page.getByRole('link',{name:'Data & methodology',exact:true}).click();
    await page.locator('.methodology .two-column').scrollIntoViewIfNeeded();
  }
  await page.evaluate(({part,title,id}) => {
    document.getElementById('demo-label')?.remove();
    const el=document.createElement('div'); el.id='demo-label';
    el.style.cssText='position:fixed;bottom:14px;left:245px;right:24px;z-index:200;background:#123d36f5;border:1px solid #d1e29e66;padding:13px 20px;border-radius:5px;color:#f1f7e8;display:flex;justify-content:space-between;align-items:center;font:14px Arial,sans-serif;box-shadow:0 4px 25px #0002;pointer-events:none';
    el.innerHTML=`<span style="color:#c6df93;font-size:10px;letter-spacing:1.7px">PART 0${part} · ${part === 1 ? 'CUSTOMER DEMO' : 'TECHNICAL REVIEW'}</span><strong style="font-weight:500">${title}</strong><span style="font-size:10px;color:#b9ccab">${id} / 20</span>`;
    document.body.appendChild(el);
  },scene);
  // Let a frame settle, then record the scene's exact cut points for muxing.
  await page.waitForTimeout(350);
  scene.video_start = (performance.now()-origin)/1000;
  await page.screenshot({ path:path.join(out,`${scene.id}.png`) });
  console.log(`Recording ${scene.id}: ${scene.title} (${scene.duration_seconds.toFixed(1)}s)`);
  await writeFile(path.join(out,'recording-timeline.json'),JSON.stringify(scenes,null,2));
  await page.waitForTimeout(scene.duration_seconds*1000);
}
await page.waitForTimeout(700);
const video = page.video();
await context.close();
await video.saveAs(path.join(out,'walkthrough.webm'));
await browser.close();
console.log('Demo recording complete: artifacts/demo/walkthrough.webm');
