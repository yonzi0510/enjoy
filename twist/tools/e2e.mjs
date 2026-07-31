#!/usr/bin/env node
/* 종단 테스트 — node twist/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계3) → 퍼즐 목록(10) → 놀이 진입(카드·돌림 블록),
 * _spin 으로 실린더를 정답까지 돌려 완성·별·펫 간식, 부분일치 무벌점(완성 안 됨),
 * 단계별 실린더 수(2/3/4), 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/twist/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 실린더 i를 targetCurrent 상태에서 target까지 한 스텝씩 돌린다
async function spinTo(page, i, target, current, faceLen) {
  const steps = ((target - current) % faceLen + faceLen) % faceLen;
  for (let k = 0; k < steps; k++) {
    await page.evaluate((idx) => App._spin(idx), i);
    await page.waitForTimeout(40);
  }
}
// 현재 퍼즐을 완전히 맞춘다(모든 실린더를 target까지 돌린다)
async function solveAll(page) {
  const d = await page.evaluate(() => App.debug());
  for (let i = 0; i < d.cylinders.length; i++) {
    const c = d.cylinders[i];
    await spinTo(page, i, c.target, c.current, c.faces.length);
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
  await page.waitForSelector('#scr-rounds.on');
  expect(await page.locator('#rounds-list .round-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#rounds-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('놀이 진입: 본보기 카드·실린더 2개(단계1) — 처음엔 미완성', async () => {
  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.cylinderCount === 2, '단계1 실린더 수: ' + d.cylinderCount);
  expect(d.solved === false, '시작부터 완성 상태면 안 됨');
  expect(d.locked === false, '시작부터 잠겨 있으면 안 됨');
  // 본보기 카드에 실린더 수만큼 그림이 그려진다
  expect(await page.locator('#find-faces .cyl-face.find').count() === 2, '카드 얼굴 수');
  expect(await page.locator('#cyl-row .cyl-btn').count() === 2, '실린더 버튼 수');
  // 각 실린더 얼굴 수가 4개(단계1 규칙)
  d.cylinders.forEach(c => expect(c.faces.length === 4, '단계1 얼굴 수: ' + c.faces.length));
});

await check('돌리기: _spin 이 얼굴 배열을 순환한다', async () => {
  const before = await page.evaluate(() => App.debug().cylinders[0].current);
  await page.evaluate(() => App._spin(0));
  await page.waitForTimeout(60);
  const after = await page.evaluate(() => App.debug().cylinders[0].current);
  const faceLen = await page.evaluate(() => App.debug().cylinders[0].faces.length);
  expect(after === (before + 1) % faceLen, '한 스텝 순환: ' + before + '→' + after);
  // 계속 돌리면 원래 자리로 돌아온다(순환 확인)
  for (let k = 0; k < faceLen - 1; k++) await page.evaluate(() => App._spin(0));
  await page.waitForTimeout(60);
  const wrapped = await page.evaluate(() => App.debug().cylinders[0].current);
  expect(wrapped === before, '한 바퀴 돌면 원래 자리: ' + wrapped);
});

await check('부분일치 무벌점: 실린더 하나만 맞춰도 완성되지 않는다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const c0 = d0.cylinders[0];
  await spinTo(page, 0, c0.target, c0.current, c0.faces.length);
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => App.debug());
  expect(d.cylinders[0].current === d.cylinders[0].target, '실린더0은 맞춰짐');
  expect(d.solved === false, '하나만 맞았는데 전체 완성 처리됨');
  expect(d.locked === false, '하나만 맞았는데 잠김');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '아직인데 축하가 뜸');
});

await check('전부 맞추면 완성 → 별(=실린더 수)·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  const before = await page.evaluate(() => App.debug());
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.solved === true, '전체 완성');
  expect(d.done === true, '퍼즐 완료 저장');
  expect(d.stars === before.stars + d.cylinderCount, '별 증가(실린더 수만큼): ' + before.stars + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 퍼즐 목록
  await page.waitForSelector('#scr-rounds.on');
  expect(await page.locator('#rounds-list .round-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#rounds-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 실린더 3개 · 얼굴 4~5개 · 동물+공룡', async () => {
  await page.click('#scr-rounds .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-rounds.on');
  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.cylinderCount === 3, '단계2 실린더 수: ' + d.cylinderCount);
  d.cylinders.forEach(c => expect(c.faces.length >= 4 && c.faces.length <= 5, '단계2 얼굴 수: ' + c.faces.length));
});

await check('단계2 완성: 별이 실린더 수만큼 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  const need = await page.evaluate(() => App.debug().cylinderCount);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + need, '별 증가: ' + before + '→' + after + ' (필요 ' + need + ')');
  await page.click('#reward-close');
  await page.waitForSelector('#scr-rounds.on');
});

await check('단계3: 실린더 4개 · 얼굴 5~6개 · 섞인 테마', async () => {
  await page.click('#scr-rounds .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-rounds.on');
  expect(await page.locator('#rounds-list .round-card').count() === 10, '단계3 퍼즐 10개');
  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.cylinderCount === 4, '단계3 실린더 수: ' + d.cylinderCount);
  d.cylinders.forEach(c => expect(c.faces.length >= 5 && c.faces.length <= 6, '단계3 얼굴 수: ' + c.faces.length));
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-rounds.on');
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
    await page.click('.menu-card.c-l3'); // 실린더가 가장 많은 단계로 빡세게
    await page.waitForSelector('#scr-rounds.on');
    await page.click('#rounds-list .round-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const stage = document.querySelector('#play-stage').getBoundingClientRect();
      const row = document.querySelector('#cyl-row').getBoundingClientRect();
      const card = document.querySelector('#find-card').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        rowBottom: row.bottom, rowRight: row.right, rowLeft: row.left,
        cardTop: card.top, cardLeft: card.left,
        stageTop: stage.top,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.rowBottom <= m.ih + 2, s.name + ': 돌림 블록이 아래로 잘림 ' + m.rowBottom + ' > ' + m.ih);
    expect(m.rowRight <= m.iw + 2, s.name + ': 돌림 블록이 옆으로 잘림 ' + m.rowRight + ' > ' + m.iw);
    expect(m.rowLeft >= -2, s.name + ': 돌림 블록이 옆으로 잘림 ' + m.rowLeft);
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
