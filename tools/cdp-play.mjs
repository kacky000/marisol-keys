// Plays the game headlessly through the Chrome DevTools Protocol to catch runtime errors:
//   node tools/cdp-play.mjs <script.json> <outdir>
// script.json: [{ "eval": "js" } | { "wait": ms } | { "keys": ["KeyW"], "ms": 2000 } | { "shot": "name" }]
// Needs `node serve.ts --port 8137` running. Prints console errors, exceptions and eval results.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [scriptPath, outDir = 'cdp-out', query = ''] = process.argv.slice(2);
const steps = JSON.parse(readFileSync(scriptPath, 'utf8'));
mkdirSync(outDir, { recursive: true });
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 400);
const proc = spawn(chrome, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cdp-'))}`, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
}

async function main() {
  let target;
  for (let k = 0; k < 50 && !target; k++) {
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = list.find((t) => t.type === 'page'); } catch { await sleep(200); }
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result || msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) console.log('CONSOLE', msg.params.type, msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `http://localhost:8137/index.html${query}` });
  await sleep(6000);
  for (const st of steps) {
    if (st.wait) await sleep(st.wait);
    if (st.eval) {
      const r = await send('Runtime.evaluate', { expression: st.eval, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) console.log('EVAL-ERROR', r.exceptionDetails.exception?.description);
      else if (r.result && r.result.value !== undefined) console.log('EVAL', JSON.stringify(r.result.value).slice(0, 600));
    }
    if (st.keys) {
      for (const k of st.keys) await send('Runtime.evaluate', { expression: `dispatchEvent(new KeyboardEvent('keydown', { code: '${k}' }))` });
      await sleep(st.ms || 1000);
      for (const k of st.keys) await send('Runtime.evaluate', { expression: `dispatchEvent(new KeyboardEvent('keyup', { code: '${k}' }))` });
    }
    if (st.pause) {
      // break into a stuck page and print where it is spinning
      ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.method === 'Debugger.paused') {
          for (const f of msg.params.callFrames.slice(0, 8)) console.log('FRAME', f.functionName, f.url.split('/').slice(-2).join('/'), f.location.lineNumber + 1);
        }
      });
      await send('Debugger.enable');
      send('Debugger.pause');
      await sleep(3000);
    }
    if (st.shot) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(outDir, `${st.shot}.png`), Buffer.from(r.data, 'base64'));
      console.log('SHOT', st.shot);
    }
  }
  proc.kill();
  process.exit(0);
}
main().catch((e) => { console.error(e); proc.kill(); process.exit(1); });
