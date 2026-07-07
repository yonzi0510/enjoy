#!/usr/bin/env node
/* 종단 테스트 — node write/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 자음 필사(펜 스트로크 합성) → 손가락 리젝션 → 완료·별 →
 * 동요 목록 → 동요 한 줄 필사 → 갤러리 → 새로고침 후 진행도 유지까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/write/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 합성 포인터 스트로크 — pts 는 캔버스 비율 좌표 [ [0~1, 0~1], ... ]
async function stroke(page, sel, pts, pointerType) {
  await page.evaluate(({ sel, pts, pointerType }) => {
    const c = document.querySelector(sel);
    const r = c.getBoundingClientRect();
    const ev = (type, fx, fy) => c.dispatchEvent(new PointerEvent(type, {
      pointerId: 7, pointerType, isPrimary: true, buttons: 1, bubbles: true, cancelable: true,
      clientX: r.left + r.width * fx, clientY: r.top + r.height * fy,
    }));
    ev('pointerdown', pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ev('pointermove', pts[i][0], pts[i][1]);
    ev('pointerup', pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }, { sel, pts, pointerType });
}
// 안내 글자를 다 덮는 지그재그 (느슨한 겹침 판정 통과용)
function zigzag() {
  const pts = [];
  let dir = 1;
  for (const fy of [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]) {
    const xs = [];
    for (let fx = 0.03; fx <= 0.97; fx += 0.04) xs.push(fx);
    if (dir < 0) xs.reverse();
    dir = -dir;
    xs.forEach(fx => pts.push([fx, fy]));
  }
  return pts;
}
const squiggle = [[0.2, 0.35], [0.3, 0.72], [0.4, 0.35], [0.5, 0.72], [0.6, 0.35], [0.7, 0.72]];

async function completePage(page) { // 현재 페이지를 다 쓰고 보상까지 진행
  await stroke(page, '#ink-trace', zigzag(), 'pen');
  await stroke(page, '#ink-free', squiggle, 'pen');
  await page.click('#btn-done');
  await page.waitForSelector('#reward.on', { timeout: 3000 });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 챕터 7개 + 갤러리 카드', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 8, '메뉴 카드 수');
});

await check('자음 쓰기 진입: 줄노트 2줄 + 점 4개', async () => {
  await page.click('.menu-card.c-jaum');
  await page.waitForSelector('#scr-write.on');
  expect(await page.locator('#write-dots .dot').count() === 4, '페이지 점 수');
  expect(await page.locator('.note-line canvas').count() === 2, '캔버스 수');
});

await check('손가락 필기는 무시되고 펜슬 안내가 뜬다', async () => {
  await stroke(page, '#ink-free', squiggle, 'touch');
  const d = await page.evaluate(() => App.debug());
  expect(d.freeStrokes === 0, '손가락 획이 기록됨');
  await page.waitForSelector('#pen-hint.on', { timeout: 2000 });
});

await check('펜 따라쓰기: 획 기록 + 겹침 판정 통과', async () => {
  await stroke(page, '#ink-trace', zigzag(), 'pen');
  const d = await page.evaluate(() => App.debug());
  expect(d.traceStrokes > 0, '획이 기록되지 않음');
  expect(d.coverage >= 0.5, '겹침 ' + d.coverage.toFixed(2));
});

await check('아랫줄 없이 완료 시도 → 통과 안 됨', async () => {
  await page.click('#btn-done');
  expect(!(await page.locator('#reward.on').count()), '보상이 떠버림');
});

await check('혼자 쓰기 후 완료 → 별 + 다음 장', async () => {
  await stroke(page, '#ink-free', squiggle, 'pen');
  await page.click('#btn-done');
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  await page.click('#reward-next');
  await page.waitForFunction(() => !document.getElementById('reward').classList.contains('on'));
  const onIdx = await page.evaluate(() =>
    [...document.querySelectorAll('#write-dots .dot')].findIndex(d => d.classList.contains('on')));
  expect(onIdx === 1, '2번째 장으로 안 넘어감: ' + onIdx);
  expect(await page.locator('#write-dots .dot.done').count() === 1, '완료 점 표시');
});

await check('홈으로: 별·진행도 반영', async () => {
  await page.click('#btn-write-back');
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '1', '별 수');
  const prog = await page.locator('.menu-card.c-jaum .mc-prog').textContent();
  expect(prog.includes('1 / 4'), '챕터 진행도: ' + prog);
});

await check('동요 필사: 항목 5개 목록 → 한 줄 완료', async () => {
  await page.click('.menu-card.c-song');
  await page.waitForSelector('#scr-items.on');
  expect(await page.locator('.item-row').count() === 5, '동요 항목 수');
  await page.locator('.item-main').first().click();
  await page.waitForSelector('#scr-write.on');
  await completePage(page);
  await page.click('#reward-next');
});

await check('뒤로 가면 동요 목록으로 돌아온다', async () => {
  await page.click('#btn-write-back');
  await page.waitForSelector('#scr-items.on');
  const prog = await page.locator('.item-main .it-prog').first().textContent();
  expect(prog.includes('1 / 4'), '항목 진행도: ' + prog);
});

await check('갤러리: 작품 2장', async () => {
  await page.click('#scr-items .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-gallery');
  await page.waitForSelector('#scr-gallery.on');
  expect(await page.locator('.art-card').count() === 2, '작품 수');
});

await check('새로고침 후 진행도·갤러리 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '2', '별 수');
  const g = await page.locator('.menu-card.c-gallery .mc-prog').textContent();
  expect(g.trim() === '2장', '갤러리 수: ' + g);
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
