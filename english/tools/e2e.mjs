#!/usr/bin/env node
/* 종단 테스트 — node english/tools/e2e.mjs
 * 실제 Chromium 으로 홈 → 그림 단어장(카테고리 → 단어 → 답변) → 배운 단어 기록
 * → 마이크로 물어보기(인식 결과 주입) → 퀴즈 한 판 완주(펫 간식)
 * → 알파벳 배우기(대문자·소문자 52자) → 따라쓰기 완주(별·낱말 카드·펫 간식)
 * → 발화 언어 가르기(영어 en-US / 한국어 ko-KR)
 * → 새로고침 후 진행도 유지 → 첫 화면 규격(세 화면) → 콘솔 오류 0 까지 검증한다.
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
// 발화는 **가로채서 기록**한다 — 이 앱은 한 화면에서 한국어 안내와 영어 발음이
// 번갈아 나오는 첫 기능이라, 어느 쪽이 어떤 lang 으로 나갔는지가 검사 대상이다.
// (SpeechSynthesisUtterance 의 lang 은 만든 뒤에 정해지므로 speak() 시점에 읽는다.)
await page.addInitScript(() => {
  window.__utter = [];
  const fake = {
    cancel() {}, getVoices() { return []; }, onvoiceschanged: null,
    speak(u) { window.__utter.push({ text: u.text, lang: u.lang }); setTimeout(() => u.onend && u.onend(), 5); },
  };
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

await check('홈: 토끼 + 다섯 칸(알파벳·따라쓰기·단어장·배운 단어·퀴즈)', async () => {
  await page.waitForSelector('#screen-home.active');
  expect(await page.locator('#btn-mic').count() === 1, '토끼 마이크 단추');
  expect(await page.locator('.home-nav .nav-card').count() === 5, '첫 화면 칸 5개');
  for (const id of ['#btn-abc', '#btn-trace', '#btn-dict', '#btn-learned', '#btn-quiz']) {
    expect(await page.locator(id).count() === 1, '칸이 없음: ' + id);
  }
  expect((await page.locator('#learned-count').textContent()) === '0', '배운 단어 0');
  expect((await page.locator('#traced-count').textContent()) === '0', '따라 쓴 글자 0');
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

/* ═══════════ 알파벳 배우기 · 따라쓰기 ═══════════ */

await check('알파벳 격자: 대문자 26 + 소문자 26 (탭 전환)', async () => {
  await page.locator('#quiz-done-home').click();
  await page.waitForSelector('#screen-home.active');
  await page.locator('#btn-abc').click();
  await page.waitForSelector('#screen-abc.active');
  expect(await page.locator('#abc-grid .abc-cell').count() === 26, '대문자 26칸');
  const upper = await page.evaluate(() => [...document.querySelectorAll('#abc-grid .abc-cell')].map(c => c.dataset.ch).join(''));
  expect(upper === 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '대문자 순서: ' + upper);
  await page.locator('#abc-tabs .tab[data-case="lower"]').click();
  expect(await page.locator('#abc-grid .abc-cell').count() === 26, '소문자 26칸');
  const lower = await page.evaluate(() => [...document.querySelectorAll('#abc-grid .abc-cell')].map(c => c.dataset.ch).join(''));
  expect(lower === 'abcdefghijklmnopqrstuvwxyz', '소문자 순서: ' + lower);
  await page.locator('#abc-tabs .tab[data-case="upper"]').click();
});

await check('글자 상세: 이름·소리·낱말 + 영어는 en-US · 한국어는 ko-KR', async () => {
  await page.evaluate(() => { window.__utter.length = 0; });
  await page.locator('.abc-cell[data-ch="A"]').click();
  await page.waitForSelector('#screen-letter.active');
  expect((await page.locator('#letter-big').textContent()) === 'A', '큰 글자');
  expect((await page.locator('#letter-name').textContent()) === '에이', '이름');
  expect((await page.locator('#letter-sound').textContent()) === '애', '소리');
  expect(await page.locator('#letter-words .wordbtn').count() >= 2, '낱말 2개 이상');
  await page.waitForTimeout(900);
  const said = await page.evaluate(() => window.__utter);
  // 글자 이름은 영어 목소리로, 그 뒤 안내는 한국어 목소리로 — 섞이면 발음이 망가진다
  expect(said.some(u => u.text === 'A' && u.lang === 'en-US'), '글자 A 를 en-US 로: ' + JSON.stringify(said));
  expect(said.some(u => u.text === 'apple' && u.lang === 'en-US'), '낱말 apple 을 en-US 로: ' + JSON.stringify(said));
  expect(said.some(u => /[가-힣]/.test(u.text) && u.lang === 'ko-KR'), '한국어 안내를 ko-KR 로: ' + JSON.stringify(said));
});

await check('낱말 단추: 영어 발음(en-US)이 나가고 뜻은 한국어(ko-KR)', async () => {
  await page.evaluate(() => { window.__utter.length = 0; });
  await page.locator('#letter-words .wordbtn[data-en="ant"]').click();
  await page.waitForTimeout(700);
  const said = await page.evaluate(() => window.__utter);
  expect(said.filter(u => u.text === 'ant' && u.lang === 'en-US').length >= 1, 'ant 를 en-US 로: ' + JSON.stringify(said));
  expect(said.some(u => u.text.indexOf('개미') >= 0 && u.lang === 'ko-KR'), '뜻을 ko-KR 로: ' + JSON.stringify(said));
});

await check('따라쓰기 완주 → ⭐ + 낱말 카드 + 펫 간식', async () => {
  const before = await page.evaluate(() => window.Pet && Pet.state().snacks);
  await page.locator('#letter-trace').click();
  await page.waitForSelector('#screen-trace.active');
  expect((await page.locator('#trace-ch').textContent()) === 'A', '따라쓸 글자');
  // 손가락 대신 포인터 드래그로 획을 하나씩 따라 그린다 (pointerType 을 가리지 않는다)
  for (let s = 0; s < 8; s++) {
    const st = await page.evaluate(() => window.__englishTest.traceState());
    if (st.done) break;
    const path = await page.evaluate(() => window.__englishTest.tracePath());
    expect(path && path.length > 1, '획 경로가 있어야 함');
    await page.mouse.move(path[0][0], path[0][1]);
    await page.mouse.down();
    for (const [x, y] of path) await page.mouse.move(x, y);
    await page.mouse.up();
  }
  const st = await page.evaluate(() => window.__englishTest.traceState());
  expect(st.done, '완성되지 않음: ' + JSON.stringify(st));
  await page.waitForSelector('#reward-overlay:not(.hidden)', { timeout: 5000 });
  const card = await page.evaluate(() => ({
    w: document.querySelector('#reward-word').textContent,
    k: document.querySelector('#reward-ko').textContent,
    cards: Progress.cardCount(),
    traced: Progress.tracedCount(),
    snacks: window.Pet && Pet.state().snacks,
  }));
  expect(/^a/.test(card.w), '낱말 카드가 A 로 시작해야 함: ' + card.w);
  expect(card.k.length > 0, '뜻이 비어 있음');
  expect(card.cards === 1 && card.traced === 1, '카드·따라쓰기 기록: ' + JSON.stringify(card));
  expect(card.snacks === before + 1, '펫 간식 +1: ' + before + ' → ' + card.snacks);
});

await check('보상 → 다음 글자 B 로 이어지고, 격자에는 ⭐ 가 남는다', async () => {
  const label = await page.locator('#reward-next').textContent();
  expect(label.indexOf('B') >= 0, '다음 글자 단추가 B 가 아님: ' + label);
  await page.locator('#reward-next').click();
  await page.waitForSelector('#screen-trace.active');
  expect((await page.locator('#trace-ch').textContent()) === 'B', '알파벳 순서 위반');
  await page.locator('#trace-back').click();
  await page.waitForSelector('#screen-abc.active');
  expect(await page.locator('.abc-cell[data-ch="A"].traced').count() === 1, 'A 칸에 ⭐ 표시');
  expect(await page.locator('.abc-cell[data-ch="A"] .ac-star').count() === 1, '⭐ 아이콘');
});

await check('발화 언어: 영어는 en-US, 한글이 든 안내는 ko-KR (섞인 발화 없음)', async () => {
  const bad = await page.evaluate(() => window.__utter.filter(u => {
    const hasKo = /[가-힣]/.test(u.text);
    const asciiWord = /^[A-Za-z][A-Za-z' -]*$/.test(u.text.trim());
    if (hasKo && u.lang !== 'ko-KR') return true;      // 한국어 안내가 영어 목소리로 나감
    if (asciiWord && u.lang !== 'en-US') return true;  // 영어 글자·낱말이 한국어 목소리로 나감
    return false;
  }));
  expect(bad.length === 0, '언어가 어긋난 발화: ' + JSON.stringify(bad.slice(0, 4)));
  const n = await page.evaluate(() => window.__utter.length);
  expect(n >= 4, '발화가 기록되지 않았다 (' + n + ')');
});

await check('홈의 따라쓰기 칸 → 글자를 누르면 바로 따라쓰기', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#screen-home.active');
  expect((await page.locator('#traced-count').textContent()) === '1', '홈에 따라 쓴 글자 수');
  await page.locator('#btn-trace').click();
  await page.waitForSelector('#screen-abc.active');
  expect((await page.locator('#abc-title').textContent()).indexOf('따라쓰기') >= 0, '따라쓰기 제목');
  await page.locator('.abc-cell[data-ch="C"]').click();
  await page.waitForSelector('#screen-trace.active');
  expect((await page.locator('#trace-ch').textContent()) === 'C', '고른 글자로 바로 진입');
  await page.locator('#trace-back').click();
  await page.waitForSelector('#screen-abc.active');
});

await check('새로고침 후 진행도 유지 (배운 단어·따라 쓴 글자·낱말 카드·펫 먹이)', async () => {
  const before = await page.evaluate(() => ({
    n: Progress.count(),
    traced: Progress.tracedCount(),
    cards: Progress.cardCount(),
    pet: window.Pet ? Pet.state().snacks + Pet.state().meals : 0,
  }));
  await page.goto(BASE);
  await page.waitForSelector('#screen-home.active');
  const after = await page.evaluate(() => ({
    n: Progress.count(),
    traced: Progress.tracedCount(),
    cards: Progress.cardCount(),
    pet: window.Pet ? Pet.state().snacks + Pet.state().meals : 0,
    label: document.querySelector('#learned-count').textContent,
    tlabel: document.querySelector('#traced-count').textContent,
    // 새 키를 만들지 않고 옛 키에 필드를 더했는지 (parent 백업 목록에서 빠지면 안 된다)
    keys: Object.keys(JSON.parse(localStorage.getItem(
      window.Profile ? Profile.key('english-playground-v1') : 'english-playground-v1')) || {}),
  }));
  expect(after.n === before.n && after.n >= 2, '배운 단어 유지: ' + before.n + ' → ' + after.n);
  expect(after.traced === before.traced && after.traced >= 1, '따라 쓴 글자 유지: ' + before.traced + ' → ' + after.traced);
  expect(after.cards === before.cards && after.cards >= 1, '낱말 카드 유지: ' + before.cards + ' → ' + after.cards);
  expect(after.pet === before.pet, '펫 먹이 유지: ' + before.pet + ' → ' + after.pet);
  expect(after.label === String(after.n), '홈 표시: ' + after.label);
  expect(after.tlabel === String(after.traced), '홈 따라쓰기 표시: ' + after.tlabel);
  ['learned', 'misses', 'traced', 'cards'].forEach(k => {
    expect(after.keys.indexOf(k) >= 0, '한 키 안에 있어야 할 필드가 없다: ' + k + ' / ' + after.keys.join(','));
  });
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
