#!/usr/bin/env node
/* 종단 테스트 — node bag/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 세 놀이(숟가락 드래그·회전 스냅 / 빨대 높이 스냅 / 네모 조각 톡 회전) →
 * 완성 보상·펫·별 → 오답 무벌점 → 새로고침 진행도 유지 → 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/bag/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }
const dbg = page => page.evaluate(() => App.debug());

// 조각/슬라이더를 목표로 끌기 (실제 마우스 → 포인터 이벤트)
async function dragTo(page, id, to) {
  const p = (await dbg(page)).pieces.find(x => x.id === id);
  await page.mouse.move(p.client.x, p.client.y);
  await page.mouse.down();
  const dst = to || p.targetClient;
  await page.mouse.move(dst.x, dst.y, { steps: 12 });
  await page.mouse.up();
}
// 제자리에서 톡톡 눌러 방향이 맞을 때까지 회전
async function tapUntilPlaced(page, id) {
  for (let i = 0; i < 9; i++) {
    const p = (await dbg(page)).pieces.find(x => x.id === id);
    if (p.placed) return true;
    await page.mouse.click(p.client.x, p.client.y);
    await page.waitForTimeout(80);
  }
  return (await dbg(page)).pieces.find(x => x.id === id).placed;
}
async function openPuzzle(page, cardCls, puzzleId) {
  await page.click('.menu-card.' + cardCls);
  await page.waitForSelector('#scr-list.on');
  await page.click('.item-main[data-puzzle="' + puzzleId + '"]');
}

// 캔버스에 합성 포인터 스트로크 — pts 는 캔버스 비율 좌표 [ [0~1, 0~1], ... ]
async function stroke(page, sel, pts, pointerType = 'mouse') {
  await page.evaluate(({ sel, pts, pointerType }) => {
    const c = document.querySelector(sel);
    const r = c.getBoundingClientRect();
    const ev = (type, fx, fy) => c.dispatchEvent(new PointerEvent(type, {
      pointerId: 7, pointerType, isPrimary: true, buttons: 1, bubbles: true, cancelable: true,
      clientX: r.left + r.width * fx, clientY: r.top + r.height * fy,
    }));
    ev('pointerdown', pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ev('pointermove', pts[i][0], pts[i][1]);
    ev('pointerup', pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }, { sel, pts, pointerType });
}
// 목표 곡선을 캔버스 비율 좌표로 (offX/offY 는 논리 px 어긋남 — 관대 판정 검사용)
async function balloonFracs(page, li, idx, offX = 0, offY = 0) {
  return await page.evaluate(({ li, idx, offX, offY }) => {
    const p = BagData.balloons.levels[li].pages[idx].p;
    const out = [];
    for (let i = 0; i < p.length; i += 2) out.push([(p[i] + offX) / Ink.BW, (p[i + 1] + offY) / Ink.BH]);
    return out;
  }, { li, idx, offX, offY });
}
// 화면을 마구 칠하는 스크리블 (곡선을 덮지만 잉크 대부분이 곡선 밖 → 정밀도에서 떨어져야 함)
function scribble() {
  const pts = [];
  let dir = 1;
  for (const fy of [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.92]) {
    const xs = [];
    for (let fx = 0.05; fx <= 0.95; fx += 0.045) xs.push(fx);
    if (dir < 0) xs.reverse();
    dir = -dir;
    xs.forEach(fx => pts.push([fx, fy]));
  }
  return pts;
}
const balloonDbg = page => page.evaluate(() => App.debug().balloon);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 놀이 카드 4개(숟가락·빨대·네모·풍선) + 별 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 4, '카드 수');
  expect(await page.locator('.menu-card.c-balloon').count() === 1, '풍선 줄 카드');
  expect((await page.locator('#home-stars').textContent()) === '0', '별 수');
});

await check('숟가락: 도안 30개 목록 진입', async () => {
  await page.click('.menu-card.c-spoon');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#play-list .item-main').count() === 30, '도안 수');
});

await check('숟가락(자리 맞추기): 조각을 본보기 자리에 끌면 착!', async () => {
  await page.click('.item-main[data-puzzle="sp1-1"]');
  await page.waitForSelector('#scr-spoon.on');
  const d0 = await dbg(page);
  expect(d0.total === 3 && d0.placed === 0, '3개 · 시작 0');
  await dragTo(page, d0.pieces[0].id);
  await page.waitForTimeout(300);
  const d = await dbg(page);
  expect(d.pieces[0].placed === true, '첫 조각이 자리에 놓여야 함');
  expect(d.placed === 1, '놓인 수: ' + d.placed);
});

await check('숟가락 완성 → 축하 + 별 + 펫 간식', async () => {
  const d0 = await dbg(page);
  for (const p of d0.pieces) if (!p.placed) await dragTo(page, p.id);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await dbg(page);
  expect(d.stars === 1, '별: ' + d.stars);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 1, '펫 간식: ' + JSON.stringify(pet));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#play-list .item-main .it-prog:has-text("🏅")').count() === 1, '완성 표시');
});

await check('숟가락(방향 맞추기): 끌어 놓고 톡 눌러 회전하면 착!', async () => {
  await page.click('#scr-list .back'); // 홈으로? 아니라 목록엔 뒤로가기 data-go=scr-home
  await page.waitForSelector('#scr-home.on');
  await openPuzzle(page, 'c-spoon', 'sp2-1');
  await page.waitForSelector('#scr-spoon.on');
  const d0 = await dbg(page);
  expect(d0.pieces[0].rotStep === 90, '90° 단계');
  const id = d0.pieces[0].id;
  await dragTo(page, id);                 // 자리로 끌기 (각도는 아직 안 맞음)
  await page.waitForTimeout(200);
  const mid = (await dbg(page)).pieces.find(x => x.id === id);
  expect(mid.placed === false, '각도가 안 맞으면 아직 안 놓여야 함');
  const placed = await tapUntilPlaced(page, id); // 톡톡 회전 → 착!
  expect(placed === true, '회전으로 방향 맞추면 놓여야 함');
});

await check('빨대: 도안 30개 목록 진입', async () => {
  await page.click('#btn-spoon-back');
  await page.waitForSelector('#scr-list.on');
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-straw');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#play-list .item-main').count() === 30, '도안 수');
});

await check('빨대: 슬라이더를 목표 높이로 끌면 착!', async () => {
  await page.click('.item-main[data-puzzle="st1-1"]');
  await page.waitForSelector('#scr-straw.on');
  const d0 = await dbg(page);
  expect(d0.total === 3 && d0.placed === 0, '3개 · 시작 0');
  await dragTo(page, d0.pieces[0].id);
  await page.waitForTimeout(300);
  const d = await dbg(page);
  expect(d.pieces[0].placed === true, '첫 슬라이더가 목표에 맞아야 함');
});

await check('빨대: 목표와 먼 높이는 무벌점(안 놓임·별 그대로)', async () => {
  const d0 = await dbg(page);
  const wrong = d0.pieces.find(p => !p.placed && p.target < 0.65);
  const box = await page.locator('#straw-stage').boundingBox();
  await page.mouse.move(wrong.client.x, wrong.client.y);
  await page.mouse.down();
  await page.mouse.move(wrong.client.x, box.y + 12, { steps: 10 }); // 맨 위로 (목표와 멀리)
  await page.mouse.up();
  await page.waitForTimeout(200);
  const d = await dbg(page);
  const w = d.pieces.find(p => p.id === wrong.id);
  expect(w.placed === false, '틀린 높이인데 놓임');
  expect(d.stars === 1, '오답에 별이 변함: ' + d.stars);
  expect(d.rewardOn === false, '오답인데 축하가 뜸');
});

await check('빨대 완성 → 축하 + 별 + 펫 간식', async () => {
  let d = await dbg(page);
  for (const p of d.pieces) if (!p.placed) { await dragTo(page, p.id); await page.waitForTimeout(120); }
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  d = await dbg(page);
  expect(d.stars === 2, '별: ' + d.stars);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 2, '펫 간식: ' + JSON.stringify(pet));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '2', '별 수');
  const sp = await page.locator('.menu-card.c-spoon .mc-prog').textContent();
  expect(sp.includes('1 / 30'), '숟가락 진행: ' + sp);
  const st = await page.locator('.menu-card.c-straw .mc-prog').textContent();
  expect(st.includes('1 / 30'), '빨대 진행: ' + st);
});

// ─────────── 네모 조각 놀이 ───────────
await check('네모: 도안 30개 목록 진입', async () => {
  await page.click('.menu-card.c-square');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#play-list .item-main').count() === 30, '도안 수');
});

await check('네모: 조각을 톡톡 돌려 무늬 완성 → 축하 + 별 + 펫 간식', async () => {
  await page.click('.item-main[data-puzzle="sq2-1"]');
  await page.waitForSelector('#scr-square.on');
  const d0 = await dbg(page);
  expect(d0.total === 4 && d0.placed === 0, '4개 · 시작 0');
  expect(d0.pieces.every(p => !p.matched), '시작부터 맞은 조각이 있음(돌릴 게 없음)');
  for (const p of d0.pieces) {
    const done = await tapUntilPlaced(page, p.id); // 톡톡 회전 → 제자리
    expect(done === true, '조각 ' + p.id + '을 회전으로 못 맞춤');
  }
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await dbg(page);
  expect(d.stars === 3, '별: ' + d.stars);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 3, '펫 간식: ' + JSON.stringify(pet));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#play-list .item-main .it-prog:has-text("🏅")').count() === 1, '완성 표시');
});

await check('네모: 틀린 각도는 무벌점(완성 안 됨·별 그대로)', async () => {
  await page.click('.item-main[data-puzzle="sq2-2"]');
  await page.waitForSelector('#scr-square.on');
  const d0 = await dbg(page);
  await page.mouse.click(d0.pieces[0].client.x, d0.pieces[0].client.y); // 한 번만 톡(대개 아직 안 맞음)
  await page.waitForTimeout(120);
  const d = await dbg(page);
  expect(d.placed < d.total, '한 번 돌렸는데 전부 완성됨');
  expect(d.rewardOn === false, '완성 전인데 축하가 뜸');
  expect(d.stars === 3, '오답에 별이 변함: ' + d.stars);
  await page.click('#btn-square-back');
  await page.waitForSelector('#scr-list.on');
  await page.click('#scr-list .back');
});

await check('네모: 새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '3', '별 수');
  const sq = await page.locator('.menu-card.c-square .mc-prog').textContent();
  expect(sq.includes('1 / 30'), '네모 진행: ' + sq);
});

// ─────────── 요리조리 풍선 줄 놀이 ───────────
let starsBeforeBalloon = 0, snacksBeforeBalloon = 0;

await check('풍선 줄: 홈 카드 → 단계 목록(3단계)', async () => {
  starsBeforeBalloon = (await dbg(page)).stars;
  snacksBeforeBalloon = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  await page.click('.menu-card.c-balloon');
  await page.waitForSelector('#scr-list.on');
  const names = await page.locator('#play-list .item-main .it-name').allTextContents();
  expect(names.length === 3, '단계 수: ' + names.length);
  expect(names[0].includes('1단계') && names[2].includes('3단계'), '단계 이름: ' + names);
});

await check('풍선 줄 1단계: 본보기+내 카드, 안내선 표시 → 곡선 따라 그리면 통과·별·펫', async () => {
  await page.locator('#play-list .item-main').first().click();
  await page.waitForSelector('#scr-balloon.on');
  expect(await page.locator('#balloon-sample').isVisible(), '본보기 카드');
  expect(await page.locator('#balloon-pad').isVisible(), '내 카드');
  let d = await balloonDbg(page);
  expect(d.level === 'line1' && d.idx === 0, '1단계 첫 장: ' + JSON.stringify(d));
  expect(d.guide === true, '1~2단계는 안내선이 보여야 함');
  await stroke(page, '#balloon-pad', await balloonFracs(page, 0, 0));
  d = await balloonDbg(page);
  expect(d.strokes === 1, '획 1개');
  expect(d.coverage >= d.judge.cmin && d.precision >= d.judge.pmin,
    '따라 그리기 통과해야: cov ' + d.coverage.toFixed(2) + ' / prec ' + d.precision.toFixed(2));
  await page.waitForSelector('#balloon-fly.fly', { timeout: 2000 }).catch(() => {});
  await page.click('#balloon-next');
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  const stars = (await dbg(page)).stars;
  expect(stars === starsBeforeBalloon + 1, '별 +1: ' + stars);
  const snacks = await page.evaluate(() => Pet.state().snacks);
  expect(snacks === snacksBeforeBalloon + 1, '펫 간식 +1: ' + snacks);
  await page.click('#reward-next');
  await page.waitForFunction(() => !document.getElementById('reward').classList.contains('on'));
  d = await balloonDbg(page);
  expect(d.idx === 1, '다음 풍선으로: ' + d.idx);
  expect(await page.locator('#balloon-dots .dot.done').count() === 1, '완료 점 표시');
});

await check('풍선 줄: 마구 칠하기(스크리블)는 정밀도에서 떨어져 불통', async () => {
  await page.click('#balloon-clear');
  await stroke(page, '#balloon-pad', scribble());
  const d = await balloonDbg(page);
  // 스크리블은 곡선도 덮어 재현율은 높지만, 잉크 대부분이 곡선 밖이라 정밀도가 낮아야 한다
  expect(d.precision < d.judge.pmin, '스크리블 정밀도가 임계 미만이어야: prec ' + d.precision.toFixed(2) + ' < ' + d.judge.pmin);
  await page.click('#balloon-next');
  await page.waitForTimeout(150);
  const d2 = await balloonDbg(page);
  expect(d2.idx === 1, '판정 실패면 머물러야 함: ' + d2.idx);
  expect(!(await page.locator('#reward.on').count()), '스크리블에 보상이 뜨면 안 됨');
});

await check('풍선 줄: 곡선 무시 직선은 불통(3단계 곡선에서도)', async () => {
  await page.click('#btn-balloon-back');
  await page.waitForSelector('#scr-list.on');
  await page.locator('#play-list .item-main').nth(2).click();
  await page.waitForSelector('#scr-balloon.on');
  await page.click('#balloon-next'); // 옆으로 뻗는 곡선(나란한 고리)으로 이동 (0획이라 구경만)
  await page.waitForTimeout(120);
  let d = await balloonDbg(page);
  expect(d.level === 'line3' && d.idx === 1 && d.guide === false, '3단계 옆 곡선: ' + JSON.stringify(d));
  // 옆으로 굽이치는 목표를 무시하고 가운데로 곧게 내리긋기 → 재현율에서 떨어진다
  await stroke(page, '#balloon-pad', [[0.5, 0.38], [0.5, 0.5], [0.5, 0.62], [0.5, 0.75], [0.5, 0.9]]);
  d = await balloonDbg(page);
  expect(d.coverage < d.judge.cmin || d.precision < d.judge.pmin,
    '직선은 불통이어야: cov ' + d.coverage.toFixed(2) + ' / prec ' + d.precision.toFixed(2));
  await page.click('#balloon-next');
  await page.waitForTimeout(150);
  expect((await balloonDbg(page)).idx === 1, '직선 실패면 머물러야 함');
  expect(!(await page.locator('#reward.on').count()), '직선에 보상이 뜨면 안 됨');
});

await check('풍선 줄 3단계: 곡선을 조금 어긋나게 따라 그려도 너그럽게 통과', async () => {
  await page.click('#balloon-clear');
  // 목표에서 24px(논리) 어긋난 선 — 따라 그리기 판정이면 아슬하지만 3단계는 관대해 통과
  await stroke(page, '#balloon-pad', await balloonFracs(page, 2, 1, 24, 0));
  const d = await balloonDbg(page);
  expect(d.coverage >= d.judge.cmin && d.precision >= d.judge.pmin,
    '보고 그리기 통과해야: cov ' + d.coverage.toFixed(2) + ' / prec ' + d.precision.toFixed(2));
  await page.waitForSelector('#balloon-fly.fly', { timeout: 2000 }).catch(() => {});
  await page.click('#balloon-next');
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  await page.click('#reward-next');
  await page.waitForFunction(() => !document.getElementById('reward').classList.contains('on'));
});

await check('풍선 줄: 새로고침 후 진행도 유지', async () => {
  const stars = (await dbg(page)).stars;
  expect(stars === starsBeforeBalloon + 2, '풍선 별 2개 추가: ' + starsBeforeBalloon + ' → ' + stars);
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await dbg(page)).stars === stars, '별 유지');
  const prog = await page.locator('.menu-card.c-balloon .mc-prog').textContent();
  expect(prog.includes('2 / 30'), '풍선 줄 진행도: ' + prog);
});

await check('풍선 줄: 3해상도(패드 가로·폰 가로·폰 세로) 잘림 없음', async () => {
  await page.click('.menu-card.c-balloon');
  await page.waitForSelector('#scr-list.on');
  await page.locator('#play-list .item-main').first().click();
  await page.waitForSelector('#scr-balloon.on');
  for (const vp of [{ w: 1180, h: 820 }, { w: 844, h: 390 }, { w: 390, h: 844 }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.waitForTimeout(220);
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.bl-card')].map(c => c.getBoundingClientRect());
      const de = document.documentElement;
      return { hOver: de.scrollWidth - window.innerWidth, iw: window.innerWidth, ih: window.innerHeight,
        cards: cards.map(c => ({ t: c.top, b: c.bottom, l: c.left, r: c.right })) };
    });
    expect(r.hOver <= 1, vp.w + '×' + vp.h + ': 가로 넘침 ' + r.hOver);
    r.cards.forEach((c, i) => expect(c.t >= -1 && c.b <= r.ih + 1 && c.l >= -1 && c.r <= r.iw + 1,
      vp.w + '×' + vp.h + ' 카드 ' + i + ' 잘림: ' + JSON.stringify(c)));
  }
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.click('#btn-balloon-back');
  await page.waitForSelector('#scr-list.on');
  await page.click('#scr-list .back');
});

// ─────────── 3해상도 잘림 자동 검사 ───────────
async function noOverflow(page, label) {
  const r = await page.evaluate(() => {
    const de = document.documentElement;
    const hOver = de.scrollWidth - window.innerWidth;
    const rects = [];
    document.querySelectorAll('.screen.on .sample-card, .screen.on .board-wrap, .screen.on .menu, .screen.on .items-list').forEach(el => {
      const b = el.getBoundingClientRect();
      rects.push({ right: b.right, bottom: b.bottom, top: b.top });
    });
    return { hOver, w: window.innerWidth, h: window.innerHeight, rects };
  });
  expect(r.hOver <= 1, label + ': 가로 넘침 ' + r.hOver);
  r.rects.forEach((b, i) => {
    expect(b.right <= r.w + 1, label + ': 요소 ' + i + ' 오른쪽 잘림 (' + b.right.toFixed(0) + '>' + r.w + ')');
    expect(b.bottom <= r.h + 1, label + ': 요소 ' + i + ' 아래 잘림 (' + b.bottom.toFixed(0) + '>' + r.h + ')');
  });
}
const RESO = [
  { w: 1180, h: 820, name: '패드 가로' },
  { w: 844, h: 390, name: '폰 가로' },
  { w: 390, h: 844, name: '폰 세로' },
];
for (const rz of RESO) {
  await check('잘림 검사(' + rz.name + ' ' + rz.w + '×' + rz.h + '): 홈·숟가락·빨대', async () => {
    await page.setViewportSize({ width: rz.w, height: rz.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await noOverflow(page, rz.name + '/홈');
    await openPuzzle(page, 'c-spoon', 'sp3-1');
    await page.waitForSelector('#scr-spoon.on');
    await page.waitForTimeout(150);
    await noOverflow(page, rz.name + '/숟가락');
    await page.click('#btn-spoon-back'); await page.click('#scr-list .back');
    await openPuzzle(page, 'c-straw', 'st2-1');
    await page.waitForSelector('#scr-straw.on');
    await page.waitForTimeout(150);
    await noOverflow(page, rz.name + '/빨대');
    await page.click('#btn-straw-back'); await page.click('#scr-list .back');
    await openPuzzle(page, 'c-square', 'sq3-1');
    await page.waitForSelector('#scr-square.on');
    await page.waitForTimeout(150);
    await noOverflow(page, rz.name + '/네모');
  });
}

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
