#!/usr/bin/env node
/* 종단 테스트 — node rings/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계3) → 퍼즐 목록(10) → 놀이 진입(카드 손·놀이 손·트레이),
 * 카드대로 순서대로 고리 끼우기 → 완성·별(고리 수)·펫 간식, 오답 무벌점(완성 안 됨),
 * 단계별 고리 수, 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/rings/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 카드 순서(steps: {finger,color})대로 고리를 끼워 퍼즐을 완성한다
async function solve(page) {
  const steps = await page.evaluate(() => App.debug().steps);
  for (const s of steps) {
    await page.evaluate((st) => App._attempt(st.color, st.finger), s);
    await page.waitForTimeout(50);
  }
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

await check('퍼즐 목록: 단계1 퍼즐 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-puzzles.on');
  expect(await page.locator('#puzzles-list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#puzzles-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('놀이 진입: 카드 손·놀이 손·트레이, 고리 2~3개(단계1)', async () => {
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.rings >= 2 && d.rings <= 3, '단계1 고리 수: ' + d.rings);
  expect(d.placedCount === 0, '처음엔 낀 고리 0: ' + d.placedCount);
  expect(await page.locator('#card-hand .ring').count() === d.rings, '본보기 카드 고리 수');
  expect(await page.locator('#tray .tray-item').count() >= 2, '트레이 색 수');
});

await check('오답 무벌점: 순서 아닌 자리는 안 끼워지고 축하도 없다', async () => {
  const steps = await page.evaluate(() => App.debug().steps);
  const st0 = steps[0];
  const wrongFinger = (st0.finger + 1) % 5;
  await page.evaluate((a) => App._attempt(a.color, a.wf), { color: st0.color, wf: wrongFinger });
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => App.debug());
  expect(d.placedCount === 0, '오답인데 끼워짐: ' + d.placedCount);
  expect(d.locked === false, '오답인데 완성됨');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '오답인데 축하가 뜸');
});

await check('카드대로 끼우기 → 완성 → 별(고리 수)·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  const before = await page.evaluate(() => App.debug());
  await solve(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.placedCount === d.rings, '고리 다 끼움: ' + d.placedCount + '/' + d.rings);
  expect(d.done === true, '퍼즐 완료 저장');
  expect(d.stars === before.stars + d.rings, '별 증가(고리 수만큼): ' + before.stars + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-puzzles.on');
  expect(await page.locator('#puzzles-list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#puzzles-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 고리 4~5개', async () => {
  await page.click('#scr-puzzles [data-go="scr-home"]');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-puzzles.on');
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.rings >= 4 && d.rings <= 5, '단계2 고리 수: ' + d.rings);
});

await check('단계2 완성: 별이 고리 수만큼 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  const need = await page.evaluate(() => App.debug().rings);
  await solve(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + need, '별 증가: ' + before + '→' + after + ' (고리 ' + need + ')');
  await page.click('#reward-close');
  await page.waitForSelector('#scr-puzzles.on');
});

await check('단계3: 겹쳐 끼우기 포함(같은 손가락 2개)', async () => {
  await page.click('#scr-puzzles [data-go="scr-home"]');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-puzzles.on');
  expect(await page.locator('#puzzles-list .puzzle-card').count() === 10, '단계3 퍼즐 10개');
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.rings >= 4, '단계3 고리 수: ' + d.rings);
  expect(d.stacked === true, '단계3 겹쳐 끼우기 포함');
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-puzzles.on');
});

await check('새로고침 후 진행도 유지', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === String(starsBefore), '별 수 유지: ' + starsBefore);
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
    await page.click('.menu-card.c-l3'); // 고리가 가장 많은 단계로 빡세게
    await page.waitForSelector('#scr-puzzles.on');
    await page.click('#puzzles-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const play = document.querySelector('#play-hand').getBoundingClientRect();
      const card = document.querySelector('#card-hand').getBoundingClientRect();
      const tray = document.querySelector('#tray').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        playBottom: play.bottom, playRight: play.right,
        cardTop: card.top, cardLeft: card.left,
        trayBottom: tray.bottom,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.playBottom <= m.ih + 2, s.name + ': 놀이 손이 아래로 잘림 ' + m.playBottom + ' > ' + m.ih);
    expect(m.trayBottom <= m.ih + 2, s.name + ': 트레이가 아래로 잘림 ' + m.trayBottom + ' > ' + m.ih);
    expect(m.playRight <= m.iw + 2, s.name + ': 놀이 손이 옆으로 잘림 ' + m.playRight + ' > ' + m.iw);
    expect(m.cardTop >= -2 && m.cardLeft >= -2, s.name + ': 본보기 카드가 잘림 top=' + m.cardTop + ' left=' + m.cardLeft);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
