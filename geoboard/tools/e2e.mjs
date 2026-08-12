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
const GRIDN = 6;   // 못 격자 — 못 인덱스↔좌표 환산에 쓴다
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
  expect(d.madeCount === 0, '처음엔 만든 고무줄 0: ' + d.madeCount);
  expect(d.activeColor === null, '처음엔 주무르는 고무줄 없음');
  expect(await page.locator('#card-board .band').count() === d.bands, '본보기 고무줄 가닥 수: ' + d.bands);
  expect(await page.locator('#board .peg').count() === 36, '놀이 못판 못 36개');
  const colors = await page.evaluate(() => GeoboardData.colorsOf(App.debug().puzzleId
    ? GeoboardData.puzzleById(App.debug().puzzleId) : null).length);
  expect(await page.locator('#tray .tray-item').count() === colors, '트레이 = 이 퍼즐에 쓰는 색만 (' + colors + ')');
});

await check('고무줄은 닫힌 고리다 — 못 3개 이상, 자기끼리 안 엇갈림', async () => {
  const bad = await page.evaluate(() => {
    const out = [];
    GeoboardData.PUZZLES.forEach(pz => pz.bands.forEach((b, i) => {
      if (b.pegs.length < 3) out.push(pz.id + '#' + i + ' 못 ' + b.pegs.length + '개');
    }));
    return out;
  });
  expect(bad.length === 0, '고리가 안 되는 고무줄: ' + bad.slice(0, 3).join(', '));
});

await check('색을 고르면 고무줄이 판에 걸려 나온다 (빈 판에서 시작하지 않는다)', async () => {
  const r = await page.evaluate(() => {
    const pz = GeoboardData.puzzleById(App.debug().puzzleId);
    App._pick(pz.bands[0].color);
    const d = App.debug();
    return { color: d.activeColor, verts: d.activeVerts, want: pz.bands[0].color };
  });
  expect(r.color === r.want, '고른 색이 주무르는 고무줄이 됨: ' + r.color);
  expect(r.verts && r.verts.length === 2, '못 두 개에 걸쳐 나온다: ' + JSON.stringify(r.verts));
  expect(await page.locator('#board .band').count() === 1, '판에 고무줄 한 가닥이 보인다');
});

await check('줄을 당겨 못에 걸면 고리가 커진다 · 못 없는 자리는 안 걸린다(무벌점)', async () => {
  const before = await page.evaluate(() => App.debug().activeVerts.length);
  // 본보기에 없는 못으로 당겨도 걸리기는 한다(어떤 모양이든 만들 수 있다) — 다만 완성은 안 된다
  const r = await page.evaluate(() => {
    const pz = GeoboardData.puzzleById(App.debug().puzzleId);
    const used = new Set(pz.bands[0].pegs.map(p => p[1] * GeoboardData.GRID + p[0]));
    let free = 0;
    while (used.has(free)) free++;
    App._pullTo(free);
    const d = App.debug();
    return { n: d.activeVerts.length, made: d.madeCount, locked: d.locked };
  });
  expect(r.n === before + 1, '당긴 만큼 고리가 커진다: ' + before + '→' + r.n);
  expect(r.made === 0, '본보기와 다른데 완성됨');
  expect(r.locked === false, '본보기와 다른데 퍼즐이 끝남');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀린 모양인데 축하가 뜸');
});

/* 옛 「오답 무벌점」 검사는 걷어냈다 — 못 두 개를 찍어 선을 놓던 시절의 것이라
 * App._attempt 와 함께 사라졌다. 지금의 무벌점은 위 「줄을 당겨…」 검사가 잰다:
 * 본보기에 없는 못으로 당겨도 걸리기는 하되(어떤 모양이든 만들 수 있다) 완성되지 않고,
 * 못이 없는 자리에 놓으면 탁 되돌아갈 뿐 잃는 것이 없다. */

await check('카드대로 걸기 → 완성 → 별(세그먼트 수)·펫 간식', async () => {
  await page.evaluate(() => App._pick(App.debug().activeColor));   // 주무르던 것 접기
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  const before = await page.evaluate(() => App.debug());
  await solve(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.madeCount === d.bands, '고무줄 다 만듦: ' + d.madeCount + '/' + d.bands);
  expect(d.placedCount === d.total, '변 다 걸림: ' + d.placedCount + '/' + d.total);
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
    // 목소리 단추(#btn-voice)는 놀이 화면에서 감췄다(shared/crayon.css) — 안 보이는 것을 훑으면
    // 오탐이 나므로 목록에서 뺐다. 제목·별·카드 이름은 그대로 훑는다.
    ['h1', '.stat', '.card-cap'].forEach(sel => {
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

/* 목소리 설정 단추는 부모용이라 놀이 화면에서 감췄다(shared/crayon.css, 2026-08).
 * 부모님이 아이패드에서 "저 메세지 아이콘은 뭐야"라고 물으셨고, 아이는 읽지 못하는 단추였다.
 * 예전에 이 자리에서 재던 「손그림 아이콘이다」·「터치 46px 이다」를 방향만 뒤집는다 —
 * 이제 지켜야 할 것은 "놀이 화면 어디에도 안 보인다"다. 바꾸는 곳은 부모님 페이지. */
await check('목소리 단추: 놀이 화면에 안 보인다 (부모님 페이지에서 바꾼다)', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  const m = await page.evaluate(() => {
    const el = document.querySelector('#btn-voice');
    if (!el) return { gone: true };
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { display: cs.display, visibility: cs.visibility, laidOut: el.offsetParent !== null,
      w: Math.round(r.width), h: Math.round(r.height) };
  });
  expect(m.gone || (m.display === 'none' && !m.laidOut && !m.w && !m.h),
    '목소리 단추가 아직 놀이 화면에 보인다: ' + JSON.stringify(m));
  // 길게 눌러 여는 방식(shared/voice-settings.js)은 그대로 살려 뒀다 — CSS 규칙만 걷어내면 되돌아온다
});

await check('진짜 손가락 드래그로 걸린다 (내부 함수가 아니라 포인터로)', async () => {
  /* 아래 검사들은 App._solve/_pullTo 라는 **내부 함수**를 부른다. 그것만 있으면
   * 포인터 배선이 통째로 죽어도 전부 통과한다 — 아이는 아무것도 못 하는데 초록불인 것이다.
   * 그래서 여기서 한 번은 진짜 마우스/터치로 집어 끌어 본다. */
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(200);

  await page.click('#tray .tray-item');
  await page.waitForTimeout(150);
  const st = await page.evaluate(() => ({
    d: App.debug(),
    pegs: GeoboardData.puzzleById(App.debug().puzzleId).bands[0].pegs,
  }));
  expect(st.d.activeVerts.length === 2, '색을 누르면 고무줄이 걸려 나온다');

  const svg = await page.locator('#board .board-svg').boundingBox();
  const at = (gx, gy) => ({ x: svg.x + (10 + gx * 16) / 100 * svg.width,
                            y: svg.y + (10 + gy * 16) / 100 * svg.height });
  const G = GRIDN;
  const want = st.pegs.map(p => p[1] * G + p[0]).filter(i => st.d.activeVerts.indexOf(i) < 0);
  const a = { gx: st.d.activeVerts[0] % G, gy: Math.floor(st.d.activeVerts[0] / G) };
  const b = { gx: st.d.activeVerts[1] % G, gy: Math.floor(st.d.activeVerts[1] / G) };
  const from = at((a.gx + b.gx) / 2, (a.gy + b.gy) / 2);          // 못이 아닌 줄 한가운데를 집는다
  const to = at(want[0] % G, Math.floor(want[0] / G));

  /* 먼저 **못이 없는 자리**(칸 한복판)에 놓아 본다 — 고무줄이라면 탁 되돌아가야 한다.
   * 걸리는 거리를 넉넉하게 잡으면 판 위 어디에 놓아도 걸려 버려서 되튀는 맛이 사라진다.
   * 실제로 그 실수를 했었고, 그때 이 검사가 없어 아무도 못 잡았다. */
  const dead = at(0.5, 0.5);                       // 못 네 개 사이 한복판 (가장 가까운 못까지 11.3)
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(dead.x, dead.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const afterDead = await page.evaluate(() => App.debug().activeVerts.length);
  expect(afterDead === 2, '못 없는 자리에 놓았는데 걸렸다 — 되돌아가야 함 (' + afterDead + ')');

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(90);
  const hi = await page.locator('#board .peg.hi').count();
  expect(hi > 0, '집는 순간 걸 수 있는 못이 반짝여야 함');
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
  await page.waitForTimeout(60);
  const live = await page.evaluate(() => {
    const el = document.querySelector('#board .band.live path');
    return el ? el.getAttribute('d').split('L').length : 0;
  });
  expect(live >= 3, '끄는 동안 손끝까지 고무줄이 늘어나야 함 (꼭짓점 ' + live + ')');
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(300);

  const d2 = await page.evaluate(() => App.debug());
  expect(d2.madeCount === 1, '드래그로 고무줄이 완성돼야 함: ' + d2.madeCount);
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  await page.click('#scr-list [data-go="scr-home"]');
  await page.waitForSelector('#scr-home.on');
});

await check('고무줄 30개 전부 볼록하다 (실물로 걸리는 모양인가)', async () => {
  /* 고무줄은 **당기기만** 하고 못은 **밀기만** 한다 — 안으로 파인 꼭짓점에서는 양쪽 줄이
   * 둘 다 안쪽으로 당겨 못이 붙잡을 방법이 없고, 줄은 이웃 두 못을 잇는 곧은 줄로 튕겨 나간다.
   * 그래서 한 가닥은 언제나 볼록하다. validate-data.js 의 계약 ⑤ 와 같은 규칙을
   * 브라우저에서도 한 번 잰다 — 데이터를 고치고 validate 를 안 돌린 채 커밋해도 여기서 걸린다. */
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  const bad = await page.evaluate(() => {
    const out = [];
    GeoboardData.PUZZLES.forEach(pz => pz.bands.forEach((b, bi) => {
      const n = b.pegs.length;
      let cw = 0, ccw = 0;
      for (let i = 0; i < n; i++) {
        const a = b.pegs[i], c = b.pegs[(i + 1) % n], d = b.pegs[(i + 2) % n];
        const t = (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]);
        if (t > 0) cw++; else if (t < 0) ccw++;
      }
      if (cw && ccw) out.push(pz.id + '/' + bi);
    }));
    return out;
  });
  expect(bad.length === 0, '안으로 파인 고무줄이 있다 — ' + bad.join(', '));
});

await check('같은 색 고무줄 두 가닥도 차례로 걸린다', async () => {
  /* 화살표·자동차·연처럼 **한 색으로 두 가닥**을 거는 퍼즐이 생겼다(파인 그림을 볼록한
   * 조각으로 나눈 결과다). 트레이는 색마다 칸 하나뿐이라, 첫 가닥을 걸어도 그 색이
   * 「다 걸었음」으로 꺼지면 두 번째를 못 건다. 그 자리를 잰다. */
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  const twin = await page.evaluate(() => {
    const pz = GeoboardData.PUZZLES.find(x =>
      x.bands.length > GeoboardData.colorsOf(x).length);
    return pz ? { id: pz.id, stage: pz.stage, color: pz.bands[0].color, bands: pz.bands.length } : null;
  });
  expect(twin !== null, '같은 색 두 가닥짜리 퍼즐이 데이터에 없다 — 이 검사가 헛돈다');

  await page.click('.menu-card.c-l' + twin.stage);
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card[data-id="' + twin.id + '"]');
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(150);

  const chips = await page.locator('#tray .tray-item[data-id="' + twin.color + '"]').count();
  expect(chips === 1, '트레이에 같은 색 칸이 여러 개다 (' + chips + ') — 색마다 하나여야 한다');

  // 첫 가닥을 건다
  const first = await page.evaluate(color => {
    App._pick(color);
    const d = App.debug();
    const pz = GeoboardData.puzzleById(d.puzzleId);
    pz.bands[0].pegs.forEach(p => App._pullTo(p[1] * GeoboardData.GRID + p[0]));
    return App.debug().madeCount;
  }, twin.color);
  expect(first === 1, '첫 가닥이 안 걸렸다 (madeCount ' + first + ')');

  const dimmed = await page.locator('#tray .tray-item[data-id="' + twin.color + '"].done').count();
  expect(dimmed === 0, '첫 가닥만 걸었는데 그 색이 「다 걸었음」으로 꺼졌다 — 두 번째를 못 건다');

  // 두 번째 가닥이 그 색으로 다시 나오는가 — 나오면 그것도 손으로 건다
  const second = await page.evaluate(color => {
    App._pick(color);
    const d = App.debug();
    return d.activeVerts ? d.activeVerts.length : 0;
  }, twin.color);
  expect(second === 2, '같은 색을 다시 눌렀는데 두 번째 고무줄이 안 나온다');

  await page.evaluate(() => {
    const pz = GeoboardData.puzzleById(App.debug().puzzleId);
    pz.bands[1].pegs.forEach(p => App._pullTo(p[1] * GeoboardData.GRID + p[0]));
  });
  await page.waitForTimeout(200);
  const d = await page.evaluate(() => App.debug());
  expect(d.madeCount === d.bands, '두 가닥을 다 걸었는데 완성이 안 됐다 (' + d.madeCount + '/' + d.bands + ')');
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
