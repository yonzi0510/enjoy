#!/usr/bin/env node
/* 종단 테스트 — node burger/tools/e2e.mjs
 * 실제 Chromium 으로 홈 → 미션 목록 → 카드 순서대로 쌓기(탭) → 완성·축하·별·펫,
 * 틀린 재료 무벌점, 단계별 재료 수, 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/burger/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 트레이의 재료를 탭해서 놓기 시도 (탭 = 클릭)
async function tapIng(page, id) {
  await page.click('.tray-item[data-id="' + id + '"]:not(.used)');
}
// 미션을 카드 순서대로 끝까지 쌓는다
async function stackAll(page) {
  for (;;) {
    const nid = await page.evaluate(() => App.debug().nextId);
    if (!nid) break;
    await tapIng(page, nid);
    await page.waitForTimeout(60);
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

await check('미션 목록: 단계1 미션 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-missions.on');
  expect(await page.locator('#missions-list .mission-card').count() === 10, '미션 수');
  expect((await page.locator('#missions-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('미션 진입: 미션 카드·트레이 표시, 첫 재료는 아래빵', async () => {
  await page.click('#missions-list .mission-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.layers.length === 3, '단계1 층 수: ' + d.layers.length);
  expect(d.nextId === 'bun-bottom', '첫 재료: ' + d.nextId);
  expect(await page.locator('#recipe-list .rc-row').count() === 3, '미션 카드 줄 수');
  // 트레이 = 미션 재료(3) + 방해(1)
  expect(await page.locator('#tray .tray-item').count() === 4, '트레이 재료 수: ' + d.trayIds.length);
});

await check('틀린 재료 무벌점: 순서 아닌 재료는 안 얹히고 축하도 없다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  // 아래빵이 다음인데, 아래빵이 아닌 재료를 탭한다
  const wrong = d0.trayIds.find(id => id !== 'bun-bottom');
  await tapIng(page, wrong);
  await page.waitForTimeout(150);
  const d = await page.evaluate(() => App.debug());
  expect(d.placed.length === 0, '틀린 탭인데 재료가 쌓임: ' + JSON.stringify(d.placed));
  expect(d.pegCount === 0, '꼬치에 층이 생김');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 뜸');
});

await check('카드 순서대로 쌓기 → 완성 → 축하·별·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await stackAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.pegCount === 3, '꼬치 층 수: ' + d.pegCount);
  expect(d.stars === 3, '별(3층=3): ' + d.stars);
  expect(d.done === true, '미션 완료 저장');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 미션 목록
  await page.waitForSelector('#scr-missions.on');
  expect(await page.locator('#missions-list .mission-card.done').count() === 1, '완성 미션 수');
  expect((await page.locator('#missions-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 미션 층 5개 (빵-속3-빵)', async () => {
  await page.click('#scr-missions .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-missions.on');
  await page.click('#missions-list .mission-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.layers.length === 5, '단계2 층 수: ' + d.layers.length);
  expect(d.layers[0] === 'bun-bottom' && d.layers[4] === 'bun-top', '빵 시작/끝');
  expect(d.trayIds.length === 7, '트레이 수(5+2): ' + d.trayIds.length);
});

await check('단계2 완성: 별이 5 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  await stackAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 5, '별 증가: ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-missions.on');
});

await check('단계3: 미션 층 7개 (빵-속5-빵)', async () => {
  await page.click('#scr-missions .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-missions.on');
  await page.click('#missions-list .mission-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.layers.length === 7, '단계3 층 수: ' + d.layers.length);
  expect(d.trayIds.length === 9, '트레이 수(7+2): ' + d.trayIds.length);
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-missions.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '8', '별 수(3+5)');
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
    await page.click('.menu-card.c-l3'); // 가장 층이 많은 단계로 빡세게
    await page.waitForSelector('#scr-missions.on');
    await page.click('#missions-list .mission-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(120);
    const m = await page.evaluate(() => ({
      horiz: document.documentElement.scrollWidth - window.innerWidth,
      trayBottom: document.querySelector('#tray').getBoundingClientRect().bottom,
      pegTop: document.querySelector('#peg-wrap').getBoundingClientRect().top,
      ih: window.innerHeight,
    }));
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.trayBottom <= m.ih + 2, s.name + ': 트레이가 화면 아래로 잘림 ' + m.trayBottom + ' > ' + m.ih);
    expect(m.pegTop >= -2, s.name + ': 꼬치가 위로 잘림 ' + m.pegTop);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
