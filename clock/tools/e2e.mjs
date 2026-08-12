#!/usr/bin/env node
/* 종단 테스트 — node clock/tools/e2e.mjs
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 *
 * 이 파일의 핵심은 **진짜 마우스로 바늘을 돌려 본다**는 것이다.
 * 내부 함수를 불러 상태만 바꾸면 포인터 배선이 통째로 죽어도 초록불이 뜬다 —
 * 아이는 아무것도 못 하는데 검사는 통과하는 것이다. 그래서 아래 (a)~(i) 는
 * 전부 page.mouse 로 집고 끌고 놓는다.
 *
 *  (a) 분침을 끌어 목표에 맞추면 완성 + 별 + 펫 간식
 *  (b) 자석 — 눈금 사이 어중간한 자리에 놓아도 총분이 단위의 배수가 된다
 *  (c) 12시 넘기기 — 11시 45분 판에서 계속 끌어 12를 지나면 시가 하나만 올라간다
 *  (d) 무벌점 — 틀린 시각에 놓아도 잠기지 않고 별이 줄지 않고 축하가 안 뜬다
 *  (e) 손끝 추종 — 끄는 도중 바늘 각도가 시작과 목표 사이에 있다
 *  (f) 시침 연동 — 30분에서 시침각이 시×30+15 (정수 시각에 딱 붙으면 실패)
 *  (g) 그림-상태 일치 — SVG 바늘 끝점으로 각도를 역산해 debug() 와 대조
 *  (h) 한복판은 안 잡힌다 / 숫자 탭으로도 맞춰진다
 *  (i) 말 — 「○ 시!」 한마디만, 순우리말, 설명 없음
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/clock/';
const GRAB_R = 26;   // 바늘을 집는 반지름(viewBox 100 기준) — 손잡이와 한복판 사이

let passed = 0, failed = 0;
let preWin = null;   // 완성 직전의 별·간식 (검사 (e) 가 적고 (a) 가 견준다)
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });

/* 말한 것을 모두 받아 적는다 — 이 앱이 하는 말은 시각 한마디뿐이어야 한다 */
await page.addInitScript(() => {
  window.__said = [];
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = u => { try { window.__said.push(String(u.text)); } catch (e) {} };
  }
});

const consoleErrors = [];
const IGNORE = /icon-192|icon-512|favicon|Manifest/i;   // 아이콘은 아직 없다(생성 금지) — 404 는 정상
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) consoleErrors.push(m.text()); });
page.on('pageerror', e => { if (!IGNORE.test(String(e))) consoleErrors.push(String(e)); });
page.on('requestfailed', r => { /* 아이콘 404 는 무시 */ });

/* ─────────── 시계 조작 도우미 (전부 진짜 마우스) ─────────── */
async function dialBox() { return await page.locator('#dial .ck-face').boundingBox(); }
function at(box, r, deg) {
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const s = box.width / 100, t = deg * Math.PI / 180;
  return { x: cx + r * s * Math.sin(t), y: cy - r * s * Math.cos(t) };
}
const dbg = () => page.evaluate(() => App.debug());
// 화면에 실제로 그려진 바늘의 각도를 끝점 좌표에서 역산한다
const drawnAngle = sel => page.evaluate(s => {
  const el = document.querySelector('#dial ' + s);
  if (!el) return null;
  const x2 = parseFloat(el.getAttribute('x2')), y2 = parseFloat(el.getAttribute('y2'));
  return ((Math.atan2(x2 - 50, 50 - y2) * 180 / Math.PI) % 360 + 360) % 360;
}, sel);

/* 지금 바늘을 집어 deltaDeg 만큼 돌린다(양수 = 시계 방향). opt.hold 면 놓지 않는다. */
async function dragBy(deltaDeg, opt) {
  const o = opt || {};
  const box = await dialBox();
  const start = (await dbg()).minuteAngle;
  const from = at(box, GRAB_R, start);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = o.steps || Math.max(10, Math.ceil(Math.abs(deltaDeg) / 12));
  for (let i = 1; i <= steps; i++) {
    const p = at(box, GRAB_R, start + deltaDeg * i / steps);
    await page.mouse.move(p.x, p.y);
    if (o.onStep && i === Math.floor(steps / 2)) await o.onStep(start);
  }
  if (!o.hold) { await page.mouse.up(); await page.waitForTimeout(120); }
  return start;
}
// 지금 자리에서 목표까지 시계 방향으로 끈다(+extra 분 더 갈 수도 있다)
async function dragForward(targetTotal, extraMin) {
  const d = await dbg();
  const fwd = ((targetTotal - d.total) % 720 + 720) % 720;
  return dragBy((fwd + (extraMin || 0)) * 6);
}
async function openBoard(stageCls, boardIdx) {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('#menu .menu-card.c-r1');
  await page.waitForSelector('#scr-stages.on');
  await page.click('#stages .menu-card.' + stageCls);
  await page.waitForSelector('#scr-list.on');
  await page.locator('#list .round-card').nth(boardIdx || 0).click();
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(150);
}

await page.goto(BASE);

/* ═══════════ 앱 셸 ═══════════ */

await check('홈: 방 카드 3개 — ①만 열려 있고 ②③은 「곧 만들어요」', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '방 카드 수');
  expect(await page.locator('#menu .menu-card.soon').count() === 2, '아직 안 만든 방이 2개가 아니다');
  expect(await page.locator('#menu .menu-card.c-r1.soon').count() === 0, '뻐꾸기 시계가 잠겨 있다');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('방②③ — 눌러도 안 들어가고 쪽지만 뜬다 (다음 사람 자리)', async () => {
  await page.click('#menu .menu-card.c-r2');
  await page.waitForTimeout(200);
  expect(await page.locator('#scr-home.on').count() === 1, '아직 안 만든 방에 들어가 버렸다');
  expect(await page.locator('#toast.on').count() === 1, '「곧 만들어요」 쪽지가 안 떴다');
  await page.waitForTimeout(1700);
});

await check('방①: 단계 넷 (정각 · 반 · 15분 · 5분)', async () => {
  await page.click('#menu .menu-card.c-r1');
  await page.waitForSelector('#scr-stages.on');
  expect(await page.locator('#stages .menu-card').count() === 4, '단계 카드 수');
  const units = await page.evaluate(() => ClockData.STAGES.map(s => s.unit));
  expect(units.join(',') === '60,30,15,5', '단계 단위: ' + units.join(','));
});

await check('판 목록: 단계1 판 10개 · 40개 전부 단위의 배수', async () => {
  await page.click('#stages .menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .round-card').count() === 10, '판 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
  const bad = await page.evaluate(() => ClockData.BOARDS
    .filter(b => b.minutes % ClockData.unitOf(b.stage) !== 0).map(b => b.id));
  expect(bad.length === 0, '단위의 배수가 아닌 판: ' + bad.join(','));
});

await check('놀이 진입: 시계판 · 시작 자리가 정답이 아니다 · 1단계 목표는 그림', async () => {
  await page.locator('#list .round-card').first().click();
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(150);
  const d = await dbg();
  expect(d.stage === 1 && d.unit === 60, '단계/단위: ' + d.stage + '/' + d.unit);
  expect(d.total !== d.target, '열자마자 정답이다');
  expect(d.locked === false && d.opened === false, '처음부터 문이 열려 있다');
  expect(await page.locator('#dial .ck-face').count() === 1, '시계판이 없다');
  expect(await page.locator('#dial .ck-num').count() === 12, '숫자 12개');
  expect(await page.locator('#goal-face .ck-face').count() === 1, '1단계 목표가 시계 그림이 아니다');
  expect((await page.locator('#goal-digit').textContent()).trim() === '', '1단계인데 숫자가 떠 있다');
  // 글로 된 4지선다는 어디에도 없다
  expect(await page.locator('#scr-play .choice, #scr-play .quiz, #scr-play .option').count() === 0, '고르는 화면이 있다');
});

/* ═══════════ (d) 무벌점 — 완성보다 **먼저** 잰다 ═══════════ */

await check('(d) 무벌점: 틀린 시각에 놓아도 잠기지 않고 별도 안 줄고 축하도 안 뜬다', async () => {
  const before = await dbg();
  // 목표를 지나쳐 한 눈금 더 간다 (단계1 이라 한 시간 더)
  await dragForward(before.target, 60);
  const d = await dbg();
  expect(d.total !== d.target, '일부러 빗나가려 했는데 맞아 버렸다');
  expect(d.locked === false, '틀렸는데 판이 잠겼다');
  expect(d.done === false, '틀렸는데 완료로 저장됐다');
  expect(d.opened === false, '틀렸는데 문이 열렸다');
  expect(d.reward === false, '틀렸는데 축하가 떴다');
  expect(d.stars === before.stars, '틀렸는데 별이 바뀌었다: ' + before.stars + '→' + d.stars);
  expect(d.misses === 1, '빗나감이 안 세어졌다: ' + d.misses);
  // 다시 끌 수 있다 (한 눈금은 넘게 돌려야 자리가 바뀐다)
  await dragBy(d.unit * 0.9 * 6);
  expect((await dbg()).total !== d.total, '틀린 뒤 바늘이 안 움직인다');
});

await check('무벌점 힌트: 두 번 빗나가면 목표 숫자가 반짝인다 (정답을 공개하지는 않는다)', async () => {
  const d = await dbg();
  expect(d.misses >= 2, '빗나감 ' + d.misses);
  const hi = await page.locator('#dial .ck-num.hint').count();
  expect(hi === 1, '반짝이는 숫자가 ' + hi + '개');
  const which = await page.locator('#dial .ck-num.hint').getAttribute('data-h');
  expect(Number(which) === (await page.evaluate(() => ClockEngine.hour12(App.debug().target))),
    '반짝이는 숫자가 목표 시가 아니다: ' + which);
  expect((await dbg()).locked === false, '힌트가 떴는데 판이 잠겼다');
});

/* ═══════════ (e)(g)(a) 끌어서 맞추기 ═══════════ */

await check('(e) 손끝 추종: 끄는 도중 바늘이 시작과 목표 사이에 있다 (툭툭 끊기지 않는다)', async () => {
  // 앞 검사에서 일부러 멀리 보내 뒀으므로 같은 판을 새로 연다(빗나감도 0으로 돌아온다)
  await openBoard('c-l1', 0);
  const d0 = await dbg();
  expect(((d0.target - d0.total) % 720 + 720) % 720 < 60, '시작 자리가 한 바퀴 밖이다');
  const fwd = ((d0.target - d0.total) % 720 + 720) % 720;
  let mid = null;
  await dragBy(fwd * 6, {
    hold: true,
    onStep: async (start) => {
      const st = await dbg();
      const drawn = await drawnAngle('.ck-min');
      mid = { start, st, drawn };
    },
  });
  expect(mid, '끄는 도중을 못 쟀다');
  expect(mid.st.dragging === true, '끄는 중인데 dragging 이 false');
  expect(mid.st.live !== null, '끄는 중인데 live 값이 없다');
  // 끄는 동안 그림은 손끝(live)을 그대로 따라간다 — 눈금에 붙어 툭툭 끊기지 않는다
  const wantDeg = (((mid.st.live % 60) * 6) % 360 + 360) % 360;
  expect(Math.abs(((mid.drawn - wantDeg + 540) % 360) - 180) < 1.5,
    '그린 바늘이 live 값과 다르다: ' + mid.drawn.toFixed(2) + '° vs ' + wantDeg.toFixed(2) + '°');
  const goneFwd = ((mid.drawn - mid.start) % 360 + 360) % 360;
  expect(goneFwd > 5 && goneFwd < fwd * 6 + 5, '끄는 도중 바늘이 시작~목표 사이가 아니다: +' + goneFwd.toFixed(1) + '°');
  // 손을 떼기 **직전**의 별·간식을 적어 둔다 — 다음 검사(a)가 이것과 견준다
  preWin = { d: await dbg(), snacks: await page.evaluate(() => (window.Pet ? Pet.state().snacks : 0)) };
  await page.mouse.up();
  await page.waitForTimeout(200);
});

await check('(a) 목표에 맞추면 완성 — 문 열림 · 별 · 펫 간식 · 도감', async () => {
  expect(preWin, '앞 검사에서 손을 떼기 직전을 못 쟀다');
  const before = preWin.d, petBefore = preWin.snacks;
  const now = await dbg();
  expect(now.total === now.target, '앞 검사에서 목표에 안 섰다: ' + now.total + '/' + now.target);
  await page.waitForTimeout(400);
  const d = await dbg();
  expect(d.locked === true, '맞췄는데 완성이 아니다');
  expect(d.opened === true, '맞췄는데 문이 안 열렸다');
  expect(d.done === true, '완료 저장 안 됨');
  expect(d.stars === before.stars + 1, '별 증가: ' + before.stars + '→' + d.stars);
  expect(d.birds >= 1, '도감에 친구가 안 담겼다');
  expect(await page.locator('#door-bird svg').count() === 1, '문에서 새가 안 나왔다');
  const petAfter = await page.evaluate(() => (window.Pet ? Pet.state().snacks : 0));
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
  await page.waitForSelector('#reward.on', { timeout: 4000 });
});

await check('(g) 그림-상태 일치: SVG 바늘 끝점으로 역산한 각도가 debug() 와 같다', async () => {
  const d = await dbg();
  const mA = await drawnAngle('.ck-min');
  const hA = await drawnAngle('.ck-hour');
  expect(Math.abs(mA - d.minuteAngle) < 0.6, '분침 그림 ' + mA.toFixed(2) + '° ≠ 상태 ' + d.minuteAngle + '°');
  expect(Math.abs(hA - d.hourAngle) < 0.6, '시침 그림 ' + hA.toFixed(2) + '° ≠ 상태 ' + d.hourAngle + '°');
  expect(Math.abs(d.minuteAngle - (d.minutes % 60) * 6) < 1e-6, '분침각이 분과 안 맞는다');
  expect(Math.abs(d.hourAngle - (d.total * 0.5) % 360) < 1e-6, '시침각이 총분과 안 맞는다');
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .round-card.done').count() === 1, '완성 판 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

/* ═══════════ (b) 자석 ═══════════ */

await check('(b) 자석: 눈금 사이 어중간한 자리에 놓아도 총분이 반드시 단위의 배수', async () => {
  for (const [cls, unit] of [['c-l1', 60], ['c-l3', 15], ['c-l4', 5]]) {
    await openBoard(cls, 1);
    // 눈금과 안 맞는 각도들 — 어디에 놓아도 붙어야 한다
    for (const deg of [37, 71, 113, 158, 209, 251]) {
      await dragBy(deg);
      const d = await dbg();
      expect(Number.isInteger(d.total), unit + '분 눈금: 총분이 정수가 아니다 — ' + d.total);
      expect(d.total % unit === 0, unit + '분 눈금: ' + deg + '° 뒤 총분 ' + d.total + ' 이 눈금 위가 아니다');
      expect(d.total >= 0 && d.total <= 719, '총분이 0~719 밖 — ' + d.total);
      if (d.locked) break;   // 어쩌다 맞으면 그 단계는 여기까지
    }
  }
});

/* ═══════════ (c) 12시 넘기기 ═══════════ */

await check('(c) 12시 넘기기: 11시 45분 판에서 계속 끌어 12를 지나면 시가 하나만 올라간다', async () => {
  const idx = await page.evaluate(() =>
    ClockData.boardsOf(3).findIndex(b => b.minutes === 11 * 60 + 45));
  expect(idx >= 0, '11시 45분 판이 없다');
  await openBoard('c-l3', idx);
  const d0 = await dbg();
  expect(d0.target === 705, '목표가 11시 45분이 아니다: ' + d0.target);
  expect(d0.hour12 === 11, '시작이 11시대가 아니다: ' + d0.hour12);
  // 12시(총분 0)까지 시계 방향으로 한 번에 끈다 — 목표(11:45)를 지나 12를 넘는다
  await dragForward(720);
  const d = await dbg();
  expect(d.total === 0, '12를 지난 뒤 총분이 0(12시)이어야 하는데 ' + d.total +
    ' (' + d.hour12 + '시 ' + d.minutes + '분) — 각도 접기가 빠지면 여기서 몇 시간이 점프한다');
  expect(d.hour12 === 12, '시가 12가 아니다: ' + d.hour12);
  expect(d.hourAngle === 0, '시침각이 0이 아니다: ' + d.hourAngle);
  expect(d.locked === false && d.reward === false, '지나가다 완성돼 버렸다');
});

/* ═══════════ (f) 시침 연동 ═══════════ */

await check('(f) 시침 연동: 30분에서 시침각 = 시×30+15 (정수 시각에 붙어 있으면 실패)', async () => {
  const idx = await page.evaluate(() =>
    ClockData.boardsOf(2).findIndex(b => b.minutes % 60 === 30));
  await openBoard('c-l2', idx);
  const d0 = await dbg();
  await dragForward(d0.target);
  const d = await dbg();
  expect(d.total === d.target, '목표에 못 섰다: ' + d.total + '/' + d.target);
  expect(d.minutes === 30, '30분이 아니다: ' + d.minutes);
  const want = d.hour * 30 + 15;
  expect(Math.abs(d.hourAngle - want) < 1e-6, '시침각 ' + d.hourAngle + '° (기대 ' + want + '°)');
  expect(d.hourAngle % 30 !== 0, '시침이 정수 시각에 딱 붙어 있다 — 실물에 없는 그림이다');
  const drawn = await drawnAngle('.ck-hour');
  expect(Math.abs(drawn - want) < 0.6, '그려진 시침도 반 칸 물려 있어야 한다: ' + drawn.toFixed(2) + '°');
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  await page.click('#reward-close');
});

/* ═══════════ (h) 한복판 · 숫자 탭 ═══════════ */

await check('(h) 한복판은 안 잡힌다 / 숫자를 톡 누르면 긴바늘이 간다', async () => {
  await openBoard('c-l4', 0);
  const box = await dialBox();
  const before = await dbg();

  /* ① 한복판을 집어 끌어도 아무 일이 없다 (각도가 불안정한 자리다).
   *    한가운데뿐 아니라 **바늘이 지나가는 중심 근처**(r=8)에서도 안 잡혀야 한다 —
   *    그려진 바늘까지 잡히게 두면 한복판이 되살아난다. */
  for (const r0 of [0, 8]) {
    const c = at(box, r0, before.minuteAngle);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      const p = at(box, r0 + i, before.minuteAngle + i * 20);
      await page.mouse.move(p.x, p.y);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);
    const afterCenter = await dbg();
    expect(afterCenter.total === before.total,
      '중심에서 ' + r0 + ' 되는 자리를 끌었는데 바늘이 움직였다: ' + before.total + '→' + afterCenter.total);
    expect(afterCenter.misses === before.misses, '한복판을 끌었는데 빗나감으로 세어졌다');
  }

  // ② 숫자 탭 — 바늘이 덮지 않은 숫자를 고른다
  const n = await page.evaluate(() => {
    const d = App.debug();
    for (let k = 1; k <= 12; k++) {
      const gap = Math.abs(ClockEngine.fold(k * 30 - d.minuteAngle));
      if (gap > 45) return k;
    }
    return 1;
  });
  const want = await page.evaluate(k => ClockEngine.tapTotal(App.debug().total, k, App.debug().unit), n);
  const p = at(box, 30, n * 30);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(180);
  const d = await dbg();
  expect(d.total === want, '숫자 ' + n + ' 을 눌렀는데 ' + d.total + ' (기대 ' + want + ')');
  expect(d.minutes === (n % 12) * 5, '긴바늘이 ' + n + ' 을 안 가리킨다: ' + d.minutes + '분');
});

/* ═══════════ (i) 말 ═══════════ */

await check('(i) 말: 「○ 시!」 한마디만 — 순우리말, 설명 안 붙음', async () => {
  const idx = await page.evaluate(() => ClockData.boardsOf(1).findIndex(b => b.minutes === 4 * 60));
  expect(idx >= 0, '4시 판이 없다');
  await openBoard('c-l1', idx);
  await page.evaluate(() => { window.__said = []; });
  const d0 = await dbg();
  await dragForward(d0.target);
  await page.waitForTimeout(1200);
  const said = await page.evaluate(() => window.__said.slice());
  expect(said.length === 1, '한마디만 해야 하는데 ' + said.length + '마디: ' + JSON.stringify(said));
  expect(said[0] === '네 시!', '「네 시!」 가 아니다 — ' + JSON.stringify(said[0]));
  expect(said[0].indexOf('사 시') < 0, '한자어로 읽었다');
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  await page.click('#reward-close');
});

await check('말은 언제나 시각 읽기뿐이다 (앱을 통틀어 설명이 섞이지 않는다)', async () => {
  // 2단계 이후는 목표를 소리로도 준다 — 그것도 시각 한마디여야 한다
  await openBoard('c-l2', 2);
  await page.evaluate(() => { window.__said = []; });
  await page.waitForTimeout(700);
  await page.click('#btn-listen');
  await page.waitForTimeout(600);
  const bad = await page.evaluate(() => {
    const ok = new Set();
    for (let t = 0; t < 720; t += 5) { const s = ClockData.readTime(t); ok.add(s); ok.add(s + '!'); }
    return window.__said.filter(x => !ok.has(x));
  });
  expect(bad.length === 0, '시각 읽기가 아닌 말: ' + JSON.stringify(bad));
  const said = await page.evaluate(() => window.__said.slice());
  expect(said.length >= 1, '2단계에서 목표를 소리로 안 줬다');
  expect(said.every(s => /시/.test(s)), '시각이 아닌 말: ' + JSON.stringify(said));
});

/* ═══════════ 진행도 · 도감 ═══════════ */

await check('친구 도감 12칸 — 만난 친구만 채워진다', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('#menu .menu-card.c-r1');
  await page.waitForSelector('#scr-stages.on');
  await page.click('#btn-dex');
  await page.waitForSelector('#scr-dex.on');
  expect(await page.locator('#dex-grid .dex-cell').count() === 12, '도감 칸 수');
  const got = await page.locator('#dex-grid .dex-cell.got').count();
  expect(got >= 2, '만난 친구가 도감에 안 담겼다: ' + got);
  expect((await page.locator('#dex-total').textContent()).includes(got + ' / 12'), '도감 표기');
});

await check('새로고침 후 진행도 유지', async () => {
  const starsBefore = await page.evaluate(() => Progress.stars());
  const birdsBefore = await page.evaluate(() => Progress.birdCount());
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === String(starsBefore), '별 수 유지: ' + starsBefore);
  expect(await page.evaluate(() => Progress.birdCount()) === birdsBefore, '도감 유지: ' + birdsBefore);
  await page.click('#menu .menu-card.c-r1');
  await page.waitForSelector('#scr-stages.on');
  const l1 = await page.locator('#stages .menu-card.c-l1 .mc-prog').textContent();
  expect(/\d+ \/ 10/.test(l1), '단계1 진행 표기: ' + l1);
});

/* ═══════════ 화면 규격 ═══════════ */

await check('놀이판 무변형 (시계판 전체 computed transform none)', async () => {
  // 바늘을 회전이 아니라 좌표로 그리는 것이 이 앱의 뼈대다. 판이 조금이라도 기울거나
  // 커지면 손끝 각도 계산이 통째로 어긋난다.
  await openBoard('c-l4', 3);
  const read = () => page.evaluate(() => {
    const sels = ['#dial', '#dial .ck-face', '#dial .ck-rim', '#dial .ck-tick', '#dial .ck-num',
      '#dial .ck-numhit', '#dial .ck-ghost', '#dial .ck-hour', '#dial .ck-min', '#dial .ck-grab',
      '#dial .ck-knob', '#dial .ck-glow', '#dial .ck-cap',
      '#goal-face .ck-face', '#goal-face .ck-num', '.clock-col', '.play-stage', '#goal-card'];
    const bad = []; let seen = 0;
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      seen++;
      const t = getComputedStyle(el).transform;
      if (t !== 'none') bad.push(sel + ' → ' + t);
    }));
    return { bad, seen };
  });
  let r = await read();
  expect(r.seen >= 90, '검사한 시계판 요소가 너무 적다: ' + r.seen);
  expect(r.bad.length === 0, '변형이 걸린 요소: ' + r.bad.slice(0, 4).join(' , '));
  // 끄는 도중에도, 맞춘 뒤에도 그대로여야 한다
  await dragBy(120, { hold: true });
  r = await read();
  expect(r.bad.length === 0, '끄는 도중 변형: ' + r.bad.slice(0, 4).join(' , '));
  await page.mouse.up();
  await page.waitForTimeout(150);
  const d = await dbg();
  await dragForward(d.target);
  await page.waitForTimeout(400);
  r = await read();
  expect(r.bad.length === 0, '완성 뒤 변형: ' + r.bad.slice(0, 4).join(' , '));
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  await page.click('#reward-close');
});

await check('잡는 영역이 폰 세로에서 46px 이상 · 한복판은 비어 있다', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBoard('c-l2', 0);
  const m = await page.evaluate(() => {
    const svg = document.querySelector('#dial .ck-face');
    const r = svg.getBoundingClientRect();
    const grab = document.querySelector('#dial .ck-grab');
    const w = parseFloat(grab.getAttribute('stroke-width'));
    return { dial: r.width, grabPx: w * r.width / 100, inPx: ClockEngine.R_GRAB_IN * r.width / 100 };
  });
  expect(m.grabPx >= 46, '잡는 굵기 ' + m.grabPx.toFixed(1) + 'px — 46px 이상이어야 함');
  expect(m.dial >= 250 && m.dial <= 340, '폰 세로 시계판 ' + m.dial.toFixed(0) + 'px — 320px 안팎이어야 함');
  expect(m.dial <= 390 - 44, '시계판이 폭에 꽉 차 엄지가 화면 가장자리에 걸린다: ' + m.dial.toFixed(0) + 'px');
  expect(m.inPx >= 40, '한복판 비어 있는 반경이 ' + m.inPx.toFixed(0) + 'px 뿐이다');
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('3해상도 잘림 없음 (가로 스크롤·세로 넘침)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '패드 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await openBoard('c-l4', 5);   // 목표가 숫자로 뜨는(자리를 더 먹는) 단계
    const m = await page.evaluate(() => {
      const dial = document.querySelector('#dial').getBoundingClientRect();
      const goal = document.querySelector('#goal-card').getBoundingClientRect();
      const door = document.querySelector('#door-box').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        dialB: dial.bottom, dialR: dial.right, dialL: dial.left, dialT: dial.top,
        goalT: goal.top, goalL: goal.left, doorT: door.top,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 ' + m.horiz + 'px');
    expect(m.dialB <= m.ih + 2, s.name + ': 시계판이 아래로 잘림 ' + m.dialB.toFixed(0) + ' > ' + m.ih);
    expect(m.dialT >= -2, s.name + ': 시계판이 위로 잘림 ' + m.dialT.toFixed(0));
    expect(m.dialR <= m.iw + 2 && m.dialL >= -2, s.name + ': 시계판이 옆으로 잘림');
    expect(m.goalT >= -2 && m.goalL >= -2, s.name + ': 목표 카드가 잘림');
    expect(m.doorT >= -2, s.name + ': 뻐꾸기 집이 잘림');
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('폰·패드: 겹침 없음 · 터치 46px · 화면 이탈 없음', async () => {
  const sizes = [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드' }];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    for (const where of ['home', 'stages', 'list', 'play']) {
      await page.goto(BASE);
      await page.waitForSelector('#scr-home.on');
      if (where !== 'home') { await page.click('#menu .menu-card.c-r1'); await page.waitForSelector('#scr-stages.on'); }
      if (where === 'list' || where === 'play') { await page.click('#stages .menu-card.c-l4'); await page.waitForSelector('#scr-list.on'); }
      if (where === 'play') { await page.locator('#list .round-card').first().click(); await page.waitForSelector('#scr-play.on'); }
      await page.waitForTimeout(220);
      const m = await page.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
        const box = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
        const hit = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
        const floats = [];
        const home = document.querySelector('.enjoy-home-btn');
        const tag = document.querySelector('.tl-bar-tag');
        if (home && vis(home)) floats.push(['집 단추', box(home)]);
        if (tag && vis(tag) && !tag.closest('.tl-hidden')) floats.push(['시간 쪽지', box(tag)]);

        const targetSel = '.screen.on .bar > *, .screen.on .home-head > *, .screen.on .stats > *,' +
          '.screen.on .back, .screen.on #btn-listen, .screen.on #btn-dex,' +
          '.screen.on .menu-card, .screen.on .round-card, .screen.on .dex-cell,' +
          '.screen.on .vs-btn, .screen.on .stat, .screen.on .page-count, .screen.on .goal-card';
        const targets = [...document.querySelectorAll(targetSel)].filter(vis);
        const overlaps = [];
        floats.forEach(([fn, f]) => targets.forEach(t => {
          if (hit(f, box(t))) overlaps.push(fn + ' ↔ ' + (t.id || t.className));
        }));

        const tapSel = '.screen.on .back, .screen.on #btn-listen, .screen.on #btn-dex,' +
          '.screen.on .menu-card, .screen.on .round-card';
        const small = [...document.querySelectorAll(tapSel)].filter(vis)
          .map(el => ({ n: el.id || el.className, ...box(el) }))
          .filter(b => b.w < 46 || b.h < 46)
          .map(b => b.n + ' ' + Math.round(b.w) + '×' + Math.round(b.h));

        const out = [...document.querySelectorAll(targetSel + ', .screen.on #dial')].filter(vis)
          .map(el => ({ n: el.id || el.className, ...box(el) }))
          .filter(b => b.l < -1 || b.r > window.innerWidth + 1 || b.t < -1)
          .map(b => b.n + ' [' + [b.l, b.t, b.r, b.b].map(Math.round).join(',') + ']');

        return { horiz: document.documentElement.scrollWidth - window.innerWidth,
          floats: floats.length, overlaps, small, out };
      });
      const at2 = s.name + '/' + where;
      expect(m.horiz <= 1, at2 + ': 가로 스크롤 ' + m.horiz + 'px');
      expect(m.floats >= 2, at2 + ': 집 단추·시간 쪽지가 안 떠 있다(' + m.floats + ') — 겹침 검사가 헛돈다');
      expect(m.overlaps.length === 0, at2 + ': 겹침 — ' + m.overlaps.join(' | '));
      expect(m.small.length === 0, at2 + ': 터치 46px 미만 — ' + m.small.join(' | '));
      expect(m.out.length === 0, at2 + ': 화면 이탈 — ' + m.out.join(' | '));
    }
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('첫 화면 낙서장 배치 — 칸마다 다른 기울기, 먼저 할 것이 가장 크다', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#menu .menu-card')];
    const has = c => {
      const st = getComputedStyle(c, '::before');
      return !!st.backgroundImage && st.backgroundImage !== 'none'
        && st.backgroundImage.includes('svg') && parseFloat(st.width) > 20;
    };
    return {
      rots: cards.map(c => getComputedStyle(c).rotate),
      widths: cards.map(c => c.offsetWidth),
      firstIsRoom1: !!cards[0] && cards[0].classList.contains('c-r1'),
      arrowFirst: !!cards[0] && has(cards[0]),
      arrowRest: cards.slice(1).filter(has).length,
      old: document.querySelectorAll('.start-arrow, .first-arrow, .mc-arrow').length,
    };
  });
  expect(m.rots.every(r => r && r !== 'none'), '기울지 않은 칸이 있다: ' + m.rots.join(' | '));
  expect(new Set(m.rots).size === 3, '칸 세 개가 같은 기울기다: ' + m.rots.join(' | '));
  expect(m.widths[0] >= Math.max(m.widths[1], m.widths[2]) * 1.05, '첫 칸이 확실히 크지 않다: ' + m.widths.join(' / '));
  expect(m.firstIsRoom1, '첫 칸이 뻐꾸기 시계가 아니다');
  expect(m.arrowFirst, '공용 시작 화살표가 없다');
  expect(m.arrowRest === 0, '첫 칸이 아닌 칸에도 화살표가 있다');
  expect(m.old === 0, '앱이 따로 그린 옛 화살표가 남아 있다');
});

await check('이모지 대신 손그림 아이콘', async () => {
  const m = await page.evaluate(() => {
    const EMOJI = /[\u{25A0}-\u{27BF}\u{1F300}-\u{1FAFF}]/u;
    const bad = [];
    ['h1', '.stat', '.mc-name', '.mc-desc', '.goal-digit'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (EMOJI.test(el.textContent)) bad.push(sel + ': ' + el.textContent.trim());
      });
    });
    return { bad, icons: document.querySelectorAll('svg.ic').length };
  });
  expect(m.bad.length === 0, '이모지가 남아 있다 — ' + m.bad.join(' | '));
  expect(m.icons >= 2, '손그림 아이콘이 안 그려졌다: ' + m.icons);
});

await check('목소리 단추: 놀이 화면에 안 보인다 (부모님 페이지에서 바꾼다)', async () => {
  const m = await page.evaluate(() => {
    const el = document.querySelector('#btn-voice');
    if (!el) return { gone: true };
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { display: cs.display, laidOut: el.offsetParent !== null, w: Math.round(r.width), h: Math.round(r.height) };
  });
  expect(m.gone || (m.display === 'none' && !m.laidOut && !m.w && !m.h),
    '목소리 단추가 아직 보인다: ' + JSON.stringify(m));
});

await check('제한 시간·카운트다운이 없다 (시계로 아이를 재촉하지 않는다)', async () => {
  await openBoard('c-l1', 2);
  const m = await page.evaluate(() => ({
    sel: document.querySelectorAll('#scr-play .timer, #scr-play .countdown, #scr-play .time-left').length,
    src: (window.App && String(App.debug)) || '',
  }));
  expect(m.sel === 0, '놀이 화면에 시간 재는 것이 있다');
  const d = await dbg();
  await page.waitForTimeout(1500);
  const d2 = await dbg();
  expect(d2.total === d.total && d2.locked === d.locked, '가만히 뒀는데 판이 저절로 바뀐다');
});

await check('콘솔 오류 0 (아이콘 404 제외)', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
