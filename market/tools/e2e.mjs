#!/usr/bin/env node
/* 종단 테스트 — node market/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 단계 잠금 → 1단계 가게(주문 표시 → 상품 드래그 → 동전 지불:
 * 모자람 안내·초과 안내·정확 지불 성공) → 손님 5명 접객 보상(별·펫) →
 * 새로고침 후 진행도 유지 → 2단계 해금·500원 동전까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/market/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 합성 포인터 드래그 — 원소 가운데에서 목적지 가운데로 (앱의 window 리스너와 맞물린다)
async function dragTo(page, srcSel, dstSel) {
  await page.evaluate(({ srcSel, dstSel }) => {
    const s = document.querySelector(srcSel), d = document.querySelector(dstSel);
    if (!s || !d) throw new Error('드래그 대상 없음: ' + srcSel + ' → ' + dstSel);
    const sr = s.getBoundingClientRect(), dr = d.getBoundingClientRect();
    const ev = (type, el, x, y) => el.dispatchEvent(new PointerEvent(type, {
      pointerId: 3, pointerType: 'touch', isPrimary: true, buttons: 1,
      bubbles: true, cancelable: true, clientX: x, clientY: y,
    }));
    const sx = sr.left + sr.width / 2, sy = sr.top + sr.height / 2;
    const dx = dr.left + dr.width / 2, dy = dr.top + dr.height / 2;
    ev('pointerdown', s, sx, sy);
    for (let i = 1; i <= 5; i++) ev('pointermove', window, sx + (dx - sx) * i / 5, sy + (dy - sy) * i / 5);
    ev('pointerup', window, dx, dy);
  }, { srcSel, dstSel });
}
const dbg = page => page.evaluate(() => App.debug());

// 주문 상품을 전부 장바구니에 담는다
async function pickOrder(page) {
  const d = await dbg(page);
  for (const id of d.shop.order) {
    await dragTo(page, '.shelf-item[data-id="' + id + '"]', '#basket');
  }
}
// 가격만큼 동전을 정확히 낸다 (500원 먼저, 나머지 100원)
async function payExact(page) {
  let d = await dbg(page);
  while (d.shop.phase === 'pay' && d.shop.paid < d.shop.price) {
    const left = d.shop.price - d.shop.paid;
    const v = (left >= 500 && await page.locator('.coin-src[data-v="500"]').count()) ? 500 : 100;
    await dragTo(page, '.coin-src[data-v="' + v + '"]', '#counter');
    d = await dbg(page);
  }
}
// 손님 한 명 접객 완료를 기다린다
async function waitServed(page, n) {
  await page.waitForFunction(
    n => { const d = App.debug(); return d.shop && d.shop.custIdx === n; },
    n, { timeout: 8000 });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // 폰 세로 기준
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 가게 카드 3개 + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '카드 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('잠긴 가게는 열리지 않는다 (2·3단계 🔒)', async () => {
  expect(await page.locator('.menu-card.c-l2.locked').count() === 1, '2단계가 잠겨 있어야 함');
  expect(await page.locator('.menu-card.c-l3.locked').count() === 1, '3단계가 잠겨 있어야 함');
  await page.click('.menu-card.c-l2');
  await page.waitForTimeout(300);
  expect(await page.locator('#scr-home.on').count() === 1, '잠긴 가게로 들어가짐');
});

await check('1단계 진입: 손님 주문 표시 + 진열 6개 + 동전 가격표', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-shop.on');
  const d = await dbg(page);
  expect(d.shop && d.shop.level === 1 && d.shop.phase === 'pick', '상태: ' + JSON.stringify(d.shop));
  expect(d.shop.order.length === 1, '주문 개수');
  expect(await page.locator('#shelf .shelf-item').count() === 6, '진열 상품 수');
  const bubble = await page.locator('#bubble .bb-text').textContent();
  expect(bubble && bubble.length > 2, '주문 말풍선: ' + bubble);
  expect(await page.locator('.shelf-item .si-price .coin').count() > 0, '동전 가격표가 없음');
  // 주문 상품이 진열대에 있어야 한다
  expect(await page.locator('.shelf-item[data-id="' + d.shop.order[0] + '"]').count() === 1, '주문 상품이 진열대에 없음');
});

await check('틀린 상품 드래그 → 담기지 않고 부드럽게 되돌아간다', async () => {
  const d = await dbg(page);
  const wrongId = await page.evaluate(oid =>
    [...document.querySelectorAll('.shelf-item')].map(el => el.dataset.id).find(id => id !== oid),
    d.shop.order[0]);
  await dragTo(page, '.shelf-item[data-id="' + wrongId + '"]', '#basket');
  const d2 = await dbg(page);
  expect(d2.shop.picked.length === 0, '틀린 상품이 담김');
  expect(d2.shop.phase === 'pick', '단계가 넘어감');
  await page.waitForSelector('#guide.on', { timeout: 2000 }); // 부드러운 안내
});

await check('맞는 상품 드래그 → 장바구니에 쏙 + 지불 단계 시작', async () => {
  await pickOrder(page);
  const d = await dbg(page);
  expect(d.shop.picked.length === 1, '담긴 수');
  expect(d.shop.phase === 'pay', '지불 단계로 안 넘어감');
  expect(await page.locator('#basket .basket-slot.got').count() === 1, '장바구니 표시');
  expect(!(await page.locator('#pay-row').isHidden()), '동전 지갑이 보여야 함');
  expect(await page.locator('#price-guide .coin').count() >= 1, '가격표 동전 안내');
});

await check('동전이 모자란 채 "다 냈어요" → 부드러운 안내 + 그대로', async () => {
  await page.click('#btn-pay'); // 동전 0개
  await page.waitForSelector('#guide.on', { timeout: 2000 });
  const g = await page.locator('#guide').textContent();
  expect(g.includes('모자라'), '안내 문구: ' + g);
  const d = await dbg(page);
  expect(d.shop.phase === 'pay' && d.shop.custIdx === 0, '틀렸는데 넘어감');
});

await check('동전 정확 지불 → 하트 + 고맙습니다 + 다음 손님', async () => {
  await payExact(page);
  const d = await dbg(page);
  expect(d.shop.paid === d.shop.price, '지불액: ' + d.shop.paid + ' / ' + d.shop.price);
  expect(d.shop.phase === 'done', '성공 처리 안 됨');
  expect(await page.locator('.cust-row .heart').count() >= 1, '하트가 안 떴음');
  await waitServed(page, 1); // 다음 손님 등장
  expect((await dbg(page)).shop.phase === 'pick', '다음 손님 주문이 안 옴');
});

await check('손님 5명 접객 → 보상 + 별 5개 + 펫 식사·간식', async () => {
  for (let n = 1; n < 5; n++) { // 첫 손님은 위에서 완료
    await pickOrder(page);
    await payExact(page);
    if (n < 4) await waitServed(page, n + 1);
  }
  await page.waitForSelector('#reward.on', { timeout: 8000 });
  const d = await dbg(page);
  expect(d.stars === 5, '별: ' + d.stars);
  expect(d.rounds.l1 === 1, '판 수: ' + JSON.stringify(d.rounds));
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.meals === 1, '펫 식사(한 판 완주): ' + JSON.stringify(pet));
  expect(pet.snacks === 2, '펫 간식(2명당 1개): ' + pet.snacks);
});

await check('보상 닫기 → 홈: 판 수 표시 + 2단계 해금', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-home.on');
  const prog = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(prog.includes('1판'), '판 수 기록: ' + prog);
  expect(await page.locator('.menu-card.c-l2.locked').count() === 0, '2단계가 아직 잠김');
  expect(await page.locator('.menu-card.c-l3.locked').count() === 1, '3단계는 아직 잠겨 있어야 함');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '5', '별 수');
  const prog = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(prog.includes('1판'), '판 수: ' + prog);
  expect(await page.locator('.menu-card.c-l2.locked').count() === 0, '2단계 해금이 풀림');
});

await check('2단계: 500원 동전 등장 + 초과 지불은 부드럽게 되돌린다', async () => {
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-shop.on');
  await pickOrder(page);
  expect(await page.locator('.coin-src[data-v="500"]').count() === 1, '500원 동전이 없음');
  expect(await page.locator('.coin-src[data-v="100"]').count() === 1, '100원 동전이 없음');
  // 일부러 초과: 가격이 500원이면 100원을 먼저 놓고 500원 → 어떤 가격(500~900)이든 넘친다
  const d = await dbg(page);
  if (d.shop.price <= 500) await dragTo(page, '.coin-src[data-v="100"]', '#counter');
  await dragTo(page, '.coin-src[data-v="500"]', '#counter');
  await dragTo(page, '.coin-src[data-v="500"]', '#counter');
  const d2 = await dbg(page);
  expect(d2.shop.paid < d2.shop.price, '초과 동전이 놓임: ' + d2.shop.paid + ' / ' + d2.shop.price);
  expect(d2.shop.phase === 'pay' && d2.shop.custIdx === 0, '틀렸는데 넘어감');
  await page.waitForSelector('#guide.on', { timeout: 2000 });
  const g = await page.locator('#guide').textContent();
  expect(g.includes('많아'), '안내 문구: ' + g);
  // 이어서 정확히 내면 성공한다
  await payExact(page);
  expect((await dbg(page)).shop.phase === 'done', '초과 후 정확 지불이 안 됨');
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
