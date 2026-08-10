#!/usr/bin/env node
/* 종단 테스트 — node robot/tools/e2e.mjs
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 *
 * 이 앱은 「짜기 → 실행 → 관찰」 구조라, 재야 할 것도 다른 놀이와 다르다.
 * 화살표를 **진짜로 눌러** 카드가 쌓이는지, ▶ 로 로봇이 실제로 걸어가는지,
 * 그리고 무엇보다 **빗나갔을 때 명령 줄이 살아 있는지**(이 앱의 핵심 배려)를 잰다.
 *
 * 내부 함수(App._…)로 명령을 채워 넣지 않는다 — 그러면 화살표판 배선이 통째로 죽어도
 * 초록불이 켜진다. 카드는 전부 page.click 으로 쌓고 뺀다.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/robot/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

/* ── 잔심부름 ── */
// 화살표판을 진짜 클릭해 명령을 쌓는다
async function press(page, dirs) {
  for (const d of dirs) {
    await page.click('.pad-btn[data-dir="' + d + '"]');
    await page.waitForTimeout(35);
  }
}
// 명령 줄을 카드 클릭으로 비운다 (맨 앞 카드를 계속 누른다)
async function clearCards(page) {
  for (let i = 0; i < 20; i++) {
    const n = await page.locator('#cmd-strip .cmd-card').count();
    if (!n) return;
    await page.click('#cmd-strip .cmd-card[data-i="0"]');
    await page.waitForTimeout(35);
  }
  throw new Error('명령 줄을 비우지 못했다');
}
// ▶ 를 누르고 실행이 끝날 때까지 기다린다
async function runAndWait(page, ms) {
  await page.click('#btn-run');
  await page.waitForFunction(() => App.debug().running === false, null, { timeout: ms || 12000 });
}
const dbg = page => page.evaluate(() => App.debug());

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
// 아이콘 파일은 통합 담당이 나중에 만든다 — 404 는 정상이라 세지 않는다
const IGNORE = /icon-\d+\.png|favicon|manifest/i;
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 단계 카드 3개 + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '단계 카드 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('판 목록: 단계1 판 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '판 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('놀이 진입: 4×4 마당 · 로봇은 시작 칸 · 명령 줄 비어 있음', async () => {
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await dbg(page);
  expect(d.n === 4, '단계1 격자: ' + d.n);
  expect(await page.locator('#cells .cell').count() === 16, '칸 16개');
  expect(d.robot.x === d.start[0] && d.robot.y === d.start[1], '로봇이 시작 칸에 없다');
  expect(d.cmds.length === 0, '처음엔 명령 줄이 비어 있어야 함');
  expect(await page.locator('#cmd-strip .cmd-card').count() === 0, '카드가 그려져 있다');
});

await check('진짜 클릭으로 화살표를 누르면 카드가 쌓인다', async () => {
  await press(page, ['up', 'up', 'up']);
  const d = await dbg(page);
  expect(d.cmds.join(',') === 'up,up,up', '명령 줄: ' + d.cmds.join(','));
  expect(await page.locator('#cmd-strip .cmd-card').count() === 3, '카드 3장이 보여야 함');
  const nos = await page.locator('#cmd-strip .cmd-card .cc-no').allTextContents();
  expect(nos.join(',') === '1,2,3', '카드에 순서 번호: ' + nos.join(','));
});

await check('카드를 누르면 그 카드만 빠진다', async () => {
  await press(page, ['left']);            // up,up,up,left
  await page.click('#cmd-strip .cmd-card[data-i="1"]');   // 두 번째(up) 빼기
  await page.waitForTimeout(80);
  const d = await dbg(page);
  expect(d.cmds.join(',') === 'up,up,left', '가운데 카드만 빠져야 함: ' + d.cmds.join(','));
  await page.click('#cmd-strip .cmd-card[data-i="2"]');   // left 빼기
  await page.waitForTimeout(80);
  const d2 = await dbg(page);
  expect(d2.cmds.join(',') === 'up,up', '마지막 카드 빼기: ' + d2.cmds.join(','));
});

/* ★ 이 앱의 핵심 배려 — 빗나가도 명령 줄은 살아 있다 */
await check('틀린 명령으로 실행: 명령 줄이 지워지지 않는다 · 벌점 없음 · 축하 안 뜸', async () => {
  const before = await dbg(page);
  expect(before.cmds.length === 2, '검사 준비: 카드 2장');
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await runAndWait(page);
  await page.waitForTimeout(1400);   // 로봇이 처음 자리로 돌아올 때까지
  const d = await dbg(page);
  expect(d.cmds.join(',') === before.cmds.join(','), '명령 줄이 바뀌었다: ' + d.cmds.join(','));
  expect(await page.locator('#cmd-strip .cmd-card').count() === 2, '카드가 화면에서 지워졌다');
  expect(d.stars === before.stars, '벌점/보상이 생겼다: ' + before.stars + '→' + d.stars);
  expect(d.done === false, '틀렸는데 완성 처리됨');
  expect(d.locked === false, '틀렸는데 판이 잠김');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 떴다');
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore, '틀렸는데 펫 간식이 나갔다');
  expect(d.robot.x === d.start[0] && d.robot.y === d.start[1], '로봇이 처음 자리로 안 돌아왔다');
});

await check('맞는 명령으로 실행: 로봇이 실제로 걸어가 목표에 닿는다 → 완성·별·펫 간식', async () => {
  await clearCards(page);
  const sol = await page.evaluate(() => RobotData.solve(RobotData.puzzleById(App.debug().puzzleId)));
  expect(sol && sol.length >= 2, '해답을 못 구했다');
  await press(page, sol);
  const before = await dbg(page);
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(before.cmds.length === sol.length, '카드 수: ' + before.cmds.length);
  await page.click('#btn-run');
  // 걸어가는 도중을 한 번 잡아 본다 — 로봇이 정말 움직이는가
  await page.waitForFunction(() => {
    const d = App.debug();
    return d.robot.x !== d.start[0] || d.robot.y !== d.start[1];
  }, null, { timeout: 6000 });
  await page.waitForSelector('#reward.on', { timeout: 12000 });
  const d = await dbg(page);
  expect(d.robot.x === d.goal[0] && d.robot.y === d.goal[1], '로봇이 목표에 없다: ' + JSON.stringify(d.robot));
  expect(d.locked === true, '완성 잠금');
  expect(d.done === true, '판 완료 저장');
  expect(d.stars === before.stars + 1, '별 증가: ' + before.stars + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card.done').count() === 1, '완성 판 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('벽·웅덩이에 부딪히면 그 자리에 멈춘다 (남은 명령은 건너뛴다, 벌점 없음)', async () => {
  await page.click('#scr-list [data-go="scr-home"]');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-list.on');
  // 시작 칸 옆에 벽·웅덩이가 있는 판을 데이터에서 골라 연다
  const pick = await page.evaluate(() => {
    const list = RobotData.puzzlesOf(2);
    for (let i = 0; i < list.length; i++) {
      const pz = list[i];
      for (const d of RobotData.DIR_IDS) {
        const dd = RobotData.DIRS[d];
        const nx = pz.start[0] + dd.dx, ny = pz.start[1] + dd.dy;
        if (!RobotData.inside(pz, nx, ny)) continue;
        if (RobotData.isWall(pz, nx, ny) || RobotData.isPuddle(pz, nx, ny)) {
          return { idx: i, dir: d, id: pz.id, kind: RobotData.isWall(pz, nx, ny) ? 'wall' : 'puddle' };
        }
      }
    }
    return null;
  });
  expect(pick, '시작 칸 옆에 장애물이 있는 판이 없다 (validate-data 가 6판 이상을 보장한다)');
  await page.click('#list .puzzle-card:nth-child(' + (pick.idx + 1) + ')');
  await page.waitForSelector('#scr-play.on');
  const before = await dbg(page);
  // 막힌 방향 + 그 뒤로 더 놓아 둔다 — 부딪히면 남은 명령을 건너뛰어야 한다
  await press(page, [pick.dir, 'up', 'up']);
  await page.click('#btn-run');
  await page.waitForFunction(() => App.debug().bumped !== null, null, { timeout: 8000 });
  const d = await dbg(page);
  expect(d.bumped === pick.kind, '부딪힌 까닭: ' + d.bumped + ' (기대 ' + pick.kind + ')');
  expect(d.robot.x === d.start[0] && d.robot.y === d.start[1], '부딪혔는데 자리를 옮겼다: ' + JSON.stringify(d.robot));
  expect(d.cmds.length === 3, '부딪혔다고 명령 줄이 지워졌다: ' + d.cmds.length);
  expect(d.stars === before.stars, '부딪혔는데 벌점이 생겼다');
  expect(d.done === false && d.locked === false, '부딪혔는데 완성 처리됨');
  expect(await page.locator('#robot-dizzy.on').count() === 1, '별이 뱅뱅 도는 표시가 없다');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '부딪혔는데 축하가 떴다');
});

await check('단계2 완성 — 꺾어 가는 길도 실제로 걸어간다', async () => {
  await clearCards(page);
  const sol = await page.evaluate(() => RobotData.solve(RobotData.puzzleById(App.debug().puzzleId)));
  expect(sol.length >= 5 && sol.length <= 7, '단계2 최단 명령 수: ' + sol.length);
  await press(page, sol);
  await page.click('#btn-run');
  await page.waitForSelector('#reward.on', { timeout: 15000 });
  const d = await dbg(page);
  expect(d.robot.x === d.goal[0] && d.robot.y === d.goal[1], '목표 도착 실패');
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3: 열쇠를 먼저 줍지 않으면 문이 안 열린다', async () => {
  await page.click('#scr-list [data-go="scr-home"]');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d0 = await dbg(page);
  expect(d0.n === 6, '단계3 격자: ' + d0.n);
  expect(d0.key, '단계3 인데 열쇠가 없다');
  // 열쇠를 밟지 않고 문 앞까지 간 뒤, 문으로 한 걸음 더
  const route = await page.evaluate(() => {
    const pz = RobotData.puzzleById(App.debug().puzzleId);
    const r = RobotData.pathToDoor(pz);
    return r ? { dirs: r.dirs, into: r.into, at: r.at } : null;
  });
  expect(route, '열쇠 없이 문 앞까지 가는 길이 없다');
  await press(page, route.dirs.concat([route.into]));
  await page.click('#btn-run');
  await page.waitForFunction(() => App.debug().bumped !== null, null, { timeout: 15000 });
  const d = await dbg(page);
  expect(d.bumped === 'door', '문에서 막히지 않았다: ' + d.bumped);
  expect(d.hasKey === false, '열쇠를 안 주웠는데 가졌다고 나온다');
  expect(d.robot.x === route.at[0] && d.robot.y === route.at[1], '문 앞에 서 있어야 한다: ' + JSON.stringify(d.robot));
  expect(d.done === false && d.locked === false, '열쇠 없이 완성됐다');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '열쇠 없이 축하가 떴다');
});

await check('단계3: 열쇠를 줍고 가면 문이 열린다 (완성)', async () => {
  await page.waitForTimeout(1700);   // 로봇이 처음 자리로 돌아올 때까지
  await clearCards(page);
  const sol = await page.evaluate(() => RobotData.solve(RobotData.puzzleById(App.debug().puzzleId)));
  expect(sol.length >= 8 && sol.length <= 10, '단계3 최단 명령 수: ' + sol.length);
  await press(page, sol);
  await page.click('#btn-run');
  await page.waitForSelector('#reward.on', { timeout: 20000 });
  const d = await dbg(page);
  expect(d.hasKey === true, '열쇠를 주웠어야 한다');
  expect(d.robot.x === d.goal[0] && d.robot.y === d.goal[1], '문에 도착 실패');
  expect(d.done === true, '완성 저장');
  await page.click('#reward-close');
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
  const l3 = await page.locator('.menu-card.c-l3 .mc-prog').textContent();
  expect(l3.includes('1 / 10'), '단계3 진행: ' + l3);
});

/* ═══════════ 낙서장 규격 ═══════════ */

/* 칸과 로봇 자리가 어긋나면 화면으로는 그럴듯한데 놀이가 통째로 거짓말이 된다.
 * 실제로 그랬다 — 칸 안의 <svg> 가 기본 크기(300×150)로 격자 줄 높이를 밀어 올려
 * 6×6 마당의 줄이 150px 이 됐는데, 눈으로는 멀쩡해 보였다. 그래서 자로 잰다. */
await check('칸이 마당을 정확히 나눈다 — 로봇 자리와 격자가 맞물린다', async () => {
  for (const lv of ['c-l1', 'c-l3']) {
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.' + lv);
    await page.waitForSelector('#scr-list.on');
    await page.click('#list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const d = App.debug();
      const bb = document.querySelector('#board').getBoundingClientRect();
      const cells = [...document.querySelectorAll('#cells .cell')];
      const want = bb.width / d.n;
      const bad = cells.filter(c => {
        const r = c.getBoundingClientRect();
        return Math.abs(r.width - want) > 1.5 || Math.abs(r.height - want) > 1.5;
      }).length;
      const startCell = cells.find(c => +c.dataset.x === d.start[0] && +c.dataset.y === d.start[1]);
      const sc = startCell.getBoundingClientRect();
      const rb = document.querySelector('#robot').getBoundingClientRect();
      const goalCell = cells.find(c => +c.dataset.x === d.goal[0] && +c.dataset.y === d.goal[1]);
      return {
        n: d.n, cells: cells.length, want, bad,
        span: { w: Math.abs(cells[cells.length - 1].getBoundingClientRect().right - bb.right),
                h: Math.abs(cells[cells.length - 1].getBoundingClientRect().bottom - bb.bottom) },
        robotOff: { x: Math.abs(rb.left - sc.left), y: Math.abs(rb.top - sc.top) },
        goalHasIcon: !!goalCell.querySelector('svg'),
      };
    });
    expect(m.cells === m.n * m.n, lv + ': 칸 수 ' + m.cells);
    expect(m.bad === 0, lv + ': 크기가 어긋난 칸 ' + m.bad + '개 (칸 하나는 ' + m.want.toFixed(1) + 'px 이어야 함)');
    expect(m.span.w <= 1.5 && m.span.h <= 1.5, lv + ': 격자가 마당을 넘거나 모자람 ' + JSON.stringify(m.span));
    expect(m.robotOff.x <= 1.5 && m.robotOff.y <= 1.5, lv + ': 로봇이 시작 칸에 딱 맞지 않는다 ' + JSON.stringify(m.robotOff));
    expect(m.goalHasIcon, lv + ': 목표 칸에 그림이 없다');
  }
});

await check('놀이판 무변형 (computed transform none)', async () => {
  // 격자 좌표가 놀이의 전부다. 마당·칸·로봇·카드가 조금이라도 기울거나 커지면
  // 아이가 보는 자리와 로봇이 서는 자리가 어긋난다.
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l3');           // 격자가 가장 큰 단계로 빡세게
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(200);
  await press(page, ['right', 'up']);

  const read = () => page.evaluate(() => {
    const sels = ['#board-box', '#board', '#cells', '#cells .cell', '#robot', '#robot .rb-body',
      '#cmd-strip', '#cmd-strip .cmd-card', '#pad', '#pad .pad-btn'];
    const bad = []; let seen = 0;
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      seen++;
      const t = getComputedStyle(el).transform;
      if (t !== 'none') bad.push(sel + ' → ' + t);
    }));
    return { bad, seen };
  });
  let r = await read();
  expect(r.seen >= 45, '검사한 놀이판 요소가 너무 적다: ' + r.seen);
  expect(r.bad.length === 0, '변형이 걸린 요소: ' + r.bad.slice(0, 4).join(' , '));

  // 로봇이 걷는 도중에도 그대로여야 한다 (이동은 left/top 이어야 하므로)
  await page.click('#btn-run');
  await page.waitForTimeout(500);
  r = await read();
  expect(r.bad.length === 0, '걷는 중 변형이 걸린 요소: ' + r.bad.slice(0, 4).join(' , '));
  const moved = await page.evaluate(() => {
    const el = document.querySelector('#robot');
    const cs = getComputedStyle(el);
    return { left: cs.left, top: cs.top, transform: cs.transform };
  });
  expect(moved.transform === 'none', '로봇 이동에 transform 을 쓰고 있다: ' + moved.transform);
  expect(parseFloat(moved.left) >= 0 && parseFloat(moved.top) >= 0, '로봇 자리가 left/top 으로 잡히지 않았다');
  await page.waitForFunction(() => App.debug().running === false, null, { timeout: 15000 });
});

await check('폰 세로에서 마당·명령 줄·화살표판이 한 화면에 들어간다 (3해상도)', async () => {
  const sizes = [
    { w: 390, h: 844, name: '폰 세로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 1180, h: 820, name: '패드 가로' },
  ];
  const out = [];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3');   // 6×6 — 가장 빡빡한 판
    await page.waitForSelector('#scr-list.on');
    await page.click('#list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await press(page, ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up']);  // 카드를 가득 채워도
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const b = el => { const r = document.querySelector(el).getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; };
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        vert: document.documentElement.scrollHeight - window.innerHeight,
        ih: window.innerHeight, iw: window.innerWidth,
        board: b('#board'), strip: b('#cmd-strip'), pad: b('#pad'), run: b('#btn-run'), bar: b('#scr-play .bar'),
        rows: (() => {
          const cards = [...document.querySelectorAll('#cmd-strip .cmd-card')];
          return new Set(cards.map(c => Math.round(c.getBoundingClientRect().top))).size;
        })(),
      };
    });
    out.push(s.name + ': 마당 ' + Math.round(m.board.w) + 'px · 명령줄 ' + Math.round(m.strip.h) +
      'px(' + m.rows + '줄) · 화살표판 ' + Math.round(m.pad.h) + 'px · 아래 여유 ' +
      Math.round(m.ih - Math.max(m.pad.b, m.run.b)) + 'px');
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 ' + m.horiz + 'px');
    expect(m.board.t >= m.bar.b - 2, s.name + ': 마당이 윗줄을 파고든다');
    expect(m.board.b <= m.ih + 1, s.name + ': 마당이 아래로 잘림 ' + Math.round(m.board.b) + ' > ' + m.ih);
    expect(m.strip.b <= m.ih + 1, s.name + ': 명령 줄이 아래로 잘림 ' + Math.round(m.strip.b));
    expect(m.pad.b <= m.ih + 1, s.name + ': 화살표판이 아래로 잘림 ' + Math.round(m.pad.b));
    expect(m.run.b <= m.ih + 1, s.name + ': 출발 단추가 아래로 잘림 ' + Math.round(m.run.b));
    expect(m.board.r <= m.iw + 1 && m.board.l >= -1, s.name + ': 마당이 옆으로 잘림');
    expect(m.board.w >= 150, s.name + ': 마당이 너무 작다 ' + Math.round(m.board.w) + 'px');
    expect(m.rows <= 2, s.name + ': 명령 카드가 ' + m.rows + '줄이 됐다 (두 줄 고정이어야 마당이 안 들썩인다)');
  }
  console.log('     ↳ ' + out.join('\n     ↳ '));
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('폰·패드: 겹침 없음 · 터치 46px · 화면 이탈 없음', async () => {
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
        await press(page, ['up', 'right']);
      }
      await page.waitForTimeout(200);
      const m = await page.evaluate(() => {
        const vis = el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        };
        const box = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
        const hit = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;

        const floats = [];
        const home = document.querySelector('.enjoy-home-btn');
        const tag = document.querySelector('.tl-bar-tag');
        if (home && vis(home)) floats.push(['집 단추', box(home)]);
        if (tag && vis(tag) && !tag.closest('.tl-hidden')) floats.push(['시간 쪽지', box(tag)]);

        const targetSel = '.screen.on .bar > *, .screen.on .home-head > *, .screen.on .stats > *,' +
          '.screen.on .back, .screen.on #btn-listen, .screen.on .menu-card, .screen.on .puzzle-card,' +
          '.screen.on .pad-btn, .screen.on .cmd-card, .screen.on #btn-run,' +
          '.screen.on .vs-btn, .screen.on .stat, .screen.on .page-count';
        const targets = [...document.querySelectorAll(targetSel)].filter(vis);
        const overlaps = [];
        floats.forEach(([fname, f]) => targets.forEach(t => {
          if (hit(f, box(t))) overlaps.push(fname + ' ↔ ' + (t.id || t.className));
        }));

        // 터치 하한 46px — 아이가 실제로 누르는 것들
        const tapSel = '.screen.on .back, .screen.on #btn-listen, .screen.on .vs-btn,' +
          '.screen.on .menu-card, .screen.on .puzzle-card, .screen.on .pad-btn,' +
          '.screen.on .cmd-card, .screen.on #btn-run';
        const small = [...document.querySelectorAll(tapSel)].filter(vis)
          .map(el => ({ n: el.id || el.className, ...box(el) }))
          .filter(b => b.w < 46 || b.h < 46)
          .map(b => b.n + ' ' + Math.round(b.w) + '×' + Math.round(b.h));

        const out = [...document.querySelectorAll(targetSel + ', .screen.on .board-box')].filter(vis)
          .map(el => ({ n: el.id || el.className, ...box(el) }))
          .filter(b => b.l < -1 || b.r > window.innerWidth + 1 || b.t < -1)
          .map(b => b.n + ' [' + [b.l, b.t, b.r, b.b].map(Math.round).join(',') + ']');

        return { horiz: document.documentElement.scrollWidth - window.innerWidth, floats: floats.length, overlaps, small, out };
      });
      const at = s.name + '/' + where;
      expect(m.horiz <= 1, at + ': 가로 스크롤 ' + m.horiz + 'px');
      expect(m.floats >= 2, at + ': 집 단추·시간 쪽지가 안 떠 있다(' + m.floats + ') — 겹침 검사가 헛돈다');
      expect(m.overlaps.length === 0, at + ': 겹침 — ' + m.overlaps.join(' | '));
      expect(m.small.length === 0, at + ': 터치 46px 미만 — ' + m.small.join(' | '));
      expect(m.out.length === 0, at + ': 화면 이탈 — ' + m.out.join(' | '));
    }
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('첫 화면 규격 — 칸마다 다른 기울기, 1단계가 가장 크고, 시작 화살표는 첫 칸에만', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#menu .menu-card')];
    const has = c => {
      const s = getComputedStyle(c, '::before');
      return !!s.backgroundImage && s.backgroundImage !== 'none' && s.backgroundImage.includes('svg') && parseFloat(s.width) > 20;
    };
    return {
      rots: cards.map(c => getComputedStyle(c).rotate),
      widths: cards.map(c => c.offsetWidth),
      first: !!cards[0] && has(cards[0]),
      rest: cards.slice(1).filter(has).length,
      firstIsL1: !!cards[0] && cards[0].classList.contains('c-l1'),
      old: document.querySelectorAll('.start-arrow, .first-arrow, .mc-arrow').length,
    };
  });
  expect(m.rots.every(r => r && r !== 'none'), '기울지 않은 칸이 있다: ' + m.rots.join(' | '));
  expect(new Set(m.rots).size === 3, '칸 세 개가 같은 기울기다: ' + m.rots.join(' | '));
  expect(m.widths[0] >= Math.max(m.widths[1], m.widths[2]) * 1.05, '1단계 칸이 뒤 칸보다 크지 않다: ' + m.widths.join(' / '));
  expect(m.firstIsL1, '첫 칸이 1단계가 아니다');
  expect(m.first, '첫 놀이를 가리키는 공용 시작 화살표가 없다');
  expect(m.rest === 0, '첫 칸이 아닌 칸에도 화살표가 있다: ' + m.rest);
  expect(m.old === 0, '앱이 따로 그리던 옛 화살표가 남아 있다');
});

await check('이모지 대신 손그림 아이콘', async () => {
  const m = await page.evaluate(() => {
    const EMOJI = /[\u{1F300}-\u{1FAFF}]/u;
    const bad = [];
    ['h1', '.stat', '.mc-name', '.mc-desc'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (EMOJI.test(el.textContent)) bad.push(sel + ': ' + el.textContent.trim());
      });
    });
    return { bad, syms: document.querySelectorAll('svg symbol[id^="rb-"]').length };
  });
  expect(m.bad.length === 0, '이모지가 남아 있다 — ' + m.bad.join(' | '));
  expect(m.syms >= 12, '손그림 <symbol> 이 모자라다: ' + m.syms);
});

/* 목소리 설정 단추는 부모용이라 놀이 화면에서 감췄다(shared/crayon.css, 2026-08). */
await check('목소리 단추: 놀이 화면에 안 보인다 (부모님 페이지에서 바꾼다)', async () => {
  const m = await page.evaluate(() => {
    const el = document.querySelector('#btn-voice');
    if (!el) return { gone: true };
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { display: cs.display, laidOut: el.offsetParent !== null, w: Math.round(r.width), h: Math.round(r.height) };
  });
  expect(m.gone || (m.display === 'none' && !m.laidOut && !m.w && !m.h),
    '목소리 단추가 아직 놀이 화면에 보인다: ' + JSON.stringify(m));
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
