#!/usr/bin/env node
/* 종단 테스트 — node twist/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계3) → 퍼즐 목록(10) → 놀이 진입(카드·돌림 블록),
 * _spin 으로 실린더를 정답까지 돌려 완성·별·펫 간식, 부분일치 무벌점(완성 안 됨),
 * 단계별 실린더 수(2/3/4), 새로고침 진행도 유지, 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/twist/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 실린더 i를 targetCurrent 상태에서 target까지 한 스텝씩 돌린다
async function spinTo(page, i, target, current, faceLen) {
  const steps = ((target - current) % faceLen + faceLen) % faceLen;
  for (let k = 0; k < steps; k++) {
    await page.evaluate((idx) => App._spin(idx), i);
    await page.waitForTimeout(40);
  }
}
// 현재 퍼즐을 완전히 맞춘다(모든 실린더를 target까지 돌린다)
async function solveAll(page) {
  const d = await page.evaluate(() => App.debug());
  for (let i = 0; i < d.cylinders.length; i++) {
    const c = d.cylinders[i];
    await spinTo(page, i, c.target, c.current, c.faces.length);
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

await check('퍼즐 목록: 단계1 퍼즐 10개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-rounds.on');
  expect(await page.locator('#rounds-list .round-card').count() === 10, '퍼즐 수');
  expect((await page.locator('#rounds-count').textContent()).includes('0 / 10'), '진행 표기');
});

await check('놀이 진입: 본보기 카드·실린더 2개(단계1) — 처음엔 미완성', async () => {
  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.cylinderCount === 2, '단계1 실린더 수: ' + d.cylinderCount);
  expect(d.solved === false, '시작부터 완성 상태면 안 됨');
  expect(d.locked === false, '시작부터 잠겨 있으면 안 됨');
  // 본보기 카드에 실린더 수만큼 그림이 그려진다
  expect(await page.locator('#find-faces .cyl-face.find').count() === 2, '카드 얼굴 수');
  expect(await page.locator('#cyl-row .cyl-btn').count() === 2, '실린더 버튼 수');
  // 각 실린더 얼굴 수가 4개(단계1 규칙)
  d.cylinders.forEach(c => expect(c.faces.length === 4, '단계1 얼굴 수: ' + c.faces.length));
});

await check('돌리기: _spin 이 얼굴 배열을 순환한다', async () => {
  const before = await page.evaluate(() => App.debug().cylinders[0].current);
  await page.evaluate(() => App._spin(0));
  await page.waitForTimeout(60);
  const after = await page.evaluate(() => App.debug().cylinders[0].current);
  const faceLen = await page.evaluate(() => App.debug().cylinders[0].faces.length);
  expect(after === (before + 1) % faceLen, '한 스텝 순환: ' + before + '→' + after);
  // 계속 돌리면 원래 자리로 돌아온다(순환 확인)
  for (let k = 0; k < faceLen - 1; k++) await page.evaluate(() => App._spin(0));
  await page.waitForTimeout(60);
  const wrapped = await page.evaluate(() => App.debug().cylinders[0].current);
  expect(wrapped === before, '한 바퀴 돌면 원래 자리: ' + wrapped);
});

await check('부분일치 무벌점: 실린더 하나만 맞춰도 완성되지 않는다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const c0 = d0.cylinders[0];
  await spinTo(page, 0, c0.target, c0.current, c0.faces.length);
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => App.debug());
  expect(d.cylinders[0].current === d.cylinders[0].target, '실린더0은 맞춰짐');
  expect(d.solved === false, '하나만 맞았는데 전체 완성 처리됨');
  expect(d.locked === false, '하나만 맞았는데 잠김');
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '아직인데 축하가 뜸');
});

await check('전부 맞추면 완성 → 별(=실린더 수)·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  const before = await page.evaluate(() => App.debug());
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.locked === true, '완성 잠금');
  expect(d.solved === true, '전체 완성');
  expect(d.done === true, '퍼즐 완료 저장');
  expect(d.stars === before.stars + d.cylinderCount, '별 증가(실린더 수만큼): ' + before.stars + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close'); // 그만할래 → 퍼즐 목록
  await page.waitForSelector('#scr-rounds.on');
  expect(await page.locator('#rounds-list .round-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#rounds-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 실린더 3개 · 얼굴 4~5개 · 동물+공룡', async () => {
  await page.click('#scr-rounds .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-rounds.on');
  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.cylinderCount === 3, '단계2 실린더 수: ' + d.cylinderCount);
  d.cylinders.forEach(c => expect(c.faces.length >= 4 && c.faces.length <= 5, '단계2 얼굴 수: ' + c.faces.length));
});

await check('단계2 완성: 별이 실린더 수만큼 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  const need = await page.evaluate(() => App.debug().cylinderCount);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + need, '별 증가: ' + before + '→' + after + ' (필요 ' + need + ')');
  await page.click('#reward-close');
  await page.waitForSelector('#scr-rounds.on');
});

await check('단계3: 실린더 4개 · 얼굴 5~6개 · 섞인 테마', async () => {
  await page.click('#scr-rounds .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-rounds.on');
  expect(await page.locator('#rounds-list .round-card').count() === 10, '단계3 퍼즐 10개');
  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.cylinderCount === 4, '단계3 실린더 수: ' + d.cylinderCount);
  d.cylinders.forEach(c => expect(c.faces.length >= 5 && c.faces.length <= 6, '단계3 얼굴 수: ' + c.faces.length));
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
    await page.click('.menu-card.c-l3'); // 실린더가 가장 많은 단계로 빡세게
    await page.waitForSelector('#scr-rounds.on');
    await page.click('#rounds-list .round-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const stage = document.querySelector('#play-stage').getBoundingClientRect();
      const row = document.querySelector('#cyl-row').getBoundingClientRect();
      const card = document.querySelector('#find-card').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        rowBottom: row.bottom, rowRight: row.right, rowLeft: row.left,
        cardTop: card.top, cardLeft: card.left,
        stageTop: stage.top,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.rowBottom <= m.ih + 2, s.name + ': 돌림 블록이 아래로 잘림 ' + m.rowBottom + ' > ' + m.ih);
    expect(m.rowRight <= m.iw + 2, s.name + ': 돌림 블록이 옆으로 잘림 ' + m.rowRight + ' > ' + m.iw);
    expect(m.rowLeft >= -2, s.name + ': 돌림 블록이 옆으로 잘림 ' + m.rowLeft);
    expect(m.cardTop >= -2 && m.cardLeft >= -2, s.name + ': 본보기 카드가 잘림 top=' + m.cardTop + ' left=' + m.cardLeft);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('손그림 아이콘: 화면 틀에 이모지가 남아 있지 않다', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  // 블록에 그려진 얼굴은 이모지 그대로 둔다 — 여기서 찾는 것은 '화면 틀'의 이모지뿐.
  // (⭐ 는 단계3 블록 얼굴로도 쓰이므로, 얼굴이 동물뿐인 단계1 경로에서만 잰다)
  const emoji = /[⭐🎡🔊🎯✅◀▶]|🗣/u;
  const homeText = await page.locator('#scr-home').textContent();
  expect(!emoji.test(homeText), '홈에 이모지 남음: ' + homeText);
  expect(await page.locator('.home-head h1 svg').count() === 1, '제목 손그림 없음');
  expect(await page.locator('#scr-home .stat svg').count() === 1, '별 아이콘 없음');
  expect(await page.locator('#btn-voice svg').count() === 1, '목소리 아이콘 없음');
  // 떨림 필터가 문서에 딱 하나 있다
  expect(await page.locator('#twist-kd').count() === 1, '손그림 떨림 필터 없음');
  // 제목에서 첫 놀이로 향하는 점선 화살표 — 첫 칸에만
  expect(await page.locator('#menu .menu-card:nth-child(1) .first-arrow').count() === 1, '시작 화살표 없음');
  expect(await page.locator('#menu .first-arrow').count() === 1, '시작 화살표가 여러 칸에 있음');

  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-rounds.on');
  const listText = await page.locator('#scr-rounds').textContent();
  expect(!emoji.test(listText), '목록에 이모지 남음: ' + listText);
  expect(await page.locator('#rounds-list .rd-badge svg').count() === 10, '퍼즐 배지 아이콘 수');

  await page.click('#rounds-list .round-card');
  await page.waitForSelector('#scr-play.on');
  const playText = await page.locator('#scr-play').textContent();
  expect(!emoji.test(playText), '놀이 화면에 이모지 남음: ' + playText);
  expect(await page.locator('#btn-listen svg').count() === 1, '듣기 아이콘 없음');
  expect(await page.locator('#find-cap svg').count() === 1, '본보기 카드 아이콘 없음');
  // 맞은 블록의 체크도 손그림
  const c0 = (await page.evaluate(() => App.debug())).cylinders[0];
  await spinTo(page, 0, c0.target, c0.current, c0.faces.length);
  await page.waitForTimeout(420);
  expect(await page.locator('#cyl-row .cyl-check svg').count() === 1, '맞음 표시 손그림 없음');
});

await check('놀이판 무변형: 돌림 블록에는 장식용 회전·확대가 없다', async () => {
  // 이 놀이는 블록을 '돌려서' 맞춘다. 놀이판 요소에 장식용 transform 이 걸리면
  // 아이가 돌려 놓은 각도와 섞여 무엇이 정답인지 알 수 없게 된다.
  for (const s of [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드 가로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3');           // 실린더가 가장 많은 단계로 빡세게
    await page.waitForSelector('#scr-rounds.on');
    await page.click('#rounds-list .round-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(500);                // 돌리기 애니메이션이 끝난 뒤 잰다
    const bad = await page.evaluate(() => {
      const els = [
        document.querySelector('#play-stage'),
        document.querySelector('#cyl-col'),
        document.querySelector('#cyl-row'),
        document.querySelector('#find-card'),
        ...document.querySelectorAll('#cyl-row .cyl-btn'),
        ...document.querySelectorAll('#cyl-row .cyl-face'),
        ...document.querySelectorAll('#find-faces .cyl-face'),
      ].filter(Boolean);
      return els.filter(el => {
        const t = getComputedStyle(el).transform;
        return t && t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)';
      }).map(el => el.id || el.className);
    });
    expect(bad.length === 0, s.name + ': 변형이 걸린 놀이판 요소 — ' + bad.join(', '));
    // 돌린 뒤에도 rest 상태로 돌아온다
    await page.evaluate(() => App._spin(0));
    await page.waitForTimeout(500);
    const bad2 = await page.evaluate(() => [...document.querySelectorAll('#cyl-row .cyl-btn, #cyl-row .cyl-face')]
      .filter(el => { const t = getComputedStyle(el).transform; return t && t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'; }).length);
    expect(bad2 === 0, s.name + ': 돌린 뒤 변형이 남음 ' + bad2 + '개');
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('첫 화면 낙서장: 칸마다 다른 기울기·크기, 겹침·이탈 없음', async () => {
  for (const s of [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드 가로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.waitForTimeout(140);
    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#menu .menu-card')];
      return {
        rects: cards.map(c => { const r = c.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }),
        tf: cards.map(c => getComputedStyle(c).transform),
        // 놀이 이름은 한 줄로 — 줄 수와 칸 안에 들어가는지를 함께 잰다
        names: cards.map(c => {
          const n = c.querySelector('.mc-name');
          const nr = n.getBoundingClientRect(), cr = c.getBoundingClientRect();
          return { t: n.textContent, lines: nr.height / parseFloat(getComputedStyle(n).fontSize) / 1.45, over: nr.left < cr.left - 1 || nr.right > cr.right + 1 };
        }),
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        vw: window.innerWidth,
      };
    });
    // 크기 위계 — 먼저 할 단계가 가장 크다
    expect(m.rects[0].w > m.rects[1].w && m.rects[1].w > m.rects[2].w,
      s.name + ': 크기 위계 어긋남 ' + m.rects.map(r => Math.round(r.w)).join('/'));
    // 기울기가 셋 다 다르다
    expect(new Set(m.tf).size === 3, s.name + ': 기울기가 겹침');
    m.tf.forEach((t, i) => expect(t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)', s.name + ': ' + (i + 1) + '번 칸이 안 기울었다'));
    // 서로 겹치지 않는다
    for (let i = 0; i < m.rects.length; i++) for (let j = i + 1; j < m.rects.length; j++) {
      const a = m.rects[i], b = m.rects[j];
      expect(!(a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b), s.name + ': 칸 ' + (i + 1) + '·' + (j + 1) + ' 겹침');
    }
    // 화면 밖으로 삐져나가지 않는다 + 터치 하한 44px
    m.rects.forEach((r, i) => {
      expect(r.l >= -1 && r.r <= m.vw + 1, s.name + ': 칸 ' + (i + 1) + ' 화면 이탈 ' + Math.round(r.l) + '~' + Math.round(r.r));
      expect(r.w >= 44 && r.h >= 44, s.name + ': 칸 ' + (i + 1) + ' 터치 영역 부족 ' + Math.round(r.w) + '×' + Math.round(r.h));
    });
    m.names.forEach(n => {
      expect(n.lines <= 1.05, s.name + ': "' + n.t + '" 이름이 한 줄을 넘음');
      expect(!n.over, s.name + ': "' + n.t + '" 이름이 칸 밖으로 삐져나감');
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 ' + m.horiz + 'px');
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('머리 줄 겹침 없음: 듣기·제목·뒤로 ↔ 집 단추·남은시간 쪽지', async () => {
  for (const s of [{ w: 390, h: 844, name: '폰 세로' }, { w: 844, h: 390, name: '폰 가로' }, { w: 1180, h: 820, name: '패드 가로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    // 남은시간 쪽지를 강제로 띄워 최악을 잰다(부모님이 제한을 켠 상태)
    await page.evaluate(() => {
      const b = document.querySelector('.tl-bar');
      if (b) { b.classList.remove('tl-hidden'); const m = b.querySelector('.tl-bar-min'); if (m) m.textContent = '30분'; }
    });
    const bad = [];
    const measure = async (where) => {
      await page.waitForTimeout(160);
      const hits = await page.evaluate(() => {
        const rect = sel => { const el = document.querySelector(sel); return (el && el.offsetParent !== null) ? el.getBoundingClientRect() : null; };
        const mine = [['제목', rect('#scr-home.on h1') || rect('.screen.on .bar h2')],
                      ['듣기', rect('#scr-play.on #btn-listen')],
                      ['뒤로', rect('.screen.on .back')],
                      ['별', rect('#scr-home.on .stat')],
                      ['목소리', rect('#scr-home.on #btn-voice')]];
        const theirs = [['집 단추', rect('.enjoy-home-btn')], ['남은시간', rect('.tl-bar-tag')]];
        const out = [];
        mine.forEach(([an, a]) => theirs.forEach(([bn, b]) => {
          if (!a || !b) return;
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(an + '↔' + bn);
        }));
        return out;
      });
      hits.forEach(h => bad.push(s.name + '/' + where + ': ' + h));
    };
    await measure('홈');
    await page.click('.menu-card.c-l3');
    await page.waitForSelector('#scr-rounds.on');
    await measure('목록');
    await page.click('#rounds-list .round-card');
    await page.waitForSelector('#scr-play.on');
    await measure('놀이');
    expect(bad.length === 0, bad.join(', '));
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('터치 44px: 뒤로·듣기·목소리·집 단추·블록', async () => {
  for (const s of [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드 가로' }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    const small = await page.evaluate(() => {
      const out = [];
      const chk = (name, el) => { if (!el) return; const r = el.getBoundingClientRect(); if (r.width < 44 || r.height < 44) out.push(name + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); };
      chk('목소리', document.querySelector('#btn-voice'));
      chk('집 단추', document.querySelector('.enjoy-home-btn'));
      return out;
    });
    expect(small.length === 0, s.name + ': ' + small.join(', '));
    await page.click('.menu-card.c-l3');
    await page.waitForSelector('#scr-rounds.on');
    await page.click('#rounds-list .round-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(160);
    const small2 = await page.evaluate(() => {
      const out = [];
      const chk = (name, el) => { if (!el) return; const r = el.getBoundingClientRect(); if (r.width < 44 || r.height < 44) out.push(name + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); };
      chk('뒤로', document.querySelector('#btn-play-back'));
      chk('듣기', document.querySelector('#btn-listen'));
      [...document.querySelectorAll('#cyl-row .cyl-btn')].forEach((b, i) => chk('블록' + (i + 1), b));
      return out;
    });
    expect(small2.length === 0, s.name + ': ' + small2.join(', '));
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
