#!/usr/bin/env node
/* 종단 테스트 — node dice/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계3) → 라운드 목록(10) → 놀이 진입(카드·주사위),
 * 맞는 주사위를 모두 탭 → 완성·별·펫 간식, 오답 무벌점(완성 안 됨),
 * 단계별 주사위 수(6/8/9), 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/dice/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 주사위를 강제로 굴리고 얼굴이 나올 때까지 기다린다
async function roll(page) {
  await page.evaluate(() => App._roll());
  await page.waitForFunction(() => App.debug().rolled === true, { timeout: 3000 });
  await page.waitForTimeout(60);
}
// 정답 주사위를 모두 탭해 라운드를 완성한다 (굴린 뒤 호출)
async function findAll(page) {
  const idx = await page.evaluate(() => App.debug().targetIndices);
  for (const i of idx) {
    await page.evaluate((k) => App._attempt(k), i);
    await page.waitForTimeout(60);
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

await check('라운드 목록: 단계1 라운드 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-rounds.on');
  expect(await page.locator('#rounds-list .round-card').count() === 10, '라운드 수');
  expect((await page.locator('#rounds-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('놀이 진입: 본보기 카드·주사위 6개(단계1)', async () => {
  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.diceCount === 6, '단계1 주사위 수: ' + d.diceCount);
  expect(d.targets.length === 1, '단계1 찾을 동물 수: ' + d.targets.length);
  // 본보기 카드에 찾을 동물 얼굴이 그려진다
  expect(await page.locator('#find-faces .die.find').count() === 1, '카드 얼굴 수');
  // 굴리기 전엔 주사위가 덮여있다(🎲), 버튼 표시
  expect(await page.locator('#dice-grid .die-btn').count() === 6, '주사위 버튼 수');
});

await check('오답 무벌점: 엉뚱한 주사위를 탭해도 완성되지 않는다', async () => {
  await roll(page);
  const d0 = await page.evaluate(() => App.debug());
  // 정답이 아닌 주사위 인덱스를 찾는다
  const wrong = d0.diceAnimals.findIndex((a, i) => d0.targetIndices.indexOf(i) < 0);
  expect(wrong >= 0, '방해 주사위가 없음');
  await page.evaluate((k) => App._attempt(k), wrong);
  await page.waitForTimeout(150);
  const d = await page.evaluate(() => App.debug());
  expect(d.foundCount === 0, '오답인데 찾음 처리: ' + d.foundCount);
  expect(d.locked === false, '오답인데 완성됨');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '오답인데 축하가 뜸');
});

await check('맞는 주사위 모두 탭 → 완성 → 별·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  const before = await page.evaluate(() => App.debug());
  await findAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.foundCount === d.targetIndices.length, '정답 다 찾음: ' + d.foundCount + '/' + d.targetIndices.length);
  expect(d.done === true, '라운드 완료 저장');
  expect(d.stars === before.stars + d.targetIndices.length, '별 증가(정답 수만큼): ' + before.stars + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 라운드 목록
  await page.waitForSelector('#scr-rounds.on');
  expect(await page.locator('#rounds-list .round-card.done').count() === 1, '완성 라운드 수');
  expect((await page.locator('#rounds-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 주사위 8개 · 찾을 동물 2종', async () => {
  await page.click('#scr-rounds .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-rounds.on');
  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.diceCount === 8, '단계2 주사위 수: ' + d.diceCount);
  expect(d.targets.length === 2, '단계2 찾을 동물 수: ' + d.targets.length);
});

await check('단계2 완성: 별이 정답 수만큼 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  await roll(page);
  const need = await page.evaluate(() => App.debug().targetIndices.length);
  await findAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + need, '별 증가: ' + before + '→' + after + ' (필요 ' + need + ')');
  await page.click('#reward-close');
  await page.waitForSelector('#scr-rounds.on');
});

await check('단계3: 주사위 9개 · 찾을 동물 2~3종', async () => {
  await page.click('#scr-rounds .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-rounds.on');
  expect(await page.locator('#rounds-list .round-card').count() === 10, '단계3 라운드 10개');
  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.diceCount === 9, '단계3 주사위 수: ' + d.diceCount);
  expect(d.targets.length >= 2 && d.targets.length <= 3, '단계3 찾을 동물 수: ' + d.targets.length);
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-rounds.on');
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

await check('낙서장 첫 화면: 손그림 아이콘 · 시작 화살표 · 크기 위계', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .start-arrow').count() === 1, '제목에서 첫 놀이로 가는 화살표 없음');
  expect(await page.locator('.home-head h1 svg.ic').count() === 1, '제목 손그림 없음');
  expect(await page.locator('.stat svg.ic').count() === 1, '별 손그림 없음');
  expect(await page.locator('#btn-voice svg.ic').count() === 1, '목소리 손그림 없음');
  // 화면 틀에서 이모지가 사라졌는지 (주사위에 그려진 동물 그림은 SVG 라 글자로 잡히지 않는다)
  const txt = (await page.locator('.home-head h1').innerText()) + (await page.locator('#menu').innerText());
  const emo = txt.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || [];
  expect(emo.length === 0, '첫 화면에 이모지가 남음: ' + emo.join(' '));
  // 크기 위계 — 가장 먼저 할 「쉬운 주사위」가 제일 크다
  const w = async s => (await page.locator(s).boundingBox()).width;
  const w1 = await w('.menu-card.c-l1'), w2 = await w('.menu-card.c-l2'), w3 = await w('.menu-card.c-l3');
  expect(w1 > w2 && w2 > w3, '크기 위계가 아님: ' + [w1, w2, w3].join(' / '));
});

await check('첫 화면 낙서장 배치: 폰·패드에서 겹침·이탈 없음', async () => {
  for (const s of [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드 가로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#menu .menu-card')].map(c => c.getBoundingClientRect());
      let overlap = 0;
      for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i], b = cards[j];
        if (a.left < b.right - .5 && b.left < a.right - .5 && a.top < b.bottom - .5 && b.top < a.bottom - .5) overlap++;
      }
      return {
        overlap,
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        minLeft: Math.min(...cards.map(c => c.left)),
        maxRight: Math.max(...cards.map(c => c.right)),
        minSide: Math.min(...cards.map(c => Math.min(c.width, c.height))),
        iw: window.innerWidth,
      };
    });
    expect(m.overlap === 0, s.name + ': 흩뿌린 칸끼리 겹침 ' + m.overlap + '곳');
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 ' + m.horiz + 'px');
    expect(m.minLeft >= -2 && m.maxRight <= m.iw + 2, s.name + ': 칸이 화면 밖 left=' + m.minLeft + ' right=' + m.maxRight);
    expect(m.minSide >= 44, s.name + ': 터치 하한 44px 미달 ' + m.minSide);
  }
});

await check('기울어 놓인 주사위: 탭 판정이 그림과 어긋나지 않는다', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l3'); // 주사위가 가장 많은 단계로
  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  await roll(page);
  const info = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#dice-grid .die-btn')];
    const boxes = btns.map(b => b.getBoundingClientRect());
    // 1) 정말 조금씩 기울어 있는가
    const tilted = btns.filter(b => {
      const t = getComputedStyle(b).transform;
      return t && t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)';
    }).length;
    // 2) 기울인 탓에 이웃과 겹치지 않는가 (겹치면 엉뚱한 주사위가 눌린다)
    let overlap = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.left < b.right - .5 && b.left < a.right - .5 && a.top < b.bottom - .5 && b.top < a.bottom - .5) overlap++;
    }
    // 3) 눈에 보이는 한가운데를 찍으면 바로 그 주사위가 잡히는가
    let wrongHit = 0;
    btns.forEach((b, i) => {
      const r = boxes[i];
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!el || el.closest('.die-btn') !== b) wrongHit++;
    });
    return { n: btns.length, tilted, overlap, wrongHit };
  });
  expect(info.tilted === info.n, '기울어진 주사위 ' + info.tilted + '/' + info.n);
  expect(info.overlap === 0, '주사위끼리 겹침 ' + info.overlap + '곳');
  expect(info.wrongHit === 0, '가운데를 찍었는데 다른 주사위가 잡힘 ' + info.wrongHit + '개');
  // 손가락으로 실제로 찍어도 정답으로 잡히는가
  const idx = (await page.evaluate(() => App.debug().targetIndices))[0];
  const box = await page.locator('.die-btn[data-idx="' + idx + '"]').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(150);
  expect((await page.evaluate(() => App.debug().foundCount)) === 1, '가운데를 찍었는데 정답으로 잡히지 않음');
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
    await page.click('.menu-card.c-l3'); // 가장 주사위가 많은 단계로 빡세게
    await page.waitForSelector('#scr-rounds.on');
    await page.click('#rounds-list .round-card');
    await page.waitForSelector('#scr-play.on');
    await page.evaluate(() => App._roll());
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => {
      const stage = document.querySelector('#play-stage').getBoundingClientRect();
      const grid = document.querySelector('#dice-grid').getBoundingClientRect();
      const card = document.querySelector('#find-card').getBoundingClientRect();
      const roll = document.querySelector('#btn-roll').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        gridBottom: grid.bottom, gridRight: grid.right,
        cardTop: card.top, cardLeft: card.left,
        rollBottom: roll.bottom, stageTop: stage.top,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.gridBottom <= m.ih + 2, s.name + ': 주사위판이 아래로 잘림 ' + m.gridBottom + ' > ' + m.ih);
    expect(m.rollBottom <= m.ih + 2, s.name + ': 굴리기 버튼이 아래로 잘림 ' + m.rollBottom + ' > ' + m.ih);
    expect(m.gridRight <= m.iw + 2, s.name + ': 주사위판이 옆으로 잘림 ' + m.gridRight + ' > ' + m.iw);
    expect(m.cardTop >= -2 && m.cardLeft >= -2, s.name + ': 본보기 카드가 잘림 top=' + m.cardTop + ' left=' + m.cardLeft);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
