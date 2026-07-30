#!/usr/bin/env node
/* 종단 테스트 — node beads/tools/e2e.mjs
 * 실제 Chromium 으로 홈 → 퍼즐 목록 → 퍼즐 진입 → 카드대로 색 구슬 채우기 → 완성·축하·별·펫,
 * 틀린 색 무벌점, 단계별 격자(3/4/5), 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/beads/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

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
  expect(await page.locator('#list-box .pz-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('퍼즐 진입: 본보기 카드·보드·팔레트 표시, 3×3 빈 보드', async () => {
  await page.click('#list-box .pz-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.size === 3, '단계1 격자: ' + d.size);
  expect(d.target.length === 9, '셀 수: ' + d.target.length);
  expect(d.board.every(c => c === null), '보드가 처음엔 비어야 함');
  expect(await page.locator('#sample-holder .bead-grid.is-card .cell').count() === 9, '본보기 셀 수');
  expect(await page.locator('#board-holder .bead-grid.is-board .cell').count() === 9, '보드 셀 수');
  expect(await page.locator('#palette .pal-bead').count() === 6, '팔레트 구슬 6종');
});

await check('틀린 색 무벌점: 다른 색을 놓으면 안 박히고 축하도 없다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  // 색이 있는 첫 칸을 찾아 target 과 다른 색을 놓는다
  const res = await page.evaluate(() => {
    const d = App.debug();
    const i = d.target.findIndex(c => c !== null);
    const wrong = App.debug().selected;
    // target[i] 와 다른 색을 고른다
    const others = ['red','orange','yellow','green','blue','purple'].filter(c => c !== d.target[i]);
    App._place(i, others[0]);
    return { i, target: d.target[i], placed: others[0] };
  });
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => App.debug());
  expect(d.filled === 0, '틀린 색인데 구슬이 박힘: filled=' + d.filled);
  expect(d.board[res.i] === null, '틀린 칸이 채워짐');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 뜸');
  expect(consoleErrors.length === 0, '무벌점 중 콘솔 오류: ' + consoleErrors.join(' | '));
});

await check('카드대로 채우기 → 완성 → 축하·별·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  const beadCount = await page.evaluate(() => App.debug().beadCount);
  await page.evaluate(() => App._solve());
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.filled === d.beadCount, '전부 채움: ' + d.filled + '/' + d.beadCount);
  expect(d.stars === beadCount, '별(구슬 수 만큼): ' + d.stars + ' vs ' + beadCount);
  expect(d.done === true, '퍼즐 완료 저장');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 목록
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list-box .pz-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 격자 4×4', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list-box .pz-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.size === 4, '단계2 격자: ' + d.size);
  expect(d.target.length === 16, '셀 수: ' + d.target.length);
  expect(await page.locator('#board-holder .bead-grid.is-board .cell').count() === 16, '보드 셀 수');
});

await check('단계2 완성: 별이 구슬 수만큼 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  const beadCount = await page.evaluate(() => App.debug().beadCount);
  await page.evaluate(() => App._solve());
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + beadCount, '별 증가: ' + before + '→' + after + ' (구슬 ' + beadCount + ')');
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3: 격자 5×5 (잘림 없이)', async () => {
  await page.click('#scr-list .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list-box .pz-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.size === 5, '단계3 격자: ' + d.size);
  expect(d.target.length === 25, '셀 수: ' + d.target.length);
  expect(await page.locator('#board-holder .bead-grid.is-board .cell').count() === 25, '보드 셀 수');
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지', async () => {
  const beforeStars = await page.evaluate(() => Number(document.querySelector('#home-stars')?.textContent || 0));
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  const stars = Number(await page.locator('#home-stars').textContent());
  expect(stars > 0, '별이 0이 아님: ' + stars);
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
    await page.click('.menu-card.c-l3'); // 가장 큰 5×5 로 빡세게
    await page.waitForSelector('#scr-list.on');
    await page.click('#list-box .pz-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(120);
    const m = await page.evaluate(() => {
      const board = document.querySelector('.bead-grid.is-board').getBoundingClientRect();
      const pal = document.querySelector('#palette').getBoundingClientRect();
      const card = document.querySelector('.bead-grid.is-card').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        boardBottom: board.bottom, boardTop: board.top,
        palBottom: pal.bottom,
        cardBottom: card.bottom,
        ih: window.innerHeight,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.boardTop >= -2, s.name + ': 보드가 위로 잘림 ' + m.boardTop);
    expect(m.palBottom <= m.ih + 2, s.name + ': 팔레트가 화면 아래로 잘림 ' + m.palBottom + ' > ' + m.ih);
    expect(m.boardBottom <= m.ih + 2, s.name + ': 보드가 화면 아래로 잘림 ' + m.boardBottom + ' > ' + m.ih);
    expect(m.cardBottom <= m.ih + 2, s.name + ': 본보기 카드가 아래로 잘림 ' + m.cardBottom + ' > ' + m.ih);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
