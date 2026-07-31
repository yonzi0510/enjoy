#!/usr/bin/env node
/* 종단 테스트 — node lines/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계3) → 퍼즐 목록(10) → 놀이 진입(안내선 종류 확인),
 * 못 그은 트레이스는 완성되지 않음(무벌점) → App._trace() 로 완주 시뮬레이션하면
 * 완성·별·펫 간식 → 목록에 done 표기·진행 카운트, 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/lines/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 캔버스 위에 짧고 엉뚱한 획을 하나 그어(완주에는 턱없이 못 미치는 낙서) 무벌점 검사에 쓴다
async function scribble(page) {
  const box = await page.locator('#play-canvas').boundingBox();
  const x = box.x + box.width * 0.12, y = box.y + box.height * 0.12;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 10, y + 6, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(80);
}
// App._trace() 로 안내선을 그대로 따라 그리는 완벽한 트레이스를 시뮬레이션해 퍼즐을 완성시킨다
async function traceAndComplete(page) {
  await page.evaluate(() => App._trace());
  await page.waitForSelector('#reward.on', { timeout: 5000 });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 단계 카드 3개 + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '단계 카드 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('퍼즐 목록: 단계1 퍼즐 10개 + 0/10', async () => {
  await page.click('.menu-card.c-s1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('놀이 진입(단계1): 안내선 종류 = 햇살(ray)', async () => {
  await page.click('#list .puzzle-card >> nth=0');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.type === 'ray', '단계1 안내선 종류: ' + d.type);
  expect(d.done === false, '시작 시 미완성');
});

await check('무벌점: 엉뚱하게 짧게 그어도 완성되지 않는다', async () => {
  await scribble(page);
  const d = await page.evaluate(() => App.debug());
  expect(d.strokeCount > 0, '획이 그려지지 않음');
  expect(d.done === false, '낙서만으로 완성됨');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '낙서인데 축하가 뜸');
  await page.click('#btn-clear');
  await page.waitForTimeout(60);
});

await check('완벽 트레이스(_trace) → 완성 → 별·펫 간식', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await traceAndComplete(page);
  const d = await page.evaluate(() => App.debug());
  expect(d.done === true, '완성 잠금');
  expect(d.stars === starsBefore + 1, '별 증가: ' + starsBefore + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2 진입: 안내선 종류 = 물결(wave)', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-s2');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '단계2 퍼즐 10개');
  await page.click('#list .puzzle-card >> nth=0');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.type === 'wave' || d.type === 'zigzag', '단계2 안내선 종류: ' + d.type);
});

await check('단계2 완성(_trace) → 별·펫 간식 증가', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await traceAndComplete(page);
  const d = await page.evaluate(() => App.debug());
  expect(d.done === true, '단계2 완성 잠금');
  expect(d.stars === starsBefore + 1, '단계2 별 증가: ' + starsBefore + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '단계2 펫 간식: ' + petBefore + '→' + petAfter);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3 진입: 안내선 종류 = 소용돌이(spiral)', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-s3');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '단계3 퍼즐 10개');
  await page.click('#list .puzzle-card >> nth=0');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.type === 'spiral', '단계3 안내선 종류: ' + d.type);
  // 소용돌이는 촘촘히 샘플링된 긴 경로 하나(140+1점) — 곧은 선·꺾은 선과 뚜렷이 구분된다
  const pathInfo = await page.evaluate(() => {
    const pz = window.LinesData.puzzleById(App.debug().puzzle);
    const paths = window.LinesData.guideOf(pz);
    return { pathCount: paths.length, ptCount: paths[0] ? paths[0].length : 0 };
  });
  expect(pathInfo.pathCount === 1, '소용돌이는 경로 1개여야 함: ' + pathInfo.pathCount);
  expect(pathInfo.ptCount > 100, '소용돌이 점 개수가 너무 적음(촘촘한 곡선이 아님): ' + pathInfo.ptCount);
});

await check('단계3 완성(_trace) → 별·펫 간식 증가', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await traceAndComplete(page);
  const d = await page.evaluate(() => App.debug());
  expect(d.done === true, '단계3 완성 잠금');
  expect(d.stars === starsBefore + 1, '단계3 별 증가: ' + starsBefore + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '단계3 펫 간식: ' + petBefore + '→' + petAfter);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지(별·단계별 1/10)', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === String(starsBefore), '별 수 유지: ' + starsBefore);
  for (const cls of ['c-s1', 'c-s2', 'c-s3']) {
    const prog = await page.locator('.menu-card.' + cls + ' .mc-prog').textContent();
    expect(prog.includes('1 / 10'), cls + ' 진행 유지: ' + prog);
  }
});

await check('3해상도 잘림 없음 (가로 스크롤·상하좌우 잘림 검사)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '패드 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-s3'); // 얼굴이 상대적으로 작은 소용돌이 단계도 함께 확인
    await page.waitForSelector('#scr-list.on');
    await page.click('#list .puzzle-card >> nth=0');
    await page.waitForSelector('#scr-play.on');
    const m = await page.evaluate(() => {
      const canvas = document.querySelector('#play-canvas').getBoundingClientRect();
      const clear = document.querySelector('#btn-clear').getBoundingClientRect();
      const bar = document.querySelector('#scr-play .bar').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        canvasTop: canvas.top, canvasLeft: canvas.left, canvasBottom: canvas.bottom, canvasRight: canvas.right,
        clearBottom: clear.bottom, barTop: bar.top,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.canvasTop >= -2 && m.barTop >= -2, s.name + ': 캔버스/상단바가 위로 잘림 top=' + m.canvasTop);
    expect(m.canvasLeft >= -2, s.name + ': 캔버스가 왼쪽으로 잘림 left=' + m.canvasLeft);
    expect(m.canvasRight <= m.iw + 2, s.name + ': 캔버스가 오른쪽으로 잘림 ' + m.canvasRight + ' > ' + m.iw);
    expect(m.clearBottom <= m.ih + 2, s.name + ': 다시 그릴래 버튼이 아래로 잘림 ' + m.clearBottom + ' > ' + m.ih);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
