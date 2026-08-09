#!/usr/bin/env node
/* 종단 테스트 — node english/tools/e2e.mjs
 * 실제 Chromium 으로 홈 → 그림 단어장(카테고리 → 단어 → 답변) → 배운 단어 기록
 * → 마이크로 물어보기(인식 결과 주입) → 퀴즈 한 판 완주(펫 간식) →
 * 새로고침 후 진행도 유지 → 첫 화면 규격(세 화면) → 콘솔 오류 0 까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/english/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });

// 헤드리스에는 음성 엔진이 없으므로 TTS 를 즉시 끝나는 스텁으로 대체 (결정적 테스트).
// 발화 내용(영어 발음)은 이 테스트가 손대지 않는다 — 스텁은 끝나기만 한다.
await page.addInitScript(() => {
  const fake = { cancel() {}, getVoices() { return []; }, speak(u) { setTimeout(() => u.onend && u.onend(), 5); }, onvoiceschanged: null };
  Object.defineProperty(window, 'speechSynthesis', { value: fake });
});
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

const screenId = () => page.evaluate(() => {
  const s = document.querySelector('.screen.active');
  return s ? s.id : null;
});

console.log('▶ 영어 놀이터 E2E');
await page.goto(BASE);

await check('홈: 토끼 + 세 칸(그림 단어장·배운 단어·퀴즈 놀이)', async () => {
  await page.waitForSelector('#screen-home.active');
  expect(await page.locator('#btn-mic').count() === 1, '토끼 마이크 단추');
  expect(await page.locator('.home-nav .nav-card').count() === 3, '첫 화면 칸 3개');
  expect((await page.locator('#learned-count').textContent()) === '0', '배운 단어 0');
});

await check('그림 단어장: 카테고리 10개 → 단어 목록', async () => {
  await page.locator('#btn-dict').click();
  await page.waitForSelector('#screen-cats.active');
  expect(await page.locator('#cat-grid .cat-card').count() === 10, '카테고리 수');
  await page.locator('#cat-grid .cat-card').first().click();
  await page.waitForSelector('#screen-words.active');
  expect(await page.locator('#word-grid .word-card').count() >= 5, '단어 카드 수');
});

await check('단어 누르기 → 답변 화면(영어·읽는 법) + 배운 단어로 기록', async () => {
  // 첫 칸은 elephant — 아래 '마이크로 물어보기'가 코끼리를 쓰므로 겹치지 않게 둘째 칸을 누른다
  const en = await page.locator('#word-grid .word-card .word-en').nth(1).textContent();
  await page.locator('#word-grid .word-card').nth(1).click();
  await page.waitForSelector('#screen-answer.active');
  const shown = await page.locator('#answer-en').textContent();
  expect(shown === en.toUpperCase(), '답변 단어: ' + shown + ' / ' + en);
  expect((await page.locator('#answer-read').textContent()).length > 0, '읽는 법 표시');
  const n = await page.evaluate(() => Progress.count());
  expect(n === 1, '배운 단어 수: ' + n);
});

await check('마이크로 물어보기: 인식 결과를 넣으면 그 단어의 답변 화면', async () => {
  await page.locator('#answer-home').click();
  await page.waitForSelector('#screen-home.active');
  await page.evaluate(() => App.handleSpeech(['코끼리가 영어로 뭐야']));
  await page.waitForSelector('#screen-answer.active');
  const shown = await page.locator('#answer-en').textContent();
  expect(shown === 'ELEPHANT', '코끼리 → ELEPHANT (' + shown + ')');
});

await check('못 알아들은 말: 부드럽게 다시 묻고 부모 확인용으로 남는다', async () => {
  await page.locator('#answer-home').click();
  await page.waitForSelector('#screen-home.active');
  // 사전에 없는 말 (있는 말을 고르면 답변 화면으로 가 버린다 — '우주정거장'은 space 로 잡힌다)
  await page.evaluate(() => App.handleSpeech(['뽀로로가 영어로 뭐야']));
  await page.waitForSelector('#screen-unknown.active');
  const msg = await page.locator('#unknown-msg').textContent();
  expect(!/틀렸|잘못/.test(msg), '혼내는 말이 있으면 안 됨: ' + msg);
  const misses = await page.evaluate(() => Progress.listMisses().length);
  expect(misses === 1, '부모 확인용 기록: ' + misses);
});

await check('배운 단어 화면: 배운 만큼 줄이 생긴다', async () => {
  await page.locator('#unknown-home').click();
  await page.waitForSelector('#screen-home.active');
  await page.locator('#btn-learned').click();
  await page.waitForSelector('#screen-learned.active');
  expect(await page.locator('#learned-list .learned-row').count() === 2, '배운 단어 줄 수');
});

await check('퀴즈 한 판 완주 → 축하 + 펫 간식', async () => {
  await page.locator('#learned-home').click();
  await page.waitForSelector('#screen-home.active');
  const before = await page.evaluate(() => window.Pet && Pet.state().snacks);
  await page.locator('#btn-quiz').click();
  await page.waitForSelector('#screen-quiz.active');
  for (let i = 0; i < 5; i++) {
    const answer = await page.evaluate(() => document.querySelector('#quiz-question').textContent.toLowerCase());
    const done = await page.evaluate(() => !document.querySelector('#quiz-done-overlay').classList.contains('hidden'));
    if (done) break;
    await page.locator(`.quiz-choice[data-en="${answer}"]`).click();
    await page.waitForTimeout(1000);
  }
  await page.waitForSelector('#quiz-done-overlay:not(.hidden)');
  const after = await page.evaluate(() => window.Pet && Pet.state().snacks);
  expect(after === before + 1, '펫 간식 +1: ' + before + ' → ' + after);
});

await check('새로고침 후 진행도 유지 (배운 단어·펫 먹이)', async () => {
  const before = await page.evaluate(() => ({
    n: Progress.count(),
    pet: window.Pet ? Pet.state().snacks + Pet.state().meals : 0,
  }));
  await page.goto(BASE);
  await page.waitForSelector('#screen-home.active');
  const after = await page.evaluate(() => ({
    n: Progress.count(),
    pet: window.Pet ? Pet.state().snacks + Pet.state().meals : 0,
    label: document.querySelector('#learned-count').textContent,
  }));
  expect(after.n === before.n && after.n >= 2, '배운 단어 유지: ' + before.n + ' → ' + after.n);
  expect(after.pet === before.pet, '펫 먹이 유지: ' + before.pet + ' → ' + after.pet);
  expect(after.label === String(after.n), '홈 표시: ' + after.label);
});

await check('놀이판 무변형: 첫 화면 칸에 크기·자리 변형이 없다', async () => {
  // 손으로 붙인 느낌은 기울기(rotate)로만 낸다 — 자리 옮김(translate)·확대(scale)는
  // 줄을 밀어내고 이웃을 파고든다 (DESIGN.md 「첫 화면 규격」).
  const bad = await page.evaluate(() => {
    return [...document.querySelectorAll('.home-nav .nav-card')].map(c => {
      const t = getComputedStyle(c).transform;
      if (t === 'none') return null;
      const m = t.match(/matrix\(([^)]+)\)/);
      if (!m) return t;
      const [a, b, , , e, f] = m[1].split(',').map(Number);
      const scale = Math.sqrt(a * a + b * b);
      return (Math.abs(e) > 1 || Math.abs(f) > 1 || Math.abs(scale - 1) > 0.02) ? t : null;
    }).filter(Boolean);
  });
  expect(bad.length === 0, '기울기 말고 다른 변형이 걸린 칸: ' + bad.join(' | '));
});

/* ═══════════ 첫 화면 규격 (DESIGN.md 「첫 화면 규격 (놀이 고르는 화면)」) ═══════════
 * 지난 라운드에 29개 앱의 첫 화면이 제각각 갈린 진짜 까닭은 **규격을 지킬 검사가
 * 없었기 때문**이다. 그래서 숫자를 여기에 못 박는다 — 세 화면(패드 가로·폰 가로·
 * 폰 세로)에서 제목 크기·가운데·칸 간격·겹침·터치 하한을 잰다.
 * (콘솔 오류 0 은 이 세 번의 이동까지 포함해 맨 아래 검사가 함께 본다) */
const SPEC_HOME = '#screen-home.active';
const SPEC_BOXES = 'h1, .stats, .mic-guide, .bunny-bubble, #btn-mic, .home-nav > *';
const SPEC_GRID = '.home-nav';
const SPEC_VIEWS = [
  { w: 1180, h: 820, name: '패드 가로' },
  { w: 844, h: 390, name: '폰 가로' },
  { w: 390, h: 844, name: '폰 세로' },
];
// CSS clamp(min, 비율×vw, max) 를 그대로 계산한다
const clampVw = (min, ratio, max, vw) => Math.min(Math.max(min, ratio * vw), max);

for (const v of SPEC_VIEWS) {
  await check(`첫 화면 규격 · ${v.name} — 제목·배지 줄·칸 간격·겹침·터치 46px`, async () => {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.goto(BASE);
    await page.waitForSelector(SPEC_HOME);
    await page.waitForTimeout(250);
    const m = await page.evaluate(([boxSel, gridSel]) => {
      const scr = document.querySelector('.screen.on, .screen.active');
      const h1 = scr.querySelector('h1');
      const r = h1.getBoundingClientRect();
      // 오른쪽 위 공용 집 단추(shared/home-button.js)가 머리줄을 그만큼 왼쪽으로 민다.
      // 29개 앱이 다 같이 밀려 있으므로 그 절반까지는 '가운데'로 친다.
      const hb = document.querySelector('.enjoy-home-btn');
      const reserve = hb ? hb.getBoundingClientRect().width + 22 : 0;
      const g = getComputedStyle(document.querySelector(gridSel));
      const boxes = [...scr.querySelectorAll(boxSel)].filter(e => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
      });
      const over = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].getBoundingClientRect(), b = boxes[j].getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 1 && oy > 1) {
          over.push((boxes[i].className || boxes[i].tagName) + '×' + (boxes[j].className || boxes[j].tagName));
        }
      }
      const small = [...scr.querySelectorAll('button, a[href], [role="button"]')]
        .map(e => [e, e.getBoundingClientRect()])
        .filter(([, b]) => b.width > 0 && b.height > 0 && (b.width < 45.5 || b.height < 45.5))
        .map(([e, b]) => (e.className || e.tagName) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
      return {
        fs: parseFloat(getComputedStyle(h1).fontSize),
        cx: r.left + r.width / 2, mid: window.innerWidth / 2, reserve,
        rowGap: parseFloat(g.rowGap) || 0, colGap: parseFloat(g.columnGap) || 0,
        over: over.slice(0, 3), small: small.slice(0, 3),
      };
    }, [SPEC_BOXES, SPEC_GRID]);

    // ① DESIGN.md 「첫 화면 규격」 — 제목 clamp(26px, 3.4vw, 36px)
    const wantFs = clampVw(26, 0.034, 36, v.w);
    expect(m.fs >= 26 && m.fs <= 36, `제목 크기가 규격 범위(26~36px) 밖: ${m.fs}px`);
    expect(Math.abs(m.fs - wantFs) <= 1, `제목 크기 ${m.fs}px — 규격은 ${wantFs.toFixed(1)}px`);
    // ② 제목은 가운데 (집 단추가 차지한 자리의 절반 + 손그림 여유까지만 봐준다)
    const slack = m.reserve / 2 + 26;
    expect(Math.abs(m.cx - m.mid) <= slack,
      `제목이 가운데에서 ${Math.round(Math.abs(m.cx - m.mid))}px 벗어남 (허용 ${Math.round(slack)}px)`);
    // ③ DESIGN.md 「첫 화면 규격」 — 칸 사이 간격 clamp(18px, 2.4vw, 32px)
    const wantGap = clampVw(18, 0.024, 32, v.w);
    expect(Math.abs(m.rowGap - wantGap) <= 1 && Math.abs(m.colGap - wantGap) <= 1,
      `칸 간격 ${m.rowGap}/${m.colGap}px — 규격은 ${wantGap.toFixed(1)}px`);
    // ④ 첫 화면 요소끼리 겹치지 않는다 (기울인 칸이 이웃을 파고들면 여기서 잡힌다)
    expect(m.over.length === 0, '겹침: ' + m.over.join(' | '));
    // ⑤ DESIGN.md 「첫 화면 규격」 — 터치 하한 46px
    expect(m.small.length === 0, '46px 미만 터치 대상: ' + m.small.join(' | '));
  });
}
await page.setViewportSize({ width: 1180, height: 820 });

await check('세 화면 모두 가로 넘침 없음', async () => {
  for (const v of SPEC_VIEWS) {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.goto(BASE);
    await page.waitForSelector(SPEC_HOME);
    const of = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    }));
    expect(of.sw <= of.cw + 1, v.name + ' 가로 넘침: ' + JSON.stringify(of));
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
});

await browser.close();
console.log('\n결과: ' + passed + ' 통과, ' + failed + ' 실패');
process.exit(failed ? 1 : 0);
