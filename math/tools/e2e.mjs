#!/usr/bin/env node
/* 종단 테스트 — node math/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 숫자 따라쓰기(펜 합성·손가락 리젝션·별·펫 간식) →
 * 그림 덧셈 한 판(오답 무벌점 → 정답 5개 → 보상) → 숫자 문제 오답 시 그림 힌트 →
 * 새로고침 후 진행도 유지까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/math/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 합성 포인터 스트로크 — pts 는 캔버스 비율 좌표
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
const squiggle = [[0.2, 0.35], [0.3, 0.72], [0.4, 0.35], [0.5, 0.72], [0.6, 0.35]];

async function clickAnswer(page, correct) { // 정답 또는 오답 보기 클릭
  await page.evaluate(c => {
    const ans = window.App.debug().answer;
    const btns = [...document.querySelectorAll('.choice-btn')];
    const target = c ? btns.find(b => +b.textContent === ans) : btns.find(b => +b.textContent !== ans);
    target.click();
  }, correct);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 모드 카드 5개', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 5, '카드 수');
});

await check('따라쓰기: 묶음 10개 → 1 쓰기 진입', async () => {
  await page.click('.menu-card.c-trace');
  await page.waitForSelector('#scr-groups.on');
  expect(await page.locator('#groups-list .item-main').count() === 10, '묶음 수');
  await page.locator('#groups-list .item-main').first().click();
  await page.waitForSelector('#scr-trace.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.traceNum === 1, '시작 숫자: ' + d.traceNum);
});

await check('손가락 필기는 무시되고 펜슬 안내가 뜬다', async () => {
  await stroke(page, '#ink-trace', squiggle, 'touch');
  const d = await page.evaluate(() => App.debug());
  expect(d.traceStrokes === 0, '손가락 획이 기록됨');
  await page.waitForSelector('#pen-hint.on', { timeout: 2000 });
});

await check('펜 따라쓰기 → ▶ → 별 + 펫 간식 + 다음 숫자', async () => {
  await stroke(page, '#ink-trace', zigzag(), 'pen');
  await page.click('#btn-tnext');
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  await page.click('#reward-next');
  const d = await page.evaluate(() => App.debug());
  expect(d.traceNum === 2, '다음 숫자: ' + d.traceNum);
  expect(d.stars === 1, '별: ' + d.stars);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 1, '펫 간식: ' + JSON.stringify(pet));
});

await check('안 쓰고 ▶ → 판정 없이 다음 숫자(구경)', async () => {
  await page.click('#btn-tnext');
  const d = await page.evaluate(() => App.debug());
  expect(d.traceNum === 3, '숫자: ' + d.traceNum);
});

await check('그림 덧셈: 단계 3개 → 오답은 벌점 없이 다시', async () => {
  await page.click('#scr-trace .back');
  await page.click('#scr-groups .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-addv');
  await page.waitForSelector('#scr-levels.on');
  expect(await page.locator('#levels-list .item-main').count() === 3, '단계 수');
  await page.locator('#levels-list .item-main').first().click();
  await page.waitForSelector('#scr-quiz.on');
  expect(!(await page.locator('#quiz-visual').isHidden()), '그림 셈은 그림이 보여야 함');
  await clickAnswer(page, false); // 오답
  let d = await page.evaluate(() => App.debug());
  expect(d.qIdx === 0, '오답인데 넘어감');
});

await check('정답 → 식이 채워지고 그림을 같이 세는 이해 단계', async () => {
  await clickAnswer(page, true);
  await page.waitForSelector('#btn-qnext:not([hidden])'); // 저절로 안 넘어가고 ▶ 를 기다린다
  const filled = await page.evaluate(() => ({
    what: +document.querySelector('#quiz-expr .q-what').textContent,
    ans: App.debug().answer,
  }));
  expect(filled.what === filled.ans, '식에 정답이 채워져야 함: ' + JSON.stringify(filled));
  await page.waitForTimeout(1800); // 같이 세기 시작 (하나… 둘…)
  const counted = await page.locator('#quiz-visual .count-obj .cnt').count();
  expect(counted >= 1, '세기 배지: ' + counted);
  const d = await page.evaluate(() => App.debug());
  expect(d.qIdx === 0, '아이가 누르기 전에 넘어가면 안 됨');
  await page.click('#btn-qnext');
  expect((await page.evaluate(() => App.debug())).qIdx === 1, '▶ 로 다음 문제');
});

await check('그림 덧셈: 정답 5개 → 보상 + 별 + 펫 간식', async () => {
  for (let i = 1; i < 5; i++) { // 첫 문제는 위에서 완료
    await clickAnswer(page, true);
    await page.waitForSelector('#btn-qnext:not([hidden])');
    await page.click('#btn-qnext');
  }
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.stars === 6, '별: ' + d.stars);
  const pet = await page.evaluate(() => Pet.state());
  expect(pet.snacks === 2, '펫 간식: ' + pet.snacks);
  await page.click('#reward-close'); // 그만할래 → 단계 목록
  await page.waitForSelector('#scr-levels.on');
  const prog = await page.locator('#levels-list .item-main .it-prog').first().textContent();
  expect(prog.includes('1판'), '판 수 기록: ' + prog);
});

await check('숫자 문제: 오답이면 그림 힌트가 저절로', async () => {
  await page.click('#scr-levels .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-add');
  await page.waitForSelector('#scr-levels.on');
  await page.locator('#levels-list .item-main').first().click();
  await page.waitForSelector('#scr-quiz.on');
  expect(await page.locator('#quiz-visual').isHidden(), '숫자 문제는 그림이 숨어야 함');
  await clickAnswer(page, false);
  expect(!(await page.locator('#quiz-visual').isHidden()), '오답 후 그림 힌트가 보여야 함');
  const d = await page.evaluate(() => App.debug());
  expect(d.hinted === true, '힌트 상태');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '6', '별 수');
  const t = await page.locator('.menu-card.c-trace .mc-prog').textContent();
  expect(t.includes('1 / 100'), '따라쓴 숫자: ' + t);
  const a = await page.locator('.menu-card.c-addv .mc-prog').textContent();
  expect(a.includes('1판'), '그림 덧셈 판 수: ' + a);
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
