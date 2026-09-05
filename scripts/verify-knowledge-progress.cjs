const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.AIMASTER_URL || 'http://127.0.0.1:8787';
const output = path.resolve('.local/browser-evidence');
fs.mkdirSync(output, { recursive: true });

async function canvasPixels(page) {
  return page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
    const gl = document.querySelector('#space').getContext('webgl2') || document.querySelector('#space').getContext('webgl');
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let visible = 0;
    let fingerprint = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 70) visible++;
      fingerprint = (fingerprint + pixels[i] * (i % 127 + 1) + pixels[i + 2]) >>> 0;
    }
    resolve({ visible, fingerprint });
  })));
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const report = { checks: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => report.errors.push(error.message));
    let completed = true;
    await page.route('**/api/state', route => route.fulfill({ json: { ok: true, state: { progress: completed ? { 'llm-basics': { completedAt: '2026-09-05T10:00:00.000Z' } } : {} } } }));
    await page.goto(base + '/frontend/knowledge-stars/');
    await page.waitForFunction(() => document.querySelector('#completedCount').textContent === '3');
    assert.equal(await page.locator('#progressSignal').textContent(), '本机学习档案已同步');
    assert.equal(await page.locator('#galaxyTitle').evaluate(node => getComputedStyle(node).opacity), '0');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      const first = await canvasPixels(page);
      await page.waitForTimeout(150);
      const second = await canvasPixels(page);
      assert(second.visible > 100, 'Star canvas has visible pixels at ' + width);
      assert.notEqual(first.fingerprint, second.fingerprint, 'Star canvas moves at ' + width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(output, 'knowledge-progress-' + width + '.png') });
      report.checks.push({ name: 'linked-progress-and-canvas', width, ...second });
    }
    completed = false;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(() => document.querySelector('#completedCount').textContent === '0');
    report.checks.push({ name: 'return-to-page-refreshes-cleared-progress' });
    await page.route('**/api/state', route => route.fulfill({ status: 404, body: 'Not found' }));
    await page.reload();
    await page.waitForSelector('#loading.hide', { state: 'attached' });
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#progressSignal').textContent(), '静态课程浏览');
    assert.equal(await page.locator('#errorCard').evaluate(node => node.classList.contains('show')), false);
    report.checks.push({ name: 'offline-static-course-fallback' });
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.failure = error.stack;
    process.exitCode = 1;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'knowledge-progress-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
})();
