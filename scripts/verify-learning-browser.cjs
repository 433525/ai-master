const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.AIMASTER_URL || 'http://127.0.0.1:8787';
const output = path.resolve('.local/browser-evidence');
fs.mkdirSync(output, { recursive: true });

async function mediaState(page) {
  return page.locator('#aw-anim-video').evaluate(video => {
    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 100;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, 160, 100);
    const data = context.getImageData(0, 0, 160, 100).data;
    let visible = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 20 && data[i] + data[i + 1] + data[i + 2] > 40) visible++;
    return { src: decodeURI(video.currentSrc), time: video.currentTime, width: video.videoWidth, height: video.videoHeight, visible, display: getComputedStyle(video).display };
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const report = { date: new Date().toISOString(), base, environment: 'Headless Microsoft Edge on Windows; viewport emulation, not physical phone testing', checks: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        if (this.tagName === 'AUDIO') window.__lastPetAudio = this;
        return play.apply(this, args);
      };
    });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base);
    await page.waitForSelector('#plan-form');
    await page.waitForFunction(() => document.querySelector('#aw-anim-video')?.readyState >= 2);
    const first = await mediaState(page);
    await page.waitForTimeout(500);
    const second = await mediaState(page);
    assert(second.visible > 50 && second.time !== first.time, 'Whale idle video must be visible and moving');
    report.checks.push({ name: 'whale-idle', ...second });
    const actions = await page.locator('.aw-action-select option').evaluateAll(nodes => nodes.map(n => n.value));
    assert.equal(actions.length, 100);
    for (const name of actions) assert(fs.existsSync(path.resolve('third_party/dsh-pet/dsh-pet/assets/webm', name + '.webm')), name);
    report.checks.push({ name: 'all-original-actions-present', count: actions.length });
    for (const [state, expected] of [['correct', '点击回应-开心跃动'], ['wrong', '点击回应-傲娇生气'], ['thinking', '深度思考碎碎念'], ['celebrate', '放烟花'], ['idle', '待机呼吸休闲']]) {
      await page.evaluate(state => window.dispatchEvent(new CustomEvent('aimaster-pet-state', { detail: { state } })), state);
      await page.waitForFunction(expected => {
        const video = document.querySelector('#aw-anim-video');
        return video.readyState >= 2 && decodeURI(video.currentSrc).includes(expected);
      }, expected);
      const media = await mediaState(page);
      assert(media.visible > 50, state + ' must render pixels');
      report.checks.push({ name: 'whale-' + state, ...media });
    }
    await page.evaluate(() => {
      ['correct', 'wrong', 'thinking', 'idle'].forEach(state => window.dispatchEvent(new CustomEvent('aimaster-pet-state', { detail: { state } })));
    });
    await page.waitForTimeout(800);
    const rapid = await mediaState(page);
    assert(rapid.display !== 'none' && rapid.src.includes('待机呼吸休闲') && rapid.visible > 50, 'Rapid switching must preserve latest animation');
    report.checks.push({ name: 'whale-rapid-switch', ...rapid });
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('aimaster-pet-state', { detail: { state: 'correct' } }));
      const staleEnd = document.querySelector('#aw-anim-video').onended;
      window.dispatchEvent(new CustomEvent('aimaster-pet-state', { detail: { state: 'thinking' } }));
      staleEnd();
    });
    await page.waitForTimeout(500);
    assert((await mediaState(page)).src.includes('深度思考碎碎念'), 'Stale ending must not replace current video');
    report.checks.push({ name: 'whale-stale-ending-ignored' });
    await page.evaluate(() => {
      const video = document.querySelector('#aw-anim-video');
      const play = video.play;
      video.play = function () {
        video.play = play;
        play.call(video).catch(() => {});
        return new Promise((resolve, reject) => setTimeout(() => reject(new DOMException('Replaced playback', 'AbortError')), 100));
      };
      window.dispatchEvent(new CustomEvent('aimaster-pet-state', { detail: { state: 'wrong' } }));
      window.dispatchEvent(new CustomEvent('aimaster-pet-state', { detail: { state: 'thinking' } }));
    });
    await page.waitForTimeout(400);
    const delayedRejection = await mediaState(page);
    assert(delayedRejection.src.includes('深度思考碎碎念') && delayedRejection.display !== 'none' && delayedRejection.visible > 50);
    report.checks.push({ name: 'whale-stale-play-rejection-ignored' });
    await page.locator('[data-companion="menu"]').click();
    await page.waitForSelector('.aw-menu-open');
    assert.equal(await page.locator('#aw-dock-action option').count(), 100);
    assert.equal(await page.locator('#aw-summary, #aw-qa, #aw-size').count(), 0, 'Dock settings must only expose working controls');
    await page.locator('#aw-dock-play').click();
    await page.waitForTimeout(100);
    const pausedTime = (await mediaState(page)).time;
    await page.waitForTimeout(400);
    assert.equal((await mediaState(page)).time, pausedTime, 'Pause must hold the current frame');
    await page.locator('#aw-dock-play').click();
    await page.waitForTimeout(400);
    assert.notEqual((await mediaState(page)).time, pausedTime, 'Resume must advance the video');
    await page.locator('#aw-dock-action').selectOption('放烟花');
    await page.waitForTimeout(400);
    assert((await mediaState(page)).src.includes('放烟花'));
    assert.equal(await page.locator('.aw-action-select').inputValue(), '放烟花');
    await page.locator('#aw-dock-idle').click();
    await page.waitForTimeout(300);
    assert((await mediaState(page)).src.includes('待机呼吸休闲'));
    await page.locator('#aw-dock-sound').uncheck();
    assert(await page.locator('#aw-dock-preview').isDisabled());
    assert(await page.locator('#aw-dock-volume').isDisabled());
    await page.locator('#aw-dock-sound').check();
    await page.locator('#aw-dock-volume').fill('25');
    assert.equal(await page.locator('#aw-dock-volume-value').textContent(), '25%');
    await page.locator('#aw-dock-preview').click();
    await page.waitForFunction(() => window.__lastPetAudio?.currentTime > 0 && window.__lastPetAudio.volume === 0.25);
    report.checks.push({ name: 'whale-settings-actions-pause-resume-and-sound' });
    await page.screenshot({ path: path.join(output, 'desktop-whale-settings.png') });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.aw-menu-open').count(), 0);
    await page.locator('[data-companion="menu"]').click();
    assert.equal(await page.locator('#aw-dock-volume').inputValue(), '25');
    await page.locator('#aw-dock-close').click();
    assert.equal(await page.locator('.aw-menu-open').count(), 0);
    await page.locator('[data-companion="random"]').click();
    await page.waitForTimeout(600);
    report.checks.push({ name: 'whale-random-button', ...await mediaState(page) });
    for (const width of [1440, 900, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: path.join(output, 'workspace-' + width + '.png'), fullPage: true });
      const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
      assert(dimensions.content <= width, 'No horizontal overflow at ' + width);
      report.checks.push({ name: 'responsive-workspace', ...dimensions });
      await page.locator('[data-companion="menu"]').click();
      const menu = await page.locator('#aw-menu').boundingBox();
      assert(menu.x >= 0 && menu.y >= 0 && menu.x + menu.width <= width && menu.y + menu.height <= 900, 'Settings must fit viewport at ' + width);
      await page.screenshot({ path: path.join(output, 'whale-settings-' + width + '.png') });
      await page.locator('#aw-dock-close').click();
      report.checks.push({ name: 'responsive-whale-settings', width, menu });
    }
    await page.setViewportSize({ width: 568, height: 320 });
    await page.locator('[data-companion="menu"]').click();
    const shortMenu = await page.locator('#aw-menu').boundingBox();
    assert(shortMenu.y >= 0 && shortMenu.y + shortMenu.height <= 320, 'Settings must fit landscape phone height');
    await page.locator('#aw-dock-close').click();
    report.checks.push({ name: 'landscape-whale-settings', ...shortMenu });
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.passed = false; report.failure = error.stack; process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
})();
