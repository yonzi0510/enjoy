#!/usr/bin/env node
/* 종단 테스트 — node matrix/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계 3개) → 퍼즐 목록(10개) → 놀이(격자·헤더·트레이) →
 * 정답 놓기(격자 완성·별·펫) · 오답 무벌점 · 단계별 격자 크기(2/3/4) ·
 * 새로고침 후 진행도 유지 · 3해상도 잘림 없음(4×4 포함)을 검증한다. 콘솔 오류 0 기대.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/matrix/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 트레이의 조각을 탭(클릭)해서 놓기 시도
async function tap(page, id) {
  await page.click('.tray-item[data-id="' + id + '"]:not(.used)');
}
// 다음 칸부터 정답 조각을 순서대로 끝까지 놓는다
async function fillAll(page) {
  for (;;) {
    const nid = await page.evaluate(() => App.debug().nextId);
    if (!nid) break;
    await tap(page, nid);
    await page.waitForTimeout(60);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

// 깨끗한 진행도에서 시작
await page.goto(BASE);
await page.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (/matrix|pet/i.test(k)) localStorage.removeItem(k); } catch (e) {} });
await page.goto(BASE);

await check('홈: 단계 카드 3개 + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '단계 카드 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('퍼즐 목록: 단계1 퍼즐 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-puzzles.on');
  expect(await page.locator('#puzzles-list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#puzzles-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('퍼즐 진입: 격자 2×2 · 헤더(방향2+색2) · 트레이(정답4+방해2)', async () => {
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.rows === 2 && d.cols === 2, '단계1 격자: ' + d.rows + 'x' + d.cols);
  expect(d.total === 4, '칸 수: ' + d.total);
  expect(await page.locator('#board .bd-cell').count() === 4, '격자 칸 DOM 수');
  expect(await page.locator('#board .bd-head').count() === 4, '헤더(방향2+색2) DOM 수');
  expect(await page.locator('#board .bd-corner').count() === 1, '코너 표시');
  expect(await page.locator('#tray .tray-item').count() === 6, '트레이 조각 수(4+2): ' + d.trayIds.length);
  // 트레이에 정답 조각이 모두 들어 있다
  const hasAll = d.cells.every(id => d.trayIds.includes(id));
  expect(hasAll, '트레이에 정답 조각 누락');
});

await check('오답 무벌점: 순서 아닌 조각은 안 들어가고 축하도 없다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const wrong = d0.trayIds.find(id => id !== d0.nextId);
  await tap(page, wrong);
  await page.waitForTimeout(150);
  const d = await page.evaluate(() => App.debug());
  expect(d.placed.length === 0, '오답인데 조각이 놓임: ' + JSON.stringify(d.placed));
  expect(d.filledCount === 0, '오답인데 칸이 채워짐');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '오답인데 축하가 뜸');
});

await check('정답 순서대로 놓기 → 격자 완성 → 축하·별·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await fillAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.filledCount === 4, '채운 칸 수: ' + d.filledCount);
  expect(d.stars === 4, '별(2×2=4): ' + d.stars);
  expect(d.done === true, '퍼즐 완료 저장');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 퍼즐 목록
  await page.waitForSelector('#scr-puzzles.on');
  expect(await page.locator('#puzzles-list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#puzzles-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 격자 3×3 · 트레이(정답9+방해2) · 완성 시 별 +9', async () => {
  await page.click('#scr-puzzles .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-puzzles.on');
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.rows === 3 && d.cols === 3, '단계2 격자: ' + d.rows + 'x' + d.cols);
  expect(await page.locator('#tray .tray-item').count() === 11, '트레이 수(9+2): ' + d.trayIds.length);
  const before = await page.evaluate(() => App.debug().stars);
  await fillAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 9, '별 증가(3×3=9): ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-puzzles.on');
});

await check('단계3: 격자 4×4 · 트레이(정답16+방해0)', async () => {
  await page.click('#scr-puzzles .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-puzzles.on');
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.rows === 4 && d.cols === 4, '단계3 격자: ' + d.rows + 'x' + d.cols);
  expect(await page.locator('#board .bd-cell').count() === 16, '격자 칸 16');
  expect(await page.locator('#board .bd-head').count() === 8, '헤더 8(방향4+색4)');
  expect(await page.locator('#tray .tray-item').count() === 16, '트레이 수(16+0): ' + d.trayIds.length);
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-puzzles.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '13', '별 수(4+9)');
  const l1 = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(l1.includes('1 / 10'), '단계1 진행: ' + l1);
  const l2 = await page.locator('.menu-card.c-l2 .mc-prog').textContent();
  expect(l2.includes('1 / 10'), '단계2 진행: ' + l2);
});

await check('3해상도 잘림 없음 (가로 스크롤·세로 넘침, 4×4 로 검사)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '태블릿 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3'); // 가장 큰 4×4 로 빡세게
    await page.waitForSelector('#scr-puzzles.on');
    await page.click('#puzzles-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const t = document.querySelector('#tray').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        boardTop: b.top, boardBottom: b.bottom,
        trayTop: t.top, trayBottom: t.bottom,
        iw: window.innerWidth, ih: window.innerHeight,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.boardTop >= -2, s.name + ': 격자가 위로 잘림 ' + m.boardTop);
    expect(m.boardBottom <= m.ih + 2, s.name + ': 격자가 아래로 잘림 ' + m.boardBottom + ' > ' + m.ih);
    expect(m.trayBottom <= m.ih + 2, s.name + ': 트레이가 아래로 잘림 ' + m.trayBottom + ' > ' + m.ih);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
