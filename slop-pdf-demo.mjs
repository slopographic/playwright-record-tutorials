#!/usr/bin/env node
// Slop PDF walkthrough, driven in a visible browser on your own computer so OBS can record the screen.
//
// Setup (once):
//   npm install playwright
//   npx playwright install chromium
// Run:
//   node slop-pdf-demo.mjs ./sample.pdf
//   node slop-pdf-demo.mjs ./sample.pdf https://slopographic.com/pdf/     (the default URL)
//
// Start OBS (Display capture or Window capture, 1920x1080, 30 or 60 fps) just before you run it.
// Each step is printed as it starts, so you can follow the cues or cut the clip later.
// Use a PDF with a line that reads "Goo spreads faster on tile" and a word "tries" on the next page,
// or change the TEXT constants below to match your file.
import { chromium } from 'playwright';
import path from 'node:path';

const [pdfArg, urlArg] = process.argv.slice(2);
if (!pdfArg) { console.error('Usage: node slop-pdf-demo.mjs <file.pdf> [url]'); process.exit(1); }
const PDF = path.resolve(pdfArg);
const URL_ = urlArg || 'https://slopographic.com/pdf/';
const LINE = 'Goo spreads faster on tile';
const WORD_CONTEXT = 'however hard it tries';
const WORD = 'tries';
const PAUSE = 1200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = (n, title) => console.log(`step ${n}: ${title}`);

// CHROME_PATH is optional: set it to a Chrome or Chromium binary to use that instead of Playwright's own.
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME_PATH || undefined, args: ['--start-maximized'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 }, acceptDownloads: false });
const page = await ctx.newPage();

// Move the pointer in a smooth curve: many small steps, so the motion looks natural on screen.
async function glide(locator) {
  const box = await locator.first().boundingBox();
  if (!box) throw new Error('no box for target');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 40 });
  await sleep(250);
}
async function click(locator) {
  await glide(locator);
  await page.mouse.down(); await sleep(90); await page.mouse.up();
}
async function openTool(tool) {
  await click(page.locator(`.rail-b[data-tool="${tool}"]`));
  await page.waitForFunction((t) => document.querySelector('.rail-b.on')?.dataset.tool === t, tool, { timeout: 5000 });
}
async function wordBox(context, word) {
  return page.evaluate(([c, w]) => {
    const span = [...document.querySelectorAll('#viewer span')].find((s) => s.textContent.includes(c));
    if (!span || !span.firstChild || span.firstChild.nodeType !== 3) return null;
    const idx = span.textContent.indexOf(w);
    const rg = document.createRange(); rg.setStart(span.firstChild, idx); rg.setEnd(span.firstChild, idx + w.length);
    const r = rg.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, x1: r.left + 2, x2: r.right - 2 };
  }, [context, word]);
}

step(1, 'Open Slop PDF. Nothing is uploaded, and the file never leaves your device.');
await page.goto(URL_, { waitUntil: 'load' });
await sleep(2500);

step(2, 'Open the sample PDF');
await page.locator('#pdfDrop input[type=file]').setInputFiles(PDF);
await page.waitForFunction(() => document.querySelectorAll('.thumb').length >= 2, null, { timeout: 60000 });
await sleep(PAUSE);

step(3, 'Open a page and zoom in');
await click(page.locator('.thumb').first());
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.getElementById('app').dataset.mode === 'page', null, { timeout: 15000 });
await sleep(PAUSE);
const viewer = await page.locator('#viewer').boundingBox();
await page.mouse.move(viewer.x + viewer.width / 2, viewer.y + viewer.height * 0.3, { steps: 30 });

await sleep(PAUSE);

step(4, 'Select a line of text and press Highlight');
const line = await page.evaluate((c) => {
  const span = [...document.querySelectorAll('#viewer span')].find((s) => s.textContent.includes(c));
  if (!span) return null;
  const r = span.getBoundingClientRect();
  return { x1: r.left + 2, x2: r.right - 2, y: r.top + r.height / 2 };
}, LINE);
if (!line) throw new Error(`line "${LINE}" not found on the page`);
await page.mouse.move(line.x1, line.y, { steps: 30 });
await page.mouse.down();
await page.mouse.move(line.x2, line.y, { steps: 60 });
await page.mouse.up();
await page.locator('.selbar-btn[data-act="highlight"]').first().waitFor({ state: 'visible', timeout: 10000 });
await sleep(600);
await click(page.locator('.selbar-btn[data-act="highlight"]').first());
await sleep(PAUSE);

step(5, 'Edit text: double-click a word, type a new one, press Enter');
await page.keyboard.press('Control+e');
await sleep(800);
const word = await wordBox(WORD_CONTEXT, WORD);
if (!word) throw new Error(`word "${WORD}" not found`);
await page.mouse.move(word.x, word.y, { steps: 30 });
await page.mouse.dblclick(word.x, word.y);
const runInput = page.locator('.edit-run');
await runInput.waitFor({ state: 'visible', timeout: 10000 });
await sleep(700);
await runInput.evaluate((el, w) => { el.focus(); const i = el.value.indexOf(w); el.setSelectionRange(i, i + w.length); }, WORD);
await sleep(500);
await page.keyboard.type('persists', { delay: 90 });
await sleep(400);
await page.keyboard.press('Enter');
await sleep(PAUSE);
await page.keyboard.press('Control+e');
await sleep(PAUSE);

step(6, 'Open the Fonts panel from the top bar, then close it');
await click(page.locator('#btnFonts'));
await sleep(PAUSE + 500);
await click(page.locator('.sf-ov button.pri', { hasText: 'Close' }).first());
await page.waitForFunction(() => !document.querySelector('.sf-ov'), null, { timeout: 5000 });
await sleep(PAUSE);

step(7, 'Open Convert: Word, Excel and PowerPoint');
await openTool('convert');
await page.waitForFunction(() => document.querySelector('#props')?.innerText.includes('Word (.docx)'), null, { timeout: 10000 });
await sleep(PAUSE);
for (const name of [/Word \(\.docx\)/, /Excel/, /PowerPoint/]) {
  await glide(page.locator('#props button', { hasText: name }).first());
  await sleep(1000);
}

step(8, 'The Tools rail: open OCR');
await openTool('ocr');
await sleep(PAUSE + 300);

step(9, 'Open the Layers panel');
await openTool('edit');
await sleep(900);
await glide(page.locator('#props').getByText('Layers', { exact: true }).first());
await sleep(PAUSE + 800);

step(10, 'Organize: drag a page to a new position');
await openTool('organize');
await page.waitForFunction(() => document.querySelectorAll('.thumb').length >= 2, null, { timeout: 10000 });
await sleep(PAUSE);
const thumbs = page.locator('.thumb');
await glide(thumbs.nth(0));
await page.mouse.down();
await sleep(150);
const target = await thumbs.nth(1).boundingBox();
await page.mouse.move(target.x + target.width * 0.8, target.y + target.height / 2, { steps: 50 });
await sleep(400);
await page.mouse.up();
await page.waitForFunction(() => !document.body.classList.contains('is-dragging'), null, { timeout: 5000 });
await sleep(PAUSE + 500);

step(11, 'Redact a word: Redact in the selection bar, then Apply redactions');
try {
await click(thumbs.nth(1));
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.getElementById('app').dataset.mode === 'page', null, { timeout: 15000 });
await sleep(PAUSE);
const tries = await wordBox('persists', 'persists');
if (!tries) throw new Error('word "persists" not found for redaction');
await page.mouse.move(tries.x1, tries.y, { steps: 30 });
await page.mouse.down();
await page.mouse.move(tries.x2, tries.y, { steps: 40 });
await page.mouse.up();
await sleep(900);
await click(page.locator('.selbar-btn[data-act="redact"]').first());
await sleep(1200);
await openTool('redact');
await click(page.getByRole('button', { name: /Apply redactions/ }).first());
await click(page.getByRole('button', { name: 'Redact permanently' }));
await page.waitForFunction(() => !document.querySelector('.rd-confirm'), null, { timeout: 10000 }).catch(() => {});
await sleep(4000);
} catch (e) { console.log('step 11 skipped:', e.message); }

step(12, 'Done. Stop the OBS recording.');
await sleep(4000);
await browser.close();
