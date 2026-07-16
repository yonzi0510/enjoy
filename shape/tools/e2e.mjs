#!/usr/bin/env node
/* 종단 테스트 — node shape/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 칠교(먼 곳 드롭 무시·스냅·완성 보상·펫 간식) →
 * 새로고침 후 진행도 유지 → 빙글빙글 단계(탭 회전·각도 안 맞으면 스냅 거부·완성 시 펫 식사) →
 * 블록 퍼즐 → 도형 맞추기(틀린 자리 튕김·완성)까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/shape/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

const dbg = page => page.evaluate(() => App.debug());

// 합성 포인터 드래그 — 조각 요소에 pointerdown, 창으로 pointermove/up
async function dragPiece(page, id, to) {
  await page.evaluate(({ id, to }) => {
    const d = App.debug();
    const p = d.pieces.find(q => q.id === id);
    const el = document.querySelector('.piece[data-id="' + id + '"]');
    const ev = (type, tgt, x, y) => tgt.dispatchEvent(new PointerEvent(type, {
      pointerId: 5, pointerType: 'touch', isPrimary: true, buttons: 1,
      bubbles: true, cancelable: true, clientX: x, clientY: y,
    }));
    ev('pointerdown', el, p.client.x, p.client.y);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      ev('pointermove', document, p.client.x + (to.x - p.client.x) * i / steps,
        p.client.y + (to.y - p.client.y) * i / steps);
    }
    ev('pointerup', document, to.x, to.y);
  }, { id, to });
  await page.waitForTimeout(340); // 스르륵 이동 애니메이션이 끝날 때까지
}
// 톡 누르기 (움직이지 않고 down+up) — 빙글빙글 단계에서 45° 회전
async function tapPiece(page, id) {
  await page.evaluate(id => {
    const d = App.debug();
    const p = d.pieces.find(q => q.id === id);
    const el = document.querySelector('.piece[data-id="' + id + '"]');
    const ev = type => el.dispatchEvent(new PointerEvent(type, {
      pointerId: 5, pointerType: 'touch', isPrimary: true, buttons: 1,
      bubbles: true, cancelable: true, clientX: p.client.x, clientY: p.client.y,
    }));
    ev('pointerdown');
    ev('pointerup');
  }, id);
}
// 각도를 탭으로 맞춘 뒤 제 자리로 끌어다 놓기 (한 조각 완성)
// 제 자리 위에서 돌리다가 각도가 맞으면 앱이 바로 붙여 주므로 placed 를 함께 살핀다
async function solvePiece(page, id) {
  for (let n = 0; n < 8; n++) {
    const p = (await dbg(page)).pieces.find(q => q.id === id);
    if (p.placed || ((p.rot - p.rotTarget) % p.sym + p.sym) % p.sym === 0) break;
    await tapPiece(page, id);
  }
  const p = (await dbg(page)).pieces.find(q => q.id === id);
  if (p.placed) return;
  await dragPiece(page, id, p.targetClient);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 놀이 카드 3개', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '카드 수');
});

await check('칠교 목록: 도안 10개 (빙글빙글 5개)', async () => {
  await page.click('.menu-card.c-tan');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#puzzle-list .item-main').count() === 10, '도안 수');
  const spins = await page.locator('#puzzle-list .it-kind:has-text("빙글빙글")').count();
  expect(spins === 5, '빙글빙글 단계 수: ' + spins);
});

await check('칠교(집) 진입: 조각 7개 + 회색 실루엣', async () => {
  await page.click('#puzzle-list .item-main[data-puzzle="house"]');
  await page.waitForSelector('#scr-play.on');
  const d = await dbg(page);
  expect(d.mode === 'tan' && d.puzzle === 'house', '퍼즐: ' + d.puzzle);
  expect(d.total === 7 && d.placed === 0, '조각 수');
  expect(await page.locator('#stage .slot').count() === 7, '실루엣 조각 수');
});

await check('먼 곳에 놓으면 붙지 않는다', async () => {
  const p = (await dbg(page)).pieces[0];
  await dragPiece(page, p.id, { x: p.targetClient.x + 200, y: p.targetClient.y });
  expect(!(await dbg(page)).pieces[0].placed, '먼 곳인데 붙음');
});

await check('제 자리로 끌면 착! 스냅', async () => {
  const p = (await dbg(page)).pieces[0];
  await dragPiece(page, p.id, p.targetClient);
  const d = await dbg(page);
  expect(d.pieces[0].placed, '스냅 안 됨');
  expect(d.placed === 1, '완성 수: ' + d.placed);
  const c = d.pieces[0];
  expect(Math.hypot(c.client.x - c.targetClient.x, c.client.y - c.targetClient.y) < 2, '자리에 안 붙음');
});

await check('일곱 조각 완성 → 보상 + 별 + 펫 간식', async () => {
  for (const p of (await dbg(page)).pieces.filter(q => !q.placed)) {
    await dragPiece(page, p.id, p.targetClient);
  }
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  const d = await dbg(page);
  expect(d.placed === 7, '완성 수: ' + d.placed);
  expect(d.stars === 1, '별: ' + d.stars);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 1, '펫 간식: ' + JSON.stringify(pet));
});

await check('그만할래 → 목록에 🏅 완성 표시', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  const badge = await page.locator('#puzzle-list .item-main[data-puzzle="house"] .it-prog').textContent();
  expect(badge.includes('🏅'), '완성 표시: ' + badge);
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '1', '별 수');
  const t = await page.locator('.menu-card.c-tan .mc-prog').textContent();
  expect(t.includes('1 / 10'), '칠교 진행: ' + t);
});

await check('빙글빙글 단계(로켓): 톡 누르면 45° 회전', async () => {
  await page.click('.menu-card.c-tan');
  await page.waitForSelector('#scr-list.on');
  await page.click('#puzzle-list .item-main[data-puzzle="rocket"]');
  await page.waitForSelector('#scr-play.on');
  const before = (await dbg(page)).pieces[0].rot;
  await tapPiece(page, 't0');
  const after = (await dbg(page)).pieces[0].rot;
  expect(after === (before + 45) % 360, '회전각: ' + before + ' → ' + after);
});

await check('각도가 안 맞으면 제 자리여도 붙지 않는다', async () => {
  // t1(큰 삼각형)은 45° 어긋난 채로 나온다 — 그대로 제 자리에 놓아 본다
  const p = (await dbg(page)).pieces.find(q => q.id === 't1');
  expect(((p.rot - p.rotTarget) % 360 + 360) % 360 !== 0, '이미 맞는 각도로 나옴');
  await dragPiece(page, 't1', p.targetClient);
  expect(!(await dbg(page)).pieces.find(q => q.id === 't1').placed, '각도가 틀린데 붙음');
});

await check('탭으로 각도 맞추고 놓으면 착! → 로켓 완성 = 펫 식사', async () => {
  for (const p of (await dbg(page)).pieces.filter(q => !q.placed)) {
    await solvePiece(page, p.id);
  }
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  const d = await dbg(page);
  expect(d.placed === 7, '완성 수: ' + d.placed);
  const pet = await page.evaluate(() => Pet.state());
  expect(pet.meals === 1, '펫 식사: ' + pet.meals);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('블록 퍼즐(거북이): 격자에 착착 → 완성', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-block');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#puzzle-list .item-main').count() === 6, '도안 수');
  await page.click('#puzzle-list .item-main[data-puzzle="turtle"]');
  await page.waitForSelector('#scr-play.on');
  const d0 = await dbg(page);
  expect(d0.mode === 'block' && d0.total === 7, '조각 수: ' + d0.total);
  // 첫 조각 스냅 확인 후 전부 완성
  const p0 = d0.pieces[0];
  await dragPiece(page, p0.id, p0.targetClient);
  expect((await dbg(page)).pieces[0].placed, '블록이 격자에 안 붙음');
  for (const p of (await dbg(page)).pieces.filter(q => !q.placed)) {
    await dragPiece(page, p.id, p.targetClient);
  }
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('도형 맞추기: 틀린 자리는 부드럽게 튕겨 돌아온다', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-shape');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#puzzle-list .item-main').count() === 6, '그림 수');
  await page.click('#puzzle-list .item-main[data-puzzle="house"]');
  await page.waitForSelector('#scr-play.on');
  const d = await dbg(page);
  // 세모 지붕(s0)을 동그라미 해님(s4) 자리에 놓아 본다
  const roof = d.pieces.find(q => q.id === 's0');
  const sun = d.pieces.find(q => q.id === 's4');
  const homeX = roof.client.x, homeY = roof.client.y;
  await dragPiece(page, 's0', sun.targetClient);
  await page.waitForTimeout(400); // 튕겨 돌아오는 애니메이션
  const r2 = (await dbg(page)).pieces.find(q => q.id === 's0');
  expect(!r2.placed, '틀린 자리인데 붙음');
  expect(Math.hypot(r2.client.x - homeX, r2.client.y - homeY) < 4, '트레이로 안 돌아옴');
});

await check('도형 맞추기: 같은 모양 자리에 착! → 완성', async () => {
  for (const p of (await dbg(page)).pieces.filter(q => !q.placed)) {
    await dragPiece(page, p.id, p.targetClient);
  }
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  const d = await dbg(page);
  expect(d.placed === d.total, '완성 수: ' + d.placed + '/' + d.total);
  await page.click('#reward-close');
});

await check('가로↔세로 회전: 판·트레이 재배치 + 진행 유지 + 양쪽에서 스냅', async () => {
  await page.waitForSelector('#scr-list.on');
  await page.click('#puzzle-list .item-main[data-puzzle="train"]');
  await page.waitForSelector('#scr-play.on');
  const vb = () => page.evaluate(() => document.getElementById('stage').getAttribute('viewBox'));
  // 가로(1180×820)에서는 판 왼쪽 + 트레이 오른쪽 viewBox
  expect(await vb() === '0 0 158 92', '가로 viewBox: ' + await vb());
  let p = (await dbg(page)).pieces[0];
  await dragPiece(page, p.id, p.targetClient);
  expect((await dbg(page)).pieces[0].placed, '가로에서 스냅 안 됨');
  // 세로로 회전 — 놓인 조각은 그대로, 트레이는 아래로
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  expect(await vb() === '0 0 100 148', '세로 viewBox: ' + await vb());
  const d = await dbg(page);
  expect(d.placed === 1 && d.pieces[0].placed, '회전하며 진행이 풀림');
  // 세로에서도 이어서 스냅된다
  p = d.pieces.find(q => !q.placed);
  await dragPiece(page, p.id, p.targetClient);
  expect((await dbg(page)).pieces.find(q => q.id === p.id).placed, '세로에서 스냅 안 됨');
  // 다시 가로로 — 진행 유지
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.waitForTimeout(350);
  expect(await vb() === '0 0 158 92', '복귀 viewBox: ' + await vb());
  expect((await dbg(page)).placed === 2, '복귀 후 진행이 풀림');
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
