#!/usr/bin/env node
/* 종단 테스트 — node dig/tools/e2e.mjs
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 *
 * 실제 Chromium 으로 홈(단계3) → 판 목록(10) → 발굴 놀이를 돌려 본다.
 * 이 앱의 핵심은 **흙이 진짜로 걷히는가** 이므로, 앱이 알려 주는 숫자를 믿지 않고
 * 흙 캔버스의 픽셀을 e2e 가 직접 세어 판정한다(coloring 팀의 픽셀 판정 선례).
 *   - 진짜 마우스로 문질러 흙이 걷히는가
 *   - 덜 팠을 때 보기가 안 뜨고, 기준(25%)을 넘으면 뜨는가
 *   - 정답 → 완성·별·펫 간식 / 오답 → 벌점도 초기화도 없음
 *   - 적게 파고 맞히면 별이 더 많은가 (별 계산이 실제로 다른가)
 *   - 새로고침 후 진행도 유지 · 놀이판 무변형 · 3해상도 잘림 없음 · 터치 46px
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/dig/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
// 아이콘(icon-192/512.png)은 통합 담당이 그린다 — 아직 없어서 나는 404 는 실패로 치지 않는다
const IGNORE = t => /icon-(192|512)\.png/.test(t) || (/favicon/i.test(t) && /404/.test(t));
page.on('console', m => { if (m.type() === 'error' && !IGNORE(m.text())) consoleErrors.push(m.text()); });
page.on('pageerror', e => { if (!IGNORE(String(e))) consoleErrors.push(String(e)); });

/* ── e2e 가 직접 재는 「파낸 비율」 ─────────────────────────────
 * 앱의 App.debug().ratio 를 믿지 않는다. 흙 캔버스의 알파를 직접 세어
 * 「정말 지워졌는가」를 판정한다 — 지우기를 막아 놓으면 이 값이 안 움직인다. */
const dugRatio = () => page.evaluate(() => {
  const c = document.getElementById('dirt-canvas');
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let total = 0, clear = 0;
  for (let y = 0; y < c.height; y += 6) {
    for (let x = 0; x < c.width; x += 6) {
      total++;
      if (d[(y * c.width + x) * 4 + 3] < 40) clear++;
    }
  }
  return clear / total;
});

// 진짜 마우스로 흙판을 문지른다 (내부 함수가 아니라 포인터로)
async function rub(rows) {
  const b = await page.locator('#dirt-canvas').boundingBox();
  for (let i = 0; i < (rows || 1); i++) {
    const y = b.y + b.height * (0.2 + i * 0.2);
    await page.mouse.move(b.x + b.width * 0.1, y);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.9, y, { steps: 14 });
    await page.mouse.up();
    await page.waitForTimeout(60);
  }
}

const choicesVisible = () => page.evaluate(() => {
  const bar = document.getElementById('choice-bar');
  const btn = bar.querySelector('.choice-btn');
  if (!btn) return false;
  const cs = getComputedStyle(bar);
  const r = btn.getBoundingClientRect();
  return cs.display !== 'none' && r.width > 0 && r.height > 0;
});

async function openRound(levelCls, nth) {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.' + levelCls);
  await page.waitForSelector('#scr-list.on');
  await page.locator('#list .puzzle-card').nth(nth || 0).click();
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(120);
}

await page.goto(BASE);

await check('홈: 단계 카드 3개 + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '단계 카드 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('판 목록: 단계1 판 10개 · 숨은 그림을 미리 보여 주지 않는다', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '판 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 10'), '진행 표기');
  // 목록 딱지 안에는 흙더미만 있고 숨은 그림(밑그림 svg)은 없어야 한다
  const leak = await page.evaluate(() => document.querySelectorAll('#list .puzzle-card svg[viewBox="0 0 100 100"]').length);
  expect(leak === 0, '목록에 숨은 그림이 새어 나왔다: ' + leak);
});

await check('놀이 진입: 흙판이 덮여 있고 보기는 아직 없다', async () => {
  await page.locator('#list .puzzle-card').first().click();
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(150);
  const d = await page.evaluate(() => App.debug());
  expect(d.level === 1, '단계1');
  expect(d.choices.length === 2, '단계1 보기 2개: ' + d.choices.length);
  expect(d.choices.filter(c => c === d.answer).length === 1, '정답이 보기 안에 하나');
  const r = await dugRatio();
  expect(r < 0.02, '시작부터 흙이 걷혀 있다: ' + r.toFixed(3));
  expect(await choicesVisible() === false, '덜 팠는데 보기가 벌써 떴다');
});

await check('진짜 마우스로 문지르면 흙이 걷힌다 (픽셀로 판정)', async () => {
  const before = await dugRatio();
  await rub(1);
  const after = await dugRatio();
  expect(after > before + 0.03, '문질렀는데 흙이 안 걷혔다: ' + before.toFixed(3) + ' → ' + after.toFixed(3));
  const d = await page.evaluate(() => App.debug());
  expect(Math.abs(d.ratio - after) < 0.05, '앱이 재는 값과 실제 픽셀이 다르다: ' + d.ratio.toFixed(3) + ' vs ' + after.toFixed(3));
});

await check('덜 팠을 때는 보기가 아직 안 뜬다 (기준 25%)', async () => {
  const r = await dugRatio();
  expect(r < 0.25, '한 번 문질렀는데 벌써 25% 를 넘었다: ' + r.toFixed(3));
  expect(await choicesVisible() === false, '기준 아래인데 보기가 떴다 (' + r.toFixed(3) + ')');
});

await check('기준을 넘으면 보기가 스르륵 올라온다', async () => {
  await rub(4);   // 계속 문지른다
  const r = await dugRatio();
  expect(r >= 0.25, '네 줄을 문질렀는데 25% 를 못 넘었다: ' + r.toFixed(3));
  await page.waitForTimeout(200);
  expect(await choicesVisible() === true, '기준을 넘었는데 보기가 안 뜬다 (' + r.toFixed(3) + ')');
  const n = await page.locator('#choice-bar .choice-btn').count();
  expect(n === 2, '단계1 보기 단추 2개: ' + n);
});

await check('오답을 골라도 벌점·초기화가 없다 (흙만 조금 더 걷힌다)', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const wrong = d0.choices.find(c => c !== d0.answer);
  const rBefore = await dugRatio();
  await page.click('.choice-btn[data-pic="' + wrong + '"]');
  await page.waitForTimeout(250);
  const d1 = await page.evaluate(() => App.debug());
  const rAfter = await dugRatio();
  expect(d1.locked === false, '틀렸는데 판이 잠겼다');
  expect(d1.done === false, '틀렸는데 완료로 저장됐다');
  expect(d1.stars === d0.stars, '틀렸는데 별이 움직였다: ' + d0.stars + ' → ' + d1.stars);
  expect(d1.roundId === d0.roundId, '틀렸는데 다른 판으로 넘어갔다');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '틀렸는데 축하가 떴다');
  expect(rAfter > rBefore, '틀렸을 때 흙이 더 걷히지 않았다: ' + rBefore.toFixed(3) + ' → ' + rAfter.toFixed(3));
  expect(d1.misses === 1, '틀린 횟수 기록: ' + d1.misses);
  // 남은 보기는 그대로 누를 수 있다
  expect(await page.locator('.choice-btn[data-pic="' + d0.answer + '"]').isEnabled(), '정답 보기를 못 누른다');
});

await check('정답을 고르면 완성 + 별(최소 1) + 펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  const d0 = await page.evaluate(() => App.debug());
  await page.click('.choice-btn[data-pic="' + d0.answer + '"]');
  await page.waitForSelector('#reward.on', { timeout: 6000 });
  const d1 = await page.evaluate(() => App.debug());
  expect(d1.locked === true, '완성 잠금');
  expect(d1.done === true, '완료 저장');
  expect(d1.lastStars >= 1, '틀린 판이라도 별은 최소 1개: ' + d1.lastStars);
  expect(d1.stars === d0.stars + d1.lastStars, '별 합계 증가: ' + d0.stars + ' → ' + d1.stars + ' (+' + d1.lastStars + ')');
  const r = await dugRatio();
  expect(r > 0.97, '완성했는데 흙이 다 안 걷혔다: ' + r.toFixed(3));
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + ' → ' + petAfter);
  expect(await page.locator('#reward-stars .sh').count() === 3, '보상 화면에 별 세 칸');
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card.done').count() === 1, '완성 판 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

/* ── 별 계산이 실제로 다른가 ───────────────────────────────
 * 적게 파고 맞히면 ⭐⭐⭐, 많이 파면 ⭐. 상수로 굳어 있으면 여기서 걸린다. */
let starsFew = 0, starsMany = 0;
await check('적게 파고 맞히면 별 3개 (🔍 로 미리 보고 맞히기)', async () => {
  await openRound('c-l1', 1);
  await rub(1);                        // 아주 조금만 판다
  const r = await dugRatio();
  expect(r < 0.4, '한 줄만 문질렀는데 40% 를 넘었다: ' + r.toFixed(3));
  expect(await choicesVisible() === false, '아직 기준 아래인데 보기가 떴다');
  await page.click('#btn-peek');       // 🔍 — 미리 보기
  await page.waitForTimeout(200);
  expect(await choicesVisible() === true, '🔍 를 눌렀는데 보기가 안 뜬다');
  const d0 = await page.evaluate(() => App.debug());
  const before = d0.stars;
  await page.click('.choice-btn[data-pic="' + d0.answer + '"]');
  await page.waitForSelector('#reward.on', { timeout: 6000 });
  const d1 = await page.evaluate(() => App.debug());
  starsFew = d1.lastStars;
  expect(d1.answerRatio < 0.4, '맞힌 순간 파낸 양: ' + d1.answerRatio.toFixed(3));
  expect(starsFew === 3, '적게 파고 맞혔는데 별이 ' + starsFew + '개');
  expect(d1.stars === before + starsFew, '별 합계: ' + before + ' → ' + d1.stars);
  await page.click('#reward-close');
});

await check('많이 파고 맞히면 별 1개 — 별 계산이 파낸 양을 본다', async () => {
  await openRound('c-l1', 2);
  const got = await page.evaluate(() => App._digTo(0.8));   // 거의 다 판다
  const r = await dugRatio();
  expect(r > 0.65, '많이 파려 했는데 ' + r.toFixed(3) + ' 밖에 안 팠다(앱 보고 ' + got.toFixed(3) + ')');
  await page.waitForTimeout(200);
  expect(await choicesVisible() === true, '많이 팠는데 보기가 안 뜬다');
  const d0 = await page.evaluate(() => App.debug());
  await page.click('.choice-btn[data-pic="' + d0.answer + '"]');
  await page.waitForSelector('#reward.on', { timeout: 6000 });
  const d1 = await page.evaluate(() => App.debug());
  starsMany = d1.lastStars;
  expect(starsMany === 1, '많이 파고 맞혔는데 별이 ' + starsMany + '개');
  expect(starsFew > starsMany, '적게 판 쪽(' + starsFew + ')이 많이 판 쪽(' + starsMany + ')보다 별이 많아야 한다');
  await page.click('#reward-close');
});

await check('단계2·3: 보기 3개·4개', async () => {
  await openRound('c-l2', 0);
  let d = await page.evaluate(() => App.debug());
  expect(d.choices.length === 3, '단계2 보기 3개: ' + d.choices.length);
  await page.evaluate(() => App._peek());
  await page.waitForTimeout(150);
  expect(await page.locator('#choice-bar .choice-btn').count() === 3, '단계2 보기 단추 3개');

  await openRound('c-l3', 0);
  d = await page.evaluate(() => App.debug());
  expect(d.choices.length === 4, '단계3 보기 4개: ' + d.choices.length);
  await page.evaluate(() => App._peek());
  await page.waitForTimeout(150);
  expect(await page.locator('#choice-bar .choice-btn').count() === 4, '단계3 보기 단추 4개');
});

await check('새로고침 후 진행도 유지', async () => {
  const starsBefore = await page.evaluate(() => App.debug().stars);
  expect(starsBefore > 0, '앞의 검사에서 별을 못 모았다');
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === String(starsBefore), '별 수 유지: ' + starsBefore);
  const l1 = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(l1.includes('3 / 10'), '단계1 진행: ' + l1);
});

await check('흙판에 변형 없음 (computed transform none)', async () => {
  // 흙판 좌표가 놀이의 전부다. 판이 조금이라도 기울거나 커지면 파는 자리가 어긋난다.
  await openRound('c-l3', 1);
  await page.evaluate(() => App._digTo(0.4));
  await page.waitForTimeout(500);   // 보기 등장 모션이 끝나기를 기다린다
  const r = await page.evaluate(() => {
    const sels = ['#play-stage', '.dig-col', '#dig-wrap', '#pic-canvas', '#dirt-canvas',
      '#choice-bar', '#choice-bar .choice-btn', '.dig-tools'];
    const bad = []; let seen = 0;
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      seen++;
      const cs = getComputedStyle(el);
      if (cs.transform !== 'none') bad.push(sel + ' → transform ' + cs.transform);
      if (['#dig-wrap', '#pic-canvas', '#dirt-canvas'].includes(sel)) {
        if (cs.rotate !== 'none') bad.push(sel + ' → rotate ' + cs.rotate);
        if (cs.scale !== 'none') bad.push(sel + ' → scale ' + cs.scale);
        // 캔버스에 border 가 붙으면 getBoundingClientRect 가 밀려 파는 자리가 어긋난다
        if (sel !== '#dig-wrap' && parseFloat(cs.borderTopWidth) > 0) bad.push(sel + ' → border ' + cs.borderTopWidth);
      }
    }));
    return { bad, seen };
  });
  expect(r.seen >= 10, '검사한 요소가 너무 적다: ' + r.seen);
  expect(r.bad.length === 0, '변형·테두리가 걸린 놀잇감: ' + r.bad.join(' , '));
});

await check('흙판 좌표가 안 밀린다 — 판 가운데를 찍으면 판 가운데가 파인다', async () => {
  await openRound('c-l3', 2);
  const b = await page.locator('#dirt-canvas').boundingBox();
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(120);
  const m = await page.evaluate(() => {
    const c = document.getElementById('dirt-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const at = (x, y) => d[(Math.round(y) * c.width + Math.round(x)) * 4 + 3];
    return { mid: at(c.width / 2, c.height / 2), corner: at(6, 6) };
  });
  expect(m.mid < 40, '가운데를 찍었는데 가운데가 안 파였다(alpha ' + m.mid + ')');
  expect(m.corner > 200, '찍지도 않은 구석이 파였다(alpha ' + m.corner + ')');
});

await check('3해상도 잘림 없음 (가로 스크롤·아래 넘침)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '패드 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await openRound('c-l3', 3);            // 보기가 가장 많은 단계로 빡세게
    await page.evaluate(() => App._peek());
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const wrap = document.querySelector('#dig-wrap').getBoundingClientRect();
      const bar = document.querySelector('#choice-bar').getBoundingClientRect();
      const tools = document.querySelector('.dig-tools').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        wrapB: wrap.bottom, wrapR: wrap.right, wrapT: wrap.top, wrapW: wrap.width,
        barB: bar.bottom, barR: bar.right, toolsB: tools.bottom,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 ' + m.horiz + 'px');
    expect(m.wrapW >= 150, s.name + ': 흙판이 너무 작다 ' + Math.round(m.wrapW) + 'px');
    expect(m.wrapT >= -2, s.name + ': 흙판이 위로 잘림 ' + Math.round(m.wrapT));
    expect(m.wrapB <= m.ih + 2, s.name + ': 흙판이 아래로 잘림 ' + Math.round(m.wrapB) + ' > ' + m.ih);
    expect(m.wrapR <= m.iw + 2, s.name + ': 흙판이 옆으로 잘림 ' + Math.round(m.wrapR) + ' > ' + m.iw);
    expect(m.barB <= m.ih + 2, s.name + ': 보기 줄이 아래로 잘림 ' + Math.round(m.barB) + ' > ' + m.ih);
    expect(m.barR <= m.iw + 2, s.name + ': 보기 줄이 옆으로 잘림 ' + Math.round(m.barR) + ' > ' + m.iw);
    expect(m.toolsB <= m.ih + 2, s.name + ': 별·돋보기 줄이 아래로 잘림 ' + Math.round(m.toolsB));
  }
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
        await page.locator('#list .puzzle-card').first().click();
        await page.waitForSelector('#scr-play.on');
        await page.evaluate(() => App._peek());
      }
      await page.waitForTimeout(400);
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
          '.screen.on .back, .screen.on #btn-listen, .screen.on #btn-peek,' +
          '.screen.on .menu-card, .screen.on .puzzle-card, .screen.on .choice-btn,' +
          '.screen.on .vs-btn, .screen.on .stat, .screen.on .page-count, .screen.on #dig-wrap';
        const targets = [...document.querySelectorAll(targetSel)].filter(vis);
        const overlaps = [];
        floats.forEach(([fname, f]) => targets.forEach(t => {
          if (hit(f, box(t))) overlaps.push(fname + ' ↔ ' + (t.id || t.className));
        }));

        // 터치 하한 46px — 아이가 누르는 것만 잰다
        const tapSel = '.screen.on .back, .screen.on #btn-listen, .screen.on #btn-peek,' +
          '.screen.on .menu-card, .screen.on .puzzle-card, .screen.on .choice-btn';
        const small = [...document.querySelectorAll(tapSel)].filter(vis)
          .map(el => ({ n: el.id || el.className, ...box(el) }))
          .filter(b => b.w < 46 || b.h < 46)
          .map(b => b.n + ' ' + Math.round(b.w) + '×' + Math.round(b.h));

        const out = [...document.querySelectorAll(targetSel)].filter(vis)
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

/* 목소리 설정 단추는 부모용이라 놀이 화면에서 감췄다(shared/crayon.css, 2026-08).
 * 지켜야 할 것은 "놀이 화면 어디에도 안 보인다" — 바꾸는 곳은 부모님 페이지다. */
await check('목소리 단추: 놀이 화면에 안 보인다', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  const m = await page.evaluate(() => {
    const el = document.querySelector('#btn-voice');
    if (!el) return { gone: true };
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return { display: cs.display, laidOut: el.offsetParent !== null, w: Math.round(r.width), h: Math.round(r.height) };
  });
  expect(m.gone || (m.display === 'none' && !m.laidOut && !m.w && !m.h),
    '목소리 단추가 아직 놀이 화면에 보인다: ' + JSON.stringify(m));
});

await check('이모지 대신 손그림 아이콘', async () => {
  const m = await page.evaluate(() => {
    const EMOJI = /[\u{25A0}-\u{27BF}\u{1F300}-\u{1FAFF}]/u;
    const bad = [];
    ['h1', '.stat', '.mc-name', '.mc-desc', '.bar h2'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (EMOJI.test(el.textContent)) bad.push(sel + ': ' + el.textContent.trim());
      });
    });
    return { bad, icons: document.querySelectorAll('svg.ic').length };
  });
  expect(m.bad.length === 0, '이모지가 남아 있다 — ' + m.bad.join(' | '));
  expect(m.icons >= 4, '손그림 아이콘이 안 그려졌다: ' + m.icons);
});

await check('첫 화면 규격 — 칸마다 다른 기울기, 첫 칸이 가장 크고 화살표가 하나', async () => {
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

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
