#!/usr/bin/env node
/* 종단 테스트 — node slide/tools/e2e.mjs
 * 실제 Chromium 으로 홈 → 퍼즐 목록 → 놀이(본보기 카드·4열) → App._solve() 완성·별·펫,
 * 잘못된 이동(가득 찬 열에 놓기) 무벌점, 단계별 별 증가, 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 낙서장 차림새(흩뿌린 첫 화면·크기 위계·시작 화살표·손그림 아이콘·손그림 테두리)와
 * 놀이 판이 회전·확대 없이 그대로인지, 공용 집 단추가 머리줄을 덮지 않는지도 함께 잰다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/slide/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 저장된 정답 이동을 재생해 완성 (App._solve 는 240ms 간격)
async function solveAll(page) {
  await page.evaluate(() => App._solve());
  await page.waitForSelector('#reward.on', { timeout: 6000 });
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

await check('낙서장 첫 화면: 손그림 아이콘 + 시작 화살표 + 크기 위계 + 흩뿌리기', async () => {
  // 이모지 대신 손그림 SVG (제목·별·목소리 단추)
  expect(await page.locator('h1 svg use[href="#sl-title"]').count() === 1, '제목 손그림이 없음');
  expect(await page.locator('.stat svg use[href="#sl-star"]').count() === 1, '별 손그림이 없음');
  expect(await page.locator('#btn-voice svg use[href="#sl-talk"]').count() === 1, '목소리 손그림이 없음');
  // 제목에서 첫 놀이로 향하는 점선 화살표 — 첫 칸에만 하나
  expect(await page.locator('#menu .start-arrow').count() === 1, '시작 화살표가 없음');
  expect(await page.locator('.menu-card.c-l1 .start-arrow').count() === 1, '화살표가 첫 칸을 가리키지 않음');
  // 크기 위계: 쉬운 > 보통 > 어려운 (가장 먼저 할 것이 가장 크다)
  const w = async sel => (await page.locator(sel).boundingBox()).width;
  const [w1, w2, w3] = [await w('.menu-card.c-l1'), await w('.menu-card.c-l2'), await w('.menu-card.c-l3')];
  expect(w1 > w2 && w2 > w3, '단계 카드 크기 위계: ' + [w1, w2, w3].map(Math.round).join(' > '));
  // 흩뿌리기: 칸마다 다른 기울기·자리 (줄 맞춰 있으면 앱처럼 보인다)
  const tf = await page.evaluate(() =>
    [...document.querySelectorAll('#menu .menu-card')].map(el => getComputedStyle(el).transform));
  expect(tf.every(t => t && t !== 'none'), '칸이 흩뿌려지지 않음: ' + tf.join(' | '));
  expect(new Set(tf).size === tf.length, '칸이 모두 같은 각도로 기울어짐');
});

await check('공용 집 단추: 앱 안 작은 🏠 는 숨고, 머리줄과 겹치지 않는다', async () => {
  expect(await page.locator('.enjoy-home-btn').count() === 1, '공용 집 단추가 없음');
  const dup = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.home-head a[href="../"]')).display);
  expect(dup === 'none', '앱 안 작은 🏠 가 아직 보임: ' + dup);
  const hit = await page.evaluate(() => {
    const r = el => el.getBoundingClientRect();
    const hb = r(document.querySelector('.enjoy-home-btn'));
    const over = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    return [...document.querySelectorAll('.screen.on h1, .screen.on .stat, .screen.on .vs-btn')]
      .filter(el => getComputedStyle(el).display !== 'none' && over(r(el), hb))
      .map(el => el.className || el.tagName);
  });
  expect(hit.length === 0, '집 단추가 머리줄을 덮음: ' + hit.join(', '));
});

await check('퍼즐 목록: 단계1 퍼즐 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('진입: 본보기 카드(4열)·놀이 판(4열) 표시', async () => {
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.level === 1, '단계1: ' + d.level);
  expect(await page.locator('#goal-card-body .gc-col').count() === 4, '본보기 카드 열 수');
  expect(await page.locator('#board .col').count() === 4, '놀이 판 열 수');
  expect(d.columns.length === 4 && d.target.length === 4, '열 상태 4개');
});

await check('낙서장 놀이 화면: 손그림 테두리 + 두툼한 단면 없음, 판·조각은 변형 없음', async () => {
  // 열(튜브)·본보기 열의 테두리는 CSS 상자가 아니라 손그림 SVG 로 긋는다
  expect(await page.locator('#board .col > svg.col-frame').count() === 4, '열의 손그림 테두리가 없음');
  expect(await page.locator('#goal-card-body .gc-col > svg.gc-frame').count() === 4, '본보기 열의 손그림 테두리가 없음');
  const shadows = await page.evaluate(() =>
    ['#board .col', '#goal-card', '#goal-card-body .gc-col']
      .map(s => [s, getComputedStyle(document.querySelector(s)).boxShadow]));
  shadows.forEach(([s, v]) => expect(v === 'none', s + ' 에 두툼한 색 단면이 남아 있음 — ' + v));
  // ⚠️ 옮기기 판정이 틀어지므로 판과 조각에는 회전·크기 변형이 없어야 한다
  const tf = await page.evaluate(() =>
    [...document.querySelectorAll('#board, #board .col, #board .chip')].map(el => getComputedStyle(el).transform));
  expect(tf.every(t => t === 'none'), '판·조각에 변형이 걸림: ' + tf.join(' | '));
  // 조각의 색·모양(색맹 대비)은 그대로 — 네 색이 각기 다른 모양을 지닌다
  const shapes = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('#goal-card-body .gc-col').forEach((c, i) => {
      const g = c.querySelector('.gc-chip svg g');
      out[i] = (g.firstElementChild.tagName + ':' + (g.getAttribute('stroke') || ''));
    });
    return out;
  });
  expect(new Set(Object.values(shapes)).size === 4, '네 색의 구분 모양이 서로 달라야 함: ' + JSON.stringify(shapes));
});

await check('잘못된 이동 무벌점: 가득 찬 열에 놓기는 무시(변화·완성·별 없음)', async () => {
  const before = await page.evaluate(() => App.debug());
  const fullIdx = before.columns.findIndex(c => c.length >= 4); // CAPACITY=4 로 시작하는 열
  expect(fullIdx >= 0, '테스트용 가득 찬 시작 열이 없음');
  const fromIdx = before.columns.findIndex((c, i) => i !== fullIdx && c.length > 0);
  // from 열 선택 → 가득 찬 열 탭(거부)
  await page.locator('#board .col').nth(fromIdx).click();
  await page.waitForTimeout(80);
  await page.locator('#board .col').nth(fullIdx).click();
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => App.debug());
  expect(JSON.stringify(after.columns) === JSON.stringify(before.columns), '거부돼야 하는데 열 상태가 바뀜');
  expect(after.locked === false, '잘못된 이동에 완성 잠금');
  expect(after.matched === false, '잘못된 이동에 완성 판정');
  expect(after.stars === before.stars, '잘못된 이동에 별 증가: ' + before.stars + '→' + after.stars);
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '잘못된 이동에 축하가 뜸');
});

await check('App._solve() → 완성 → 축하·별(단계1=3)·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  const starsBefore = await page.evaluate(() => App.debug().stars);
  await solveAll(page);
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.matched === true, '목표 도달');
  expect(d.done === true, '퍼즐 완료 저장');
  expect(d.stars === starsBefore + 3, '별(단계1=3): ' + starsBefore + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 목록
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 진입·완성 시 별이 4 늘어난다', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.level === 2, '단계2: ' + d.level);
  expect(d.solutionLen >= 3 && d.solutionLen <= 4, '단계2 이동 수: ' + d.solutionLen);
  const before = await page.evaluate(() => App.debug().stars);
  await solveAll(page);
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 4, '별 증가(단계2=4): ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3: 진입, 이동 수 5+ ', async () => {
  await page.click('#scr-list .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.level === 3, '단계3: ' + d.level);
  expect(d.solutionLen >= 5, '단계3 이동 수 5+: ' + d.solutionLen);
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '7', '별 수(3+4)');
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
    await page.click('.menu-card.c-l3'); // 가장 섞인 단계로 빡세게
    await page.waitForSelector('#scr-list.on');
    await page.click('#list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(120);
    const m = await page.evaluate(() => ({
      horiz: document.documentElement.scrollWidth - window.innerWidth,
      boardBottom: document.querySelector('#board').getBoundingClientRect().bottom,
      goalTop: document.querySelector('#goal-card').getBoundingClientRect().top,
      ih: window.innerHeight,
    }));
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.boardBottom <= m.ih + 2, s.name + ': 놀이 판이 화면 아래로 잘림 ' + m.boardBottom + ' > ' + m.ih);
    expect(m.goalTop >= -2, s.name + ': 본보기 카드가 위로 잘림 ' + m.goalTop);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
