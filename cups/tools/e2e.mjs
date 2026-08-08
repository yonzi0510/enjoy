#!/usr/bin/env node
/* 종단 테스트 — node cups/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계3) → 목록(10) → 퍼즐 진입 → 카드대로 놓기 → 완성(종·별·펫),
 * 오답 무벌점, 단계별 컵 수 3/6/10, 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/cups/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// App._attempt(color) 로 다음 색을 카드대로 끝까지 놓는다
async function stackAll(page) {
  for (;;) {
    const next = await page.evaluate(() => App.debug().nextColor);
    if (!next) break;
    await page.evaluate(c => App._attempt(c), next);
    await page.waitForTimeout(60);
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

await check('목록: 단계1 퍼즐 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-puzzles.on');
  expect(await page.locator('#puzzles-list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#puzzles-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('퍼즐 진입: 본보기·슬롯·트레이 표시, 컵 3개 슬롯', async () => {
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.cupCount === 3, '단계1 컵 수: ' + d.cupCount);
  expect(await page.locator('#pyr-play .pyr-cell').count() === 3, '슬롯 수');
  expect(await page.locator('#tray .tray-item').count() === 6, '트레이 6색 팔레트');
  expect(await page.locator('#sample-pyr .mini-cup').count() === 3, '본보기 컵 수');
  expect(!!d.nextColor, '다음 색 있음');
});

await check('오답 무벌점: 다음 색이 아닌 컵은 안 얹히고 축하도 없다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  // 다음에 놓아야 할 색이 아닌 방해 색을 놓는다
  const order = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
  const wrong = order.find(c => c !== d0.nextColor);
  await page.evaluate(c => App._attempt(c), wrong);
  await page.waitForTimeout(150);
  const d = await page.evaluate(() => App.debug());
  expect(d.filled === 0, '틀린 색인데 쌓임: ' + d.filled);
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 뜸');
  expect(await page.locator('#pyr-play .pyr-cell.full').count() === 0, '슬롯이 채워짐');
});

await check('카드대로 쌓기 → 완성 → 종·별·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await stackAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.filled === 3, '쌓은 컵 수: ' + d.filled);
  expect(d.stars === 3, '별(3컵=3): ' + d.stars);
  expect(d.done === true, '퍼즐 완료 저장');
  expect(await page.locator('#pyr-play .pyr-cell.full').count() === 3, '채워진 슬롯 수');
  expect(await page.locator('#reward-bell svg').count() === 1, '종 아이콘(손그림 SVG)');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 목록
  await page.waitForSelector('#scr-puzzles.on');
  expect(await page.locator('#puzzles-list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#puzzles-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 컵 6개 (3+2+1)', async () => {
  await page.click('#scr-puzzles .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-puzzles.on');
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.cupCount === 6, '단계2 컵 수: ' + d.cupCount);
  expect(await page.locator('#pyr-play .pyr-cell').count() === 6, '슬롯 수');
  expect(await page.locator('#pyr-play .pyr-row').count() === 3, '줄 수(3+2+1)');
});

await check('단계2 완성: 별이 6 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  await stackAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 6, '별 증가: ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-puzzles.on');
});

await check('단계3: 컵 10개 (4+3+2+1)', async () => {
  await page.click('#scr-puzzles .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-puzzles.on');
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.cupCount === 10, '단계3 컵 수: ' + d.cupCount);
  expect(await page.locator('#pyr-play .pyr-cell').count() === 10, '슬롯 수');
  expect(await page.locator('#pyr-play .pyr-row').count() === 4, '줄 수(4+3+2+1)');
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-puzzles.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '9', '별 수(3+6)');
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
    await page.click('.menu-card.c-l3'); // 컵이 가장 많은 단계로 빡세게
    await page.waitForSelector('#scr-puzzles.on');
    await page.click('#puzzles-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(140);
    const m = await page.evaluate(() => ({
      horiz: document.documentElement.scrollWidth - window.innerWidth,
      trayBottom: document.querySelector('#tray').getBoundingClientRect().bottom,
      pyrTop: document.querySelector('#pyr-play').getBoundingClientRect().top,
      sampleTop: document.querySelector('#sample-card').getBoundingClientRect().top,
      ih: window.innerHeight,
    }));
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.trayBottom <= m.ih + 2, s.name + ': 트레이가 화면 아래로 잘림 ' + m.trayBottom + ' > ' + m.ih);
    expect(m.pyrTop >= -2, s.name + ': 피라미드가 위로 잘림 ' + m.pyrTop);
    expect(m.sampleTop >= -2, s.name + ': 본보기 카드가 위로 잘림 ' + m.sampleTop);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('손그림 아이콘: 화면 틀에 이모지가 남아 있지 않다', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  const emoji = /[⭐🔔🔊🗣️🥤◀]/u;
  const homeText = await page.locator('#scr-home').textContent();
  expect(!emoji.test(homeText), '홈에 이모지 남음: ' + homeText);
  // 아이콘이 실제로 그려졌는지 (별·컵·말하기)
  expect(await page.locator('#scr-home .stat svg').count() === 1, '별 아이콘 없음');
  expect(await page.locator('#btn-voice svg').count() === 1, '목소리 아이콘 없음');
  expect(await page.locator('.home-head h1 svg').count() === 1, '제목 컵 아이콘 없음');
  // 떨림 필터가 문서에 하나 있다
  expect(await page.locator('#cups-kd').count() === 1, '손그림 떨림 필터 없음');
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-puzzles.on');
  const listText = await page.locator('#scr-puzzles').textContent();
  expect(!emoji.test(listText), '목록에 이모지 남음: ' + listText);
  expect(await page.locator('#puzzles-list .pz-badge svg').count() === 10, '배지 아이콘 수');
  await page.click('#puzzles-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const playText = await page.locator('#scr-play').textContent();
  expect(!emoji.test(playText), '놀이 화면에 이모지 남음: ' + playText);
  expect(await page.locator('#btn-listen svg').count() === 1, '듣기 아이콘 없음');
  expect(await page.locator('.sample-cap svg').count() === 1, '본보기 종 아이콘 없음');
});

await check('놀이판 무변형: 피라미드·컵에는 회전·확대가 없다', async () => {
  const bad = await page.evaluate(() => {
    const els = [document.querySelector('#pyr-play'), document.querySelector('#pyr-col'),
                 ...document.querySelectorAll('#pyr-play .pyr-cell'),
                 ...document.querySelectorAll('#tray .ti-cup')];
    return els.filter(el => {
      const t = getComputedStyle(el).transform;
      return t && t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)';
    }).length;
  });
  expect(bad === 0, '변형이 걸린 놀이판 요소 ' + bad + '개');
});

await check('첫 화면 낙서장: 칸마다 다른 기울기·크기, 겹침·이탈 없음', async () => {
  for (const s of [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드 가로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.waitForTimeout(120);
    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#menu .menu-card')];
      return {
        rects: cards.map(c => { const r = c.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width }; }),
        tf: cards.map(c => getComputedStyle(c).transform),
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        vw: window.innerWidth,
      };
    });
    // 크기 위계 — 먼저 할 단계가 가장 크다
    expect(m.rects[0].w > m.rects[1].w && m.rects[1].w > m.rects[2].w,
      s.name + ': 크기 위계 어긋남 ' + m.rects.map(r => Math.round(r.w)).join('/'));
    // 기울기가 셋 다 다르다
    expect(new Set(m.tf).size === 3, s.name + ': 기울기가 겹침');
    m.tf.forEach((t, i) => expect(t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)', s.name + ': ' + (i + 1) + '번 칸이 안 기울었다'));
    // 서로 겹치지 않는다
    for (let i = 0; i < m.rects.length; i++) for (let j = i + 1; j < m.rects.length; j++) {
      const a = m.rects[i], b = m.rects[j];
      const over = a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      expect(!over, s.name + ': 칸 ' + (i + 1) + '·' + (j + 1) + ' 겹침');
    }
    // 화면 밖으로 삐져나가지 않는다
    m.rects.forEach((r, i) => {
      expect(r.l >= -1 && r.r <= m.vw + 1, s.name + ': 칸 ' + (i + 1) + ' 화면 이탈 ' + Math.round(r.l) + '~' + Math.round(r.r));
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 ' + m.horiz + 'px');
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('머리 줄 겹침 없음: 듣기·제목 ↔ 남은 시간 쪽지·집 단추', async () => {
  for (const s of [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드 가로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3');
    await page.waitForSelector('#scr-puzzles.on');
    await page.click('#puzzles-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(160);
    const hits = await page.evaluate(() => {
      const rect = sel => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect() : null; };
      const mine = [['듣기', rect('#btn-listen')], ['제목', rect('#play-title')], ['뒤로', rect('#btn-play-back')]];
      const theirs = [['집 단추', rect('.enjoy-home-btn')], ['남은 시간', rect('.tl-bar-tag')]];
      const bad = [];
      mine.forEach(([an, a]) => theirs.forEach(([bn, b]) => {
        if (!a || !b) return;
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push(an + '↔' + bn);
      }));
      return bad;
    });
    expect(hits.length === 0, s.name + ': ' + hits.join(', '));
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
