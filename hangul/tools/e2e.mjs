#!/usr/bin/env node
/* 종단 테스트 — node hangul/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 글자 배우기 → 따라쓰기 완주 → 거품 놀이 5라운드
 * → 첫소리 놀이 5라운드 → 노래 → 카드책 → 새로고침 후 진행도 유지까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/hangul/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

// 헤드리스에는 음성 엔진이 없으므로 TTS를 즉시 끝나는 스텁으로 대체 (결정적 테스트)
await page.addInitScript(() => {
  const fake = {
    cancel() {}, getVoices() { return []; },
    speak(u) { setTimeout(() => u.onend && u.onend(), 30); },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake });
});
page.on('pageerror', e => fail('페이지 오류 없어야 함', e.message));

// pointerdown 리스너용 탭 헬퍼 (움직이는 요소도 좌표 대기 없이 즉시 발화)
async function tap(selector) {
  await page.$eval(selector, el =>
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })));
}
async function screen() { return page.evaluate(() => window.__hangulTest.curScreen()); }

console.log('▶ 가나다 한글 놀이터 E2E');
await page.goto(BASE);

await check('홈 화면이 열린다', async () => {
  expect(await page.title() === '가나다 한글 놀이터', 'title=' + await page.title());
  expect(await screen() === 'scr-home');
  expect(await page.locator('#scr-home .menu-card').count() === 5, '메뉴 5개');
});

/* ── 글자 배우기 ── */
await check('글자 배우기 → 자음 14자 그리드', async () => {
  await tap('[data-go="learn"]');
  expect(await screen() === 'scr-letters');
  expect(await page.locator('.letter-cell').count() === 14);
});
await check('모음 탭 → 10자', async () => {
  await tap('.tab[data-tab="vowels"]');
  expect(await page.locator('.letter-cell').count() === 10);
  await tap('.tab[data-tab="consonants"]');
});
await check('ㄱ 상세: 이름·낱말 3개', async () => {
  await tap('.letter-cell[data-ch="ㄱ"]');
  expect(await screen() === 'scr-letter');
  expect(await page.locator('#letter-big').textContent() === 'ㄱ');
  expect(await page.locator('#letter-name').textContent() === '기역');
  expect(await page.locator('.wordbtn').count() === 3);
});

/* ── 따라쓰기: ㄱ의 모든 획을 포인터 드래그로 완주 ── */
await check('따라쓰기 화면 진입', async () => {
  await tap('#letter-trace');
  expect(await screen() === 'scr-trace');
});
await check('전 획 드래그 → 완성 + 카드 보상', async () => {
  for (let stroke = 0; stroke < 10; stroke++) {
    const st = await page.evaluate(() => window.__hangulTest.traceState());
    if (st.done) break;
    const path = await page.evaluate(() => window.__hangulTest.tracePath());
    expect(path && path.length > 1, '획 경로가 있어야 함');
    await page.mouse.move(path[0][0], path[0][1]);
    await page.mouse.down();
    for (const [x, y] of path) await page.mouse.move(x, y);
    await page.mouse.up();
  }
  const st = await page.evaluate(() => window.__hangulTest.traceState());
  expect(st.done, '완성되지 않음: ' + JSON.stringify(st));
  await page.locator('#reward.on').waitFor({ timeout: 5000 });
  expect(await page.locator('#reward-word').textContent() !== '');
});
await check('보상 닫기 → 따라쓰기 그리드에 ⭐ 표시', async () => {
  await tap('#reward-close');
  expect(await screen() === 'scr-letters');
  expect(await page.locator('.letter-cell[data-ch="ㄱ"].traced').count() === 1);
});

/* ── 모음 따라쓰기(ㅣ, 한 획)도 확인 ── */
await check('모음 ㅣ 따라쓰기 완주', async () => {
  await tap('.tab[data-tab="vowels"]');
  await tap('.letter-cell[data-ch="ㅣ"]');
  const path = await page.evaluate(() => window.__hangulTest.tracePath());
  await page.mouse.move(path[0][0], path[0][1]);
  await page.mouse.down();
  for (const [x, y] of path) await page.mouse.move(x, y);
  await page.mouse.up();
  const st = await page.evaluate(() => window.__hangulTest.traceState());
  expect(st.done);
  await page.locator('#reward.on').waitFor({ timeout: 5000 });
  await tap('#reward-close');
});

/* ── 거품 놀이 5라운드 ── */
await check('거품 놀이 5라운드 → 보상', async () => {
  await tap('.back[data-go="scr-home"]');
  await tap('[data-go="scr-games"]');
  await tap('[data-go="scr-bubble"]');
  expect(await screen() === 'scr-bubble');
  for (let r = 0; r < 5; r++) {
    await page.waitForFunction(() =>
      window.__hangulTest.bubbleTarget() &&
      document.querySelector('.bubble[data-ch="' + window.__hangulTest.bubbleTarget() + '"]'),
      { timeout: 5000 });
    const target = await page.evaluate(() => window.__hangulTest.bubbleTarget());
    expect((await page.locator('.bubble').count()) === 5, '거품 5개');
    await tap('.bubble[data-ch="' + target + '"]');
    await page.waitForTimeout(1000);
  }
  await page.locator('#reward.on').waitFor({ timeout: 5000 });
  await tap('#reward-close');
  expect(await screen() === 'scr-games');
});

/* ── 첫소리 놀이 5라운드 ── */
await check('첫소리 놀이 5라운드 → 보상', async () => {
  await tap('[data-go="scr-first"]');
  expect(await screen() === 'scr-first');
  for (let r = 0; r < 5; r++) {
    await page.waitForFunction(() =>
      window.__hangulTest.firstTarget() &&
      document.querySelector('.choice[data-ch="' + window.__hangulTest.firstTarget() + '"]'),
      { timeout: 5000 });
    const t = await page.evaluate(() => window.__hangulTest.firstTarget());
    expect((await page.locator('.choice').count()) === 3, '보기 3개');
    await tap('.choice[data-ch="' + t + '"]');
    await page.waitForTimeout(1250);
  }
  await page.locator('#reward.on').waitFor({ timeout: 5000 });
  await tap('#reward-close');
});

/* ── 가나다 노래 ── */
await check('가나다 노래: 그리드·재생·하이라이트', async () => {
  await tap('.back[data-go="scr-home"]');
  await tap('[data-go="scr-song"]');
  expect(await page.locator('.song-cell').count() === 14);
  await tap('#song-play');
  await page.locator('.song-cell.lit').first().waitFor({ timeout: 5000 });
  await tap('#song-play'); // 멈추기
  await tap('.tab[data-mode="vowels"]');
  expect(await page.locator('.song-cell').count() === 10);
});

/* ── 카드책 ── */
await check('카드책에 모은 카드 표시', async () => {
  await tap('.back[data-go="scr-home"]');
  await tap('[data-go="scr-cards"]');
  const ownedCount = await page.locator('.wordcard:not(.locked)').count();
  expect(ownedCount >= 3, '따라쓰기 2회+게임 2회 보상 → 최소 3장이어야 함 (중복 허용), 실제 ' + ownedCount);
  const label = await page.locator('#cards-count').textContent();
  expect(new RegExp('^' + ownedCount + ' / \\d+$').test(label), '개수 표기: ' + label);
});

/* ── 진행도 유지 ── */
await check('새로고침 후 별·카드 유지', async () => {
  await page.goto(BASE);
  const stars = Number(await page.locator('#home-stars').textContent());
  const cards = Number(await page.locator('#home-cards').textContent());
  expect(stars >= 6 + 10, '별 부족: ' + stars);   // 따라쓰기 3×2 + 게임 5×2
  expect(cards >= 3, '카드 부족: ' + cards);
});

await browser.close();
console.log('\n결과: ' + passed + ' 통과, ' + failed + ' 실패');
process.exit(failed ? 1 : 0);
