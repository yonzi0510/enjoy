#!/usr/bin/env node
/* 종단 테스트 — node bag/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 세 놀이(숟가락 드래그·회전 스냅 / 빨대 높이 스냅 / 네모 조각 톡 회전) →
 * 완성 보상·펫·별 → 오답 무벌점 → 새로고침 진행도 유지 → 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/bag/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }
const dbg = page => page.evaluate(() => App.debug());

// 조각/슬라이더를 목표로 끌기 (실제 마우스 → 포인터 이벤트)
async function dragTo(page, id, to) {
  const p = (await dbg(page)).pieces.find(x => x.id === id);
  await page.mouse.move(p.client.x, p.client.y);
  await page.mouse.down();
  const dst = to || p.targetClient;
  await page.mouse.move(dst.x, dst.y, { steps: 12 });
  await page.mouse.up();
}
// 제자리에서 톡톡 눌러 방향이 맞을 때까지 회전
async function tapUntilPlaced(page, id) {
  for (let i = 0; i < 9; i++) {
    const p = (await dbg(page)).pieces.find(x => x.id === id);
    if (p.placed) return true;
    await page.mouse.click(p.client.x, p.client.y);
    await page.waitForTimeout(80);
  }
  return (await dbg(page)).pieces.find(x => x.id === id).placed;
}
async function openPuzzle(page, cardCls, puzzleId) {
  await page.click('.menu-card.' + cardCls);
  await page.waitForSelector('#scr-list.on');
  await page.click('.item-main[data-puzzle="' + puzzleId + '"]');
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 놀이 카드 3개 + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '카드 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('숟가락: 도안 30개 목록 진입', async () => {
  await page.click('.menu-card.c-spoon');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#play-list .item-main').count() === 30, '도안 수');
});

await check('숟가락(자리 맞추기): 조각을 본보기 자리에 끌면 착!', async () => {
  await page.click('.item-main[data-puzzle="sp1-1"]');
  await page.waitForSelector('#scr-spoon.on');
  const d0 = await dbg(page);
  expect(d0.total === 3 && d0.placed === 0, '3개 · 시작 0');
  await dragTo(page, d0.pieces[0].id);
  await page.waitForTimeout(300);
  const d = await dbg(page);
  expect(d.pieces[0].placed === true, '첫 조각이 자리에 놓여야 함');
  expect(d.placed === 1, '놓인 수: ' + d.placed);
});

await check('숟가락 완성 → 축하 + 별 + 펫 간식', async () => {
  const d0 = await dbg(page);
  for (const p of d0.pieces) if (!p.placed) await dragTo(page, p.id);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await dbg(page);
  expect(d.stars === 1, '별: ' + d.stars);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 1, '펫 간식: ' + JSON.stringify(pet));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#play-list .item-main .it-prog:has-text("🏅")').count() === 1, '완성 표시');
});

await check('숟가락(방향 맞추기): 끌어 놓고 톡 눌러 회전하면 착!', async () => {
  await page.click('#scr-list .back'); // 홈으로? 아니라 목록엔 뒤로가기 data-go=scr-home
  await page.waitForSelector('#scr-home.on');
  await openPuzzle(page, 'c-spoon', 'sp2-1');
  await page.waitForSelector('#scr-spoon.on');
  const d0 = await dbg(page);
  expect(d0.pieces[0].rotStep === 90, '90° 단계');
  const id = d0.pieces[0].id;
  await dragTo(page, id);                 // 자리로 끌기 (각도는 아직 안 맞음)
  await page.waitForTimeout(200);
  const mid = (await dbg(page)).pieces.find(x => x.id === id);
  expect(mid.placed === false, '각도가 안 맞으면 아직 안 놓여야 함');
  const placed = await tapUntilPlaced(page, id); // 톡톡 회전 → 착!
  expect(placed === true, '회전으로 방향 맞추면 놓여야 함');
});

await check('빨대: 도안 30개 목록 진입', async () => {
  await page.click('#btn-spoon-back');
  await page.waitForSelector('#scr-list.on');
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-straw');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#play-list .item-main').count() === 30, '도안 수');
});

await check('빨대: 슬라이더를 목표 높이로 끌면 착!', async () => {
  await page.click('.item-main[data-puzzle="st1-1"]');
  await page.waitForSelector('#scr-straw.on');
  const d0 = await dbg(page);
  expect(d0.total === 3 && d0.placed === 0, '3개 · 시작 0');
  await dragTo(page, d0.pieces[0].id);
  await page.waitForTimeout(300);
  const d = await dbg(page);
  expect(d.pieces[0].placed === true, '첫 슬라이더가 목표에 맞아야 함');
});

await check('빨대: 목표와 먼 높이는 무벌점(안 놓임·별 그대로)', async () => {
  const d0 = await dbg(page);
  const wrong = d0.pieces.find(p => !p.placed && p.target < 0.65);
  const box = await page.locator('#straw-stage').boundingBox();
  await page.mouse.move(wrong.client.x, wrong.client.y);
  await page.mouse.down();
  await page.mouse.move(wrong.client.x, box.y + 12, { steps: 10 }); // 맨 위로 (목표와 멀리)
  await page.mouse.up();
  await page.waitForTimeout(200);
  const d = await dbg(page);
  const w = d.pieces.find(p => p.id === wrong.id);
  expect(w.placed === false, '틀린 높이인데 놓임');
  expect(d.stars === 1, '오답에 별이 변함: ' + d.stars);
  expect(d.rewardOn === false, '오답인데 축하가 뜸');
});

await check('빨대 완성 → 축하 + 별 + 펫 간식', async () => {
  let d = await dbg(page);
  for (const p of d.pieces) if (!p.placed) { await dragTo(page, p.id); await page.waitForTimeout(120); }
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  d = await dbg(page);
  expect(d.stars === 2, '별: ' + d.stars);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 2, '펫 간식: ' + JSON.stringify(pet));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '2', '별 수');
  const sp = await page.locator('.menu-card.c-spoon .mc-prog').textContent();
  expect(sp.includes('1 / 30'), '숟가락 진행: ' + sp);
  const st = await page.locator('.menu-card.c-straw .mc-prog').textContent();
  expect(st.includes('1 / 30'), '빨대 진행: ' + st);
});

// ─────────── 네모 조각 놀이 ───────────
await check('네모: 도안 30개 목록 진입', async () => {
  await page.click('.menu-card.c-square');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#play-list .item-main').count() === 30, '도안 수');
});

await check('네모: 조각을 톡톡 돌려 무늬 완성 → 축하 + 별 + 펫 간식', async () => {
  await page.click('.item-main[data-puzzle="sq2-1"]');
  await page.waitForSelector('#scr-square.on');
  const d0 = await dbg(page);
  expect(d0.total === 4 && d0.placed === 0, '4개 · 시작 0');
  expect(d0.pieces.every(p => !p.matched), '시작부터 맞은 조각이 있음(돌릴 게 없음)');
  for (const p of d0.pieces) {
    const done = await tapUntilPlaced(page, p.id); // 톡톡 회전 → 제자리
    expect(done === true, '조각 ' + p.id + '을 회전으로 못 맞춤');
  }
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await dbg(page);
  expect(d.stars === 3, '별: ' + d.stars);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 3, '펫 간식: ' + JSON.stringify(pet));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#play-list .item-main .it-prog:has-text("🏅")').count() === 1, '완성 표시');
});

await check('네모: 틀린 각도는 무벌점(완성 안 됨·별 그대로)', async () => {
  await page.click('.item-main[data-puzzle="sq2-2"]');
  await page.waitForSelector('#scr-square.on');
  const d0 = await dbg(page);
  await page.mouse.click(d0.pieces[0].client.x, d0.pieces[0].client.y); // 한 번만 톡(대개 아직 안 맞음)
  await page.waitForTimeout(120);
  const d = await dbg(page);
  expect(d.placed < d.total, '한 번 돌렸는데 전부 완성됨');
  expect(d.rewardOn === false, '완성 전인데 축하가 뜸');
  expect(d.stars === 3, '오답에 별이 변함: ' + d.stars);
  await page.click('#btn-square-back');
  await page.waitForSelector('#scr-list.on');
  await page.click('#scr-list .back');
});

await check('네모: 새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '3', '별 수');
  const sq = await page.locator('.menu-card.c-square .mc-prog').textContent();
  expect(sq.includes('1 / 30'), '네모 진행: ' + sq);
});

// ─────────── 3해상도 잘림 자동 검사 ───────────
async function noOverflow(page, label) {
  const r = await page.evaluate(() => {
    const de = document.documentElement;
    const hOver = de.scrollWidth - window.innerWidth;
    const rects = [];
    document.querySelectorAll('.screen.on .sample-card, .screen.on .board-wrap, .screen.on .menu, .screen.on .items-list').forEach(el => {
      const b = el.getBoundingClientRect();
      rects.push({ right: b.right, bottom: b.bottom, top: b.top });
    });
    return { hOver, w: window.innerWidth, h: window.innerHeight, rects };
  });
  expect(r.hOver <= 1, label + ': 가로 넘침 ' + r.hOver);
  r.rects.forEach((b, i) => {
    expect(b.right <= r.w + 1, label + ': 요소 ' + i + ' 오른쪽 잘림 (' + b.right.toFixed(0) + '>' + r.w + ')');
    expect(b.bottom <= r.h + 1, label + ': 요소 ' + i + ' 아래 잘림 (' + b.bottom.toFixed(0) + '>' + r.h + ')');
  });
}
const RESO = [
  { w: 1180, h: 820, name: '패드 가로' },
  { w: 844, h: 390, name: '폰 가로' },
  { w: 390, h: 844, name: '폰 세로' },
];
for (const rz of RESO) {
  await check('잘림 검사(' + rz.name + ' ' + rz.w + '×' + rz.h + '): 홈·숟가락·빨대', async () => {
    await page.setViewportSize({ width: rz.w, height: rz.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await noOverflow(page, rz.name + '/홈');
    await openPuzzle(page, 'c-spoon', 'sp3-1');
    await page.waitForSelector('#scr-spoon.on');
    await page.waitForTimeout(150);
    await noOverflow(page, rz.name + '/숟가락');
    await page.click('#btn-spoon-back'); await page.click('#scr-list .back');
    await openPuzzle(page, 'c-straw', 'st2-1');
    await page.waitForSelector('#scr-straw.on');
    await page.waitForTimeout(150);
    await noOverflow(page, rz.name + '/빨대');
    await page.click('#btn-straw-back'); await page.click('#scr-list .back');
    await openPuzzle(page, 'c-square', 'sq3-1');
    await page.waitForSelector('#scr-square.on');
    await page.waitForTimeout(150);
    await noOverflow(page, rz.name + '/네모');
  });
}

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
