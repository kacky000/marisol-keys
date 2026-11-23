// Captures shots through the Chrome DevTools Protocol: a fixed 1280x720 viewport, waits until the
// page's title says shot-ready, then saves a PNG.
//   node tools/cdp-shot.mjs "<query>" <out.png>
// Needs `node serve.ts --port 8137` running.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [query, out] = process.argv.slice(2);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9700 + Math.floor(Math.random() * 200);
const proc = spawn(chrome, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shot-'))}`, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });

async function main() {
  let target;
  for (let k = 0; k < 60 && !target; k++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { await sleep(250); }
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result || msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', msg.params.exceptionDetails.exception?.description);
  });
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://localhost:8137/index.html${query}` });
  const t0 = Date.now();
  for (;;) {
    await sleep(1000);
    const r = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true });
    if (String(r.result?.value).startsWith('shot-ready')) break;
    if (Date.now() - t0 > 240000) { console.log('TIMEOUT'); break; }
  }
  await sleep(800);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(out, `${((Date.now() - t0) / 1000).toFixed(0)}s`);
  proc.kill();
  process.exit(0);
}
main().catch((e) => { console.error(e); proc.kill(); process.exit(1); });
