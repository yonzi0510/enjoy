#!/usr/bin/env node
/* 종단 테스트 — node pattern/tools/e2e.mjs
 * 실제 Chromium 으로 홈 → 퍼즐 목록 → 빈칸 채우기(탭) → 완성·축하·별·펫,
 * 틀린 타일 무벌점, 단계별 빈칸/타일 수, 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/pattern/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 트레이의 타일을 탭해서 놓기 시도 (탭 = 클릭)
async function tapTile(page, id) {
  await page.click('.tile-item[data-id="' + id + '"]:not(.used)');
}
// 지금 차례인 정답 타일을 순서대로 끝까지 넣는다
async function solveAll(page) {
  for (;;) {
    const nid = await page.evaluate(() => App.debug().nextId);
    if (!nid) break;
    await tapTile(page, nid);
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

await check('퍼즐 목록: 단계1 퍼즐 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('퍼즐 진입: 패턴 줄·빈칸·트레이 표시', async () => {
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.level === 1, '단계1');
  expect(d.blankCount >= 1, '빈칸 수: ' + d.blankCount);
  expect(d.blanks.length === 1, '단계1 빈칸 1개: ' + JSON.stringify(d.blanks));
  expect(d.blanks[0] === d.pattern.length - 1, '단계1 빈칸은 줄 끝');
  expect(d.slotCount === d.pattern.length, '슬롯 수 = 패턴 길이');
  // 트레이 = 정답(1) + 방해(extra=2) = 3
  expect(await page.locator('#tray .tile-item').count() === 3, '트레이 타일 수: ' + d.trayIds.length);
  expect(d.trayIds.includes(d.nextId), '트레이에 정답 포함');
});

await check('틀린 타일 무벌점: 정답 아닌 타일은 안 들어가고 축하도 없다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const wrong = d0.trayIds.find(id => id !== d0.nextId);
  await tapTile(page, wrong);
  await page.waitForTimeout(160);
  const d = await page.evaluate(() => App.debug());
  expect(d.placed.length === 0, '틀린 탭인데 채워짐: ' + JSON.stringify(d.placed));
  expect(d.filledCount === 0, '빈칸이 채워짐');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 뜸');
});

await check('정답 넣기 → 완성 → 축하·별·펫 간식·색종이', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.filledCount === d.blanks.length, '빈칸 모두 채움: ' + d.filledCount);
  expect(d.blankCount === 0, '남은 빈칸 0: ' + d.blankCount);
  expect(d.stars === 1, '별(단계1=1): ' + d.stars);
  expect(d.done === true, '퍼즐 완료 저장');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
  expect(await page.locator('#confetti .cf').count() > 0, '색종이 조각');
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 퍼즐 목록
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 가운데 빈칸 · 트레이 4개(정답1+방해3)', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.level === 2, '단계2');
  expect(d.blanks.length === 1, '빈칸 1개');
  expect(d.blanks[0] !== 0 && d.blanks[0] !== d.pattern.length - 1, '가운데 빈칸: ' + d.blanks[0]);
  expect(await page.locator('#tray .tile-item').count() === 4, '트레이 수(1+3): ' + d.trayIds.length);
});

await check('단계2 완성: 별이 2 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 2, '별 증가: ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3: 긴 반복/2색 분할 · 빈칸 1~2개', async () => {
  await page.click('#scr-list .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.level === 3, '단계3');
  expect(d.blanks.length >= 1 && d.blanks.length <= 2, '빈칸 1~2개: ' + d.blanks.length);
  // 트레이 = 정답(빈칸 수) + 방해(extra=3)
  expect(d.trayIds.length === d.blanks.length + 3, '트레이 수(정답+3): ' + d.trayIds.length);
  expect(d.blanks.every(bi => d.answers.length), '정답 준비됨');
});

await check('단계3 완성: 별이 3 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 3, '별 증가: ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '6', '별 수(1+2+3): ' + (await page.locator('#home-stars').textContent()));
  const l1 = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(l1.includes('1 / 10'), '단계1 진행: ' + l1);
  const l2 = await page.locator('.menu-card.c-l2 .mc-prog').textContent();
  expect(l2.includes('1 / 10'), '단계2 진행: ' + l2);
  const l3 = await page.locator('.menu-card.c-l3 .mc-prog').textContent();
  expect(l3.includes('1 / 10'), '단계3 진행: ' + l3);
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
    await page.click('.menu-card.c-l3'); // 가장 긴 패턴으로 빡세게
    await page.waitForSelector('#scr-list.on');
    await page.click('#list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(120);
    const m = await page.evaluate(() => ({
      horiz: document.documentElement.scrollWidth - window.innerWidth,
      trayBottom: document.querySelector('#tray').getBoundingClientRect().bottom,
      stripTop: document.querySelector('#strip').getBoundingClientRect().top,
      ih: window.innerHeight,
    }));
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.trayBottom <= m.ih + 2, s.name + ': 트레이가 화면 아래로 잘림 ' + m.trayBottom + ' > ' + m.ih);
    expect(m.stripTop >= -2, s.name + ': 패턴 줄이 위로 잘림 ' + m.stripTop);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
