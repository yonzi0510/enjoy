#!/usr/bin/env node
/* 종단 테스트 — node math/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 숫자 따라쓰기(펜 합성·손가락 리젝션·별·펫 간식) →
 * 그림 덧셈 한 판(오답 무벌점 → 정답 5개 → 보상) → 숫자 문제 오답 시 그림 힌트 →
 * 패턴 이어가기(진입·오답 재시도·정답 기차 출발·3단계 완주 펫 식사) →
 * 새로고침 후 진행도 유지까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/math/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 합성 포인터 스트로크 — pts 는 캔버스 비율 좌표
async function stroke(page, sel, pts, pointerType) {
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
function zigzag() {
  const pts = [];
  let dir = 1;
  for (const fy of [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]) {
    const xs = [];
    for (let fx = 0.03; fx <= 0.97; fx += 0.04) xs.push(fx);
    if (dir < 0) xs.reverse();
    dir = -dir;
    xs.forEach(fx => pts.push([fx, fy]));
  }
  return pts;
}
const squiggle = [[0.2, 0.35], [0.3, 0.72], [0.4, 0.35], [0.5, 0.72], [0.6, 0.35]];

async function clickAnswer(page, correct) { // 정답 또는 오답 보기 클릭
  await page.evaluate(c => {
    const ans = window.App.debug().answer;
    const btns = [...document.querySelectorAll('.choice-btn')];
    const target = c ? btns.find(b => +b.textContent === ans) : btns.find(b => +b.textContent !== ans);
    target.click();
  }, correct);
}

// 주사위 조각(pieceN)을 목표 칸(cellN)으로 합성 포인터 드래그
async function dragDice(page, pieceN, cellN) {
  await page.evaluate(({ pieceN, cellN }) => {
    const piece = document.querySelector('.dice-piece[data-n="' + pieceN + '"]');
    const cell = document.querySelector('.dice-cell[data-n="' + cellN + '"]');
    const pr = piece.getBoundingClientRect(), cr = cell.getBoundingClientRect();
    const fx = pr.left + pr.width / 2, fy = pr.top + pr.height / 2;
    const tx = cr.left + cr.width / 2, ty = cr.top + cr.height / 2;
    const ev = (type, x, y, target) => target.dispatchEvent(new PointerEvent(type, {
      pointerId: 9, pointerType: 'touch', isPrimary: true, buttons: 1, bubbles: true, cancelable: true,
      clientX: x, clientY: y,
    }));
    ev('pointerdown', fx, fy, piece);
    for (let i = 1; i <= 6; i++) ev('pointermove', fx + (tx - fx) * i / 6, fy + (ty - fy) * i / 6, window);
    ev('pointerup', tx, ty, window);
  }, { pieceN, cellN });
}

// 점 잇기 — 각 점(.dot-c)의 화면 중심 좌표를 순번대로 반환
async function dotCenters(page) {
  return await page.evaluate(() =>
    [...document.querySelectorAll('#dots-svg .dot-g')]
      .sort((a, b) => (+a.dataset.n) - (+b.dataset.n))
      .map(g => { const r = g.querySelector('.dot-c').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
}
// 점 잇기 화면에 합성 포인터 이벤트를 쏜다 (전부 #dots-svg 에서 발생 → down 은 svg, move/up 은 창으로 버블)
async function dotPtr(page, type, x, y) {
  await page.evaluate(({ type, x, y }) => {
    document.querySelector('#dots-svg').dispatchEvent(new PointerEvent(type, {
      pointerId: 11, pointerType: 'touch', isPrimary: true,
      buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true, clientX: x, clientY: y,
    }));
  }, { type, x, y });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 모드 카드 11개', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 11, '카드 수');
});

await check('따라쓰기: 묶음 10개 → 1 쓰기 진입', async () => {
  await page.click('.menu-card.c-trace');
  await page.waitForSelector('#scr-groups.on');
  expect(await page.locator('#groups-list .item-main').count() === 10, '묶음 수');
  await page.locator('#groups-list .item-main').first().click();
  await page.waitForSelector('#scr-trace.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.traceNum === 1, '시작 숫자: ' + d.traceNum);
});

await check('손가락 필기는 무시되고 펜슬 안내가 뜬다', async () => {
  await stroke(page, '#ink-trace', squiggle, 'touch');
  const d = await page.evaluate(() => App.debug());
  expect(d.traceStrokes === 0, '손가락 획이 기록됨');
  await page.waitForSelector('#pen-hint.on', { timeout: 2000 });
});

await check('펜 따라쓰기 → ▶ → 별 + 펫 간식 + 다음 숫자', async () => {
  await stroke(page, '#ink-trace', zigzag(), 'pen');
  await page.click('#btn-tnext');
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  await page.click('#reward-next');
  const d = await page.evaluate(() => App.debug());
  expect(d.traceNum === 2, '다음 숫자: ' + d.traceNum);
  expect(d.stars === 1, '별: ' + d.stars);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 1, '펫 간식: ' + JSON.stringify(pet));
});

await check('안 쓰고 ▶ → 판정 없이 다음 숫자(구경)', async () => {
  await page.click('#btn-tnext');
  const d = await page.evaluate(() => App.debug());
  expect(d.traceNum === 3, '숫자: ' + d.traceNum);
});

await check('그림 덧셈: 단계 3개 → 오답은 벌점 없이 다시', async () => {
  await page.click('#scr-trace .back');
  await page.click('#scr-groups .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-addv');
  await page.waitForSelector('#scr-levels.on');
  expect(await page.locator('#levels-list .item-main').count() === 3, '단계 수');
  await page.locator('#levels-list .item-main').first().click();
  await page.waitForSelector('#scr-quiz.on');
  expect(!(await page.locator('#quiz-visual').isHidden()), '그림 셈은 그림이 보여야 함');
  expect(await page.locator('#quiz-expr').isHidden(), '그림 셈은 풀 때 식이 숨어야 함');
  await clickAnswer(page, false); // 오답
  let d = await page.evaluate(() => App.debug());
  expect(d.qIdx === 0, '오답인데 넘어감');
});

await check('정답 → 산수식이 짠! 나타나고 그림을 같이 세는 이해 단계', async () => {
  await clickAnswer(page, true);
  await page.waitForSelector('#btn-qnext:not([hidden])'); // 저절로 안 넘어가고 ▶ 를 기다린다
  expect(!(await page.locator('#quiz-expr').isHidden()), '정답 후 식이 나타나야 함');
  const filled = await page.evaluate(() => ({
    what: +document.querySelector('#quiz-expr .q-what').textContent,
    ans: App.debug().answer,
  }));
  expect(filled.what === filled.ans, '식에 정답이 채워져야 함: ' + JSON.stringify(filled));
  await page.waitForTimeout(1800); // 같이 세기 시작 (하나… 둘…)
  const counted = await page.locator('#quiz-visual .count-obj .cnt').count();
  expect(counted >= 1, '세기 배지: ' + counted);
  const d = await page.evaluate(() => App.debug());
  expect(d.qIdx === 0, '아이가 누르기 전에 넘어가면 안 됨');
  await page.click('#btn-qnext');
  expect((await page.evaluate(() => App.debug())).qIdx === 1, '▶ 로 다음 문제');
});

await check('그림 덧셈: 정답 5개 → 보상 + 별 + 펫 간식', async () => {
  for (let i = 1; i < 5; i++) { // 첫 문제는 위에서 완료
    await clickAnswer(page, true);
    await page.waitForSelector('#btn-qnext:not([hidden])');
    await page.click('#btn-qnext');
  }
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.stars === 6, '별: ' + d.stars);
  const pet = await page.evaluate(() => Pet.state());
  expect(pet.snacks === 2, '펫 간식: ' + pet.snacks);
  await page.click('#reward-close'); // 그만할래 → 단계 목록
  await page.waitForSelector('#scr-levels.on');
  const prog = await page.locator('#levels-list .item-main .it-prog').first().textContent();
  expect(prog.includes('1판'), '판 수 기록: ' + prog);
});

await check('숫자 문제: 오답이면 그림 힌트가 저절로', async () => {
  await page.click('#scr-levels .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-add');
  await page.waitForSelector('#scr-levels.on');
  await page.locator('#levels-list .item-main').first().click();
  await page.waitForSelector('#scr-quiz.on');
  expect(await page.locator('#quiz-visual').isHidden(), '숫자 문제는 그림이 숨어야 함');
  await clickAnswer(page, false);
  expect(!(await page.locator('#quiz-visual').isHidden()), '오답 후 그림 힌트가 보여야 함');
  const d = await page.evaluate(() => App.debug());
  expect(d.hinted === true, '힌트 상태');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '6', '별 수');
  const t = await page.locator('.menu-card.c-trace .mc-prog').textContent();
  expect(t.includes('1 / 100'), '따라쓴 숫자: ' + t);
  const a = await page.locator('.menu-card.c-addv .mc-prog').textContent();
  expect(a.includes('1판'), '그림 덧셈 판 수: ' + a);
});

await check('징검다리: 단계 3개 → 틀린 돌은 머물고, 맞는 돌로 폴짝 → 식 공개', async () => {
  await page.click('.menu-card.c-stones');
  await page.waitForSelector('#scr-levels.on');
  expect(await page.locator('#levels-list .item-main').count() === 3, '단계 수');
  await page.locator('#levels-list .item-main').first().click(); // 앞으로 폴짝 (더하기)
  await page.waitForSelector('#scr-stones.on');
  expect(await page.locator('#stones-row .stone').count() === 10, '돌 10개');
  const s0 = (await page.evaluate(() => App.debug())).stone;
  expect(s0.target === s0.a + s0.b, '더하기 문제: ' + JSON.stringify(s0));
  // 틀린 돌 (더하기는 target ≥ 2 라 1번 돌은 항상 오답)
  const wrongN = s0.target === 1 ? 2 : 1;
  await page.click('#stones-row .stone[data-n="' + wrongN + '"]');
  expect(await page.locator('#stones-expr').isHidden(), '틀렸는데 식이 나옴');
  // 맞는 돌 → 폴짝 이동 후 식 공개
  await page.click('#stones-row .stone[data-n="' + s0.target + '"]');
  await page.waitForSelector('#btn-snext:not([hidden])', { timeout: 6000 });
  expect(!(await page.locator('#stones-expr').isHidden()), '식이 나타나야 함');
  const exprTxt = await page.locator('#stones-expr').textContent();
  expect(exprTxt.replace(/\s/g, '') === s0.a + '+' + s0.b + '=' + s0.target, '식 내용: ' + exprTxt);
});

await check('징검다리: 다섯 번 성공 → 보상 + 별 + 펫 간식', async () => {
  const before = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  for (let q = 0; q < 4; q++) { // 첫 문제는 위에서 완료
    await page.click('#btn-snext');
    await page.waitForFunction(() => document.getElementById('btn-snext').hidden);
    const s = (await page.evaluate(() => App.debug())).stone;
    await page.click('#stones-row .stone[data-n="' + s.target + '"]');
    await page.waitForSelector('#btn-snext:not([hidden])', { timeout: 6000 });
  }
  await page.click('#btn-snext'); // 마지막 → 보상
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  const after = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  expect(after.stars === before.stars + 5, '별: ' + JSON.stringify({ before, after }));
  expect(after.snacks === before.snacks + 1, '펫 간식: ' + JSON.stringify({ before, after }));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-levels.on');
});

await check('수 세기: 단계 2개 → 물건 수 = 정답, 오답은 벌점 없이 다시', async () => {
  await page.click('#scr-levels .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-count');
  await page.waitForSelector('#scr-levels.on');
  expect(await page.locator('#levels-list .item-main').count() === 2, '단계 수');
  await page.locator('#levels-list .item-main').first().click(); // 쉬움 (1~5)
  await page.waitForSelector('#scr-count.on');
  const d0 = await page.evaluate(() => App.debug().count);
  expect(d0.n >= 1 && d0.n <= 5, '개수 범위: ' + d0.n);
  expect(await page.locator('#count-visual .count-obj').count() === d0.n, '물건 수가 정답과 달라짐');
  // 오답 → 그대로 다시
  await page.evaluate(() => {
    const n = App.debug().count.n;
    [...document.querySelectorAll('#count-choices .choice-btn')].find(b => +b.textContent !== n).click();
  });
  expect((await page.evaluate(() => App.debug().count)).qIdx === 0, '오답인데 넘어감');
  expect(await page.locator('#btn-cnext').isHidden(), '오답인데 ▶ 가 보임');
});

await check('수 세기: 정답 → 물건을 하나씩 탭하며 같이 세는 이해 단계', async () => {
  await page.evaluate(() => {
    const n = App.debug().count.n;
    [...document.querySelectorAll('#count-choices .choice-btn')].find(b => +b.textContent === n).click();
  });
  await page.waitForSelector('#btn-cnext:not([hidden])');
  await page.locator('#count-visual .count-obj').first().click(); // 하나!
  expect(await page.locator('#count-visual .count-obj .cnt').count() === 1, '세기 배지가 안 붙음');
  expect((await page.evaluate(() => App.debug().count)).counted === 1, '센 개수');
  const d = await page.evaluate(() => App.debug().count);
  expect(d.qIdx === 0, '아이가 누르기 전에 넘어가면 안 됨');
});

await check('수 세기: 다섯 문제 → 보상 + 별 + 펫 간식', async () => {
  const before = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  await page.click('#btn-cnext'); // 첫 문제는 위에서 완료
  for (let q = 1; q < 5; q++) {
    await page.evaluate(() => {
      const n = App.debug().count.n;
      [...document.querySelectorAll('#count-choices .choice-btn')].find(b => +b.textContent === n).click();
    });
    await page.waitForSelector('#btn-cnext:not([hidden])');
    await page.click('#btn-cnext');
  }
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  const after = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  expect(after.stars === before.stars + 5, '별: ' + JSON.stringify({ before, after }));
  expect(after.snacks === before.snacks + 1, '펫 간식: ' + JSON.stringify({ before, after }));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-levels.on');
  const prog = await page.locator('#levels-list .item-main .it-prog').first().textContent();
  expect(prog.includes('1판'), '판 수 기록: ' + prog);
});

await check('숫자표: 단계 3개 → 1~30 빈칸 4개 → 오답 무벌점 → 정답이 칸을 채움', async () => {
  await page.click('#scr-levels .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-chart');
  await page.waitForSelector('#scr-levels.on');
  expect(await page.locator('#levels-list .item-main').count() === 3, '단계 수');
  await page.locator('#levels-list .item-main').first().click(); // 1~30
  await page.waitForSelector('#scr-chart.on');
  expect(await page.locator('#chart-grid .chart-cell').count() === 30, '칸 수');
  expect(await page.locator('#chart-grid .chart-cell.blank').count() === 4, '빈칸 수');
  expect(!(await page.locator('#chart-choices').isHidden()), '첫 빈칸이 자동 선택되어 보기가 보여야 함');
  // 오답 → 채워지지 않는다
  await page.evaluate(() => {
    const sel = App.debug().chart.sel;
    [...document.querySelectorAll('#chart-choices .choice-btn')].find(b => +b.textContent !== sel).click();
  });
  expect((await page.evaluate(() => App.debug().chart)).left === 4, '오답인데 채워짐');
  // 정답 → 그 칸이 채워진다
  const sel = (await page.evaluate(() => App.debug().chart)).sel;
  await page.evaluate(() => {
    const s = App.debug().chart.sel;
    [...document.querySelectorAll('#chart-choices .choice-btn')].find(b => +b.textContent === s).click();
  });
  expect((await page.evaluate(() => App.debug().chart)).left === 3, '빈칸이 줄어야 함');
  const filled = await page.locator('#chart-grid .chart-cell.filled').first().textContent();
  expect(+filled === sel, '채워진 숫자: ' + filled + ' (기대 ' + sel + ')');
});

await check('숫자표: 다 채우면 보상 + 별 + 펫 간식', async () => {
  const before = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  for (let q = 0; q < 3; q++) { // 남은 빈칸 3개
    await page.waitForFunction(() => App.debug().chart.sel != null); // 다음 빈칸 자동 선택을 기다린다
    await page.evaluate(() => {
      const s = App.debug().chart.sel;
      [...document.querySelectorAll('#chart-choices .choice-btn')].find(b => +b.textContent === s).click();
    });
  }
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  expect((await page.evaluate(() => App.debug().chart)).left === 0, '빈칸이 남음');
  const after = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  expect(after.stars === before.stars + 4, '별(빈칸 수만큼): ' + JSON.stringify({ before, after }));
  expect(after.snacks === before.snacks + 1, '펫 간식: ' + JSON.stringify({ before, after }));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-levels.on');
});

await check('숫자표 가로모드: 아이패드 가로 여러 해상도에서 30칸이 보기 버튼에 안 가림', async () => {
  const sizes = [{ w: 1194, h: 834 }, { w: 1133, h: 744 }, { w: 1024, h: 768 }];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    for (const lvl of [1, 2, 3]) { // 1~30(3줄)·1~50·51~100(5줄) 모두 확인
      await page.goto(BASE);
      await page.waitForSelector('#scr-home.on');
      await page.click('.menu-card.c-chart');
      await page.waitForSelector('#scr-levels.on');
      await page.locator('#levels-list .item-main').nth(lvl - 1).click();
      await page.waitForSelector('#scr-chart.on');
      const bad = await page.evaluate(() => {
        const cells = [...document.querySelectorAll('#chart-grid .chart-cell')];
        const btns = [...document.querySelectorAll('#chart-choices .choice-btn')];
        let overlap = 0;
        for (const c of cells) {
          const r = c.getBoundingClientRect();
          for (const b of btns) {
            const q = b.getBoundingClientRect();
            if (Math.min(r.right, q.right) - Math.max(r.left, q.left) > 1 &&
                Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 1) { overlap++; break; }
          }
        }
        return overlap;
      });
      expect(bad === 0, s.w + 'x' + s.h + ' 단계' + lvl + ': 칸 ' + bad + '개가 보기 버튼에 가림');
    }
  }
  await page.setViewportSize({ width: 1180, height: 820 }); // 기본 뷰포트 복원
  await page.goto(BASE); // 다음 검사가 목록에서 시작하도록 숫자표 목록에 남겨 둔다
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-chart');
  await page.waitForSelector('#scr-levels.on');
});

await check('점 잇기: 그림 30개 → 틀린 탭·잘못된 시작은 이어지지 않음', async () => {
  await page.click('#scr-levels .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-dots');
  await page.waitForSelector('#scr-levels.on');
  expect(await page.locator('#levels-list .item-main').count() === 30, '그림 수');
  await page.locator('#levels-list .item-main').first().click(); // 별
  await page.waitForSelector('#scr-dots.on');
  const total = (await page.evaluate(() => App.debug().dot)).total;
  expect(total >= 10 && total <= 20, '점 수: ' + total);
  expect(await page.locator('#dots-svg .dot-g').count() === total, '점 요소 수');
  await page.click('#dots-svg .dot-g[data-n="3"] .dot-c'); // 틀린 점 탭
  expect((await page.evaluate(() => App.debug().dot)).next === 1, '틀린 점 탭인데 진행됨');
  // 잘못된 시작 — 아무 데서나(빈 구석) 눌러 다음 점으로 그어도 이어지지 않는다
  const svgBox = await page.locator('#dots-svg').boundingBox();
  const c = await dotCenters(page);
  await dotPtr(page, 'pointerdown', svgBox.x + 3, svgBox.y + 3); // 점에서 먼 구석
  await dotPtr(page, 'pointermove', c[0].x, c[0].y);           // 1번 점 위로 끌어도
  await dotPtr(page, 'pointerup', c[0].x, c[0].y);
  expect((await page.evaluate(() => App.debug().dot)).next === 1, '잘못된 시작인데 이어짐');
});

await check('점 잇기: 손가락으로 그어 완성 (순서 건너뜀 무시) → 채움·보상·별·펫', async () => {
  const before = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  const total = (await page.evaluate(() => App.debug().dot)).total;
  const c = await dotCenters(page);
  // 1번 점에 콕 대면 바로 이어진다 (next=2)
  await dotPtr(page, 'pointerdown', c[0].x, c[0].y);
  expect((await page.evaluate(() => App.debug().dot)).next === 2, '1번에서 시작했는데 안 이어짐');
  // 순서 건너뜀 — 다음이 2인데 5번 점을 지나가도 이어지지 않는다
  await dotPtr(page, 'pointermove', c[4].x, c[4].y);
  expect((await page.evaluate(() => App.debug().dot)).next === 2, '순서를 건너뛰었는데 이어짐');
  // 이어서 2..마지막 점까지 순서대로 그어 나간다 (한 번의 드래그로)
  for (let i = 1; i < total; i++) await dotPtr(page, 'pointermove', c[i].x, c[i].y);
  await dotPtr(page, 'pointerup', c[total - 1].x, c[total - 1].y);
  expect(await page.evaluate(() => document.querySelector('#dots-svg .dots-fill').classList.contains('on')),
    '그림이 색으로 채워져야 함');
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  const after = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  expect(after.stars === before.stars + 2, '별: ' + JSON.stringify({ before, after }));
  expect(after.snacks === before.snacks + 1, '펫 간식: ' + JSON.stringify({ before, after }));
  await page.click('#reward-next'); // 다른 그림 → 목록
  await page.waitForSelector('#scr-levels.on');
  const prog = await page.locator('#levels-list .item-main .it-prog').first().textContent();
  expect(prog.includes('🏅'), '완성 훈장: ' + prog);
});

await check('점 잇기: 탭 폴백 — 다음 점을 순서대로 탭해도 완성된다', async () => {
  await page.locator('#levels-list .item-main').nth(1).click(); // 두 번째 그림 (집)
  await page.waitForSelector('#scr-dots.on');
  const total = (await page.evaluate(() => App.debug().dot)).total;
  for (let n = 1; n <= total; n++) {
    // 다음 점은 깜빡이는 중이라(의도된 안내 애니메이션) 안정성 검사 없이 실제 클릭(탭)만 보낸다
    await page.click('#dots-svg .dot-g[data-n="' + n + '"] .dot-hit', { force: true });
  }
  expect(await page.evaluate(() => document.querySelector('#dots-svg .dots-fill').classList.contains('on')),
    '탭만으로도 그림이 채워져야 함');
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  await page.click('#reward-next');
  await page.waitForSelector('#scr-levels.on');
});

await check('패턴: 단계 3개 → 기차 칸(❓ 포함) + 보기 3개는 서로 다르고 정답은 하나', async () => {
  await page.click('#scr-levels .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-pattern');
  await page.waitForSelector('#scr-levels.on');
  expect(await page.locator('#levels-list .item-main').count() === 3, '단계 수');
  await page.locator('#levels-list .item-main').first().click(); // 1단계 (ABAB)
  await page.waitForSelector('#scr-pattern.on');
  const d = await page.evaluate(() => App.debug().pattern);
  expect(d && d.unit === 'AB', '1단계 반복 단위: ' + JSON.stringify(d));
  const cars = await page.locator('#train .train-car').count();
  expect(cars === d.shownLen + 1, '기차 칸 수(❓ 포함): ' + cars + ' (기대 ' + (d.shownLen + 1) + ')');
  expect(await page.locator('#train .q-car').count() === 1, '❓ 칸이 하나여야 함');
  expect((await page.locator('#train .q-car').textContent()) === '❓', '마지막 칸은 ❓');
  const info = await page.evaluate(() => {
    const ans = App.debug().pattern.answer;
    const em = [...document.querySelectorAll('#pattern-choices .choice-btn')].map(b => b.textContent);
    return { em, hit: em.filter(e => e === ans).length };
  });
  expect(info.em.length === 3 && new Set(info.em).size === 3, '보기 3개가 서로 달라야 함: ' + info.em);
  expect(info.hit === 1, '보기 중 정답이 하나여야 함: ' + info.hit);
});

await check('패턴: 오답은 벌점 없이 흔들리고 기차는 그대로', async () => {
  await page.evaluate(() => {
    const ans = App.debug().pattern.answer;
    [...document.querySelectorAll('#pattern-choices .choice-btn')].find(b => b.textContent !== ans).click();
  });
  const d = await page.evaluate(() => App.debug().pattern);
  expect(d.qIdx === 0, '오답인데 넘어감');
  expect(await page.evaluate(() => !document.getElementById('train').classList.contains('go')), '오답인데 기차가 출발함');
  expect(await page.locator('#btn-pnext').isHidden(), '오답인데 ▶ 가 보임');
});

await check('패턴: 정답 → ❓ 가 채워지고 기차 출발 → ▶ 로 다음 문제', async () => {
  const ans = await page.evaluate(() => App.debug().pattern.answer);
  await page.evaluate(() => {
    const a = App.debug().pattern.answer;
    [...document.querySelectorAll('#pattern-choices .choice-btn')].find(b => b.textContent === a).click();
  });
  expect((await page.locator('#train .q-car').textContent()) === ans, '❓ 칸이 정답으로 채워져야 함');
  await page.waitForFunction(() => document.getElementById('train').classList.contains('go'), null, { timeout: 3000 });
  await page.waitForSelector('#btn-pnext:not([hidden])', { timeout: 4000 });
  await page.click('#btn-pnext');
  expect((await page.evaluate(() => App.debug().pattern)).qIdx === 1, '▶ 로 다음 문제');
});

async function solvePattern(from) { // from번째 문제부터 한 판 끝까지 정답을 고른다
  for (let q = from; q < 5; q++) {
    await page.evaluate(() => {
      const a = App.debug().pattern.answer;
      [...document.querySelectorAll('#pattern-choices .choice-btn')].find(b => b.textContent === a).click();
    });
    await page.waitForSelector('#btn-pnext:not([hidden])', { timeout: 4000 });
    await page.click('#btn-pnext');
  }
  await page.waitForSelector('#reward.on', { timeout: 3000 });
}

await check('패턴: 다섯 문제 → 보상 + 별 5개 + 펫 간식', async () => {
  const before = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  await solvePattern(1); // 첫 문제는 위에서 완료
  const after = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  expect(after.stars === before.stars + 5, '별: ' + JSON.stringify({ before, after }));
  expect(after.snacks === before.snacks + 1, '펫 간식: ' + JSON.stringify({ before, after }));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-levels.on');
  const prog = await page.locator('#levels-list .item-main .it-prog').first().textContent();
  expect(prog.includes('1판'), '판 수 기록: ' + prog);
});

await check('패턴: 3단계 모두 완주 → 펫 식사', async () => {
  const before = await page.evaluate(() => Pet.state().meals);
  for (const nth of [1, 2]) { // 2·3단계도 완주
    await page.locator('#levels-list .item-main').nth(nth).click();
    await page.waitForSelector('#scr-pattern.on');
    await solvePattern(0);
    await page.click('#reward-close');
    await page.waitForSelector('#scr-levels.on');
  }
  const after = await page.evaluate(() => Pet.state().meals);
  expect(after === before + 1, '펫 식사: ' + JSON.stringify({ before, after }));
});

await check('주사위: 진입 → 단계 3개 → 보드 목표 칸 + 조각', async () => {
  await page.locator('#scr-levels .back').click();
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-dice');
  await page.waitForSelector('#scr-levels.on');
  expect(await page.locator('#levels-list .item-main').count() === 3, '단계 수');
  await page.locator('#levels-list .item-main').first().click(); // 쉬움
  await page.waitForSelector('#scr-dice.on');
  const d = await page.evaluate(() => App.debug().dice);
  expect(d.total === 3 && d.cells.length === 3, '조각·목표 칸 수: ' + JSON.stringify(d));
  expect(await page.locator('#dice-tray .dice-piece').count() === 3, '트레이 조각 수');
  expect(await page.locator('#dice-board .dice-cell[data-n]').count() === 3, '목표 칸 수');
});

await check('주사위: 틀린 칸에 놓으면 무벌점으로 튕겨 돌아온다', async () => {
  const nums = (await page.evaluate(() => App.debug().dice.cells.map(c => c.n)));
  const a = nums[0], b = nums.find(n => n !== a);
  await dragDice(page, a, b); // a점 조각을 b칸(다른 숫자)에 떨어뜨림
  await page.waitForTimeout(400); // 튕겨 돌아오는 잔동작
  const d = await page.evaluate(() => App.debug().dice);
  expect(d.placed === 0, '틀린 칸인데 놓임: ' + JSON.stringify(d));
  expect(d.pieces.find(p => p.n === a).placed === false, '조각이 남아 있어야 함');
  expect(d.cells.find(c => c.n === b).filled === false, '칸이 채워지면 안 됨');
});

await check('주사위: 맞는 칸에 놓으면 착 붙고 개수가 는다', async () => {
  const a = (await page.evaluate(() => App.debug().dice.cells[0].n));
  await dragDice(page, a, a);
  // 붙는 잔동작(스냅 애니메이션)이 끝나 개수가 오르고 잠금이 풀릴 때까지 기다린다
  await page.waitForFunction(() => App.debug().dice.placed === 1, null, { timeout: 3000 });
  const d = await page.evaluate(() => App.debug().dice);
  expect(d.placed === 1, '놓인 개수: ' + d.placed);
  expect(d.cells.find(c => c.n === a).filled === true, '칸이 채워져야 함');
  expect(await page.locator('#dice-board .dice-cell.filled .dice-piece.placed').count() >= 1, '칸 안에 조각이 들어가야 함');
});

await check('주사위: 판을 다 채우면 보상 + 별 + 펫 간식', async () => {
  const before = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  const total = (await page.evaluate(() => App.debug().dice.total));
  let left = (await page.evaluate(() => App.debug().dice.pieces.filter(p => !p.placed).map(p => p.n)));
  let done = (await page.evaluate(() => App.debug().dice.placed));
  for (const n of left) {
    await dragDice(page, n, n);
    done++;
    // 스냅 애니메이션이 끝나 잠금이 풀린 뒤에 다음 조각을 드래그한다
    await page.waitForFunction(k => App.debug().dice.placed === k, done, { timeout: 3000 });
  }
  await page.waitForSelector('#reward.on', { timeout: 3000 });
  const after = await page.evaluate(() => ({ stars: App.debug().stars, snacks: Pet.state().snacks }));
  expect(after.stars === before.stars + total, '별(조각 수만큼): ' + JSON.stringify({ before, after, total }));
  expect(after.snacks === before.snacks + 1, '펫 간식: ' + JSON.stringify({ before, after }));
  await page.click('#reward-close');
  await page.waitForSelector('#scr-levels.on');
  const prog = await page.locator('#levels-list .item-main .it-prog').first().textContent();
  expect(prog.includes('1판'), '판 수 기록: ' + prog);
});

await check('새로고침 후 새 활동 진행도 유지', async () => {
  const stars = await page.evaluate(() => App.debug().stars);
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === String(stars), '별 수');
  const c = await page.locator('.menu-card.c-count .mc-prog').textContent();
  expect(c.includes('1판'), '수 세기 판 수: ' + c);
  const h = await page.locator('.menu-card.c-chart .mc-prog').textContent();
  expect(h.includes('1판'), '숫자표 판 수: ' + h);
  const d = await page.locator('.menu-card.c-dots .mc-prog').textContent();
  expect(d.includes('2 /'), '점 잇기 완성 수: ' + d); // 드래그(별)+탭 폴백(집) 두 그림 완성
  const p = await page.locator('.menu-card.c-pattern .mc-prog').textContent();
  expect(p.includes('3판'), '패턴 판 수(세 단계 합): ' + p);
  const dice = await page.locator('.menu-card.c-dice .mc-prog').textContent();
  expect(dice.includes('1판'), '주사위 판 수: ' + dice);
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
