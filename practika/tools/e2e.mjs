#!/usr/bin/env node
/* 종단 테스트 — node practika/tools/e2e.mjs
 * 실제 Chromium 으로 홈 → 코스맵 → 레슨 대화 완주(정답·오답 경로) → 결과(별·XP·젬)
 * → 다음 레슨 잠금 해제 → 어휘 복습 → 새로고침 후 진행도 유지까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8788)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8788/practika/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

// 헤드리스에는 음성 엔진이 없으므로 TTS 를 즉시 끝나는 스텁으로 대체 (결정적 테스트)
await page.addInitScript(() => {
  const fake = { cancel() {}, getVoices() { return []; }, speak(u) { setTimeout(() => u.onend && u.onend(), 5); }, onvoiceschanged: null };
  Object.defineProperty(window, 'speechSynthesis', { value: fake });
});
page.on('pageerror', e => fail('페이지 오류 없어야 함', e.message));

async function tap(sel) {
  await page.$eval(sel, el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
}
const T = () => page.evaluate(() => window.__practikaTest);
const screen = () => page.evaluate(() => window.__practikaTest.curScreen());
const mode = () => page.evaluate(() => window.__practikaTest.mode());
const expected = () => page.evaluate(() => window.__practikaTest.expected());
const isUser = () => page.evaluate(() => window.__practikaTest.isUserTurn());
const totals = () => page.evaluate(() => window.__practikaTest.totals());
const say = t => page.evaluate(txt => window.__simulateSpeech(txt), t);
// 가로모드에서 패널이 display:contents 로 풀리면 offsetParent 가 null 이라 자식 박스로도 판정한다
const visible = sel => page.evaluate(s => {
  const el = document.querySelector(s);
  if (!el || el.classList.contains('hidden')) return false;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  if (el.offsetParent !== null) return true;
  return cs.display === 'contents' &&
    [...el.children].some(c => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
}, sel);

console.log('▶ 프랙티카 놀이터 E2E');
await page.goto(BASE);

await check('홈이 열리고 언어탭 3개·영어 트랙 3개·아바타가 보인다', async () => {
  expect(await page.title() === '프랙티카 놀이터', 'title=' + await page.title());
  expect(await screen() === 'screen-home');
  expect(await page.locator('#lang-tabs .lang-tab').count() === 3, '언어 탭 3개');
  expect(await page.locator('#track-list .track-card').count() === 3, '영어 트랙 카드 3개');
  expect(await page.evaluate(() => window.__practikaTest.lang()) === 'en', '기본 언어 en');
  expect(await page.locator('#home-avatar .avatar').count() === 1, '아바타 SVG');
});

await check('여행 트랙 → 코스맵에 레슨 4개, 첫 레슨만 열림', async () => {
  await tap('#track-list .track-card:first-child');
  expect(await screen() === 'screen-map');
  expect(await page.locator('#lesson-list .lesson-card').count() === 4, '레슨 4개');
  expect(await page.locator('#lesson-list .lesson-card.locked').count() === 3, '잠긴 레슨 3개');
});

await check('첫 레슨 시작 → 세션, 첫 턴은 튜터', async () => {
  await tap('#lesson-list .lesson-card:first-child');
  expect(await screen() === 'screen-session');
  expect(await mode() === 'session');
  expect(await visible('#tutor-panel'), '튜터 패널 보임');
});

await check('오답 경로: 마이크 → 엉뚱한 말 → 낮은 점수 + 넘어가기 제공', async () => {
  await tap('#tutor-next');                       // 첫 튜터 턴 넘기기
  expect(await isUser(), '유저 턴이어야 함');
  await tap('#mic-btn');                          // 실제 듣기 세션 시작
  await sleep(20);
  await say('banana banana banana');             // 인식 결과 주입
  await sleep(30);
  expect(await visible('#fb-panel'), '피드백 패널 보임');
  const score = await page.$eval('#fb-score', el => +el.dataset.score);
  expect(score < 60, '오답 점수 낮아야 함: ' + score);
  expect((await page.$eval('#fb-next', el => el.textContent)).includes('넘어가기'), '넘어가기 버튼');
});

await check('다시 말하기 → 정답 → 통과 점수', async () => {
  await tap('#fb-retry');                         // 유저 패널 복귀 + 다시 듣기 시작
  expect(await visible('#user-panel'), '유저 패널 복귀');
  const model = await expected();
  await say(model);                               // 활성 듣기 세션에 정답 주입
  await sleep(30);
  const score = await page.$eval('#fb-score', el => +el.dataset.score);
  expect(score >= 90, '정답 점수 높아야 함: ' + score);
  expect((await page.$eval('#fb-next', el => el.textContent)).includes('다음'), '다음 버튼');
});

await check('나머지 대화를 정답으로 완주 → 결과 화면', async () => {
  await tap('#fb-next');
  // 세션이 끝날 때까지: 유저 턴이면 모범답안 말하기, 튜터 턴이면 다음
  for (let i = 0; i < 40 && await screen() === 'screen-session'; i++) {
    if (await isUser()) {
      const m = await expected();
      await say(m); await sleep(20);
      await tap('#fb-next'); await sleep(20);
    } else {
      await tap('#tutor-next'); await sleep(20);
    }
  }
  expect(await screen() === 'screen-result', 'screen=' + await screen());
  const stars = await page.$eval('#result-stars', el => el.textContent);
  expect(stars.includes('⭐'), '별 표시: ' + stars);
});

await check('결과에 XP·젬 지급, 스트릭 1 이상', async () => {
  const t = await totals();
  expect(t.xp > 0, 'xp=' + t.xp);
  expect(t.gems > 0, 'gems=' + t.gems);
  expect(t.streak >= 1, 'streak=' + t.streak);
});

await check('코스로 돌아가면 두 번째 레슨이 열려 있다', async () => {
  await tap('#result-map');
  expect(await screen() === 'screen-map');
  expect(await page.locator('#lesson-list .lesson-card.locked').count() === 2, '잠긴 레슨 2개(첫 완료로 2번째 해제)');
});

await check('홈 → 어휘 복습 시작 → 카드 채점 진행', async () => {
  await tap('#map-home');
  expect(await screen() === 'screen-home');
  const learned = await page.$eval('#review-count', el => +el.textContent);
  expect(learned > 0, '배운 표현 수 > 0: ' + learned);
  await tap('#btn-review');
  expect(await screen() === 'screen-review');
  expect(await mode() === 'review');
  // 실제 듣기 경로: 마이크 → 정답 주입 → 채점 피드백
  const m0 = await expected();
  await tap('#review-mic'); await sleep(20);
  await say(m0); await sleep(30);
  expect(await visible('#review-fb'), '복습 피드백 보임');
  await tap('#review-next'); await sleep(20);
});

await check('복습을 끝까지 진행 → 완료 오버레이', async () => {
  for (let i = 0; i < 12 && await screen() === 'screen-review'; i++) {
    const done = await page.evaluate(() => window.__practikaTest.reviewDoneVisible());
    if (done) break;
    if (await visible('#review-fb')) { await tap('#review-next'); await sleep(20); continue; }
    const m = await expected();
    if (!m) break;
    await say(m); await sleep(20);
    await tap('#review-next'); await sleep(20);
  }
  expect(await page.evaluate(() => window.__practikaTest.reviewDoneVisible()), '복습 완료 오버레이');
});

await check('새로고침 후에도 진행도(스트릭·XP·완료 레슨) 유지', async () => {
  const before = await totals();
  await tap('#review-done-home');
  await page.reload();
  await sleep(50);
  const after = await totals();
  expect(after.xp >= before.xp && after.xp > 0, `xp 유지: before=${before.xp} after=${after.xp}`);
  expect(after.streak >= 1, 'streak 유지: ' + after.streak);
  // 완료 레슨 유지 → 여행 트랙 두 번째 레슨 여전히 열림
  await tap('#track-list .track-card:first-child');
  expect(await page.locator('#lesson-list .lesson-card.locked').count() === 2, '완료 레슨 유지로 잠긴 레슨 2개');
});

await check('일본어로 전환 → 일본어 트랙이 보인다', async () => {
  await page.goto(BASE); await sleep(50);          // 홈으로 리셋(진행도는 유지)
  expect(await screen() === 'screen-home', 'screen=' + await screen());
  await tap('#lang-tabs .lang-tab:nth-child(2)');  // 일본어
  await sleep(20);
  expect(await page.evaluate(() => window.__practikaTest.lang()) === 'ja', 'lang=ja');
  const title = await page.$eval('#track-list .track-card:first-child .track-name', el => el.textContent);
  expect(title.includes('일본어'), '트랙명: ' + title);
});

await check('일본어 첫 레슨을 완주 → 결과(CJK 채점)', async () => {
  await tap('#track-list .track-card:first-child'); // ja-travel
  await sleep(20);
  await tap('#lesson-list .lesson-card:first-child'); // ja-travel-airport
  await sleep(20);
  expect(await screen() === 'screen-session', 'screen=' + await screen());
  for (let i = 0; i < 40 && await screen() === 'screen-session'; i++) {
    if (await isUser()) {
      const m = await expected();       // 일본어 모범 답안
      await say(m); await sleep(20);
      const score = await page.$eval('#fb-score', el => +el.dataset.score);
      expect(score >= 90, '일본어 정답 점수: ' + score);
      await tap('#fb-next'); await sleep(20);
    } else { await tap('#tutor-next'); await sleep(20); }
  }
  expect(await screen() === 'screen-result', 'screen=' + await screen());
});

await check('일본어 어휘가 복습 카운트에 반영된다', async () => {
  await tap('#result-map'); await sleep(20);
  await tap('#map-home'); await sleep(20);
  expect(await page.evaluate(() => window.__practikaTest.lang()) === 'ja', 'ja 유지');
  const cnt = await page.$eval('#review-count', el => +el.textContent);
  expect(cnt > 0, '일본어 배운 표현 수: ' + cnt);
});

await check('가로모드(패드·폰 가로)에서 세션이 2단 배치·잘림 없음', async () => {
  for (const vp of [{ width: 1180, height: 820 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(vp);
    await page.goto(BASE); await sleep(50);
    await tap('#track-list .track-card:first-child'); await sleep(20);
    await tap('#lesson-list .lesson-card:first-child'); await sleep(20);
    expect(await screen() === 'screen-session', 'screen=' + await screen());
    await tap('#tutor-next'); await sleep(20);           // 유저 턴(마이크)으로
    expect(await isUser(), '유저 턴이어야 함');
    const r = await page.evaluate(() => {
      const av = document.querySelector('#session-avatar').getBoundingClientRect();
      const mic = document.querySelector('#mic-btn').getBoundingClientRect();
      const sc = document.querySelector('#screen-session');
      return { avRight: av.right, micLeft: mic.left, scroll: sc.scrollHeight, client: sc.clientHeight };
    });
    expect(r.avRight <= r.micLeft, `아바타 왼쪽·마이크 오른쪽 2단: ${r.avRight} <= ${r.micLeft}`);
    expect(r.scroll <= r.client + 1, `세션 세로 잘림 없음: ${r.scroll} <= ${r.client} (${vp.width}×${vp.height})`);
  }
  await page.setViewportSize({ width: 1024, height: 768 });
});

console.log(`\n결과: ${passed} 통과, ${failed} 실패`);
await browser.close();
process.exit(failed ? 1 : 0);
