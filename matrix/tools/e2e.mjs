#!/usr/bin/env node
/* 종단 테스트 — node matrix/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계 3개) → 퍼즐 목록(10개) → 놀이(격자·헤더·트레이) →
 * 정답 놓기(격자 완성·별·펫) · 오답 무벌점 · 단계별 격자 크기(2/3/4) ·
 * 새로고침 후 진행도 유지 · 3해상도 잘림 없음(4×4 포함)을 검증한다. 콘솔 오류 0 기대.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/matrix/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 트레이의 조각을 탭(클릭)해서 놓기 시도
async function tap(page, id) {
  await page.click('.tray-item[data-id="' + id + '"]:not(.used)');
}
// 다음 칸부터 정답 조각을 순서대로 끝까지 놓는다
async function fillAll(page) {
  for (;;) {
    const nid = await page.evaluate(() => App.debug().nextId);
    if (!nid) break;
    await tap(page, nid);
    await page.waitForTimeout(60);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

// 깨끗한 진행도에서 시작
await page.goto(BASE);
await page.evaluate(() => { try { for (const k of Object.keys(localStorage)) if (/matrix|pet/i.test(k)) localStorage.removeItem(k); } catch (e) {} });
await page.goto(BASE);

await check('홈: 단계 카드 3개 + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '단계 카드 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('퍼즐 목록: 단계1 퍼즐 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-puzzles.on');
  expect(await page.locator('#puzzles-list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#puzzles-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('퍼즐 진입: 격자 2×2 · 헤더(방향2+색2) · 트레이(정답4+방해2)', async () => {
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.rows === 2 && d.cols === 2, '단계1 격자: ' + d.rows + 'x' + d.cols);
  expect(d.total === 4, '칸 수: ' + d.total);
  expect(await page.locator('#board .bd-cell').count() === 4, '격자 칸 DOM 수');
  expect(await page.locator('#board .bd-head').count() === 4, '헤더(방향2+색2) DOM 수');
  expect(await page.locator('#board .bd-corner').count() === 1, '코너 표시');
  expect(await page.locator('#tray .tray-item').count() === 6, '트레이 조각 수(4+2): ' + d.trayIds.length);
  // 트레이에 정답 조각이 모두 들어 있다
  const hasAll = d.cells.every(id => d.trayIds.includes(id));
  expect(hasAll, '트레이에 정답 조각 누락');
});

await check('오답 무벌점: 순서 아닌 조각은 안 들어가고 축하도 없다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const wrong = d0.trayIds.find(id => id !== d0.nextId);
  await tap(page, wrong);
  await page.waitForTimeout(150);
  const d = await page.evaluate(() => App.debug());
  expect(d.placed.length === 0, '오답인데 조각이 놓임: ' + JSON.stringify(d.placed));
  expect(d.filledCount === 0, '오답인데 칸이 채워짐');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '오답인데 축하가 뜸');
});

await check('정답 순서대로 놓기 → 격자 완성 → 축하·별·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await fillAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.filledCount === 4, '채운 칸 수: ' + d.filledCount);
  expect(d.stars === 4, '별(2×2=4): ' + d.stars);
  expect(d.done === true, '퍼즐 완료 저장');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 퍼즐 목록
  await page.waitForSelector('#scr-puzzles.on');
  expect(await page.locator('#puzzles-list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#puzzles-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 격자 3×3 · 트레이(정답9+방해2) · 완성 시 별 +9', async () => {
  await page.click('#scr-puzzles .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-puzzles.on');
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.rows === 3 && d.cols === 3, '단계2 격자: ' + d.rows + 'x' + d.cols);
  expect(await page.locator('#tray .tray-item').count() === 11, '트레이 수(9+2): ' + d.trayIds.length);
  const before = await page.evaluate(() => App.debug().stars);
  await fillAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 9, '별 증가(3×3=9): ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-puzzles.on');
});

await check('단계3: 격자 4×4 · 트레이(정답16+방해0)', async () => {
  await page.click('#scr-puzzles .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-puzzles.on');
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.rows === 4 && d.cols === 4, '단계3 격자: ' + d.rows + 'x' + d.cols);
  expect(await page.locator('#board .bd-cell').count() === 16, '격자 칸 16');
  expect(await page.locator('#board .bd-head').count() === 8, '헤더 8(방향4+색4)');
  expect(await page.locator('#tray .tray-item').count() === 16, '트레이 수(16+0): ' + d.trayIds.length);
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-puzzles.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '13', '별 수(4+9)');
  const l1 = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(l1.includes('1 / 10'), '단계1 진행: ' + l1);
  const l2 = await page.locator('.menu-card.c-l2 .mc-prog').textContent();
  expect(l2.includes('1 / 10'), '단계2 진행: ' + l2);
});

await check('3해상도 잘림 없음 (가로 스크롤·세로 넘침, 4×4 로 검사)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '태블릿 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3'); // 가장 큰 4×4 로 빡세게
    await page.waitForSelector('#scr-puzzles.on');
    await page.click('#puzzles-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const b = document.querySelector('#board').getBoundingClientRect();
      const t = document.querySelector('#tray').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        boardTop: b.top, boardBottom: b.bottom,
        trayTop: t.top, trayBottom: t.bottom,
        iw: window.innerWidth, ih: window.innerHeight,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.boardTop >= -2, s.name + ': 격자가 위로 잘림 ' + m.boardTop);
    expect(m.boardBottom <= m.ih + 2, s.name + ': 격자가 아래로 잘림 ' + m.boardBottom + ' > ' + m.ih);
    expect(m.trayBottom <= m.ih + 2, s.name + ': 트레이가 아래로 잘림 ' + m.trayBottom + ' > ' + m.ih);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

/* ─── 낙서장 배치 (「시안 3」) ─────────────────────────────────────── */

await check('첫 화면 낙서장: 칸마다 다른 기울기 · 크기 위계(1>2>3) · 안 겹침', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    // 새 규격: 흩뿌리기는 transform 이 아니라 낱개 속성 rotate 로 준다 — 각도는 rotate 에서 읽는다
    const ang = el => +parseFloat(getComputedStyle(el).rotate || '0').toFixed(2) || 0;
    const cards = [...document.querySelectorAll('#menu .menu-card')];
    const rs = cards.map(c => c.getBoundingClientRect());
    let overlap = 0;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++)
      if (rs[i].right > rs[j].left + 1 && rs[j].right > rs[i].left + 1 &&
          rs[i].bottom > rs[j].top + 1 && rs[j].bottom > rs[i].top + 1) overlap++;
    return {
      angles: cards.map(ang),
      // 칸의 진짜 폭은 offsetWidth 로 잰다 — 경계상자는 기울기만큼 넓어져 2·3단계가 엎치락뒤치락한다
      widths: cards.map(c => c.offsetWidth),
      overlap,
      offscreen: rs.filter(r => r.left < -1 || r.right > innerWidth + 1).length,
      scrollX: document.querySelector('#scr-home').scrollWidth - document.querySelector('#scr-home').clientWidth,
    };
  });
  expect(new Set(m.angles).size === 3, '칸이 같은 각도로 서 있다: ' + m.angles.join(','));
  expect(m.angles.every(a => Math.abs(a) > 0.5 && Math.abs(a) < 6), '기울기가 0이거나 과하다: ' + m.angles.join(','));
  // 새 규격: 1단계만 1.15배 크고 2·3단계는 서로 같다 — DESIGN.md 「첫 화면 규격」
  expect(m.widths[0] >= Math.max(m.widths[1], m.widths[2]) * 1.05, '1단계 칸이 뒤 칸보다 확실히 크지 않다: ' + m.widths.join('/'));
  expect(Math.max(m.widths[1], m.widths[2]) <= Math.min(m.widths[1], m.widths[2]) * 1.15, '2·3단계 칸 크기가 서로 다르다: ' + m.widths.join('/'));
  expect(m.overlap === 0, '칸끼리 겹침 ' + m.overlap + '건');
  expect(m.offscreen === 0 && m.scrollX <= 1, '칸이 화면 밖으로 나감');
});

/* 이 놀이의 목숨줄 — 조각이 '어느 쪽을 보는지'가 정답이라
   격자·조각에 회전이나 크기 변형이 붙으면 놀이가 망가진다. */
await check('격자·조각에는 회전·크기 변형 없음 (첫 화면 미리보기 포함)', async () => {
  const home = await page.evaluate(() => {
    // 기울기는 transform 과 낱개 속성 rotate 두 곳에서 온다 — 둘 다 더해야 진짜 각도가 나온다
    // (새 규격의 흩뿌리기가 rotate 로 바뀌었으므로 transform 만 보면 이 검사가 껍데기가 된다)
    const ang = el => {
      const s = getComputedStyle(el);
      let a = 0;
      if (s.transform && s.transform !== 'none') { const n = new DOMMatrix(s.transform); a += Math.atan2(n.b, n.a) * 180 / Math.PI; }
      if (s.rotate && s.rotate !== 'none') a += parseFloat(s.rotate) || 0;
      return a;
    };
    return [...document.querySelectorAll('#menu .mc-icon .mini-grid')].map(el => {
      let a = 0;
      for (let n = el; n && n.id !== 'menu'; n = n.parentElement) a += ang(n);
      return +a.toFixed(2);
    });
  });
  expect(home.every(a => Math.abs(a) < 0.35), '첫 화면 미리보기 격자가 기울어 있다: ' + home.join(','));

  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-puzzles.on');
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(200);
  const play = await page.evaluate(() => {
    const els = [document.querySelector('#board'),
      ...document.querySelectorAll('#board .bd-cell, #board .bd-head, #board .bd-corner, #tray .tray-item, #tray .ti-piece')];
    let maxA = 0, maxS = 0;
    for (const el of els) {
      const t = getComputedStyle(el).transform;
      if (t === 'none') continue;
      const m = new DOMMatrix(t);
      maxA = Math.max(maxA, Math.abs(Math.atan2(m.b, m.a) * 180 / Math.PI));
      maxS = Math.max(maxS, Math.abs(Math.hypot(m.a, m.b) - 1));
    }
    return { maxA: +maxA.toFixed(3), maxS: +maxS.toFixed(3) };
  });
  expect(play.maxA < 0.01, '격자·조각이 회전했다: ' + play.maxA + '도');
  expect(play.maxS < 0.01, '격자·조각 크기가 변형됐다: 배율차 ' + play.maxS);
});

await check('UI 그림은 손그림 SVG — 이모지가 남아 있지 않다', async () => {
  const m = await page.evaluate(() => {
    const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2B00}-\u{2BFF}\u{25A0}-\u{25FF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}]/u;
    /* 공용 부품(#pet-slot 의 학습 펫, 남은 시간 쪽지, 프로필 배지)은 이 앱 소관이 아니라 뺀다 */
    const zones = ['#scr-home h1', '#scr-home .stat', '#scr-home .menu', '#scr-puzzles .bar',
      '#puzzles-list', '#scr-play .bar', '#hint-chip', '#board .bd-corner'];
    const left = [];
    for (const z of zones) {
      const el = document.querySelector(z);
      if (el && EMOJI.test(el.textContent)) left.push(z + ': ' + el.textContent.trim().slice(0, 24));
    }
    return {
      left,
      useCount: document.querySelectorAll('use[href^="#mx-"]').length,
      symbols: document.querySelectorAll('symbol[id^="mx-"]').length,
      hasFilter: !!document.querySelector('#mx-hand feTurbulence') && !!document.querySelector('#mx-hand feDisplacementMap'),
    };
  });
  expect(m.left.length === 0, '이모지가 남았다 — ' + m.left.join(' | '));
  expect(m.symbols >= 10, '손그림 <symbol> 수: ' + m.symbols);
  expect(m.useCount >= 4, '손그림을 쓰는 자리 수: ' + m.useCount);
  expect(m.hasFilter, '떨림 필터(feTurbulence + feDisplacementMap) 없음');
});

await check('오른쪽 위 남은 시간 쪽지와 머리줄이 겹치지 않는다 (폰·패드)', async () => {
  for (const s of [{ w: 390, h: 844, n: '폰 세로' }, { w: 1180, h: 820, n: '패드 가로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.waitForTimeout(400);
    const hitHome = await page.evaluate(() => {
      const t = document.querySelector('.tl-bar-tag');
      if (!t) return [];
      const r = t.getBoundingClientRect();
      return [...document.querySelectorAll('#scr-home h1, #scr-home .stat, #scr-home .vs-btn')]
        .filter(e => getComputedStyle(e).display !== 'none')
        .filter(e => { const b = e.getBoundingClientRect(); return b.right > r.left && r.right > b.left && b.bottom > r.top && r.bottom > b.top; })
        .map(e => e.tagName + (e.className ? '.' + e.className : ''));
    });
    expect(hitHome.length === 0, s.n + ' 첫 화면 겹침: ' + hitHome.join(','));
    await page.click('.menu-card.c-l1');
    await page.waitForSelector('#scr-puzzles.on');
    await page.click('#puzzles-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(200);
    const hitPlay = await page.evaluate(() => {
      const t = document.querySelector('.tl-bar-tag');
      if (!t) return [];
      const r = t.getBoundingClientRect();
      return [...document.querySelectorAll('#scr-play .back, #scr-play h2, #scr-play .bigbtn')]
        .filter(e => { const b = e.getBoundingClientRect(); return b.right > r.left && r.right > b.left && b.bottom > r.top && r.bottom > b.top; })
        .map(e => e.id || e.tagName);
    });
    expect(hitPlay.length === 0, s.n + ' 놀이 화면 겹침: ' + hitPlay.join(','));
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
