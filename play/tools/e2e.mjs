#!/usr/bin/env node
/* 종단 테스트 — node play/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 숨은그림 완주 → 다른그림 완주 → 글자 찾기 완주 → 스티커북/스티커 놀이
 * → 짝꿍 카드(짝 맞춤·오답 재뒤집기·3단계 완주 → 펫 식사) → 동물의 집(오답 재시도·정답 드래그·판 완주)
 * → 주제 데이터 계약(동물 30·탈것 18·음식 15+) → 음식의 자리(새 주제 진입·정답 드래그)
 * → 새로고침 후 진행도 유지까지 검증한다. 콘솔 오류 0이 기본 기대치.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/play/';
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
const consoleErrors = [];
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console: ' + m.text()); });

async function tap(selector) {
  await page.$eval(selector, el =>
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
}
async function activeScreen() {
  return page.evaluate(() => {
    const s = document.querySelector('.screen.active');
    return s ? s.id : null;
  });
}
async function petState() { return page.evaluate(() => window.Pet && Pet.state()); }
// 요소 가운데로 드래그 (pointer 이벤트는 mouse에서 생성됨)
async function dragCenter(fromSel, toSel) {
  const from = await page.locator(fromSel).boundingBox();
  const to = await page.locator(toSel).boundingBox();
  expect(from && to, '드래그 대상이 안 보임: ' + fromSel + ' → ' + toSel);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
}

console.log('▶ 찾기 놀이터 E2E');
await page.goto(BASE);

/* ── 1. 홈 ── */
await check('홈: 테마 6장 + 글자찾기 배너 + 새 모드 배너 2개 + 펫 버튼', async () => {
  expect(await page.title() === '찾기 놀이터', 'title=' + await page.title());
  expect(await activeScreen() === 'screen-home');
  expect(await page.locator('.theme-card').count() === 6, '테마 카드 6장');
  expect(await page.locator('#btn-letters').count() === 1);
  expect(await page.locator('#btn-memory').count() === 1, '짝꿍 카드 배너');
  expect(await page.locator('#btn-habitat').count() === 1, '동물의 집 배너');
  expect(await page.locator('#pet-slot .pet-btn').count() === 1, '펫 버튼(헤더)');
});

/* ── 2~3. 숨은그림찾기: 진입 + 완주 → 펫 간식 ── */
await check('숨은그림 쉬움: 진입 스모크(씬·트레이)', async () => {
  await tap('.theme-card');
  await page.locator('#mode-overlay:not(.hidden)').waitFor({ timeout: 3000 });
  await tap('.level-btn[data-mode="hidden"][data-level="1"]');
  expect(await activeScreen() === 'screen-game');
  expect(await page.locator('#hidden-scene svg').count() === 1, '씬 SVG');
  expect(await page.locator('#hidden-tray .tray-item').count() > 0, '찾기 트레이');
});
await check('숨은그림 완주 → 별 + 펫 간식', async () => {
  const before = (await petState()).snacks;
  await page.evaluate(() => {
    const svg = document.querySelector('#hidden-scene svg');
    svg.querySelectorAll('[data-findhit]').forEach(h => {
      const r = h.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      svg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y }));
    });
  });
  await page.locator('#complete-overlay:not(.hidden)').waitFor({ timeout: 5000 });
  const after = await petState();
  expect(after.snacks === before + 1, '간식 +1이어야 함: ' + before + ' → ' + after.snacks);
  await tap('#complete-home');
  expect(await activeScreen() === 'screen-home');
});

/* ── 4. 다른그림찾기: 완주 → 펫 간식 ── */
await check('다른그림 쉬움 완주 → 진행 점 + 펫 간식', async () => {
  const before = (await petState()).snacks;
  await tap('.theme-card');
  await page.locator('#mode-overlay:not(.hidden)').waitFor({ timeout: 3000 });
  await tap('.level-btn[data-mode="diff"][data-level="1"]');
  expect(await activeScreen() === 'screen-game');
  expect(await page.locator('#diff-scene-b svg').count() === 1);
  await page.evaluate(() => {
    const svg = document.querySelector('#diff-scene-b svg');
    svg.querySelectorAll('[data-diffhit]').forEach(h => {
      const r = h.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      svg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y }));
    });
  });
  await page.locator('#complete-overlay:not(.hidden)').waitFor({ timeout: 5000 });
  expect(await page.locator('#diff-progress .diff-dot.on').count() > 0, '진행 점 켜짐');
  const after = await petState();
  expect(after.snacks === before + 1, '간식 +1이어야 함');
  await tap('#complete-home');
});

/* ── 5~6. 글자 찾기: 진입 + 한 판 완주 → 펫 간식 ── */
await check('글자 찾기 1단계: 진입 스모크(방울 18개)', async () => {
  await tap('#btn-letters');
  await page.locator('#letters-overlay:not(.hidden)').waitFor({ timeout: 3000 });
  await tap('.letters-level-btn[data-llevel="1"]');
  expect(await activeScreen() === 'screen-letters');
  await page.locator('.letter-bubble').first().waitFor({ timeout: 5000 });
  expect(await page.locator('.letter-bubble').count() === 18, '글자 방울 18개');
});
await check('글자 찾기 5라운드 완주 → 펫 간식', async () => {
  const before = (await petState()).snacks;
  for (let round = 0; round < 5; round++) {
    await page.waitForFunction(() =>
      window.Letters.state.playing &&
      window.Letters.state.remain === 3 &&
      document.querySelectorAll('.letter-bubble:not(.found)').length > 0,
      { timeout: 5000 });
    const target = await page.evaluate(() => window.Letters.state.target);
    for (let i = 0; i < 3; i++) {
      await page.$$eval('.letter-bubble:not(.found)', (els, t) => {
        const b = els.find(el => el.dataset.ch === t);
        if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }, target);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(1200);
  }
  await page.locator('#letters-done:not(.hidden)').waitFor({ timeout: 5000 });
  const after = await petState();
  expect(after.snacks === before + 1, '간식 +1이어야 함');
  await tap('#letters-done-home');
  expect(await activeScreen() === 'screen-home');
});

/* ── 7. 스티커북·스티커 놀이 진입 스모크 ── */
await check('스티커북 → 스티커 놀이 진입 스모크', async () => {
  await tap('#btn-stickers');
  expect(await activeScreen() === 'screen-stickers');
  expect(await page.locator('.sticker-slot').count() === 6, '스티커 슬롯 6개');
  await tap('#btn-stickerplay');
  expect(await activeScreen() === 'screen-stickerplay');
  expect(await page.locator('#sticker-palette .palette-item').count() > 0, '모은 스티커 팔레트');
  await tap('#stickerplay-back');
  await tap('#stickers-back');
  expect(await activeScreen() === 'screen-home');
});

/* ── 8~10. 짝꿍 카드 ── */
async function playMemoryBoard() {
  // 2초 미리보기가 끝날 때까지
  await page.waitForFunction(() => !window.MemoryGame.state.peeking && window.MemoryGame.state.playing, { timeout: 6000 });
  const pairs = await page.evaluate(() => window.MemoryGame.state.pairs);
  for (let p = 0; p < pairs; p++) {
    await page.evaluate(() => {
      const rest = Array.from(document.querySelectorAll('.mem-card:not(.matched)'));
      const first = rest[0];
      const twin = rest.find(c => c !== first && c.dataset.k === first.dataset.k);
      first.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      twin.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(120);
  }
}
await check('짝꿍 카드 1단계: 2초 미리보기 → 뒤집힘 (4장)', async () => {
  await tap('#btn-memory');
  await page.locator('#memory-overlay:not(.hidden)').waitFor({ timeout: 3000 });
  await tap('#memory-overlay .letters-level-btn[data-mlevel="1"]');
  expect(await activeScreen() === 'screen-memory');
  expect(await page.locator('.mem-card').count() === 4, '카드 4장');
  expect(await page.locator('.mem-card.up').count() === 4, '처음엔 다 보여야 함');
  await page.waitForFunction(() => document.querySelectorAll('.mem-card.up').length === 0, { timeout: 6000 });
});
await check('짝꿍 카드: 틀린 짝은 흔들리고 다시 뒤집힘', async () => {
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.mem-card'));
    const a = cards[0];
    const b = cards.find(c => c !== a && c.dataset.k !== a.dataset.k);
    a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  expect(await page.locator('.mem-card.wrong').count() === 2, '흔들림 표시 2장');
  await page.waitForFunction(() => document.querySelectorAll('.mem-card.up').length === 0, { timeout: 3000 });
  expect(await page.evaluate(() => window.MemoryGame.state.playing), '벌점 없이 계속 진행');
});
await check('짝꿍 카드: 짝 맞춤 → 판 완성 별 + 펫 간식, 3단계 완주 → 펫 식사', async () => {
  const before = await petState();
  // 1단계 마무리
  await playMemoryBoard();
  await page.locator('#memory-done:not(.hidden)').waitFor({ timeout: 5000 });
  expect(await page.locator('#memory-stars .star.on').count() >= 1, '별 1개 이상');
  let now = await petState();
  expect(now.snacks === before.snacks + 1, '판 완성 간식 +1');
  // 2단계 → 3단계 완주하면 식사
  await tap('#memory-done-next');
  await playMemoryBoard();
  await page.locator('#memory-done:not(.hidden)').waitFor({ timeout: 5000 });
  await tap('#memory-done-next');
  await playMemoryBoard();
  await page.locator('#memory-done:not(.hidden)').waitFor({ timeout: 5000 });
  now = await petState();
  expect(now.snacks === before.snacks + 3, '판마다 간식 +1 (총 +3)');
  expect(now.meals === before.meals + 1, '3단계 모두 첫 완주 → 식사 +1: ' + before.meals + ' → ' + now.meals);
  expect(await page.evaluate(() => window.Progress.getStars('memory_L3') > 0), 'memory_L3 별 저장');
  await tap('#memory-done-home');
  expect(await activeScreen() === 'screen-home');
});

/* ── 11~14. 동물의 집 찾기 ── */
await check('동물의 집: 주제 선택 → 구역 3개 + 친구 등장', async () => {
  await tap('#btn-habitat');
  await page.locator('#habitat-overlay:not(.hidden)').waitFor({ timeout: 3000 });
  await tap('.habitat-topic-btn[data-topic="animals"]');
  expect(await activeScreen() === 'screen-habitat');
  expect(await page.locator('.habitat-zone').count() === 3, '구역 3개');
  expect(await page.locator('.habitat-zone .hz-bg').count() === 3, '구역 SVG 배경');
  await page.waitForFunction(() => window.Habitat.state.cur, { timeout: 5000 });
  expect((await page.locator('.habitat-actor-emoji').textContent()).length > 0, '친구 이모지');
});
await check('동물의 집: 틀린 구역 → 갸웃하고 다시 기회', async () => {
  const cur = await page.evaluate(() => window.Habitat.state.cur);
  const wrongZone = await page.evaluate(() =>
    window.Habitat.state.topic.zones.find(z => z.id !== window.Habitat.state.cur.zone).id);
  await dragCenter('#habitat-actor', '.habitat-zone[data-zone="' + wrongZone + '"]');
  await page.locator('.habitat-actor.tilt').waitFor({ timeout: 2000 });
  await page.waitForFunction(() => !window.Habitat.state.busy, { timeout: 3000 });
  const st = await page.evaluate(() => ({ cur: window.Habitat.state.cur.id, wrongs: window.Habitat.state.wrongs, idx: window.Habitat.state.idx }));
  expect(st.cur === cur.id && st.idx === 0, '같은 친구로 다시 도전해야 함');
  expect(st.wrongs === 1, '오답 1회 기록');
});
await check('동물의 집: 맞는 구역 드래그 → 구역에서 뛰놀기 + 진행 점', async () => {
  const zone = await page.evaluate(() => window.Habitat.state.cur.zone);
  await dragCenter('#habitat-actor', '.habitat-zone[data-zone="' + zone + '"]');
  await page.locator('.habitat-zone[data-zone="' + zone + '"] .hz-guest').first().waitFor({ timeout: 2000 });
  expect(await page.locator('#habitat-progress .diff-dot.on').count() === 1, '진행 점 1개');
  await page.waitForFunction(() => window.Habitat.state.idx === 1 && !window.Habitat.state.busy, { timeout: 4000 });
});
await check('동물의 집: 6마리 완주 → 별 + 펫 간식', async () => {
  const before = (await petState()).snacks;
  for (let i = 1; i < 6; i++) {
    await page.waitForFunction(() => window.Habitat.state.cur && !window.Habitat.state.busy && window.Habitat.state.playing, { timeout: 5000 });
    const zone = await page.evaluate(() => window.Habitat.state.cur.zone);
    await dragCenter('#habitat-actor', '.habitat-zone[data-zone="' + zone + '"]');
    await page.waitForTimeout(1900);
  }
  await page.locator('#habitat-done:not(.hidden)').waitFor({ timeout: 6000 });
  expect(await page.locator('#habitat-stars .star.on').count() >= 1, '별 1개 이상');
  const after = await petState();
  expect(after.snacks === before + 1, '판 완성 간식 +1');
  expect(await page.evaluate(() => window.Progress.habitatDoneCount('animals') === 6), '데려다준 친구 6 기록');
  await tap('#habitat-done-home');
  expect(await activeScreen() === 'screen-home');
});

/* ── 15. 주제 데이터 계약: 동물 30·탈것 18·음식 15+ ── */
await check('동물의 집: 주제 3개 데이터 계약(동물 30·탈것 18·음식 15종 이상)', async () => {
  const t = await page.evaluate(() => {
    const T = window.Habitat.TOPICS;
    const bad = [];
    for (const k of Object.keys(T)) {
      const zoneIds = new Set(T[k].zones.map(z => z.id));
      const seen = new Set();
      T[k].items.forEach(i => {
        if (!zoneIds.has(i.zone)) bad.push(k + ':' + i.id + ' 잘못된 구역');
        if (seen.has(i.id)) bad.push(k + ':' + i.id + ' id 중복');
        seen.add(i.id);
        if (!i.e || !i.name || !i.fact) bad.push(k + ':' + i.id + ' 필드 누락');
      });
    }
    return { a: T.animals.items.length, v: T.vehicles.items.length, f: T.food ? T.food.items.length : 0, bad };
  });
  expect(t.bad.length === 0, '항목 오류: ' + t.bad.join(', '));
  expect(t.a === 30, '동물 30종이어야 함: ' + t.a);
  expect(t.v === 18, '탈것 18종이어야 함: ' + t.v);
  expect(t.f >= 15, '음식 15종 이상이어야 함: ' + t.f);
});

/* ── 16. 음식의 자리(새 주제) ── */
await check('음식의 자리: 주제 버튼 3개 → 냉장고·과일바구니·빵 바구니 + 정답 드래그', async () => {
  await tap('#btn-habitat');
  await page.locator('#habitat-overlay:not(.hidden)').waitFor({ timeout: 3000 });
  expect(await page.locator('.habitat-topic-btn').count() === 3, '주제 버튼 3개');
  await tap('.habitat-topic-btn[data-topic="food"]');
  expect(await activeScreen() === 'screen-habitat');
  for (const z of ['fridge', 'fruit', 'bread']) {
    expect(await page.locator('.habitat-zone[data-zone="' + z + '"] .hz-bg').count() === 1, z + ' 구역 SVG 배경');
  }
  await page.waitForFunction(() => window.Habitat.state.cur, { timeout: 5000 });
  const zone = await page.evaluate(() => window.Habitat.state.cur.zone);
  await dragCenter('#habitat-actor', '.habitat-zone[data-zone="' + zone + '"]');
  await page.locator('.habitat-zone[data-zone="' + zone + '"] .hz-guest').first().waitFor({ timeout: 2000 });
  await page.waitForFunction(() => window.Habitat.state.idx === 1 && !window.Habitat.state.busy, { timeout: 4000 });
  expect(await page.evaluate(() => window.Progress.habitatDoneCount('food') === 1), '음식 친구 1개 기록');
  await tap('#habitat-back');
  expect(await activeScreen() === 'screen-home');
});

/* ── 17. 새로고침 후 진행도 유지 ── */
await check('새로고침 후 별·집찾기 기록·펫 먹이 유지', async () => {
  const petBefore = await petState();
  await page.goto(BASE);
  await page.locator('.theme-card').first().waitFor({ timeout: 5000 });
  const kept = await page.evaluate(() => ({
    hidden: window.Progress.getStars((window.SCENES[0].id) + '_hidden_L1'),
    diff: window.Progress.getStars((window.SCENES[0].id) + '_diff_L1'),
    letters: window.Progress.getStars('letters_L1'),
    memory: [1, 2, 3].map(l => window.Progress.getStars('memory_L' + l)),
    habitatStars: window.Progress.getStars('habitat_animals'),
    habitatDone: window.Progress.habitatDoneCount('animals'),
    habitatFood: window.Progress.habitatDoneCount('food'),
  }));
  expect(kept.hidden > 0 && kept.diff > 0, '숨은그림·다른그림 별 유지');
  expect(kept.letters > 0, '글자 찾기 별 유지');
  expect(kept.memory.every(s => s > 0), '짝꿍 카드 별 유지: ' + kept.memory);
  expect(kept.habitatStars > 0 && kept.habitatDone === 6, '동물의 집 기록 유지');
  expect(kept.habitatFood === 1, '음식의 자리 기록 유지: ' + kept.habitatFood);
  const pet = await petState();
  expect(pet.snacks + pet.meals + pet.fed >= 1 && pet.fed === petBefore.fed, '펫 먹이 유지');
  // 홈 카드에 별 합계 표시
  const label = await page.locator('.theme-card .theme-card-stars').first().textContent();
  expect(/⭐ [1-9]/.test(label), '홈 카드 별 표기: ' + label);
});

/* ── 18. 콘솔 오류 0 ── */
await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
});

await browser.close();
console.log('\n결과: ' + passed + ' 통과, ' + failed + ' 실패');
process.exit(failed ? 1 : 0);
