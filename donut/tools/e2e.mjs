#!/usr/bin/env node
/* 종단 테스트 — node donut/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계 3) → 목록(10) → 진입 → 같은 무늬 도넛을 자리에 놓기 →
 * 완성·축하·별·펫 간식, 틀린 칸 무벌점, 단계별 도넛 수 4/6/9, 새로고침 진행도 유지,
 * 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/donut/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 디버그 훅으로 다음 빈 자리(그 자리의 목표 도넛)를 골라 놓는다 — App._attempt(id, slotIndex)
async function placeOne(page) {
  const d = await page.evaluate(() => App.debug());
  const idx = d.slots.findIndex(s => !s.placed);
  if (idx < 0) return false;
  const id = d.slots[idx].target;
  await page.evaluate(([id, i]) => App._attempt(id, i), [id, idx]);
  await page.waitForTimeout(50);
  return true;
}
async function solveAll(page) { while (await placeOne(page)) { /* 계속 */ } }

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

await check('목록: 단계1 퍼즐 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#puzzle-list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('진입: 단계1 자리 4개(2×2)·트레이 도넛 4개·자리 윤곽', async () => {
  await page.click('#puzzle-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total === 4, '단계1 자리 수: ' + d.total);
  expect(await page.locator('#board .slot').count() === 4, '자리 칸 수');
  expect(await page.locator('#board .slot .slot-ghost svg').count() === 4, '자리 윤곽(연한 도넛) 수');
  expect(await page.locator('#tray .tray-item').count() === 4, '트레이 도넛 수: ' + d.trayIds.length);
});

await check('틀린 칸 무벌점: 목표와 다른 자리에 놓으면 안 얹히고 축하도 없다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  // 0번 자리의 목표가 아닌 도넛을 0번 자리에 놓으려 시도한다
  const t0 = d0.slots[0].target;
  const wrong = d0.trayIds.find(id => id !== t0);
  await page.evaluate((id) => App._attempt(id, 0), wrong);
  await page.waitForTimeout(150);
  const d = await page.evaluate(() => App.debug());
  expect(d.placedCount === 0, '틀린 놓기인데 도넛이 얹힘: ' + d.placedCount);
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 뜸');
});

await check('같은 무늬 맞춰 놓기 → 완성 → 축하·별·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.placedCount === 4, '채운 자리 수: ' + d.placedCount);
  expect(d.stars === 4, '별(자리 4개=4): ' + d.stars);
  expect(d.done === true, '퍼즐 완료 저장');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 목록
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#puzzle-list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 자리 6개·트레이 6개, 완성 시 별 +6', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-list.on');
  await page.click('#puzzle-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total === 6, '단계2 자리 수: ' + d.total);
  expect(await page.locator('#tray .tray-item').count() === 6, '트레이 수(6)');
  const before = await page.evaluate(() => App.debug().stars);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 6, '별 증가: ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3: 자리 9개(3×3)·트레이 9개', async () => {
  await page.click('#scr-list .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-list.on');
  await page.click('#puzzle-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total === 9, '단계3 자리 수: ' + d.total);
  expect(await page.locator('#board .slot').count() === 9, '자리 칸 수(9)');
  expect(await page.locator('#tray .tray-item').count() === 9, '트레이 수(9)');
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '10', '별 수(4+6)');
  const l1 = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(l1.includes('1 / 10'), '단계1 진행: ' + l1);
  const l2 = await page.locator('.menu-card.c-l2 .mc-prog').textContent();
  expect(l2.includes('1 / 10'), '단계2 진행: ' + l2);
});

await check('3해상도 잘림 없음 (가로 스크롤·세로 넘침 검사)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '패드 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3'); // 가장 자리가 많은 단계로 빡세게
    await page.waitForSelector('#scr-list.on');
    await page.click('#puzzle-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(120);
    const m = await page.evaluate(() => ({
      horiz: document.documentElement.scrollWidth - window.innerWidth,
      trayBottom: document.querySelector('#tray').getBoundingClientRect().bottom,
      boardTop: document.querySelector('#board').getBoundingClientRect().top,
      ih: window.innerHeight,
    }));
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.trayBottom <= m.ih + 2, s.name + ': 트레이가 화면 아래로 잘림 ' + m.trayBottom + ' > ' + m.ih);
    expect(m.boardTop >= -2, s.name + ': 자리판이 위로 잘림 ' + m.boardTop);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
