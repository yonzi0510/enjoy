#!/usr/bin/env node
/* 종단 테스트 — node tangram/tools/e2e.mjs
 * 실제 Chromium 으로 홈(단계3) → 퍼즐 목록(10) → 놀이 진입(본보기 카드·조각·트레이),
 * 오답 무벌점(완성 안 됨) → 정답 스냅으로 완성 → 별·펫 간식,
 * 단계별 조각 수(2~4/4~6/6~9), 단계3 돌리기 필요, 새로고침 진행도 유지,
 * 3해상도 잘림까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/tangram/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

// 조각 하나를 정답 자리로 옮겨 놓아 본다 (필요하면 먼저 돌린다)
async function placeOne(page, id) {
  await page.evaluate((pid) => {
    const d = App.debug();
    const p = d.pieces.find(x => x.id === pid);
    if (App.debug().rotateRequired) {
      let guard = 0;
      while (App.debug().pieces.find(x => x.id === pid).rot !== p.rotTarget && guard++ < 15) App._rotate(pid);
    }
  }, id);
  await page.evaluate((pid) => {
    const p = App.debug().pieces.find(x => x.id === pid);
    App._attempt(pid, p.target.x, p.target.y);
  }, id);
  await page.waitForTimeout(40);
}
// 퍼즐 전체를 완성한다 (디버그 훅으로 한 번에)
async function solveAll(page) {
  await page.evaluate(() => App._solve());
  await page.waitForTimeout(120);
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

await check('놀이 진입: 본보기 카드·조각 2~4개(단계1), 돌리기 불필요', async () => {
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total >= 2 && d.total <= 4, '단계1 조각 수: ' + d.total);
  expect(d.rotateRequired === false, '단계1은 돌리기 불필요해야 함');
  expect(d.placed === 0, '처음엔 놓인 조각 0');
  expect(await page.locator('#ref-card .pic-svg').count() === 1, '본보기 카드 그림');
  expect(await page.locator('#stage .piece').count() === d.total, '조각 개수');
});

await check('오답 무벌점: 엉뚱한 자리에 놓아도 완성되지 않는다', async () => {
  const d0 = await page.evaluate(() => App.debug());
  const p0 = d0.pieces[0];
  // 화면 한가운데 아무 자리에나 놓아 본다(정답 자리에서 충분히 멀리)
  await page.evaluate((pid) => App._attempt(pid, 50, 20), p0.id);
  await page.waitForTimeout(120);
  const d = await page.evaluate(() => App.debug());
  expect(d.placed === 0, '오답인데 놓임 처리: ' + d.placed);
  expect(!(await page.locator('#reward').evaluate(el => el.classList.contains('on'))), '오답인데 축하가 뜸');
});

await check('정답 자리에 모두 맞추기 → 완성 → 별·펫 간식', async () => {
  const petBefore = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  const before = await page.evaluate(() => App.debug());
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.placed === d.total, '조각 다 놓음: ' + d.placed + '/' + d.total);
  expect(d.done === true, '퍼즐 완료 저장');
  expect(d.stars === before.stars + 1, '별 1 증가: ' + before.stars + '→' + d.stars);
  const petAfter = await page.evaluate(() => window.Pet ? Pet.state().snacks : 0);
  expect(petAfter === petBefore + 1, '펫 간식: ' + petBefore + '→' + petAfter);
});

await check('완성 표시: 목록에 done + 진행 1 / 10', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card.done').count() === 1, '완성 퍼즐 수');
  expect((await page.locator('#list-count').textContent()).includes('1 / 10'), '진행 표기');
});

await check('단계2: 조각 4~6개, 돌리기 불필요', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l2');
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total >= 4 && d.total <= 6, '단계2 조각 수: ' + d.total);
  expect(d.rotateRequired === false, '단계2는 돌리기 불필요해야 함');
});

await check('단계2 완성: 별이 1 늘어난다', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 1, '별 증가: ' + before + '→' + after);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('단계3 진입: 조각 6~9개, 돌리기 필요 표시', async () => {
  await page.click('#scr-list .back');
  await page.click('.menu-card.c-l3');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .puzzle-card').count() === 10, '단계3 퍼즐 10개');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.total >= 6 && d.total <= 9, '단계3 조각 수: ' + d.total);
  expect(d.rotateRequired === true, '단계3은 돌리기가 필요해야 함');
});

await check('단계3: 각도가 안 맞으면 자리에 있어도 붙지 않는다(돌려야 붙음)', async () => {
  const d = await page.evaluate(() => App.debug());
  const p = d.pieces.find(x => !x.placed);
  // 회전 없이 바로 정답 위치에 놓아 본다 — 각도가 안 맞으면 스냅되면 안 된다
  const startRot = (await page.evaluate((pid) => App.debug().pieces.find(x => x.id === pid).rot, p.id));
  if (startRot === p.rotTarget) {
    // 처음부터 우연히 각도가 맞다면 한 번 돌려 어긋나게 만든 뒤 검증
    await page.evaluate((pid) => App._rotate(pid), p.id);
  }
  await page.evaluate((a) => App._attempt(a.id, a.t.x, a.t.y), { id: p.id, t: p.target });
  await page.waitForTimeout(120);
  const after = await page.evaluate((pid) => App.debug().pieces.find(x => x.id === pid), p.id);
  expect(after.placed === false, '각도 안 맞는데 붙어버림');
});

await check('단계3 완성: 돌려서 맞춘 뒤 스냅 → 별 1 증가', async () => {
  const before = await page.evaluate(() => App.debug().stars);
  await solveAll(page);
  await page.waitForSelector('#reward.on', { timeout: 5000 });
  const d = await page.evaluate(() => App.debug());
  expect(d.placed === d.total, '조각 다 놓음: ' + d.placed + '/' + d.total);
  const after = await page.evaluate(() => App.debug().stars);
  expect(after === before + 1, '별 증가: ' + before + '→' + after);
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

await check('3해상도 잘림 없음 (가로 스크롤·세로 넘침·본보기 카드 잘림 검사)', async () => {
  const sizes = [
    { w: 1180, h: 820, name: '패드 가로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 390, h: 844, name: '폰 세로' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    await page.click('.menu-card.c-l3'); // 조각이 가장 많은 단계로 빡세게
    await page.waitForSelector('#scr-list.on');
    await page.click('#list .puzzle-card');
    await page.waitForSelector('#scr-play.on');
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const stage = document.querySelector('#stage').getBoundingClientRect();
      const wrap = document.querySelector('.stage-wrap').getBoundingClientRect();
      const card = document.querySelector('#ref-card').getBoundingClientRect();
      const bar = document.querySelector('.bar').getBoundingClientRect();
      return {
        horiz: document.documentElement.scrollWidth - window.innerWidth,
        ih: window.innerHeight, iw: window.innerWidth,
        wrapBottom: wrap.bottom, wrapRight: wrap.right,
        stageBottom: stage.bottom, stageRight: stage.right,
        cardTop: card.top, cardLeft: card.left,
        barTop: bar.top,
      };
    });
    expect(m.horiz <= 1, s.name + ': 가로 스크롤 발생 ' + m.horiz + 'px');
    expect(m.wrapBottom <= m.ih + 2, s.name + ': 놀이판이 아래로 잘림 ' + m.wrapBottom + ' > ' + m.ih);
    expect(m.wrapRight <= m.iw + 2, s.name + ': 놀이판이 옆으로 잘림 ' + m.wrapRight + ' > ' + m.iw);
    expect(m.cardTop >= -2 && m.cardLeft >= -2, s.name + ': 본보기 카드가 잘림 top=' + m.cardTop + ' left=' + m.cardLeft);
    expect(m.barTop >= -2, s.name + ': 상단 바가 잘림 top=' + m.barTop);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

/* ─── 「낙서장」 디자인이 놀이를 망가뜨리지 않았는지 ───
 * 첫 화면 칸은 삐뚤게 흩뿌리지만, 놀이판과 조각에는 장식용 변형이 **하나도** 있으면 안 된다.
 * 조금이라도 돌아가면 드래그 좌표와 각도 판정이 통째로 어긋난다. */
await check('놀이판 무변형: 판·조각에 장식용 회전·확대가 없다', async () => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-l3');            // 조각이 가장 많고 돌리기까지 있는 단계
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .puzzle-card');
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const bad = [];
    // CSS 변형이 아예 없어야 하는 것들
    ['#scr-play', '.stage-wrap', '#stage', '.ref-card', '.tray-bg', '.slot', '.deco-layer']
      .forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          const t = getComputedStyle(el).transform;
          if (t !== 'none') bad.push(sel + ' → ' + t);
        });
      });
    // 조각은 js 가 transform 속성으로 옮기고 키운다 —
    // matrix(a,b,c,d,e,f) 의 b·c 가 0 이어야 '회전·기울임 없음'(이동+확대만)이다
    const pieces = [];
    document.querySelectorAll('#stage .piece').forEach(el => {
      const t = getComputedStyle(el).transform;
      const m = /^matrix\(([^)]+)\)$/.exec(t);
      if (!m) { bad.push('.piece → ' + t); return; }
      const n = m[1].split(',').map(Number);
      if (Math.abs(n[1]) > 1e-6 || Math.abs(n[2]) > 1e-6) bad.push('.piece 회전/기울임 → ' + t);
      pieces.push(t);
    });
    return { bad, count: pieces.length };
  });
  expect(r.count > 0, '조각을 찾지 못함');
  expect(r.bad.length === 0, '장식용 변형 발견: ' + r.bad.join(' | '));
});

await check('첫 화면은 반대로 삐뚤게 흩뿌려져 있다 (칸마다 다른 기울기·크기)', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  // 등장 모션(card-in)이 도는 동안에는 그 transform 이 흩뿌림을 덮으므로 끝날 때까지 기다린다
  await page.waitForFunction(
    () => [...document.querySelectorAll('#menu .menu-card')].every(el => el.getAnimations().length === 0),
    null, { timeout: 4000 }
  );
  const r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#menu .menu-card')];
    return cards.map(el => ({
      // 새 규격: 흩뿌리기는 transform 이 아니라 낱개 속성 rotate 로 준다(이동·확대는 뺐다)
      t: getComputedStyle(el).rotate,
      // 칸의 진짜 폭은 offsetWidth 로 잰다 — 경계상자는 기울기만큼 넓어져 2·3단계가 엎치락뒤치락한다
      w: el.offsetWidth,
    }));
  });
  expect(r.every(x => x.t && x.t !== 'none'), '기울지 않은 칸이 있다: ' + JSON.stringify(r));
  expect(new Set(r.map(x => x.t)).size === r.length, '칸들이 같은 각도로 기울었다');
  // 새 규격: 1단계만 1.15배 크고 2·3단계는 서로 같다 — DESIGN.md 「첫 화면 규격」
  expect(r[0].w >= Math.max(r[1].w, r[2].w) * 1.05, '1단계 칸이 뒤 칸보다 확실히 크지 않다: ' + r.map(x => x.w).join(' / '));
  expect(Math.max(r[1].w, r[2].w) <= Math.min(r[1].w, r[2].w) * 1.15, '2·3단계 칸 크기가 서로 다르다: ' + r.map(x => x.w).join(' / '));
  // 시작 화살표는 shared/screen.css 가 첫 칸 ::before 로 얹는다(29개 앱 같은 그림·같은 색).
  // ::before 는 DOM 요소가 아니므로 getComputedStyle(el, '::before') 로 봐야 한다.
  const ar = await page.evaluate(() => {
    const has = c => {
      const s = getComputedStyle(c, '::before');
      return !!s.backgroundImage && s.backgroundImage !== 'none'
        && s.backgroundImage.includes('svg') && parseFloat(s.width) > 20;
    };
    const cards = [...document.querySelectorAll('#menu > .menu-card')];
    return { first: !!cards[0] && has(cards[0]), rest: cards.slice(1).filter(has).length,
      // 앱마다 따로 그리던 옛 화살표가 되살아나면 두 개가 겹쳐 보인다 — 0 이어야 한다
      old: document.querySelectorAll('.start-arrow, .first-arrow, .mc-arrow').length,
      firstIsL1: !!cards[0] && cards[0].classList.contains('c-l1') };
  });
  expect(ar.firstIsL1, '첫 칸이 1단계가 아니다');
  expect(ar.first, '첫 칸(1단계)에 공용 시작 화살표가 없다');
  expect(ar.rest === 0, '첫 칸이 아닌 칸에도 화살표가 있다: ' + ar.rest);
  expect(ar.old === 0, '앱이 따로 그리던 옛 화살표가 남아 있다: ' + ar.old + '개');
});

await check('UI 이모지 없음: 머리줄·단추·배지가 모두 손그림 SVG', async () => {
  const r = await page.evaluate(() => {
    const EMO = /[⌚-➿⬀-⯿️\u{1F000}-\u{1FAFF}]/u;
    const out = { emoji: [], noSvg: [] };
    // 목소리 단추(#btn-voice)는 놀이 화면에서 감췄다(shared/crayon.css) — 안 보이는 것을 훑으면
    // 오탐이 나므로 목록에서 뺐다. 나머지 머리줄·단추·배지는 그대로 잰다.
    const sels = ['h1', '.bar h2', '.stat', '.back', '.mc-prog', '.pz-badge', '#reward-next'];
    sels.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (EMO.test(el.textContent)) out.emoji.push(sel + ': ' + el.textContent.trim());
        if (!el.querySelector('svg') && sel !== '.mc-prog') out.noSvg.push(sel);
      });
    });
    return out;
  });
  expect(r.emoji.length === 0, '이모지가 남음: ' + r.emoji.join(' | '));
  expect(r.noSvg.length === 0, '손그림 SVG 가 없는 자리: ' + r.noSvg.join(', '));
});

await check('집 단추·남은시간 쪽지가 머리줄·칸과 겹치지 않는다 (폰·패드)', async () => {
  const sizes = [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드 가로' }];
  const problems = [];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    for (const step of ['home', 'list', 'play']) {
      if (step === 'list') { await page.click('.menu-card.c-l1'); await page.waitForSelector('#scr-list.on'); }
      if (step === 'play') { await page.click('#list .puzzle-card'); await page.waitForSelector('#scr-play.on'); }
      await page.waitForTimeout(180);
      const bad = await page.evaluate(() => {
        const hit = (a, b) => !(a.right <= b.left + 1 || b.right <= a.left + 1 ||
                                a.bottom <= b.top + 1 || b.bottom <= a.top + 1);
        const floats = [];
        const hb = document.querySelector('.enjoy-home-btn');
        if (hb) floats.push(['집 단추', hb.getBoundingClientRect()]);
        const tag = document.querySelector('.tl-bar:not(.tl-hidden) .tl-bar-tag');
        if (tag) floats.push(['남은시간 쪽지', tag.getBoundingClientRect()]);
        const targets = [];
        document.querySelectorAll(
          '.screen.on .bar > *, .screen.on .home-head > *, .screen.on .menu > .menu-card,' +
          '.screen.on .puzzle-list > .puzzle-card, .screen.on .ref-card'
        ).forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width && r.height) targets.push([el.className || el.tagName, r]);
        });
        const out = [];
        floats.forEach(([fn, fr]) => targets.forEach(([tn, tr]) => {
          if (hit(fr, tr)) out.push(fn + ' × ' + tn);
        }));
        return out;
      });
      bad.forEach(x => problems.push(s.name + '/' + step + ': ' + x));
    }
  }
  expect(problems.length === 0, problems.join(' | '));
});

await check('터치 영역 44px 이상 (폰·패드 × 홈·목록·놀이)', async () => {
  const sizes = [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드 가로' }];
  const small = [];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto(BASE);
    await page.waitForSelector('#scr-home.on');
    for (const step of ['home', 'list', 'play']) {
      if (step === 'list') { await page.click('.menu-card.c-l1'); await page.waitForSelector('#scr-list.on'); }
      if (step === 'play') { await page.click('#list .puzzle-card'); await page.waitForSelector('#scr-play.on'); }
      await page.waitForTimeout(150);
      const bad = await page.evaluate(() => {
        const out = [];
        // 목소리 단추는 놀이 화면에서 감췄다(shared/crayon.css) — 안 눌리는 것이니 손가락 크기를
        // 잴 대상이 아니라 목록에서 뺐다. 뒤로·놀이 칸·퍼즐 칸·집 단추는 그대로 잰다.
        document.querySelectorAll(
          '.screen.on .back, .screen.on .menu-card,' +
          '.screen.on .puzzle-card, .enjoy-home-btn'
        ).forEach(el => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          if (r.width < 44 || r.height < 44) {
            out.push((el.id || el.className) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
          }
        });
        return out;
      });
      bad.forEach(x => small.push(s.name + '/' + step + ': ' + x));
    }
  }
  expect(small.length === 0, small.join(' | '));
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

await check('콘솔 오류 0', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
