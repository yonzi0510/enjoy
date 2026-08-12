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

/* 말한 것을 모두 받아 적는다.
 * 이 앱의 말은 **두 갈래뿐**이다 — 시각 안내(readTime) 와 장면 대사(친구 한마디·카드 이름).
 * ClockData.SPEECH 가 그 두 집합을 그대로 내고, 아래 검사들이 **집합 대조**를 한다.
 * onend 를 흉내 내 준다 — 진짜 브라우저처럼 다음 마디가 이어져야 여러 마디 발화를 잴 수 있다. */
await page.addInitScript(() => {
  window.__said = [];
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = u => {
      try { window.__said.push(String(u.text)); } catch (e) {}
      setTimeout(() => { try { if (u.onend) u.onend(); } catch (e) {} }, 25);
    };
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

/* 1차에는 「①만 열려 있다」를 여기서 못 박아 두었다. 2차에서 방②③ 을 만들었으므로
 * 그 검사를 **없애지 않고 다시 적는다** — 이제는 「셋 다 열려 있고 각자 제 화면으로 들어간다」다. */
await check('홈: 방 카드 3개 — 셋 다 열려 있다 (잠긴 방 0)', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '방 카드 수');
  expect(await page.locator('#menu .menu-card.soon').count() === 0, '아직 잠긴 방이 남아 있다');
  ['c-r1', 'c-r2', 'c-r3'].forEach(() => {});
  for (const cls of ['c-r1', 'c-r2', 'c-r3']) {
    expect(await page.locator('#menu .menu-card.' + cls).count() === 1, cls + ' 카드가 없다');
  }
  const desc = await page.locator('#menu .mc-desc').allTextContents();
  expect(desc.every(t => !/곧 만들어요/.test(t)), '아직 「곧 만들어요」가 남아 있다: ' + desc.join(' | '));
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('방②③ — 눌러 들어간다 (② 는 단계 둘, ③ 은 바로 하루 만들기)', async () => {
  await page.click('#menu .menu-card.c-r2');
  await page.waitForSelector('#scr-stages.on');
  expect(await page.locator('#stages .menu-card').count() === 2, '방② 단계 카드 수');
  const wunits = await page.evaluate(() => ClockData.WAKE_STAGES.map(s => s.unit));
  expect(wunits.join(',') === '60,30', '방② 단계 단위: ' + wunits.join(','));
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('#menu .menu-card.c-r3');
  await page.waitForSelector('#scr-day.on');
  expect(await page.locator('#day-ring .day-slot').count() === 12, '하루 자리 12칸이 아니다');
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
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

await check('방①의 말은 언제나 시각 읽기뿐이다 (장면 대사가 새어 들어오지 않는다)', async () => {
  /* 1차의 「말은 언제나 시각 읽기뿐」을 **없애지 않고 정확히 다시 적는다.**
   * 앱 전체로는 갈래가 둘이 되었지만(시각 안내 · 장면 대사),
   * **시각을 알려 주는 방①에서는 여전히 시각 한마디뿐**이어야 한다.
   * 부모님이 "그냥 간단하게 몇시! 라고만 알려줘, 헷갈려" 라고 하신 그 자리다. */
  await openBoard('c-l2', 2);
  await page.evaluate(() => { window.__said = []; });
  await page.waitForTimeout(700);
  await page.click('#btn-listen');
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const times = new Set(ClockData.SPEECH.times());
    const scenes = new Set(ClockData.SPEECH.scenes());
    return {
      said: window.__said.slice(),
      notTime: window.__said.filter(x => !times.has(x)),
      sceneLeak: window.__said.filter(x => scenes.has(x)),
    };
  });
  expect(r.notTime.length === 0, '방①에서 시각 읽기가 아닌 말: ' + JSON.stringify(r.notTime));
  expect(r.sceneLeak.length === 0, '방①에 장면 대사가 새어 들어왔다: ' + JSON.stringify(r.sceneLeak));
  expect(r.said.length >= 1, '2단계에서 목표를 소리로 안 줬다');
  expect(r.said.every(s => /시/.test(s)), '시각이 아닌 말: ' + JSON.stringify(r.said));
});

/* ═══════════════════════════════════════════════════════════════════
 *              방② ⏰ 잠꾸러기 깨우기 — 전부 진짜 마우스로
 * ═══════════════════════════════════════════════════════════════════ */

async function wdialBox() { return await page.locator('#wdial .ck-face').boundingBox(); }
const wdbg = async () => (await page.evaluate(() => App.debug())).wake;
// 알람 바늘을 집어 목표 총분까지 시계 방향으로 끈다
async function wdragTo(targetTotal) {
  const box = await wdialBox();
  const d = await wdbg();
  const start = d.minuteAngle;
  const delta = ((targetTotal - d.total) % 720 + 720) % 720 * 6;
  const from = at(box, GRAB_R, start);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = Math.max(10, Math.ceil(delta / 12));
  for (let i = 1; i <= steps; i++) {
    const p = at(box, GRAB_R, start + delta * i / steps);
    await page.mouse.move(p.x, p.y);
  }
  await page.mouse.up();
  await page.waitForTimeout(140);
}
async function openWakeBoard(stageCls, idx) {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('#menu .menu-card.c-r2');
  await page.waitForSelector('#scr-stages.on');
  await page.click('#stages .menu-card.' + stageCls);
  await page.waitForSelector('#scr-list.on');
  await page.locator('#list .round-card').nth(idx || 0).click();
  await page.waitForSelector('#scr-wake.on');
  await page.waitForTimeout(180);
}
// 큰 단추를 누르고 친구가 깨어날 때까지 기다린다
async function ringAndWait() {
  await page.click('#btn-ring');
  await page.waitForFunction(() => {
    const w = App.debug().wake;
    return w && w.phase === 'awake';
  }, null, { timeout: 12000 });
  await page.waitForTimeout(300);
}
const petSnacks = () => page.evaluate(() => (window.Pet ? Pet.state().snacks : 0));

await check('방②: 판 목록 12개 · 자는 친구가 앉아 있다 · 놀이 진입', async () => {
  await openWakeBoard('c-w1', 0);
  expect(await page.locator('#wdial .ck-face').count() === 1, '알람 시계가 없다');
  expect(await page.locator('#wake-pal svg').count() === 1, '자는 친구가 없다');
  expect(await page.locator('#ask-face .ck-face').count() === 1, '그림 카드에 시계 그림이 없다');
  const d = await wdbg();
  expect(d.phase === 'set', '처음 상태: ' + d.phase);
  expect(d.total !== d.ask, '열자마자 카드 시각이다');
  expect(d.alarm === null && d.matched === false, '누르지도 않았는데 알람이 정해져 있다');
  expect((await page.locator('#ask-digit').textContent()).trim().length > 0, '카드에 시각이 굵게 안 적혔다');
  // 글로 된 4지선다는 어디에도 없다
  expect(await page.locator('#scr-wake .choice, #scr-wake .quiz, #scr-wake .option').count() === 0, '고르는 화면이 있다');
});

await check('(w-1) 시간은 단추를 눌렀을 때만 흐른다 (가만히 두면 바늘이 그대로다)', async () => {
  const a = await wdbg();
  await page.waitForTimeout(1600);
  const b = await wdbg();
  expect(a.total === b.total, '가만히 뒀는데 바늘이 움직였다: ' + a.total + '→' + b.total);
  expect(b.phase === 'set', '가만히 뒀는데 저절로 흐르기 시작했다: ' + b.phase);
  expect(await page.locator('#scr-wake .timer, #scr-wake .countdown, #scr-wake .time-left').count() === 0, '시간 재는 것이 있다');
});

await check('(w-2) 카드와 **다른** 시각에 맞춰도 깨어난다 — 벌점이 하나도 없다', async () => {
  const before = await page.evaluate(() => App.debug());
  const w0 = before.wake;
  // 일부러 카드와 한 눈금 다른 자리로 맞춘다
  const other = (w0.ask + w0.unit) % 720;
  await wdragTo(other);
  const set = await wdbg();
  expect(set.total === other, '다른 시각에 못 세웠다: ' + set.total + ' (기대 ' + other + ')');
  const palsBefore = set.pals;

  await ringAndWait();
  const d = await wdbg();
  const after = await page.evaluate(() => App.debug());
  expect(d.awake === true, '카드와 다르다고 친구가 안 깨어났다');
  expect(d.alarm === other, '아이가 맞춘 시각이 아니라 다른 시각에 울렸다: ' + d.alarm);
  expect(d.matched === false, '일부러 다르게 맞췄는데 같다고 나왔다');
  expect(d.done === false, '카드와 다른데 완성으로 저장됐다');
  expect(after.stars === before.stars, '별이 바뀌었다: ' + before.stars + '→' + after.stars);
  expect(d.pals === palsBefore, '카드와 다른데 앨범에 담겼다');
  expect(d.pose && d.say, '깨어나는 장면이 없다');
  expect(await page.locator('#btn-wake-again:not([hidden])').count() === 1, '다시 할 단추가 없다');
  // 화면 어디에도 야단·재촉이 없다
  const txt = await page.locator('#scr-wake').innerText();
  ['늦', '지각', '빨리', '얼른', '틀렸', '틀려', '잘못', '실패', '땡'].forEach(bw => {
    expect(txt.indexOf(bw) < 0, '야단·재촉 낱말이 화면에 있다: ' + bw);
  });
});

await check('(w-3) 같은 친구를 두 번 깨우면 반응이 다르다', async () => {
  const first = await wdbg();
  expect(first.seq === 0, '첫 번째인데 차례가 ' + first.seq);
  await page.click('#btn-wake-again');
  await page.waitForTimeout(220);
  await ringAndWait();
  const second = await wdbg();
  expect(second.seq === 1, '두 번째인데 차례가 ' + second.seq);
  expect(second.pose !== first.pose, '두 번째 자세가 첫 번째와 같다: ' + first.pose);
  expect(second.say !== first.say, '두 번째 대사가 첫 번째와 같다: ' + first.say);
  // 세 번째도 또 달라야 한다
  await page.click('#btn-wake-again');
  await page.waitForTimeout(220);
  await ringAndWait();
  const third = await wdbg();
  expect(third.pose !== second.pose && third.pose !== first.pose, '세 번째 자세가 앞것과 같다: ' + third.pose);
  expect(third.say !== second.say && third.say !== first.say, '세 번째 대사가 앞것과 같다: ' + third.say);
  // 그림도 실제로 달라야 한다 (표만 다르고 그림이 같으면 아이 눈에는 그대로다)
  const same = await page.evaluate((p) => ClockData.sleeperSVG(p.pal, p.a, 'x') === ClockData.sleeperSVG(p.pal, p.b, 'x'),
    { pal: first.pal, a: first.pose, b: second.pose });
  expect(same === false, '자세는 다른데 그림이 같다');
});

await check('(w-4) 카드 시각에 맞추면 — 별 · 앨범 · 펫 간식 · 완성', async () => {
  await page.click('#btn-wake-again');
  await page.waitForTimeout(220);
  const before = await page.evaluate(() => App.debug());
  const petBefore = await petSnacks();
  await wdragTo(before.wake.ask);
  expect((await wdbg()).total === before.wake.ask, '카드 시각에 못 세웠다');
  await ringAndWait();
  const d = await wdbg();
  const after = await page.evaluate(() => App.debug());
  expect(d.matched === true, '카드 시각에 맞췄는데 아니라고 한다');
  expect(d.awake === true, '깨어나지 않았다');
  expect(d.done === true, '완성 저장 안 됨');
  expect(after.stars === before.stars + 1, '별 증가: ' + before.stars + '→' + after.stars);
  expect(d.pals >= 1, '앨범에 안 담겼다');
  expect((await petSnacks()) === petBefore + 1, '펫 간식이 안 늘었다');
});

await check('(w-5) 방②의 말 — 시각 한마디 + 장면 대사, 둘이 섞이지 않는다', async () => {
  await page.click('#btn-wake-again');
  await page.waitForTimeout(250);
  await page.evaluate(() => { window.__said = []; });
  const d0 = await wdbg();
  await wdragTo(d0.ask);
  await ringAndWait();
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const times = new Set(ClockData.SPEECH.times());
    const scenes = new Set(ClockData.SPEECH.scenes());
    const said = window.__said.slice();
    return {
      said,
      outside: said.filter(x => !times.has(x) && !scenes.has(x)),
      timeSaid: said.filter(x => times.has(x)),
      sceneSaid: said.filter(x => scenes.has(x)),
      mixed: said.filter(x => /[0-9]/.test(x) && !times.has(x)),
    };
  });
  expect(r.outside.length === 0, '계약에 없는 말: ' + JSON.stringify(r.outside));
  expect(r.timeSaid.length >= 1, '시각을 안 알려 줬다: ' + JSON.stringify(r.said));
  expect(r.sceneSaid.length >= 1, '깨어난 친구가 한마디도 안 했다: ' + JSON.stringify(r.said));
  expect(r.mixed.length === 0, '시각과 다른 말이 한 마디에 섞였다: ' + JSON.stringify(r.mixed));
  // 시각 안내 자체는 여전히 「몇 시!」 한마디다 — 설명이 붙어 있지 않다
  r.timeSaid.forEach(s => expect(s.length <= 15, '시각 안내가 길다: ' + s));
});

await check('방② 앨범 10칸 — 깨운 친구만 채워진다', async () => {
  await page.click('#btn-pals');
  await page.waitForSelector('#scr-pals.on');
  const n = await page.evaluate(() => ClockData.SLEEPERS.length);
  expect(await page.locator('#pals-grid .dex-cell').count() === n, '앨범 칸 수');
  const got = await page.locator('#pals-grid .dex-cell.got').count();
  expect(got >= 1, '깨운 친구가 앨범에 안 담겼다');
  expect((await page.locator('#pals-total').textContent()).includes(got + ' / ' + n), '앨범 표기');
});

await check('방② 놀이판 무변형 (#wdial 전체 computed transform none)', async () => {
  await openWakeBoard('c-w2', 1);
  const read = () => page.evaluate(() => {
    const sels = ['#wdial', '#wdial .ck-face', '#wdial .ck-rim', '#wdial .ck-tick', '#wdial .ck-num',
      '#wdial .ck-numhit', '#wdial .ck-ghost', '#wdial .ck-hour', '#wdial .ck-min', '#wdial .ck-grab',
      '#wdial .ck-knob', '#wdial .ck-glow', '#wdial .ck-cap',
      '#ask-face .ck-face', '#ask-face .ck-num', '.wake-stage', '.wake-room', '.wake-pal', '#ask-card'];
    const bad = []; let seen = 0;
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      seen++;
      const t = getComputedStyle(el).transform;
      if (t !== 'none') bad.push(sel + ' → ' + t);
    }));
    return { bad, seen };
  });
  let r = await read();
  expect(r.seen >= 90, '검사한 요소가 너무 적다: ' + r.seen);
  expect(r.bad.length === 0, '변형이 걸린 요소: ' + r.bad.slice(0, 4).join(' , '));
  // 시간이 흐르는 동안에도, 깨어난 뒤에도 그대로여야 한다
  const d0 = await wdbg();
  await wdragTo(d0.ask);
  await page.click('#btn-ring');
  await page.waitForTimeout(700);
  r = await read();
  expect(r.bad.length === 0, '시간이 흐르는 동안 변형: ' + r.bad.slice(0, 4).join(' , '));
  await page.waitForFunction(() => App.debug().wake.phase === 'awake', null, { timeout: 12000 });
  r = await read();
  expect(r.bad.length === 0, '깨어난 뒤 변형: ' + r.bad.slice(0, 4).join(' , '));
});

/* ═══════════════════════════════════════════════════════════════════
 *          방③ 🍚 내 하루 만들기 — 정답이 없다
 * ═══════════════════════════════════════════════════════════════════ */

const ddbg = async () => (await page.evaluate(() => App.debug())).day;
async function openDayRoom() {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('#menu .menu-card.c-r3');
  await page.waitForSelector('#scr-day.on');
  await page.waitForTimeout(200);
}
// 카드를 자리로 진짜 끌어다 놓는다
async function dragCardTo(cardId, hour) {
  const a = await page.locator('#day-tray .day-card[data-id="' + cardId + '"]').boundingBox();
  const b = await page.locator('#day-ring .day-slot[data-h="' + hour + '"]').boundingBox();
  const ax = a.x + a.width / 2, ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2, by = b.y + b.height / 2;
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) await page.mouse.move(ax + (bx - ax) * i / 14, ay + (by - ay) * i / 14);
  await page.mouse.up();
  await page.waitForTimeout(140);
}

await check('방③: 자리 12칸 · 카드 14장 · 단계도 판도 없다', async () => {
  await openDayRoom();
  expect(await page.locator('#day-ring .day-slot').count() === 12, '자리 12칸');
  const n = await page.evaluate(() => ClockData.DAY_CARDS.length);
  expect(await page.locator('#day-tray .day-card').count() === n, '카드 서랍 ' + n + '장');
  expect(await page.locator('#day-dial .ck-face').count() === 1, '가운데 시계가 없다');
  const d = await ddbg();
  expect(d.placed === 0, '처음부터 카드가 놓여 있다: ' + d.placed);
  expect(d.playing === false, '들어오자마자 재생 중이다');
});

await check('(d-1) 카드를 끌어 자리에 놓으면 쑥 붙는다 (진짜 마우스)', async () => {
  await dragCardTo('breakfast', 7);
  let d = await ddbg();
  expect(d.slots['7'] === 'breakfast', '7 자리에 안 붙었다: ' + JSON.stringify(d.slots));
  expect(await page.locator('#day-ring .day-slot[data-h="7"].filled').count() === 1, '자리가 채워진 모습이 아니다');
  // 밤 자리에도 똑같이 붙는다 — 「어울리는 자리」 같은 것이 없다
  await dragCardTo('bath', 3);
  d = await ddbg();
  expect(d.slots['3'] === 'bath', '밤 자리에 안 붙었다');
  // 같은 카드를 여러 자리에 놓을 수 있다 (밥을 세 자리에 → 배가 빵빵해지는 웃음)
  await dragCardTo('breakfast', 9);
  await dragCardTo('breakfast', 10);
  d = await ddbg();
  expect(d.slots['9'] === 'breakfast' && d.slots['10'] === 'breakfast', '같은 카드를 여러 자리에 못 놓는다');
  expect(d.placed === 4, '놓인 수: ' + d.placed);
});

await check('(d-2) 자리를 톡 누르면 뺀다 · 다시 놓을 수 있다', async () => {
  await page.click('#day-ring .day-slot[data-h="10"]');
  await page.waitForTimeout(120);
  let d = await ddbg();
  expect(!d.slots['10'], '뺐는데 그대로 있다');
  expect(d.placed === 3, '뺀 뒤 놓인 수: ' + d.placed);
  await dragCardTo('sleep', 10);
  d = await ddbg();
  expect(d.slots['10'] === 'sleep', '뺀 자리에 다시 못 놓는다');
});

await check('(d-3) 정답 판정이 어디에도 없다', async () => {
  const before = await page.evaluate(() => App.debug());
  // ① 상태에 판정에 해당하는 열쇠가 없다
  const keys = Object.keys(before.day);
  ['answer', 'correct', 'right', 'wrong', 'score', 'ok', 'bad', 'mistakes', 'misses', 'locked'].forEach(k => {
    expect(keys.indexOf(k) < 0, '방③ 상태에 판정 열쇠가 생겼다: ' + k);
  });
  // ② 데이터에도 없다
  const dataBad = await page.evaluate(() => {
    const bad = [];
    ClockData.DAY_CARDS.forEach(c => ['answer', 'correct', 'right', 'score', 'hour', 'slot', 'target'].forEach(k => {
      if (k in c) bad.push(c.id + '.' + k);
    }));
    return bad;
  });
  expect(dataBad.length === 0, '카드 데이터에 정답 필드: ' + dataBad.join(','));
  // ③ 화면에 맞다/틀리다 표시가 없다
  const domBad = await page.locator('#scr-day .ok, #scr-day .bad, #scr-day .wrong, #scr-day .correct, #scr-day .right, #scr-day .miss').count();
  expect(domBad === 0, '화면에 정답·오답 표시가 있다');
  // ④ 어느 카드를 어느 자리에 놓아도 그냥 놓인다 (열두 자리 × 몇 장을 전수로)
  const stuck = await page.evaluate(() => {
    const out = [];
    for (let h = 1; h <= 12; h++) ['bath', 'sleep', 'kinder'].forEach(id => out.push(h + ':' + id));
    return out.length;
  });
  expect(stuck === 36, '검사 조합 수');
  for (const h of [1, 6, 12]) {
    for (const id of ['bath', 'sleep', 'kinder']) {
      await page.click('#day-tray .day-card[data-id="' + id + '"]');   // 톡 눌러 고르고
      await page.click('#day-ring .day-slot[data-h="' + h + '"]');
      await page.waitForTimeout(60);
      const d = await ddbg();
      expect(d.slots[String(h)] === id, h + ' 자리에 ' + id + ' 를 놓았는데 안 놓였다');
    }
  }
  // ⑤ 놓기만 해서는 별이 늘지 않는다 (점수를 매기지 않는다)
  const after = await page.evaluate(() => App.debug());
  expect(after.stars === before.stars, '카드를 놓았다고 별이 늘었다: ' + before.stars + '→' + after.stars);
});

await check('(d-4) ▶ 재생 — 바늘이 돌고 장면이 차례로 뜨고 시각을 말해 준다', async () => {
  await openDayRoom();                     // 앞 검사가 어질러 놓은 판을 그대로 쓴다
  const d0 = await ddbg();
  expect(d0.placed >= 3, '재생할 카드가 모자라다: ' + d0.placed);
  await page.evaluate(() => { window.__said = []; });
  const hand0 = d0.hand;
  await page.click('#btn-day-play');
  await page.waitForFunction(() => App.debug().day.playing === true, null, { timeout: 4000 });
  // 바늘이 돈다
  await page.waitForFunction(h => App.debug().day.hand !== h, hand0, { timeout: 5000 });
  // 장면이 뜬다
  await page.waitForFunction(() => App.debug().day.showing === true, null, { timeout: 6000 });
  expect(await page.locator('#ds-pic svg').count() === 1, '장면 그림이 안 떴다');
  const t1 = (await ddbg()).showTime;
  expect(/\d+:\d\d/.test(t1), '장면에 시각이 안 적혔다: ' + t1);
  expect(await page.locator('#day-ring .day-slot.now').count() === 1, '지금 자리가 안 반짝인다');
  // 다음 장면으로 넘어간다
  await page.waitForFunction(t => App.debug().day.showTime !== t, t1, { timeout: 9000 });
  // 재생이 끝난다
  await page.waitForFunction(() => App.debug().day.playing === false, null, { timeout: 40000 });
  expect(await page.locator('#day-tray:not([hidden])').count() === 1, '재생이 끝났는데 카드 서랍이 안 돌아왔다');
  const r = await page.evaluate(() => {
    const times = new Set(ClockData.SPEECH.times());
    const scenes = new Set(ClockData.SPEECH.scenes());
    const said = window.__said.slice();
    return {
      said,
      outside: said.filter(x => !times.has(x) && !scenes.has(x)),
      timeSaid: said.filter(x => times.has(x)).length,
      sceneSaid: said.filter(x => scenes.has(x)).length,
    };
  });
  expect(r.outside.length === 0, '계약에 없는 말: ' + JSON.stringify(r.outside));
  expect(r.timeSaid >= 2, '재생하면서 시각을 안 말해 줬다: ' + JSON.stringify(r.said));
  expect(r.sceneSaid >= 1, '장면 이름을 안 말해 줬다: ' + JSON.stringify(r.said));
});

await check('(d-5) 웃음 — 밤 자리에 낮 것을 놓으면 캄캄해지고 부엉이가 온다', async () => {
  const m = await page.evaluate(() => {
    const night = ClockData.daySceneSVG('bath', { hour: 3, tummy: 0 });
    const day = ClockData.daySceneSVG('bath', { hour: 6, tummy: 0 });
    const sleepDay = ClockData.daySceneSVG('sleep', { hour: 6, tummy: 0 });
    const t0 = ClockData.daySceneSVG('breakfast', { hour: 7, tummy: 0 });
    const t3 = ClockData.daySceneSVG('breakfast', { hour: 7, tummy: 3 });
    return {
      nightDark: night.indexOf('#2A3358') >= 0,
      dayBright: day.indexOf('#CFEAF7') >= 0,
      owl: night.indexOf('#8B6A4F') >= 0 && day.indexOf('#8B6A4F') < 0,
      sleepySun: sleepDay.indexOf('#FFD34E') >= 0,
      tummyGrows: t0 !== t3,
    };
  });
  expect(m.nightDark, '새벽 세 시에 목욕인데 캄캄하지 않다');
  expect(m.dayBright, '낮 자리인데 밝지 않다');
  expect(m.owl, '창밖에 부엉이가 없다(또는 낮에도 와 있다)');
  expect(m.sleepySun, '낮에 잠을 놓았는데 해가 없다');
  expect(m.tummyGrows, '여러 번 먹어도 배가 그대로다');
});

await check('(d-6) 만든 하루가 새로고침 뒤에도 남는다', async () => {
  const before = (await ddbg()).slots;
  expect(Object.keys(before).length >= 3, '남는지 볼 카드가 모자라다');
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('#menu .menu-card.c-r3');
  await page.waitForSelector('#scr-day.on');
  await page.waitForTimeout(200);
  const after = (await ddbg()).slots;
  expect(JSON.stringify(after) === JSON.stringify(before),
    '새로고침 뒤 하루가 달라졌다\n  전: ' + JSON.stringify(before) + '\n  후: ' + JSON.stringify(after));
  expect(await page.locator('#day-ring .day-slot.filled').count() === Object.keys(before).length, '자리 그림이 안 돌아왔다');
});

await check('(d-7) 보관하면 보관함에 담기고 다시 재생할 수 있다', async () => {
  const mine = (await ddbg()).slots;
  const keptBefore = (await ddbg()).kept;
  await page.click('#btn-day-keep');
  await page.waitForTimeout(250);
  let d = await ddbg();
  expect(d.kept === keptBefore + 1, '보관함에 안 담겼다: ' + keptBefore + '→' + d.kept);
  expect(d.placed === 0, '보관했는데 판이 안 비워졌다');
  // 새로고침 뒤에도 보관함에 있다
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('#menu .menu-card.c-r3');
  await page.waitForSelector('#scr-day.on');
  await page.click('#btn-days');
  await page.waitForSelector('#scr-days.on');
  expect(await page.locator('#days-grid .day-keepcard').count() === keptBefore + 1, '보관함 칸 수');
  // 눌러서 다시 불러온다
  await page.locator('#days-grid .day-keepcard').first().click();
  await page.waitForSelector('#scr-day.on');
  await page.waitForTimeout(200);
  d = await ddbg();
  expect(JSON.stringify(d.slots) === JSON.stringify(mine), '보관한 하루를 그대로 못 불러왔다');
});

await check('방③ 놀이판 무변형 (시계·자리·카드 전체 computed transform none)', async () => {
  const r = await page.evaluate(() => {
    const sels = ['#day-ring', '#day-dial', '#day-dial .ck-face', '#day-dial .ck-rim', '#day-dial .ck-tick',
      '#day-dial .ck-num', '#day-dial .ck-hour', '#day-dial .ck-min', '#day-dial .ck-knob', '#day-dial .ck-cap',
      '#day-ring .day-slot', '#day-tray .day-card', '.day-stage', '.day-side'];
    const bad = []; let seen = 0;
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      seen++;
      const t = getComputedStyle(el).transform;
      if (t !== 'none') bad.push(sel + ' → ' + t);
    }));
    return { bad, seen };
  });
  expect(r.seen >= 100, '검사한 요소가 너무 적다: ' + r.seen);
  expect(r.bad.length === 0, '변형이 걸린 요소: ' + r.bad.slice(0, 4).join(' , '));
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

await check('방②③ 3해상도 — 잘림 없음 · 터치 46px · 알람 시계 잡는 굵기', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '패드 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });

    /* ── 방② ── */
    await openWakeBoard('c-w1', 3);
    const m = await page.evaluate(() => {
      const box = sel => { const el = document.querySelector(sel); if (!el) return null;
        const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const svg = document.querySelector('#wdial .ck-face').getBoundingClientRect();
      const grab = document.querySelector('#wdial .ck-grab');
      const small = [...document.querySelectorAll('#scr-wake .back, #scr-wake .ringbtn, #scr-wake .bigbtn')]
        .filter(el => el.offsetParent !== null && !el.hidden)
        .map(el => ({ n: el.id || el.className, r: el.getBoundingClientRect() }))
        .filter(x => x.r.width < 46 || x.r.height < 46)
        .map(x => x.n + ' ' + Math.round(x.r.width) + '×' + Math.round(x.r.height));
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        dial: box('#wdial'), ask: box('#ask-card'), room: box('.wake-room'), btn: box('#btn-ring'),
        dialW: svg.width,
        grabPx: parseFloat(grab.getAttribute('stroke-width')) * svg.width / 100,
        small,
      };
    });
    expect(m.horiz <= 1, s.name + ' 방②: 가로 스크롤 ' + m.horiz + 'px');
    [['시계', m.dial], ['카드', m.ask], ['방', m.room], ['단추', m.btn]].forEach(([n, b]) => {
      expect(b, s.name + ' 방②: ' + n + ' 이 없다');
      expect(b.t >= -2 && b.b <= m.ih + 2, s.name + ' 방②: ' + n + ' 이 위아래로 잘림 [' + Math.round(b.t) + ',' + Math.round(b.b) + '] / ' + m.ih);
      expect(b.l >= -2 && b.r <= m.iw + 2, s.name + ' 방②: ' + n + ' 이 옆으로 잘림');
    });
    expect(m.grabPx >= 46, s.name + ' 방②: 알람 바늘 잡는 굵기 ' + m.grabPx.toFixed(1) + 'px — 46px 이상이어야 함');
    expect(m.small.length === 0, s.name + ' 방②: 터치 46px 미만 — ' + m.small.join(' | '));

    /* ── 방③ ── */
    await openDayRoom();
    const d = await page.evaluate(() => {
      const box = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const ring = box(document.querySelector('#day-ring'));
      const slots = [...document.querySelectorAll('#day-ring .day-slot')].map(box);
      const cards = [...document.querySelectorAll('#day-tray .day-card')].map(box);
      const btns = [...document.querySelectorAll('#scr-day .bigbtn, #scr-day .back')].map(box);
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        ring,
        slotMin: Math.min(...slots.map(b => Math.min(b.w, b.h))),
        cardMin: Math.min(...cards.map(b => Math.min(b.w, b.h))),
        btnMin: Math.min(...btns.map(b => Math.min(b.w, b.h))),
        out: slots.concat(cards).filter(b => b.l < -1 || b.r > window.innerWidth + 1 || b.t < -1).length,
      };
    });
    expect(d.horiz <= 1, s.name + ' 방③: 가로 스크롤 ' + d.horiz + 'px');
    expect(d.ring.t >= -2 && d.ring.b <= d.ih + 2, s.name + ' 방③: 시계 고리가 위아래로 잘림 [' +
      Math.round(d.ring.t) + ',' + Math.round(d.ring.b) + '] / ' + d.ih);
    expect(d.ring.l >= -2 && d.ring.r <= d.iw + 2, s.name + ' 방③: 시계 고리가 옆으로 잘림');
    expect(d.slotMin >= 46, s.name + ' 방③: 자리가 ' + d.slotMin.toFixed(0) + 'px — 46px 이상이어야 함');
    expect(d.cardMin >= 46, s.name + ' 방③: 카드가 ' + d.cardMin.toFixed(0) + 'px');
    expect(d.btnMin >= 46, s.name + ' 방③: 단추가 ' + d.btnMin.toFixed(0) + 'px');
    expect(d.out === 0, s.name + ' 방③: 화면 밖으로 나간 것 ' + d.out + '개');
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('방②③: 집 단추·시간 쪽지와 겹치지 않는다', async () => {
  const sizes = [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드' }];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    for (const where of ['wake', 'day', 'pals', 'days']) {
      if (where === 'wake') await openWakeBoard('c-w2', 2);
      else if (where === 'day') await openDayRoom();
      else if (where === 'pals') { await openWakeBoard('c-w1', 0); await page.click('#btn-pals'); await page.waitForSelector('#scr-pals.on'); }
      else { await openDayRoom(); await page.click('#btn-days'); await page.waitForSelector('#scr-days.on'); }
      await page.waitForTimeout(220);
      const m = await page.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
        const box = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
        const hit = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
        const floats = [];
        const home = document.querySelector('.enjoy-home-btn');
        const tag = document.querySelector('.tl-bar-tag');
        if (home && vis(home)) floats.push(['집 단추', box(home)]);
        if (tag && vis(tag) && !tag.closest('.tl-hidden')) floats.push(['시간 쪽지', box(tag)]);
        const sel = '.screen.on .bar > *, .screen.on .back, .screen.on .bigbtn, .screen.on .ringbtn,' +
          '.screen.on .page-count, .screen.on #ask-card, .screen.on .day-slot, .screen.on .day-card,' +
          '.screen.on .dex-cell, .screen.on .day-keepcard';
        const targets = [...document.querySelectorAll(sel)].filter(vis);
        const overlaps = [];
        floats.forEach(([fn, f]) => targets.forEach(t => {
          if (hit(f, box(t))) overlaps.push(fn + ' ↔ ' + (t.id || t.className));
        }));
        return { floats: floats.length, overlaps, targets: targets.length,
          horiz: document.documentElement.scrollWidth - window.innerWidth };
      });
      const at2 = s.name + '/' + where;
      expect(m.floats >= 2, at2 + ': 집 단추·시간 쪽지가 안 떠 있다(' + m.floats + ') — 겹침 검사가 헛돈다');
      expect(m.targets >= 3, at2 + ': 잴 것이 너무 적다(' + m.targets + ')');
      expect(m.overlaps.length === 0, at2 + ': 겹침 — ' + m.overlaps.join(' | '));
      expect(m.horiz <= 1, at2 + ': 가로 스크롤 ' + m.horiz + 'px');
    }
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0 (아이콘 404 제외)', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
