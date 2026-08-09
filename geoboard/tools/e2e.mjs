#!/usr/bin/env node
/* 종단 테스트 — node geoboard/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계3) → 퍼즐 목록(10) → 놀이 진입(본보기 못판·놀이 못판·트레이),
 * 카드대로 고무줄 걸기 → 완성·별(세그먼트 수)·펫 간식, 오답 무벌점(완성 안 됨),
 * 단계별 세그먼트 수, 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/geoboard/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 완성되지 않은 세그먼트를 모두 걸어 퍼즐을 완성한다
async function solve(page) {
  await page.evaluate(() => App._solve());
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

await check('퍼즐 목록: 단계1 퍼즐 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('놀이 진입: 본보기 못판·놀이 못판·트레이, 세그먼트 2~4개(단계1)', async () => {
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total >= 2 && d.total <= 4, '단계1 세그먼트 수: ' + d.total);
  expect(d.placedCount === 0, '처음엔 걸린 고무줄 0: ' + d.placedCount);
  expect(await page.locator('#card-board .band').count() === d.total, '본보기 못판 고무줄 수');
  expect(await page.locator('#board .peg').count() === 36, '놀이 못판 못 36개');
  expect(await page.locator('#tray .tray-item').count() === 5, '트레이 색 5종');
});

await check('오답 무벌점: 안 맞는 자리는 안 걸리고 축하도 없다', async () => {
  const wrong = await page.evaluate(() => {
    const d = App.debug();
    const used = new Set(d.segments.map(s => s.color));
    let color = GeoboardData.COLOR_IDS.find(c => !used.has(c));
    let fromIdx, toIdx;
    if (color) { fromIdx = 0; toIdx = 1; }
    else {
      color = d.segments[0].color;
      const GRID = GeoboardData.GRID;
      outer:
      for (let a = 0; a < GRID * GRID; a++) {
        for (let b = a + 1; b < GRID * GRID; b++) {
          const p1 = [a % GRID, Math.floor(a / GRID)], p2 = [b % GRID, Math.floor(b / GRID)];
          if (!d.segments.some(s => GeoboardData.sameSeg(s, p1, p2))) { fromIdx = a; toIdx = b; break outer; }
        }
      }
    }
    return { color, fromIdx, toIdx };
  });
  await page.evaluate((w) => App._attempt(w.color, w.fromIdx, w.toIdx), wrong);
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => App.debug());
  expect(d.placedCount === 0, '오답인데 걸림: ' + d.placedCount);
  expect(d.locked === false, '오답인데 완성됨');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '오답인데 축하가 뜸');
});

await check('카드대로 걸기 → 완성 → 별(세그먼트 수)·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  const before = await page.evaluate(() => App.debug());
  await solve(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.placedCount === d.total, '고무줄 다 걸음: ' + d.placedCount + '/' + d.total);
  expect(d.done === true, '퍼즐 완료 저장');
  expect(d.stars === before.stars + d.total, '별 증가(세그먼트 수만큼): ' + before.stars + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 세그먼트 5~8개', async () => {
  await page.click('#scr-list [data-go="scr-home"]');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total >= 5 && d.total <= 8, '단계2 세그먼트 수: ' + d.total);
});

await check('단계2 완성: 별이 세그먼트 수만큼 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  const need = await page.evaluate(() => App.debug().total);
  await solve(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + need, '별 증가: ' + before + '→' + after + ' (세그먼트 ' + need + ')');
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3: 세그먼트 9~14개', async () => {
  await page.click('#scr-list [data-go="scr-home"]');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '단계3 퍼즐 10개');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total >= 9 && d.total <= 14, '단계3 세그먼트 수: ' + d.total);
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === String(starsBefore), '별 수 유지: ' + starsBefore);
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
    await page.click('.menu-card.c-l3'); // 세그먼트가 가장 많은 단계로 빡세게
    await page.waitForSelector('#scr-list.on');
    await page.click('#list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const play = document.querySelector('#board').getBoundingClientRect();
      const card = document.querySelector('#card-board').getBoundingClientRect();
      const tray = document.querySelector('#tray').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        playBottom: play.bottom, playRight: play.right,
        cardTop: card.top, cardLeft: card.left,
        trayBottom: tray.bottom,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.playBottom <= m.ih + 2, s.name + ': 놀이 못판이 아래로 잘림 ' + m.playBottom + ' > ' + m.ih);
    expect(m.trayBottom <= m.ih + 2, s.name + ': 트레이가 아래로 잘림 ' + m.trayBottom + ' > ' + m.ih);
    expect(m.playRight <= m.iw + 2, s.name + ': 놀이 못판이 옆으로 잘림 ' + m.playRight + ' > ' + m.iw);
    expect(m.cardTop >= -2 && m.cardLeft >= -2, s.name + ': 본보기 못판이 잘림 top=' + m.cardTop + ' left=' + m.cardLeft);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

/* ═══════════ 낙서장 배치 이후 더한 검사 ═══════════ */

await check('못판·고무줄에 변형 없음 (computed transform none)', async () => {
  // 못 좌표가 놀이의 전부다. 못판이 조금이라도 기울거나 커지면 탭 자리가 어긋난다.
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l3');            // 세그먼트가 가장 많은 단계로 빡세게
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(150);

  const readTransforms = () => page.evaluate(() => {
    const sels = [
      '#board', '#card-board',
      '#board > .board-svg', '#card-board > .board-svg',
      '#board .peg', '#card-board .peg',
      '#board .band', '#card-board .band',
      '.play-slot .board-box', '.card-slot .board-box', '.board-slot',
    ];
    const bad = [];
    let seen = 0;
    sels.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        seen++;
        const t = getComputedStyle(el).transform;
        if (t !== 'none') bad.push(sel + ' → ' + t);
      });
    });
    return { bad, seen };
  });

  let r = await readTransforms();
  expect(r.seen >= 80, '검사한 못판 요소가 너무 적다: ' + r.seen);
  expect(r.bad.length === 0, '변형이 걸린 못판 요소: ' + r.bad.slice(0, 4).join(' , '));

  // 고무줄을 다 건 뒤(완성 상태)에도 그대로여야 한다
  await solve(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  r = await readTransforms();
  expect(r.bad.length === 0, '완성 후 변형이 걸린 못판 요소: ' + r.bad.slice(0, 4).join(' , '));
  const rt = await page.evaluate(() => getComputedStyle(document.querySelector('#reward-board')).transform);
  expect(rt === 'none', '상 주는 못판에 변형: ' + rt);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('첫 화면 낙서장 배치 — 칸마다 다른 기울기, 먼저 할 것이 가장 크다', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.waitForTimeout(500);   // 등장 모션(card-in)이 transform 을 쥐고 있는 동안은 못 잰다
  const m = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#menu .menu-card')];
    return {
      // 새 규격: 흩뿌리기는 transform 이 아니라 낱개 속성 rotate 로 준다(이동·확대는 뺐다)
      rots: cards.map(c => getComputedStyle(c).rotate),
      // 칸의 진짜 폭은 offsetWidth 로 잰다 — 경계상자는 기울기만큼 넓어져 2·3단계가 엎치락뒤치락한다
      widths: cards.map(c => c.offsetWidth),
      // 시작 화살표는 shared/screen.css 가 첫 칸 ::before 로 얹는다(29개 앱 같은 그림·같은 색).
      // 앱이 따로 그리던 옛 화살표(.first-arrow)는 걷어냈다 — 다시 생기면 두 개가 겹친다.
      arrow: (() => {
        const has = c => {
          const s = getComputedStyle(c, '::before');
          return !!s.backgroundImage && s.backgroundImage !== 'none'
            && s.backgroundImage.includes('svg') && parseFloat(s.width) > 20;
        };
        return { first: !!cards[0] && has(cards[0]), rest: cards.slice(1).filter(has).length,
          firstIsL1: !!cards[0] && cards[0].classList.contains('c-l1'),
          old: document.querySelectorAll('.start-arrow, .first-arrow, .mc-arrow').length };
      })(),
    };
  });
  expect(m.rots.every(r => r && r !== 'none'), '기울지 않은 칸이 있다: ' + m.rots.join(' | '));
  expect(new Set(m.rots).size === 3, '칸 세 개가 같은 기울기다: ' + m.rots.join(' | '));
  // 새 규격: 1단계만 1.15배 크고 2·3단계는 서로 같다 — DESIGN.md 「첫 화면 규격」
  expect(m.widths[0] >= Math.max(m.widths[1], m.widths[2]) * 1.05,
    '1단계 칸이 뒤 칸보다 확실히 크지 않다: ' + m.widths.join(' / '));
  expect(Math.max(m.widths[1], m.widths[2]) <= Math.min(m.widths[1], m.widths[2]) * 1.15,
    '2·3단계 칸 크기가 서로 다르다: ' + m.widths.join(' / '));
  expect(m.arrow.firstIsL1, '첫 칸이 1단계(쉬운 모양)가 아니다');
  expect(m.arrow.first, '첫 놀이를 가리키는 공용 시작 화살표가 없다');
  expect(m.arrow.rest === 0, '첫 칸이 아닌 칸에도 화살표가 있다: ' + m.arrow.rest);
  expect(m.arrow.old === 0, '앱이 따로 그리던 옛 화살표가 남아 있다');
});

await check('이모지 대신 손그림 아이콘', async () => {
  const m = await page.evaluate(() => {
    const EMOJI = /[\u{25A0}-\u{27BF}\u{1F300}-\u{1FAFF}]/u;
    const bad = [];
    ['h1', '.stat', '#btn-voice', '.card-cap'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (EMOJI.test(el.textContent)) bad.push(sel + ': ' + el.textContent.trim());
      });
    });
    return { bad, icons: document.querySelectorAll('svg.ico').length };
  });
  expect(m.bad.length === 0, '이모지가 남아 있다 — ' + m.bad.join(' | '));
  expect(m.icons >= 2, '손그림 아이콘이 안 그려졌다: ' + m.icons);
});

await check('폰·패드: 겹침 없음 · 터치 44px · 화면 이탈 없음', async () => {
  const sizes = [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드' }];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    for (const where of ['home', 'list', 'play']) {
      await page.goto(BASE);
      await page.waitForSelector('#scr-home.on');
      if (where !== 'home') {
        await page.click('.menu-card.c-l3');
        await page.waitForSelector('#scr-list.on');
      }
      if (where === 'play') {
        await page.click('#list .puzzle-card');
        await page.waitForSelector('#scr-play.on');
      }
      await page.waitForTimeout(200);
      const m = await page.evaluate(() => {
        const vis = el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        };
        const box = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
        const hit = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;

        // 오른쪽 위에 떠 있는 것들 vs 화면 틀·조작 요소
        const floats = [];
        const home = document.querySelector('.enjoy-home-btn');
        const tag = document.querySelector('.tl-bar-tag');
        if (home && vis(home)) floats.push(['집 단추', box(home)]);
        if (tag && vis(tag) && !tag.closest('.tl-hidden')) floats.push(['시간 쪽지', box(tag)]);

        // 머리줄·머리말은 '상자'가 아니라 그 안의 알맹이로 잰다 —
        // 상자는 집 단추 자리를 비우려고 오른쪽 여백을 크게 잡아 두었으므로 겹쳐도 맞는 것이다.
        const targetSel = '.screen.on .bar > *, .screen.on .home-head > *, .screen.on .stats > *,' +
          '.screen.on .back, .screen.on #btn-listen,' +
          '.screen.on .menu-card, .screen.on .puzzle-card, .screen.on .tray-item,' +
          '.screen.on .vs-btn, .screen.on .stat, .screen.on .page-count, .screen.on .pz-badge, .screen.on .card-cap';
        const targets = [...document.querySelectorAll(targetSel)].filter(vis);

        const overlaps = [];
        floats.forEach(([fname, f]) => targets.forEach(t => {
          if (hit(f, box(t))) overlaps.push(fname + ' ↔ ' + (t.id || t.className));
        }));

        // 터치 하한 44px (못은 6×6 격자라 물리적으로 못 지킨다 — 조작 단추·칸만 잰다)
        const tapSel = '.screen.on .back, .screen.on #btn-listen, .screen.on .vs-btn,' +
          '.screen.on .menu-card, .screen.on .puzzle-card, .screen.on .tray-item';
        const small = [...document.querySelectorAll(tapSel)].filter(vis)
          .map(el => ({ n: el.id || el.className, ...box(el) }))
          .filter(b => b.w < 44 || b.h < 44)
          .map(b => b.n + ' ' + Math.round(b.w) + '×' + Math.round(b.h));

        // 화면 밖으로 나간 것 — 좌우로 삐져나가거나 위로 잘린 것.
        // (아래로 넘치는 것은 목록처럼 세로로 굴리는 화면에선 정상이라 세지 않는다.
        //  놀이 화면의 세로 잘림은 '3해상도 잘림 없음' 검사가 따로 잰다.)
        const outSel = targetSel + ', .screen.on .board-box';
        const out = [...document.querySelectorAll(outSel)].filter(vis)
          .map(el => ({ n: el.id || el.className, ...box(el) }))
          .filter(b => b.l < -1 || b.r > window.innerWidth + 1 || b.t < -1)
          .map(b => b.n + ' [' + [b.l, b.t, b.r, b.b].map(Math.round).join(',') + ']');

        return {
          horiz: document.documentElement.scrollWidth - window.innerWidth,
          floats: floats.length, overlaps, small, out,
        };
      });
      const at = s.name + '/' + where;
      expect(m.horiz <= 1, at + ': 가로 스크롤 ' + m.horiz + 'px');
      expect(m.floats >= 2, at + ': 집 단추·시간 쪽지가 안 떠 있다(' + m.floats + ') — 겹침 검사가 헛돈다');
      expect(m.overlaps.length === 0, at + ': 겹침 — ' + m.overlaps.join(' | '));
      expect(m.small.length === 0, at + ': 터치 44px 미만 — ' + m.small.join(' | '));
      expect(m.out.length === 0, at + ': 화면 이탈 — ' + m.out.join(' | '));
    }
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
