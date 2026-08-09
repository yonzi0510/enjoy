#!/usr/bin/env node
/* 종단 테스트 — node lines/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계3) → 퍼즐 목록(10) → 놀이 진입(안내선 종류 확인),
 * 못 그은 트레이스는 완성되지 않음(무벌점) → App._trace() 로 완주 시뮬레이션하면
 * 완성·별·펫 간식 → 목록에 done 표기·진행 카운트, 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/lines/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 캔버스 위에 짧고 엉뚱한 획을 하나 그어(완주에는 턱없이 못 미치는 낙서) 무벌점 검사에 쓴다
async function scribble(page) {
  const box = await page.locator('#play-canvas').boundingBox();
  const x = box.x + box.width * 0.12, y = box.y + box.height * 0.12;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 10, y + 6, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(80);
}
// App._trace() 로 안내선을 그대로 따라 그리는 완벽한 트레이스를 시뮬레이션해 퍼즐을 완성시킨다
async function traceAndComplete(page) {
  await page.evaluate(() => App._trace());
  await page.waitForSelector('#reward.on', { timeout: 5000 });
}

/* 진짜 마우스로 안내선을 따라 긋는다 — 논리좌표(640×640)를 화면좌표로 바꿔 드래그한다.
 * 캔버스에 transform 이 걸리면 getBoundingClientRect() 가 커지거나 회전해 이 드래그가
 * 안내선에서 벗어나므로, 이 검사가 곧 "채점 좌표가 안 틀어졌는지" 검사이기도 하다.
 * dx,dy(논리 단위)를 주면 일부러 빗나가게 그을 수 있다. */
async function drawGuideByHand(page, dx = 0, dy = 0) {
  const g = await page.evaluate(() => {
    const el = document.querySelector('#play-canvas');
    const r = el.getBoundingClientRect();
    const mm = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
    return {
      cx: r.x + r.width / 2, cy: r.y + r.height / 2,   // 회전·확대는 가운데를 기준으로 도니 중심은 그대로
      size: el.offsetWidth,                            // 변형과 무관한 배치상의 크기
      m: mm ? mm[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0],
    };
  });
  const paths = await page.evaluate(() => {
    const pz = window.LinesData.puzzleById(App.debug().puzzle);
    return window.LinesData.guideOf(pz);
  });
  const k = g.size / 640;  // 정사각 캔버스라 가로세로 배율이 같다
  // 아이는 '눈에 보이는' 안내선을 따라간다 — 그래서 화면에 실제로 그려지는 자리(변형까지 반영)를 찍는다.
  // 캔버스에 transform 이 걸리면 여기서 찍은 자리와 ink.js 의 좌표 환산이 어긋나 채점이 무너진다.
  const at = pt => {
    const lx = (Math.max(0, Math.min(640, pt.x + dx)) - 320) * k;
    const ly = (Math.max(0, Math.min(640, pt.y + dy)) - 320) * k;
    return [g.cx + g.m[0] * lx + g.m[2] * ly, g.cy + g.m[1] * lx + g.m[3] * ly];
  };
  for (const p of paths) {
    if (p.length < 2) continue;
    let [x, y] = at(p[0]);
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i < p.length; i++) { [x, y] = at(p[i]); await page.mouse.move(x, y); }
    await page.mouse.up();
    await page.waitForTimeout(30);
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

await check('낙서장 배치: 단계 카드마다 다른 기울기 + 시작 화살표', async () => {
  const m = await page.evaluate(() => {
    const rot = el => {
      const t = getComputedStyle(el).transform;
      if (!t || t === 'none') return null;
      const n = t.match(/matrix\(([^)]+)\)/);
      if (!n) return null;
      const v = n[1].split(',').map(Number);
      return Math.round(Math.atan2(v[1], v[0]) * 180 / Math.PI * 10) / 10;
    };
    // 칸의 진짜 폭은 offsetWidth 로 잰다 — 경계상자는 기울기만큼 넓어져 2·3단계가 엎치락뒤치락한다
    const w = s => document.querySelector(s).offsetWidth;
    return {
      rots: ['.c-s1', '.c-s2', '.c-s3'].map(s => rot(document.querySelector(s))),
      widths: ['.c-s1', '.c-s2', '.c-s3'].map(w),
      // 시작 화살표는 shared/screen.css 가 첫 칸 ::before 로 얹는다(29개 앱 같은 그림·같은 색).
      // 앱이 따로 그리던 옛 화살표(.start-arrow)는 걷어냈다 — 다시 생기면 두 개가 겹친다.
      arrow: (() => {
        const has = c => {
          const s = getComputedStyle(c, '::before');
          return !!s.backgroundImage && s.backgroundImage !== 'none'
            && s.backgroundImage.includes('svg') && parseFloat(s.width) > 20;
        };
        const cards = [...document.querySelectorAll('#menu > .menu-card')];
        return { first: !!cards[0] && has(cards[0]), rest: cards.slice(1).filter(has).length,
          firstIsS1: !!cards[0] && cards[0].classList.contains('c-s1'),
          old: document.querySelectorAll('.start-arrow, .first-arrow, .mc-arrow').length };
      })(),
    };
  });
  expect(m.arrow.firstIsS1, '첫 칸이 1단계(반짝반짝 선)가 아님');
  expect(m.arrow.first, '공용 시작 화살표가 첫 칸에 없음');
  expect(m.arrow.rest === 0, '첫 칸이 아닌 칸에도 화살표가 있음: ' + m.arrow.rest);
  expect(m.arrow.old === 0, '앱이 따로 그리던 옛 화살표가 남아 있음');
  expect(m.rots.every(r => r !== null && Math.abs(r) > 0.4), '카드가 반듯하게 놓여 있음(기울기 없음): ' + m.rots);
  expect(new Set(m.rots).size === 3, '카드 기울기가 서로 같음: ' + m.rots);
  // 크기 위계 — 새 규격은 「1단계만 1.15배, 2·3단계는 같게」다 (DESIGN.md 「첫 화면 규격」)
  expect(m.widths[0] >= Math.max(m.widths[1], m.widths[2]) * 1.05,
    '1단계 칸이 뒤 칸보다 확실히 크지 않다: ' + m.widths.join(' / '));
  expect(Math.max(m.widths[1], m.widths[2]) <= Math.min(m.widths[1], m.widths[2]) * 1.15,
    '2·3단계 칸 크기가 서로 다르다: ' + m.widths.join(' / '));
});

await check('손그림 아이콘: 화면 틀에 이모지가 남아 있지 않다', async () => {
  const m = await page.evaluate(() => {
    // 화살표·기하도형·기타기호·이모지 영역 (◀ U+25C0, ⭐ U+2B50, ✏️ U+270F, 🔊 U+1F50A …)
    const EMO = /[←-⇿■-➿⬀-⯿️\u{1F000}-\u{1FAFF}]/u;
    const bad = [];
    // 화면 틀(제목·알약·단추·카드 이름) — 캔버스 위 캐릭터 얼굴은 놀잇감이라 검사 대상이 아니다
    ['h1', '.stat', '#btn-voice', '#btn-listen', '#btn-clear', '#scr-list .back',
      '#btn-play-back', '.mc-name', '.mc-prog', '#list-title',
      '#reward-next', '#reward-close', '.pz-badge'].forEach(s => {
      document.querySelectorAll(s).forEach(el => { if (EMO.test(el.textContent)) bad.push(s + ':' + el.textContent.trim()); });
    });
    return {
      bad,
      icons: document.querySelectorAll('svg.ic use').length,
      titleIcon: !!document.querySelector('h1 svg.ic use'),
    };
  });
  expect(m.bad.length === 0, '이모지가 남음 → ' + m.bad.join(' | '));
  expect(m.titleIcon && m.icons >= 8, '손그림 아이콘 수가 너무 적음: ' + m.icons);
});

await check('퍼즐 목록: 단계1 퍼즐 10개 + 0/10', async () => {
  await page.click('.menu-card.c-s1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('놀이 진입(단계1): 안내선 종류 = 햇살(ray)', async () => {
  await page.click('#list .puzzle-card >> nth=0');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.type === 'ray', '단계1 안내선 종류: ' + d.type);
  expect(d.done === false, '시작 시 미완성');
});

await check('채점 안전: 캔버스·안내선에 변형(transform)이 하나도 없다', async () => {
  const m = await page.evaluate(() => {
    const g = s => {
      const el = document.querySelector(s);
      if (!el) return s + '(없음)';
      const cs = getComputedStyle(el);
      return { sel: s, transform: cs.transform, rotate: cs.rotate, scale: cs.scale, zoom: cs.zoom, border: cs.borderTopWidth };
    };
    return ['#play-canvas', '.board-wrap', '.play-stage', '#scr-play'].map(g);
  });
  m.forEach(o => {
    expect(o.transform === 'none', o.sel + ' 에 transform 이 걸려 있다: ' + o.transform);
    expect(!o.rotate || o.rotate === 'none', o.sel + ' 에 rotate 가 걸려 있다: ' + o.rotate);
    expect(!o.scale || o.scale === 'none', o.sel + ' 에 scale 이 걸려 있다: ' + o.scale);
  });
  // 캔버스 테두리는 box-shadow 로 낸다 — border 를 주면 그리는 면이 줄어 좌표가 밀린다
  expect(m[0].border === '0px', '#play-canvas 에 border 가 생겼다(좌표가 밀린다): ' + m[0].border);
  // 논리 640×640 이 화면에서도 정사각이어야 손가락 좌표 환산이 맞는다
  const box = await page.locator('#play-canvas').boundingBox();
  expect(Math.abs(box.width - box.height) <= 2, '캔버스가 정사각이 아님: ' + box.width + '×' + box.height);
});

await check('빗나가게 그으면 완성되지 않는다(안내선에서 벗어난 좌표)', async () => {
  await drawGuideByHand(page, 110, 110);   // 안내선 모양 그대로, 자리만 크게 밀어서 긋기
  const d = await page.evaluate(() => App.debug());
  expect(d.strokeCount > 0, '획이 그려지지 않음');
  expect(d.done === false, '빗나갔는데 완성됨 (cov ' + d.coveragePct.toFixed(2) + ' adh ' + d.adherencePct.toFixed(2) + ')');
  await page.click('#btn-clear');
  await page.waitForTimeout(60);
});

await check('손으로 따라 긋기: 실제 드래그가 안내선 위에 정확히 얹힌다', async () => {
  await drawGuideByHand(page, 0, 0);
  const d = await page.evaluate(() => App.debug());
  expect(d.adherencePct >= 0.8, '그은 잉크가 안내선을 벗어남(좌표 어긋남 의심) adh=' + d.adherencePct.toFixed(2));
  expect(d.coveragePct >= 0.8, '안내선을 다 덮지 못함(좌표 어긋남 의심) cov=' + d.coveragePct.toFixed(2));
  expect(d.done === true, '따라 그었는데 완성되지 않음');
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card >> nth=1');   // 다음 검사를 위해 아직 안 한 퍼즐로
  await page.waitForSelector('#scr-play.on');
});

await check('무벌점: 엉뚱하게 짧게 그어도 완성되지 않는다', async () => {
  await scribble(page);
  const d = await page.evaluate(() => App.debug());
  expect(d.strokeCount > 0, '획이 그려지지 않음');
  expect(d.done === false, '낙서만으로 완성됨');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '낙서인데 축하가 뜸');
  await page.click('#btn-clear');
  await page.waitForTimeout(60);
});

await check('완벽 트레이스(_trace) → 완성 → 별·펫 간식', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await traceAndComplete(page);
  const d = await page.evaluate(() => App.debug());
  expect(d.done === true, '완성 잠금');
  expect(d.stars === starsBefore + 1, '별 증가: ' + starsBefore + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 2 / 10', async () => {
  // 단계1은 손 드래그로 한 개, _trace 로 한 개 — 모두 두 개를 마쳤다
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card.done').count() === 2, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('2 / 10'), '진행 표기');
});

await check('단계2 진입: 안내선 종류 = 물결(wave)', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-s2');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '단계2 퍼즐 10개');
  await page.click('#list .puzzle-card >> nth=0');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.type === 'wave' || d.type === 'zigzag', '단계2 안내선 종류: ' + d.type);
});

await check('단계2 완성(_trace) → 별·펫 간식 증가', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await traceAndComplete(page);
  const d = await page.evaluate(() => App.debug());
  expect(d.done === true, '단계2 완성 잠금');
  expect(d.stars === starsBefore + 1, '단계2 별 증가: ' + starsBefore + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '단계2 펫 간식: ' + petBefore + '→' + petAfter);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3 진입: 안내선 종류 = 소용돌이(spiral)', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-s3');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '단계3 퍼즐 10개');
  await page.click('#list .puzzle-card >> nth=0');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.type === 'spiral', '단계3 안내선 종류: ' + d.type);
  // 소용돌이는 촘촘히 샘플링된 긴 경로 하나(140+1점) — 곧은 선·꺾은 선과 뚜렷이 구분된다
  const pathInfo = await page.evaluate(() => {
    const pz = window.LinesData.puzzleById(App.debug().puzzle);
    const paths = window.LinesData.guideOf(pz);
    return { pathCount: paths.length, ptCount: paths[0] ? paths[0].length : 0 };
  });
  expect(pathInfo.pathCount === 1, '소용돌이는 경로 1개여야 함: ' + pathInfo.pathCount);
  expect(pathInfo.ptCount > 100, '소용돌이 점 개수가 너무 적음(촘촘한 곡선이 아님): ' + pathInfo.ptCount);
});

await check('단계3 완성(_trace) → 별·펫 간식 증가', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await traceAndComplete(page);
  const d = await page.evaluate(() => App.debug());
  expect(d.done === true, '단계3 완성 잠금');
  expect(d.stars === starsBefore + 1, '단계3 별 증가: ' + starsBefore + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '단계3 펫 간식: ' + petBefore + '→' + petAfter);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지(별·단계별 2/10·1/10)', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === String(starsBefore), '별 수 유지: ' + starsBefore);
  const want = { 'c-s1': '2 / 10', 'c-s2': '1 / 10', 'c-s3': '1 / 10' };
  for (const cls of Object.keys(want)) {
    const prog = await page.locator('.menu-card.' + cls + ' .mc-prog').textContent();
    expect(prog.includes(want[cls]), cls + ' 진행 유지: ' + prog + ' (기대 ' + want[cls] + ')');
  }
});

await check('3해상도 잘림 없음 (가로 스크롤·상하좌우 잘림 검사)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '패드 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-s3'); // 얼굴이 상대적으로 작은 소용돌이 단계도 함께 확인
    await page.waitForSelector('#scr-list.on');
    await page.click('#list .puzzle-card >> nth=0');
    await page.waitForSelector('#scr-play.on');
    const m = await page.evaluate(() => {
      const canvas = document.querySelector('#play-canvas').getBoundingClientRect();
      const clear = document.querySelector('#btn-clear').getBoundingClientRect();
      const bar = document.querySelector('#scr-play .bar').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        canvasTop: canvas.top, canvasLeft: canvas.left, canvasBottom: canvas.bottom, canvasRight: canvas.right,
        clearBottom: clear.bottom, barTop: bar.top,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.canvasTop >= -2 && m.barTop >= -2, s.name + ': 캔버스/상단바가 위로 잘림 top=' + m.canvasTop);
    expect(m.canvasLeft >= -2, s.name + ': 캔버스가 왼쪽으로 잘림 left=' + m.canvasLeft);
    expect(m.canvasRight <= m.iw + 2, s.name + ': 캔버스가 오른쪽으로 잘림 ' + m.canvasRight + ' > ' + m.iw);
    expect(m.clearBottom <= m.ih + 2, s.name + ': 다시 그릴래 버튼이 아래로 잘림 ' + m.clearBottom + ' > ' + m.ih);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('폰·패드: 겹침 없음 · 터치 44px · 캔버스 무변형', async () => {
  const sizes = [
    { w: 390, h: 844, name: '폰 세로' },
    { w: 1180, h: 820, name: '패드 가로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    for (const scr of ['home', 'list', 'play']) {
      if (scr === 'list') {
        await page.click('.menu-card.c-s1');
        await page.waitForSelector('#scr-list.on');
      }
      if (scr === 'play') {
        await page.click('#list .puzzle-card >> nth=0');
        await page.waitForSelector('#scr-play.on');
      }
      const m = await page.evaluate(() => {
        const vis = el => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        };
        const R = el => el.getBoundingClientRect();
        // 손가락으로 누르는 것들 — 44px 하한
        const small = [];
        document.querySelectorAll('button, a.enjoy-home-btn, .menu-card, .puzzle-card').forEach(el => {
          if (!vis(el)) return;
          const b = R(el);
          if (b.width < 44 || b.height < 44) small.push((el.id || el.className) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
        });
        // 공용 집 단추·남은시간 쪽지가 화면 것들과 겹치는지
        const fixed = ['.enjoy-home-btn', '.tl-bar-tag'].map(s => document.querySelector(s)).filter(e => e && vis(e));
        const targets = [];
        document.querySelectorAll('h1, .bar h2, .stat, .page-count, #btn-voice, #btn-listen, #btn-clear, .back, .pet-btn, #play-canvas, .menu-card, .puzzle-card')
          .forEach(el => { if (vis(el)) targets.push(el); });
        const overlaps = [];
        fixed.forEach(f => {
          const a = R(f);
          targets.forEach(t => {
            const b = R(t);
            const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (ox > 2 && oy > 2) overlaps.push((f.className) + ' ✕ ' + (t.id || t.className));
          });
        });
        return {
          small, overlaps,
          horiz: document.documentElement.scrollWidth - window.innerWidth,
          canvasTf: document.querySelector('#play-canvas') ? getComputedStyle(document.querySelector('#play-canvas')).transform : 'none',
        };
      });
      expect(m.horiz <= 1, s.name + '/' + scr + ': 가로 스크롤 ' + m.horiz + 'px');
      expect(m.small.length === 0, s.name + '/' + scr + ': 44px 미만 → ' + m.small.join(' | '));
      expect(m.overlaps.length === 0, s.name + '/' + scr + ': 겹침 → ' + m.overlaps.join(' | '));
      expect(m.canvasTf === 'none', s.name + '/' + scr + ': 캔버스 transform=' + m.canvasTf);
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
