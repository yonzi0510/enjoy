#!/usr/bin/env node
/* 종단 테스트 — node shape/tools/e2e.mjs
 * 실제 Chromium으로 홈 → 칠교(먼 곳 드롭 무시·스냅·완성 보상·펫 간식) →
 * 새로고침 후 진행도 유지 → 빙글빙글 단계(탭 회전·각도 안 맞으면 스냅 거부·완성 시 펫 식사) →
 * 블록 퍼즐 → 도형 맞추기(틀린 자리 튕김·완성)까지 검증한다.
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/shape/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) {
  try { await fn(); ok(name); }
  catch (e) { fail(name, e.message); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

const dbg = page => page.evaluate(() => App.debug());

// 합성 포인터 드래그 — 조각 요소에 pointerdown, 창으로 pointermove/up
async function dragPiece(page, id, to) {
  await page.evaluate(({ id, to }) => {
    const d = App.debug();
    const p = d.pieces.find(q => q.id === id);
    const el = document.querySelector('.piece[data-id="' + id + '"]');
    const ev = (type, tgt, x, y) => tgt.dispatchEvent(new PointerEvent(type, {
      pointerId: 5, pointerType: 'touch', isPrimary: true, buttons: 1,
      bubbles: true, cancelable: true, clientX: x, clientY: y,
    }));
    ev('pointerdown', el, p.client.x, p.client.y);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      ev('pointermove', document, p.client.x + (to.x - p.client.x) * i / steps,
        p.client.y + (to.y - p.client.y) * i / steps);
    }
    ev('pointerup', document, to.x, to.y);
  }, { id, to });
  await page.waitForTimeout(340); // 스르륵 이동 애니메이션이 끝날 때까지
}
// 톡 누르기 (움직이지 않고 down+up) — 빙글빙글 단계에서 45° 회전
async function tapPiece(page, id) {
  await page.evaluate(id => {
    const d = App.debug();
    const p = d.pieces.find(q => q.id === id);
    const el = document.querySelector('.piece[data-id="' + id + '"]');
    const ev = type => el.dispatchEvent(new PointerEvent(type, {
      pointerId: 5, pointerType: 'touch', isPrimary: true, buttons: 1,
      bubbles: true, cancelable: true, clientX: p.client.x, clientY: p.client.y,
    }));
    ev('pointerdown');
    ev('pointerup');
  }, id);
}
// 각도를 탭으로 맞춘 뒤 제 자리로 끌어다 놓기 (한 조각 완성)
// 제 자리 위에서 돌리다가 각도가 맞으면 앱이 바로 붙여 주므로 placed 를 함께 살핀다
async function solvePiece(page, id) {
  for (let n = 0; n < 8; n++) {
    const p = (await dbg(page)).pieces.find(q => q.id === id);
    if (p.placed || ((p.rot - p.rotTarget) % p.sym + p.sym) % p.sym === 0) break;
    await tapPiece(page, id);
  }
  const p = (await dbg(page)).pieces.find(q => q.id === id);
  if (p.placed) return;
  await dragPiece(page, id, p.targetClient);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

await page.goto(BASE);

await check('홈: 놀이 카드 3개', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 3, '카드 수');
});

// 첫 화면 낙서장 배치 — 칸마다 다른 기울기·크기, 겹치거나 화면 밖으로 나가지 않는다
async function menuLayout() {
  return page.evaluate(() => {
    const cs = [...document.querySelectorAll('#menu .menu-card')].map(e => {
      const r = e.getBoundingClientRect();
      // 새 규격: 흩뿌리기는 transform 이 아니라 낱개 속성 rotate 로 준다 — 각도는 rotate 에서 읽는다
      const rot = getComputedStyle(e).rotate;
      return {
        l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height,
        // 칸의 진짜 폭은 offsetWidth — 경계상자는 기울기만큼 넓어져 2·3단계가 엎치락뒤치락한다
        ow: e.offsetWidth,
        deg: rot && rot !== 'none' ? +(parseFloat(rot) || 0).toFixed(2) : 0,
      };
    });
    let ov = 0;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i], b = cs[j];
      if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 &&
          Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5) ov++;
    }
    return {
      cs, ov, vw: window.innerWidth,
      out: cs.filter(c => c.l < -0.5 || c.r > window.innerWidth + 0.5).length,
      docX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}
for (const [w, h, tag] of [[1180, 820, '패드 1180×820'], [390, 844, '폰 390×844']]) {
  await check('첫 화면 낙서장 배치: 기울기·크기 위계·겹침 없음 (' + tag + ')', async () => {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(300);
    const r = await menuLayout();
    expect(r.cs.length === 3, '카드 수');
    // 흩뿌리기 — 칸마다 다른 기울기, 어느 것도 반듯하지 않다
    r.cs.forEach((c, i) => expect(Math.abs(c.deg) > 0.5, (i + 1) + '번 칸이 안 기울었다: ' + c.deg));
    expect(new Set(r.cs.map(c => c.deg)).size === 3, '기울기가 겹친다: ' + r.cs.map(c => c.deg));
    // 새 규격: 1단계만 1.15배 크고 2·3단계는 서로 같다 — DESIGN.md 「첫 화면 규격」
    const ow = r.cs.map(c => c.ow);
    expect(ow[0] >= Math.max(ow[1], ow[2]) * 1.05, '첫 칸이 뒤 칸보다 확실히 크지 않다: ' + ow.join(' / '));
    expect(Math.max(ow[1], ow[2]) <= Math.min(ow[1], ow[2]) * 1.15, '2·3단계 칸 크기가 서로 다르다: ' + ow.join(' / '));
    // 겹침·이탈 없음
    expect(r.ov === 0, '칸이 ' + r.ov + '쌍 겹친다');
    expect(r.out === 0, '칸 ' + r.out + '개가 화면 밖으로 나갔다');
    expect(r.docX === 0, '가로 스크롤이 생겼다: ' + r.docX);
    // 다섯 살 손가락 — 어느 칸도 44px 아래로 내려가지 않는다
    r.cs.forEach((c, i) => expect(c.w >= 44 && c.h >= 44, (i + 1) + '번 칸이 너무 작다'));
  });
}
await page.setViewportSize({ width: 1180, height: 820 });
await page.waitForTimeout(300);

await check('UI 그림이 손그림 SVG (이모지 아님)', async () => {
  const r = await page.evaluate(() => {
    const q = s => document.querySelectorAll(s).length;
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
    // 목소리 단추(#btn-voice)는 놀이 화면에서 감췄다(shared/crayon.css) — 안 보이는 것을 훑으면
    // 오탐이 나므로 이모지 목록에서 뺐다. 제목·별·놀이 그림·뒤로는 그대로 훑는다.
    const chrome = [...document.querySelectorAll(
      '#scr-home h1, #scr-home .stat, #menu .mc-icon, #scr-list .back')]
      .map(e => e.textContent).join('');
    const vbtn = document.querySelector('#btn-voice');
    const vr = vbtn ? vbtn.getBoundingClientRect() : null;
    return {
      icons: q('#menu .mc-icon svg.dood'),
      title: q('#scr-home h1 svg.dood'),
      star: q('#scr-home .stat svg.dood'),
      // 손그림 그림이 걸렸는지 재던 자리 — 이제 '안 보인다'를 잰다
      // (첫 화면이 켜져 있을 때 재야 뜻이 있다. 화면이 꺼져 있으면 무엇이든 0×0 이라 헛돈다)
      homeOn: !!document.querySelector('#scr-home.on'),
      voiceHidden: !vbtn || (getComputedStyle(vbtn).display === 'none' && !vr.width && !vr.height),
      back: q('#scr-list .back svg.dood') + q('#btn-play-back svg.dood'),
      filter: q('filter#shape-dood-ink feDisplacementMap'),
      leftover: emoji.test(chrome) ? chrome : '',
    };
  });
  expect(r.icons === 3, '놀이 그림 3개가 손그림이 아니다: ' + r.icons);
  expect(r.title === 1 && r.star === 1, '제목·별 그림 없음: ' + JSON.stringify(r));
  expect(r.homeOn, '첫 화면이 안 켜져 있어 목소리 단추 검사가 헛돈다');
  expect(r.voiceHidden, '목소리 단추가 아직 놀이 화면에 보인다: ' + JSON.stringify(r));
  expect(r.back === 2, '뒤로 그림 2개가 아니다: ' + r.back);
  expect(r.filter === 1, '삐뚤한 획 필터(feDisplacementMap)가 없다');
  expect(!r.leftover, 'UI 에 이모지가 남았다: ' + r.leftover);
});

await check('칠교 목록: 도안 10개 (빙글빙글 5개)', async () => {
  await page.click('.menu-card.c-tan');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#puzzle-list .item-main').count() === 10, '도안 수');
  const spins = await page.locator('#puzzle-list .it-kind:has-text("빙글빙글")').count();
  expect(spins === 5, '빙글빙글 단계 수: ' + spins);
});

await check('칠교(집) 진입: 조각 7개 + 회색 실루엣', async () => {
  await page.click('#puzzle-list .item-main[data-puzzle="house"]');
  await page.waitForSelector('#scr-play.on');
  const d = await dbg(page);
  expect(d.mode === 'tan' && d.puzzle === 'house', '퍼즐: ' + d.puzzle);
  expect(d.total === 7 && d.placed === 0, '조각 수');
  expect(await page.locator('#stage .slot').count() === 7, '실루엣 조각 수');
});

// 낙서장 흩뿌리기는 첫 화면에만 준다.
// 놀이판이나 조각에 CSS 로 기울기·크기를 얹으면 끌어 놓기 좌표가 틀어져 퍼즐이 안 맞는다.
// (앱이 조각 배치용으로 직접 쓰는 transform 속성은 정상 — CSS 가 그 위에 덧칠했는지만 본다)
await check('놀이판과 조각에 CSS 변형이 덧칠되지 않았다', async () => {
  const bad = await page.evaluate(() => {
    const out = [];
    const nums = t => (t === 'none' || !t) ? [1, 0, 0, 1, 0, 0]
      : (t.match(/matrix\(([^)]+)\)/) || [, '1,0,0,1,0,0'])[1].split(',').map(Number);
    const look = (sel, name) => document.querySelectorAll(sel).forEach((e, i) => {
      const css = nums(getComputedStyle(e).transform);
      const own = e.transform && e.transform.baseVal.consolidate();
      const attr = own ? [own.matrix.a, own.matrix.b, own.matrix.c, own.matrix.d, own.matrix.e, own.matrix.f]
        : [1, 0, 0, 1, 0, 0];
      if (css.some((v, k) => Math.abs(v - attr[k]) > 0.01)) {
        out.push(name + i + ': css ' + css.map(v => v.toFixed(2)) + ' ≠ 속성 ' + attr.map(v => v.toFixed(2)));
      }
    });
    look('#scr-play', '놀이화면');
    look('.stage-wrap', '판테두리');
    look('#stage', '판');
    look('#stage .piece', '조각');
    look('#stage .slot', '자리');
    return out;
  });
  expect(bad.length === 0, bad.join(' | '));
});

await check('먼 곳에 놓으면 붙지 않는다', async () => {
  const p = (await dbg(page)).pieces[0];
  await dragPiece(page, p.id, { x: p.targetClient.x + 200, y: p.targetClient.y });
  expect(!(await dbg(page)).pieces[0].placed, '먼 곳인데 붙음');
});

await check('제 자리로 끌면 착! 스냅', async () => {
  const p = (await dbg(page)).pieces[0];
  await dragPiece(page, p.id, p.targetClient);
  const d = await dbg(page);
  expect(d.pieces[0].placed, '스냅 안 됨');
  expect(d.placed === 1, '완성 수: ' + d.placed);
  const c = d.pieces[0];
  expect(Math.hypot(c.client.x - c.targetClient.x, c.client.y - c.targetClient.y) < 2, '자리에 안 붙음');
});

await check('일곱 조각 완성 → 보상 + 별 + 펫 간식', async () => {
  for (const p of (await dbg(page)).pieces.filter(q => !q.placed)) {
    await dragPiece(page, p.id, p.targetClient);
  }
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  const d = await dbg(page);
  expect(d.placed === 7, '완성 수: ' + d.placed);
  expect(d.stars === 1, '별: ' + d.stars);
  const pet = await page.evaluate(() => window.Pet && Pet.state());
  expect(pet && pet.snacks === 1, '펫 간식: ' + JSON.stringify(pet));
});

await check('그만할래 → 목록에 손그림 메달 완성 표시', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  const n = await page.locator('#puzzle-list .item-main[data-puzzle="house"] .it-prog svg.dood-medal').count();
  expect(n === 1, '완성 메달 그림 수: ' + n);
  // 아직 안 한 도안 중 첫 번째만 크게 (다음에 할 것 안내)
  const ups = await page.locator('#puzzle-list .item-main.next-up').count();
  expect(ups === 1, '다음에 할 도안 강조 수: ' + ups);
  const upDone = await page.locator('#puzzle-list .item-main.next-up .it-prog svg').count();
  expect(upDone === 0, '이미 한 도안이 다음 차례로 잡혔다');
});

await check('새로고침 후 진행도 유지', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  expect((await page.locator('#home-stars').textContent()) === '1', '별 수');
  const t = await page.locator('.menu-card.c-tan .mc-prog').textContent();
  expect(t.includes('1 / 10'), '칠교 진행: ' + t);
});

await check('빙글빙글 단계(로켓): 톡 누르면 45° 회전', async () => {
  await page.click('.menu-card.c-tan');
  await page.waitForSelector('#scr-list.on');
  await page.click('#puzzle-list .item-main[data-puzzle="rocket"]');
  await page.waitForSelector('#scr-play.on');
  const before = (await dbg(page)).pieces[0].rot;
  await tapPiece(page, 't0');
  const after = (await dbg(page)).pieces[0].rot;
  expect(after === (before + 45) % 360, '회전각: ' + before + ' → ' + after);
});

await check('각도가 안 맞으면 제 자리여도 붙지 않는다', async () => {
  // t1(큰 삼각형)은 45° 어긋난 채로 나온다 — 그대로 제 자리에 놓아 본다
  const p = (await dbg(page)).pieces.find(q => q.id === 't1');
  expect(((p.rot - p.rotTarget) % 360 + 360) % 360 !== 0, '이미 맞는 각도로 나옴');
  await dragPiece(page, 't1', p.targetClient);
  expect(!(await dbg(page)).pieces.find(q => q.id === 't1').placed, '각도가 틀린데 붙음');
});

await check('탭으로 각도 맞추고 놓으면 착! → 로켓 완성 = 펫 식사', async () => {
  for (const p of (await dbg(page)).pieces.filter(q => !q.placed)) {
    await solvePiece(page, p.id);
  }
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  const d = await dbg(page);
  expect(d.placed === 7, '완성 수: ' + d.placed);
  const pet = await page.evaluate(() => Pet.state());
  expect(pet.meals === 1, '펫 식사: ' + pet.meals);
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('블록 퍼즐(거북이): 격자에 착착 → 완성', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-block');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#puzzle-list .item-main').count() === 6, '도안 수');
  await page.click('#puzzle-list .item-main[data-puzzle="turtle"]');
  await page.waitForSelector('#scr-play.on');
  const d0 = await dbg(page);
  expect(d0.mode === 'block' && d0.total === 7, '조각 수: ' + d0.total);
  // 첫 조각 스냅 확인 후 전부 완성
  const p0 = d0.pieces[0];
  await dragPiece(page, p0.id, p0.targetClient);
  expect((await dbg(page)).pieces[0].placed, '블록이 격자에 안 붙음');
  for (const p of (await dbg(page)).pieces.filter(q => !q.placed)) {
    await dragPiece(page, p.id, p.targetClient);
  }
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('도형 맞추기: 틀린 자리는 부드럽게 튕겨 돌아온다', async () => {
  await page.click('#scr-list .back');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-shape');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#puzzle-list .item-main').count() === 6, '그림 수');
  await page.click('#puzzle-list .item-main[data-puzzle="house"]');
  await page.waitForSelector('#scr-play.on');
  const d = await dbg(page);
  // 세모 지붕(s0)을 동그라미 해님(s4) 자리에 놓아 본다
  const roof = d.pieces.find(q => q.id === 's0');
  const sun = d.pieces.find(q => q.id === 's4');
  const homeX = roof.client.x, homeY = roof.client.y;
  await dragPiece(page, 's0', sun.targetClient);
  await page.waitForTimeout(400); // 튕겨 돌아오는 애니메이션
  const r2 = (await dbg(page)).pieces.find(q => q.id === 's0');
  expect(!r2.placed, '틀린 자리인데 붙음');
  expect(Math.hypot(r2.client.x - homeX, r2.client.y - homeY) < 4, '트레이로 안 돌아옴');
});

await check('도형 맞추기: 같은 모양 자리에 착! → 완성', async () => {
  for (const p of (await dbg(page)).pieces.filter(q => !q.placed)) {
    await dragPiece(page, p.id, p.targetClient);
  }
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  const d = await dbg(page);
  expect(d.placed === d.total, '완성 수: ' + d.placed + '/' + d.total);
  await page.click('#reward-close');
});

// 조각 하나를 놓아도, 그 조각과 겹치는 이웃 빈 자리 안내(문·창문)가 계속 보이는지
// 세 해상도(가로 패드·세로 패드·폰 세로)에서 확인한다. 놓은 조각이 안내를 가리면 실패.
async function slotGuidesVisibleAfterPlacing(label) {
  await page.waitForSelector('#scr-list.on');
  await page.click('#puzzle-list .item-main[data-puzzle="house"]');
  await page.waitForSelector('#scr-play.on');
  // 몸통(s1)만 제 자리에 놓는다 — 문(s2)·창문(s3)은 몸통 안쪽이라 겹친다
  const body = (await dbg(page)).pieces.find(q => q.id === 's1');
  await dragPiece(page, 's1', body.targetClient);
  const r = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const piece = q('.piece[data-id="s1"]');
    const inspect = idx => {
      const slot = q('[data-slot="' + idx + '"]');
      const bb = slot.getBoundingClientRect();
      // 안내(slot)가 놓인 조각보다 나중에 그려지면(문서상 뒤) 위에 보인다
      const rel = slot.compareDocumentPosition(piece);
      return {
        visible: bb.width > 1 && bb.height > 1,
        onTop: !!(rel & Node.DOCUMENT_POSITION_PRECEDING),
      };
    };
    return { placed: piece.classList.contains('placed'), door: inspect(2), win: inspect(3) };
  });
  expect(r.placed, label + ': 몸통이 안 놓임');
  expect(r.door.visible && r.door.onTop, label + ': 문 자리 안내가 안 보임/가려짐');
  expect(r.win.visible && r.win.onTop, label + ': 창문 자리 안내가 안 보임/가려짐');
  await page.click('#btn-play-back');
  await page.waitForSelector('#scr-list.on');
}

await check('도형 맞추기: 조각 놓아도 남은 자리 안내 보임 (가로 패드 1180×820)', async () => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await slotGuidesVisibleAfterPlacing('가로 패드');
});
await check('도형 맞추기: 조각 놓아도 남은 자리 안내 보임 (세로 패드 834×1194)', async () => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.waitForTimeout(350);
  await slotGuidesVisibleAfterPlacing('세로 패드');
});
await check('도형 맞추기: 조각 놓아도 남은 자리 안내 보임 (폰 세로 390×844)', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  await slotGuidesVisibleAfterPlacing('폰 세로');
});

await check('가로↔세로 회전: 판·트레이 재배치 + 진행 유지 + 양쪽에서 스냅', async () => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.waitForTimeout(350);
  await page.waitForSelector('#scr-list.on');
  await page.click('#puzzle-list .item-main[data-puzzle="train"]');
  await page.waitForSelector('#scr-play.on');
  const vb = () => page.evaluate(() => document.getElementById('stage').getAttribute('viewBox'));
  // 가로(1180×820)에서는 판 왼쪽 + 트레이 오른쪽 viewBox
  expect(await vb() === '0 0 158 92', '가로 viewBox: ' + await vb());
  let p = (await dbg(page)).pieces[0];
  await dragPiece(page, p.id, p.targetClient);
  expect((await dbg(page)).pieces[0].placed, '가로에서 스냅 안 됨');
  // 세로로 회전 — 놓인 조각은 그대로, 트레이는 아래로
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  expect(await vb() === '0 0 100 148', '세로 viewBox: ' + await vb());
  const d = await dbg(page);
  expect(d.placed === 1 && d.pieces[0].placed, '회전하며 진행이 풀림');
  // 세로에서도 이어서 스냅된다
  p = d.pieces.find(q => !q.placed);
  await dragPiece(page, p.id, p.targetClient);
  expect((await dbg(page)).pieces.find(q => q.id === p.id).placed, '세로에서 스냅 안 됨');
  // 다시 가로로 — 진행 유지
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.waitForTimeout(350);
  expect(await vb() === '0 0 158 92', '복귀 viewBox: ' + await vb());
  expect((await dbg(page)).placed === 2, '복귀 후 진행이 풀림');
});

// 놀이판 머리띠: '0 / 7' 이 공용 남은시간 알림표·집 단추에 가려지면 안 된다
for (const [w, h, tag] of [[390, 844, '폰 390×844'], [1180, 820, '패드 1180×820']]) {
  await check('머리띠 겹침 없음: 개수 표시 ↔ 남은시간·집 단추 (' + tag + ')', async () => {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(350);
    const r = await page.evaluate(() => {
      const box = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      const hit = (a, b) => !!a && !!b && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
      const c = box('#play-count'), tl = box('.tl-bar-tag'), hm = box('.enjoy-home-btn'), ti = box('#play-title');
      return { c, onScreen: !!c && c.l >= 0 && c.r <= window.innerWidth + .5, vsTime: hit(c, tl), vsHome: hit(c, hm), vsTitle: hit(c, ti) };
    });
    expect(r.c, '개수 표시가 없다');
    expect(r.onScreen, '개수 표시가 화면 밖으로 나갔다');
    expect(!r.vsTime, '개수 표시가 남은시간 알림표에 가린다');
    expect(!r.vsHome, '개수 표시가 집 단추에 가린다');
    expect(!r.vsTitle, '개수 표시가 제목과 겹친다');
  });
}

// 도안 목록 첫 줄이 공용 붙박이(집 단추·남은시간 쪽지)에 가려지면 완성 메달이 안 보인다
for (const [w, h, tag] of [[390, 844, '폰 390×844'], [1180, 820, '패드 1180×820']]) {
  await check('도안 목록 첫 줄이 공용 붙박이에 안 가린다 (' + tag + ')', async () => {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(350);
    if (await page.locator('#scr-play.on').count()) await page.click('#btn-play-back');
    await page.waitForSelector('#scr-list.on');
    const r = await page.evaluate(() => {
      const box = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      const hit = (a, b) => !!a && !!b && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
      const row = box('#puzzle-list .item-main'), tl = box('.tl-bar-tag'), hm = box('.enjoy-home-btn');
      return { row: !!row, vsTime: hit(row, tl), vsHome: hit(row, hm) };
    });
    expect(r.row, '목록 첫 줄이 없다');
    expect(!r.vsTime, '첫 줄이 남은시간 쪽지에 가린다');
    expect(!r.vsHome, '첫 줄이 집 단추에 가린다');
  });
}

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
