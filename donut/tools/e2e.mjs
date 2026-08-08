#!/usr/bin/env node
/* 종단 테스트 — node donut/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계 3) → 목록(10) → 진입 → 같은 무늬 도넛을 자리에 놓기 →
 * 완성·축하·별·펫 간식, 틀린 칸 무벌점, 단계별 도넛 수 4/6/9, 새로고침 진행도 유지,
 * 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/donut/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 디버그 훅으로 다음 빈 자리(그 자리의 목표 도넛)를 골라 놓는다 — App._attempt(id, slotIndex)
async function placeOne(page) {
  const d = await page.evaluate(() => App.debug());
  const idx = d.slots.findIndex(s => !s.placed);
  if (idx < 0) return false;
  const id = d.slots[idx].target;
  await page.evaluate(([id, i]) => App._attempt(id, i), [id, idx]);
  await page.waitForTimeout(50);
  return true;
}
async function solveAll(page) { while (await placeOne(page)) { /* 계속 */ } }

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
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#puzzle-list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('진입: 단계1 자리 4개(2×2)·트레이 도넛 4개·자리 윤곽', async () => {
  await page.click('#puzzle-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total === 4, '단계1 자리 수: ' + d.total);
  expect(await page.locator('#board .slot').count() === 4, '자리 칸 수');
  expect(await page.locator('#board .slot .slot-ghost svg').count() === 4, '자리 윤곽(연한 도넛) 수');
  expect(await page.locator('#tray .tray-item').count() === 4, '트레이 도넛 수: ' + d.trayIds.length);
});

await check('틀린 칸 무벌점: 목표와 다른 자리에 놓으면 안 얹히고 축하도 없다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  // 0번 자리의 목표가 아닌 도넛을 0번 자리에 놓으려 시도한다
  const t0 = d0.slots[0].target;
  const wrong = d0.trayIds.find(id => id !== t0);
  await page.evaluate((id) => App._attempt(id, 0), wrong);
  await page.waitForTimeout(150);
  const d = await page.evaluate(() => App.debug());
  expect(d.placedCount === 0, '틀린 놓기인데 도넛이 얹힘: ' + d.placedCount);
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 뜸');
});

await check('같은 무늬 맞춰 놓기 → 완성 → 축하·별·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.placedCount === 4, '채운 자리 수: ' + d.placedCount);
  expect(d.stars === 4, '별(자리 4개=4): ' + d.stars);
  expect(d.done === true, '퍼즐 완료 저장');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 목록
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#puzzle-list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 자리 6개·트레이 6개, 완성 시 별 +6', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-list.on');
  await page.click('#puzzle-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total === 6, '단계2 자리 수: ' + d.total);
  expect(await page.locator('#tray .tray-item').count() === 6, '트레이 수(6)');
  const before = await page.evaluate(() => App.debug().stars);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 6, '별 증가: ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3: 자리 9개(3×3)·트레이 9개', async () => {
  await page.click('#scr-list .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-list.on');
  await page.click('#puzzle-list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total === 9, '단계3 자리 수: ' + d.total);
  expect(await page.locator('#board .slot').count() === 9, '자리 칸 수(9)');
  expect(await page.locator('#tray .tray-item').count() === 9, '트레이 수(9)');
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '10', '별 수(4+6)');
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
    await page.click('.menu-card.c-l3'); // 가장 자리가 많은 단계로 빡세게
    await page.waitForSelector('#scr-list.on');
    await page.click('#puzzle-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(120);
    const m = await page.evaluate(() => ({
      horiz: document.documentElement.scrollWidth - window.innerWidth,
      trayBottom: document.querySelector('#tray').getBoundingClientRect().bottom,
      boardTop: document.querySelector('#board').getBoundingClientRect().top,
      ih: window.innerHeight,
    }));
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.trayBottom <= m.ih + 2, s.name + ': 트레이가 화면 아래로 잘림 ' + m.trayBottom + ' > ' + m.ih);
    expect(m.boardTop >= -2, s.name + ': 자리판이 위로 잘림 ' + m.boardTop);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

/* ─────────── 「낙서장」 디자인 검사 ─────────── */

await check('첫 화면 낙서장 배치: 칸마다 다른 기울기·자리·크기', async () => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.waitForTimeout(420);            // 등장 모션이 끝난 뒤 재야 자리 값이 확정된다
  const m = await page.evaluate(() => [...document.querySelectorAll('#menu .menu-card')].map(el => ({
    t: getComputedStyle(el).transform,
    w: Math.round(el.getBoundingClientRect().width),
  })));
  expect(m.length === 3, '단계 카드 수');
  expect(m.every(x => x.t && x.t !== 'none'), '흩뿌림이 안 걸린 칸: ' + JSON.stringify(m.map(x => x.t)));
  expect(new Set(m.map(x => x.t)).size === 3, '칸들이 같은 기울기다: ' + JSON.stringify(m.map(x => x.t)));
  // 크기 위계 — 먼저 할 것이 가장 크다
  expect(m[0].w > m[1].w && m[1].w > m[2].w, '크기 위계가 깨짐: ' + m.map(x => x.w).join(' > '));
});

await check('크기 위계: 아직 안 한 첫 퍼즐 하나만 .next 로 크게', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  await page.waitForTimeout(420);
  const r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#puzzle-list .puzzle-card')];
    const nx = cards.filter(c => c.classList.contains('next'));
    const w = el => el.getBoundingClientRect().width;
    return {
      total: cards.length,
      nextCount: nx.length,
      nextIdx: cards.indexOf(nx[0]),
      nextW: nx[0] ? w(nx[0]) : 0,
      otherW: w(cards[cards.length - 1]),
      tilts: new Set(cards.map(c => getComputedStyle(c).transform)).size,
    };
  });
  expect(r.nextCount === 1, '.next 개수: ' + r.nextCount);
  expect(r.nextIdx === 0, '아직 안 한 첫 퍼즐이 아님: ' + r.nextIdx);
  expect(r.nextW > r.otherW + 2, '.next 가 더 크지 않다: ' + r.nextW + ' vs ' + r.otherW);
  expect(r.tilts >= 3, '퍼즐 칸 기울기가 다 같다: ' + r.tilts);
});

await check('UI 이모지 없음: 화면 틀은 전부 손그림 SVG', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{25B6}\u{25C0}]/u;
  const bad = await page.evaluate((src) => {
    const re = new RegExp(src, 'u');
    const out = [];
    ['h1', '.stat', '#btn-voice', '#list-title', '#play-title', '#btn-listen',
     '#scr-list .back', '#btn-play-back', '#reward-donut'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el && re.test(el.textContent)) out.push(sel + ':' + el.textContent.trim());
    });
    return out;
  }, emoji.source);
  expect(bad.length === 0, '이모지가 남음 — ' + bad.join(', '));
  expect(await page.locator('h1 svg.dn-ico').count() === 1, '제목 손그림 아이콘');
  expect(await page.locator('#btn-voice svg.dn-ico').count() === 1, '목소리 단추 손그림 아이콘');
  expect(await page.locator('#reward-donut svg.dn-ico').count() === 1, '축하 도넛 손그림 아이콘');
});

await check('놀이판 무변형: 자리판·자리·도넛에 회전·확대가 없다', async () => {
  // 흩뿌리기는 고르는 칸에만 준다. 놀이판이 조금이라도 변형되면
  // 끌어 놓은 자리를 좌표로 재는 판정(slotIndexUnder)이 틀어진다.
  for (const s of [{ w: 1180, h: 820, name: '패드 가로' }, { w: 390, h: 844, name: '폰 세로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3');           // 자리가 가장 많은 단계
    await page.waitForSelector('#scr-list.on');
    await page.click('#puzzle-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(200);
    const bad = await page.evaluate(() => {
      const out = [];
      const sels = ['#board', '#board .slot', '#board .slot-ghost', '#board .slot-fill',
                    '#tray', '#tray .tray-item', '#tray .ti-donut'];
      sels.forEach(sel => document.querySelectorAll(sel).forEach((el, i) => {
        const t = getComputedStyle(el).transform;
        if (t && t !== 'none') out.push(sel + '[' + i + ']=' + t);
      }));
      return out;
    });
    expect(bad.length === 0, s.name + ': 변형된 놀이판 요소 — ' + bad.slice(0, 4).join(', '));
    // 좌표 판정이 실제로 살아 있는지도 같이 본다 — 자리 한가운데를 눌러 놓아 본다
    const okPlace = await page.evaluate(async () => {
      const d = App.debug();
      const idx = d.slots.findIndex(s => !s.placed);
      App._select(d.slots[idx].target);
      const cell = document.querySelector('.slot[data-i="' + idx + '"]');
      const r = cell.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!(hit && hit.closest('.slot[data-i="' + idx + '"]'));
    });
    expect(okPlace, s.name + ': 자리 한가운데가 다른 것에 가려졌다');
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('머리줄 겹침 없음: 제목·듣기·뒤로 ↔ 집 단추·남은 시간 쪽지', async () => {
  for (const s of [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드 가로' },
                   { w: 844, h: 390, name: '폰 가로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3');
    await page.waitForSelector('#scr-list.on');
    await page.click('#puzzle-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(200);
    const hits = await page.evaluate(() => {
      const R = sel => { const el = document.querySelector(sel); if (!el) return null;
        const r = el.getBoundingClientRect(); return (r.width && r.height) ? r : null; };
      const mine = [['제목', R('#play-title')], ['듣기', R('#btn-listen')], ['뒤로', R('#btn-play-back')]];
      const theirs = [['집 단추', R('.enjoy-home-btn')], ['남은 시간', R('.tl-bar-tag')]];
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

await check('터치 영역 44px 이상 (폰 세로·패드 가로)', async () => {
  for (const s of [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드 가로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    const small = async (label) => await page.evaluate((label) => {
      const out = [];
      document.querySelectorAll('button:not([hidden]), a.vs-btn').forEach(el => {
        if (el.offsetParent === null) return;                 // 안 보이는 것은 건너뜀
        const r = el.getBoundingClientRect();
        if (r.width < 44 || r.height < 44) out.push(label + ' ' + (el.id || el.className) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
      });
      return out;
    }, label);
    let bad = await small('홈');
    await page.click('.menu-card.c-l3');
    await page.waitForSelector('#scr-list.on');
    bad = bad.concat(await small('목록'));
    await page.click('#puzzle-list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(160);
    bad = bad.concat(await small('놀이'));
    expect(bad.length === 0, s.name + ': ' + bad.join(', '));
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
