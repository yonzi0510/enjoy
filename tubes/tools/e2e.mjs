#!/usr/bin/env node
/* 종단 테스트 — node tubes/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계 3개) → 퍼즐 목록(단계별 10) → 카드대로 담기 → 완성·축하·별·펫,
 * 틀린 색 무벌점, 단계별 관 수(2/3/4)·길이(3/4/5), 단계 첫 완주 펫 식사,
 * 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/tubes/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 지금 열린 퍼즐을 카드 순서대로 끝까지 담고 완성(보상)까지 기다린다.
async function solveCurrent(page) {
  for (let i = 0; i < 60; i++) {
    const nc = await page.evaluate(() => App.debug().nextColor);
    if (!nc) break;
    await page.evaluate(c => App._attempt(c), nc);
    await page.waitForTimeout(35);
  }
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

await check('목록: 단계1 퍼즐 10개, 진행 0 / 10', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('퍼즐 진입: 본보기 카드·시험관 2개·팔레트 6색, 길이 3', async () => {
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.tubes.length === 2, '단계1 관 수: ' + d.tubes.length);
  expect(d.len === 3, '단계1 길이: ' + d.len);
  expect(d.tubeEls === 2, '놀이 시험관 DOM 수: ' + d.tubeEls);
  expect(d.palette === 6, '팔레트 색 수: ' + d.palette);
  expect(await page.locator('#card-tubes .tube').count() === 2, '본보기 카드 관 수');
  expect(!!d.nextColor, '다음 색 없음');
});

await check('틀린 색 무벌점: 카드에 없는 순서 색은 안 담기고 축하도 없다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const wrong = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'].find(c => c !== d0.nextColor);
  await page.evaluate(c => App._attempt(c), wrong);
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => App.debug());
  expect(d.beadCount === 0, '틀린 색인데 구슬이 담김: ' + d.beadCount);
  expect(d.locked === false, '틀렸는데 잠김');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 뜸');
});

await check('카드대로 담기 → 완성 → 축하·별 6·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await solveCurrent(page);
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.beadCount === 6, '담긴 구슬 수(2관×3): ' + d.beadCount);
  expect(d.stars === 6, '별(구슬 6개=6): ' + d.stars);
  expect(d.done === true, '퍼즐 완료 저장');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 목록
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계 첫 완주: 남은 9개 마저 풀면 펫 식사 +1, 별 60', async () => {
  const mealBefore = await page.evaluate(() => window.Pet ? Pet.state().meals : 0);
  await page.click('#list .puzzle-card:not(.done)');
  await page.waitForSelector('#scr-play.on');
  for (let i = 0; i < 9; i++) {
    await solveCurrent(page);
    await page.click('#reward-next'); // 다음 미완성 퍼즐로, 마지막엔 목록으로
    if (i < 8) await page.waitForSelector('#scr-play.on');
  }
  await page.waitForSelector('#scr-list.on');
  const mealAfter = await page.evaluate(() => window.Pet ? Pet.state().meals : 0);
  expect(mealAfter === mealBefore + 1, '펫 식사(단계 첫 완주): ' + mealBefore + '→' + mealAfter);
  expect((await page.locator('#list-count').textContent()).includes('10 / 10'), '단계1 전부 완료');
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '60', '별(6×10): ' + await page.locator('#home-stars').textContent());
});

await check('단계2: 관 3개·길이 4, 완성 시 별 +12', async () => {
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.tubes.length === 3, '단계2 관 수: ' + d.tubes.length);
  expect(d.len === 4, '단계2 길이: ' + d.len);
  const before = await page.evaluate(() => App.debug().stars);
  await solveCurrent(page);
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 12, '별 증가(3×4): ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3: 관 4개·길이 5', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.tubes.length === 4, '단계3 관 수: ' + d.tubes.length);
  expect(d.len === 5, '단계3 길이: ' + d.len);
  expect(d.tubeEls === 4, '놀이 시험관 DOM 수: ' + d.tubeEls);
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '72', '별 수(60+12): ' + await page.locator('#home-stars').textContent());
  const l1 = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(l1.includes('10 / 10'), '단계1 진행: ' + l1);
  const l2 = await page.locator('.menu-card.c-l2 .mc-prog').textContent();
  expect(l2.includes('1 / 10'), '단계2 진행: ' + l2);
});

await check('3해상도 잘림 없음 (가로 스크롤·세로 넘침 검사)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '태블릿 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3'); // 관이 가장 많은 단계로 빡세게
    await page.waitForSelector('#scr-list.on');
    await page.click('#list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(140);
    const m = await page.evaluate(() => ({
      horiz: document.documentElement.scrollWidth - window.innerWidth,
      ih: window.innerHeight,
      cardTop: document.querySelector('#card').getBoundingClientRect().top,
      palBottom: document.querySelector('#palette').getBoundingClientRect().bottom,
      tubeEls: document.querySelectorAll('#play-tubes .tube').length,
    }));
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.cardTop >= -2, s.name + ': 본보기 카드가 위로 잘림 ' + m.cardTop);
    expect(m.palBottom <= m.ih + 2, s.name + ': 팔레트가 화면 아래로 잘림 ' + m.palBottom + ' > ' + m.ih);
    expect(m.tubeEls === 4, s.name + ': 시험관 4개가 다 안 그려짐 ' + m.tubeEls);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
