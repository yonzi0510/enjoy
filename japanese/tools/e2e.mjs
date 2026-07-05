#!/usr/bin/env node
/* 종단 테스트 — node japanese/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 글자 배우기 → 따라쓰기(あ + 전체 46자 완주) → 거품 놀이
 * → 첫소리 놀이 → 노래 → 카드책 → 새로고침 후 진행도 유지까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/japanese/';
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
async function screen() { return page.evaluate(() => window.__kanaTest.curScreen()); }
async function traceCurrent() {
  for (let stroke = 0; stroke < 12; stroke++) {
    const st = await page.evaluate(() => window.__kanaTest.traceState());
    if (st.done) break;
    const path = await page.evaluate(() => window.__kanaTest.tracePath());
    expect(path && path.length > 1, '획 경로가 있어야 함');
    await page.mouse.move(path[0][0], path[0][1]);
    await page.mouse.down();
    for (const [x, y] of path) await page.mouse.move(x, y);
    await page.mouse.up();
  }
  return page.evaluate(() => window.__kanaTest.traceState());
}

console.log('▶ あいうえお 일본어 놀이터 E2E');
await page.goto(BASE);

await check('홈 화면이 열린다', async () => {
  expect(await page.title() === 'あいうえお 일본어 놀이터', 'title=' + await page.title());
  expect(await screen() === 'scr-home');
  expect(await page.locator('#scr-home .menu-card').count() === 5, '메뉴 5개');
});

/* ── 글자 배우기 ── */
await check('글자 배우기 → あ〜な 25자 그리드', async () => {
  await tap('[data-go="learn"]');
  expect(await screen() === 'scr-letters');
  expect(await page.locator('.letter-cell').count() === 25);
});
await check('は〜ん 탭 → 21자', async () => {
  await tap('.tab[data-tab="b"]');
  expect(await page.locator('.letter-cell').count() === 21);
  await tap('.tab[data-tab="a"]');
});
await check('あ 상세: 이름·낱말 2개', async () => {
  await tap('.letter-cell[data-ch="あ"]');
  expect(await screen() === 'scr-letter');
  expect(await page.locator('#letter-big').textContent() === 'あ');
  expect((await page.locator('#letter-name').textContent()).indexOf('아') >= 0);
  expect(await page.locator('.wordbtn').count() === 2);
});

/* ── 따라쓰기: あ 완주 ── */
await check('따라쓰기 화면 진입 + あ 완주 → 카드 보상', async () => {
  await tap('#letter-trace');
  expect(await screen() === 'scr-trace');
  const st = await traceCurrent();
  expect(st.done, '완성되지 않음: ' + JSON.stringify(st));
  await page.locator('#reward.on').waitFor({ timeout: 5000 });
  await tap('#reward-close');
  expect(await screen() === 'scr-letters');
  expect(await page.locator('.letter-cell[data-ch="あ"].traced').count() === 1);
});

/* ── 전체 46자 따라쓰기 완주 (획 데이터가 모두 추적 가능한지) ── */
await check('히라가나 46자 전부 따라쓰기 완주 가능', async () => {
  const chs = await page.evaluate(() => {
    const out = [];
    window.KanaData.rows.forEach(r => r.kana.forEach(k => out.push(k.ch)));
    return out;
  });
  const failed = [];
  for (const tab of ['a', 'b']) {
    await tap('.tab[data-tab="' + tab + '"]');
    const cells = await page.$$eval('.letter-cell', els => els.map(e => e.dataset.ch));
    for (const ch of cells) {
      await tap('.letter-cell[data-ch="' + ch + '"]');
      const st = await traceCurrent();
      if (!st.done) failed.push(ch + '(' + st.cur + '/' + st.total + '획)');
      await page.locator('#reward.on').waitFor({ timeout: 5000 }).catch(() => failed.push(ch + ':보상 없음'));
      await tap('#reward-close');
    }
  }
  expect(failed.length === 0, '실패: ' + failed.join(', '));
  expect(chs.length === 46);
});

/* ── 거품 놀이 5라운드 ── */
await check('거품 놀이 5라운드 → 보상', async () => {
  await tap('.back[data-go="scr-home"]');
  await tap('[data-go="scr-games"]');
  await tap('[data-go="scr-bubble"]');
  expect(await screen() === 'scr-bubble');
  for (let r = 0; r < 5; r++) {
    await page.waitForFunction(() =>
      window.__kanaTest.bubbleTarget() &&
      document.querySelector('.bubble[data-ch="' + window.__kanaTest.bubbleTarget() + '"]'),
      { timeout: 5000 });
    const target = await page.evaluate(() => window.__kanaTest.bubbleTarget());
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
      window.__kanaTest.firstTarget() &&
      document.querySelector('.choice[data-ch="' + window.__kanaTest.firstTarget() + '"]'),
      { timeout: 5000 });
    const t = await page.evaluate(() => window.__kanaTest.firstTarget());
    expect((await page.locator('.choice').count()) === 3, '보기 3개');
    await tap('.choice[data-ch="' + t + '"]');
    await page.waitForTimeout(1250);
  }
  await page.locator('#reward.on').waitFor({ timeout: 5000 });
  await tap('#reward-close');
});

/* ── あいうえお 노래 ── */
await check('あいうえお 노래: 그리드·재생·하이라이트', async () => {
  await tap('.back[data-go="scr-home"]');
  await tap('[data-go="scr-song"]');
  expect(await page.locator('.song-cell').count() === 25);
  await tap('#song-play');
  await page.locator('.song-cell.lit').first().waitFor({ timeout: 5000 });
  await tap('#song-play'); // 멈추기
  await tap('.tab[data-mode="b"]');
  expect(await page.locator('.song-cell').count() === 21);
});

/* ── 카드책 ── */
await check('카드책에 모은 카드 표시', async () => {
  await tap('.back[data-go="scr-home"]');
  await tap('[data-go="scr-cards"]');
  const ownedCount = await page.locator('.wordcard:not(.locked)').count();
  expect(ownedCount >= 10, '따라쓰기 46회+게임 2회 보상 → 충분히 모여야 함, 실제 ' + ownedCount);
  const label = await page.locator('#cards-count').textContent();
  expect(new RegExp('^' + ownedCount + ' / \\d+$').test(label), '개수 표기: ' + label);
});

/* ── 진행도 유지 ── */
await check('새로고침 후 별·카드 유지', async () => {
  await page.goto(BASE);
  const stars = Number(await page.locator('#home-stars').textContent());
  const cards = Number(await page.locator('#home-cards').textContent());
  expect(stars >= 46 * 3 + 10, '별 부족: ' + stars);
  expect(cards >= 10, '카드 부족: ' + cards);
});

await browser.close();
console.log('\n결과: ' + passed + ' 통과, ' + failed + ' 실패');
process.exit(failed ? 1 : 0);
