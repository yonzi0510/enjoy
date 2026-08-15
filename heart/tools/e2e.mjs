#!/usr/bin/env node
/* 종단 테스트 — node heart/tools/e2e.mjs
 * 저장소 루트에서 정적 서버를 띄운 뒤 실행 (예: python3 -m http.server 8777)
 *
 * ══ 「정답이 없는데 무엇을 검사하나」 ══
 * 이 앱에는 맞고 틀림이 없다. 그래서 「정답을 맞혔나」 대신 **놀이가 끝까지 굴러가는가**를 잰다:
 *   ① 부품을 붙이면 얼굴 SVG 가 **실제로 바뀐다** — 붙인 부품 id 와 그 path 가 화면에 있다
 *   ② **3부위를 다 붙여야** 도움 카드가 펼쳐진다
 *   ③ **어느 카드를 줘도** 반응 대사가 나오고, 어느 경우에도 「틀렸어요」류 문구·벌점이 없다
 *      (4장을 하나씩 다 눌러 보고, 대사 데이터도 전수로 훑는다)
 *   ④ 장면을 마치면 도감 칸이 켜지고 **그때 만든 얼굴이 그대로** 저장된다(새로고침 후에도)
 * 여기에 홈/목록/진입 · 놀이판 무변형 · 3해상도 잘림 · 터치 46px ·
 * 목소리 단추 안 보임 · 콘솔 오류 0 을 더한다.
 *
 * 드래그는 **진짜 마우스 이벤트**로 한 번 해 본다 — 내부 함수(App._put)만 부르면
 * 포인터 배선이 통째로 죽어도 전부 초록불이 된다.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/heart/';
let passed = 0, failed = 0;
function ok(name) { passed++; console.log('  ✅ ' + name); }
function fail(name, extra) { failed++; console.error('  ❌ ' + name + (extra ? ' — ' + extra : '')); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { fail(name, e.message); } }
function expect(cond, msg) { if (!cond) throw new Error(msg || 'expect 실패'); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const consoleErrors = [];
// 아이콘(icon-192.png)은 아직 안 그렸다 — 404 는 정상이므로 세지 않는다
const ignorable = t => /icon-\d+\.png/.test(t) || /favicon/.test(t);
page.on('console', m => { if (m.type() === 'error' && !ignorable(m.text())) consoleErrors.push(m.text()); });
page.on('pageerror', e => { if (!ignorable(String(e))) consoleErrors.push(String(e)); });

// 장면 하나에 들어간다 (묶음 카드 → 목록 → 첫 장면)
async function enterScene(page, groupCls) {
  await page.click('.menu-card.' + (groupCls || 'c-l1'));
  await page.waitForSelector('#scr-list.on');
  await page.click('#list .scene-card-btn');
  await page.waitForSelector('#scr-play.on');
  await page.waitForTimeout(120);
}

await page.goto(BASE);

/* ═══════════ 홈 · 목록 · 진입 ═══════════ */

await check('홈: 칸 5개(묶음 3 + 자유 얼굴 + 도감) · 모은 마음 0', async () => {
  await page.waitForSelector('#scr-home.on');
  expect(await page.locator('#menu .menu-card').count() === 5, '홈 칸 수');
  expect((await page.locator('#home-stars').textContent()) === '0', '모은 마음');
  const names = await page.locator('#menu .mc-name').allTextContents();
  expect(names.join(',') === '집,놀이터,유치원,내 마음 얼굴,마음 도감', '칸 이름: ' + names.join(','));
});

await check('장면 목록: 집 묶음 9개', async () => {
  await page.click('.menu-card.c-l1');
  await page.waitForSelector('#scr-list.on');
  expect(await page.locator('#list .scene-card-btn').count() === 9, '장면 수');
  expect((await page.locator('#list-count').textContent()).includes('0 / 9'), '진행 표기');
});

await check('진입: 장면 그림·상황 한 줄·빈 얼굴·부품 띠 3줄(5/6/6)', async () => {
  await page.click('#list .scene-card-btn');
  await page.waitForSelector('#scr-play.on');
  const d = await page.evaluate(() => App.debug());
  expect(d.sceneId === 'h1', '첫 장면: ' + d.sceneId);
  expect(d.filled === 0, '처음엔 붙인 부품 0: ' + d.filled);
  expect((await page.locator('#scene-line').textContent()).length > 5, '상황 한 줄');
  expect(await page.locator('#scene-pic svg.scene-svg').count() === 1, '장면 그림');
  const rows = await page.locator('#parts .parts-row').count();
  expect(rows === 3, '부품 띠 줄 수: ' + rows);
  const counts = await page.evaluate(() =>
    [...document.querySelectorAll('#parts .parts-row')].map(r => r.querySelectorAll('.part-item').length));
  expect(counts.join('/') === '5/6/6', '부위별 부품 수: ' + counts.join('/'));
  expect(counts.every(c => c >= 5 && c <= 6), '부위별 5~6종이어야 함');
});

/* ═══════════ ① 부품을 붙이면 얼굴이 실제로 바뀐다 ═══════════ */

await check('① 부품을 붙이면 얼굴 SVG 가 실제로 바뀐다 (id + path 까지 확인)', async () => {
  const r = await page.evaluate(() => {
    const readFace = () => {
      const svg = document.querySelector('#face-box svg.face-svg');
      return {
        brow: svg.getAttribute('data-brow'), eyes: svg.getAttribute('data-eyes'), mouth: svg.getAttribute('data-mouth'),
        parts: [...svg.querySelectorAll('path[data-part]')].map(p => p.getAttribute('data-part') + ':' + p.getAttribute('d')),
      };
    };
    const before = readFace();
    const want = HeartData.PARTS.brow.list[1];      // 치켜뜬 눈썹
    App._put('brow', want.id);
    const after = readFace();
    return { before, after, wantId: want.id, wantD: want.d || want.fd };
  });
  expect(r.before.parts.length === 0, '붙이기 전에 이미 부품이 그려져 있다');
  expect(r.after.brow === r.wantId, 'data-brow 가 안 바뀜: ' + r.after.brow);
  expect(r.after.parts.some(p => p === r.wantId + ':' + r.wantD),
    '붙인 부품의 path 가 얼굴에 안 그려짐 — ' + r.after.parts.join(' | '));
  expect(r.after.parts.length >= 1, '얼굴에 그려진 부품 수: ' + r.after.parts.length);
});

await check('부품을 바꾸면 앞의 것이 사라지고 새 것이 그려진다', async () => {
  const r = await page.evaluate(() => {
    const a = HeartData.PARTS.brow.list[3];
    App._put('brow', a.id);
    const svg = document.querySelector('#face-box svg.face-svg');
    return {
      brow: svg.getAttribute('data-brow'),
      parts: [...svg.querySelectorAll('path[data-part]')].map(p => p.getAttribute('data-part')),
      wantId: a.id, oldId: HeartData.PARTS.brow.list[1].id,
    };
  });
  expect(r.brow === r.wantId, '바꾼 눈썹이 반영되지 않음: ' + r.brow);
  expect(r.parts.indexOf(r.oldId) < 0, '앞서 붙인 눈썹이 남아 있다');
});

/* ═══════════ ② 3부위를 다 붙여야 카드가 펼쳐진다 ═══════════ */

await check('② 부품 1·2개일 때는 도움 카드가 없다', async () => {
  let d = await page.evaluate(() => App.debug());
  expect(d.filled === 1, '지금 붙인 부품: ' + d.filled);
  expect(d.cardsShown === false && d.cardCount === 0, '부품 1개인데 카드가 펼쳐졌다');
  d = await page.evaluate(() => { App._put('eyes', HeartData.PARTS.eyes.list[3].id); return App.debug(); });
  expect(d.filled === 2, '부품 2개: ' + d.filled);
  expect(d.cardsShown === false && d.cardCount === 0, '부품 2개인데 카드가 펼쳐졌다');
  expect(await page.locator('#help-cards .help-card').count() === 0, '화면에 카드가 보인다');
});

await check('② 3부위를 다 붙이면 도움 카드 4장이 펼쳐진다', async () => {
  const d = await page.evaluate(() => { App._put('mouth', HeartData.PARTS.mouth.list[4].id); return App.debug(); });
  expect(d.filled === 3, '부품 3개: ' + d.filled);
  expect(d.cardsShown === true, '카드가 안 펼쳐졌다');
  expect(await page.locator('#help-cards .help-card').count() === 4, '카드 수');
  const names = await page.locator('#help-cards .hc-name').allTextContents();
  expect(names.every(n => n.trim().length > 0), '이름 없는 카드가 있다');
  expect(await page.locator('#help-cards .hc-ico').count() === 4, '카드 그림 4개');
});

/* ═══════════ ③ 어느 카드를 줘도 통한다 ═══════════ */

await check('③ 어느 카드를 줘도 반응 대사가 나오고 벌점이 없다 (4장 전부 눌러 본다)', async () => {
  const r = await page.evaluate(async () => {
    const sc = HeartData.sceneById('h1');
    const out = [];
    for (const c of sc.cards) {
      App._openScene('h1');
      App._put('brow', 'flat'); App._put('eyes', 'open'); App._put('mouth', 'smile');
      const starsBefore = App.debug().stars;
      App._give(c.id);
      await new Promise(r => setTimeout(r, 1100));   // 축하 패널이 뜨기를 기다린다
      const d = App.debug();
      out.push({
        card: c.id,
        helped: d.helped,
        locked: d.locked,
        done: d.done,
        praise: document.getElementById('reward-praise').textContent,
        starsDelta: d.stars - starsBefore,
        given: document.querySelectorAll('#help-cards .help-card.given').length,
      });
    }
    return out;
  });
  r.forEach(x => {
    expect(x.helped === x.card, '카드 ' + x.card + ' 를 줬는데 반영되지 않음');
    expect(x.locked === true && x.done === true, '카드 ' + x.card + ': 장면이 끝나지 않음');
    expect(x.praise && x.praise.trim().length > 3, '카드 ' + x.card + ': 반응 대사가 비었다 — "' + x.praise + '"');
    expect(x.starsDelta >= 0, '카드 ' + x.card + ': 마음이 줄었다(벌점) ' + x.starsDelta);
    expect(x.given === 1, '카드 ' + x.card + ': 건넨 표시가 없다');
  });
  expect(new Set(r.map(x => x.praise)).size === 4, '네 카드의 반응이 서로 같다 — ' + r.map(x => x.praise).join(' | '));
});

await check('③ 대사 데이터 전수: 「틀렸어요」류 부정 표현이 어디에도 없다', async () => {
  const bad = await page.evaluate(() => {
    const BAD = ['틀렸', '틀려', '아니야', '안 돼', '안돼', '잘못', '실패', '땡'];
    const out = [];
    const scan = (where, t) => BAD.forEach(w => { if (String(t).indexOf(w) >= 0) out.push(where + ': ' + t); });
    HeartData.SCENES.forEach(s => {
      scan(s.id + ' 상황', s.line);
      s.cards.forEach(c => { scan(s.id + '/' + c.id + ' 이름', c.name); c.reply.forEach(r => scan(s.id + '/' + c.id, r)); });
    });
    HeartData.praises.forEach(t => scan('칭찬', t));
    HeartData.facePraises.forEach(t => scan('얼굴 칭찬', t));
    HeartData.MOODS.forEach(m => { scan('마음', m.name); scan('마음', m.say); });
    // 화면에 남아 있는 글도 훑는다
    document.querySelectorAll('.screen, .reward').forEach(el => scan('화면', el.textContent));
    return out;
  });
  expect(bad.length === 0, bad.slice(0, 3).join(' | '));
});

await check('③ 정답을 가르는 코드가 없다 (데이터에 정답 필드 없음)', async () => {
  const bad = await page.evaluate(() => {
    const keys = ['answer', 'correct', 'right', 'score'];
    const out = [];
    HeartData.SCENES.forEach(s => {
      keys.forEach(k => { if (k in s) out.push(s.id + '.' + k); });
      s.cards.forEach(c => keys.forEach(k => { if (k in c) out.push(s.id + '/' + c.id + '.' + k); }));
    });
    return out;
  });
  expect(bad.length === 0, '정답 필드가 생겼다: ' + bad.join(', '));
});

/* ═══════════ ④ 도감: 그때 만든 얼굴 그대로 ═══════════ */

await check('④ 장면을 마치면 도감 칸이 켜지고 그때 만든 얼굴이 그대로 저장된다', async () => {
  const r = await page.evaluate(() => {
    App._openScene('h2');                 // 화남
    const sel = { brow: 'up', eyes: 'squint', mouth: 'wave' };
    App._put('brow', sel.brow); App._put('eyes', sel.eyes); App._put('mouth', sel.mouth);
    App._give(HeartData.sceneById('h2').cards[2].id);
    const d = App.debug();
    return { sel, mood: d.mood, saved: d.bookFace, bookCount: d.bookCount };
  });
  expect(r.mood === 'angry', '장면 h2 의 마음: ' + r.mood);
  expect(r.saved, '도감에 아무것도 저장되지 않았다');
  ['brow', 'eyes', 'mouth'].forEach(s => {
    expect(r.saved[s] === r.sel[s], '도감에 저장된 ' + s + ' 이 만든 것과 다르다: ' + r.saved[s] + ' ≠ ' + r.sel[s]);
  });
  expect(r.bookCount >= 2, '도감 칸 수: ' + r.bookCount);
});

await check('④ 도감 화면: 켜진 칸에 내가 만든 얼굴 그대로 · 빈 칸은 점선', async () => {
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
  await page.click('#scr-list [data-go="scr-home"]');
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-book');
  await page.waitForSelector('#scr-book.on');
  expect(await page.locator('#book-grid .book-cell').count() === 12, '도감 12칸');
  const m = await page.evaluate(() => {
    const cell = document.querySelector('.book-cell[data-mood="angry"]');
    const svg = cell.querySelector('svg.face-svg');
    const empties = [...document.querySelectorAll('.book-cell:not(.got) svg.mini-face.empty')].length;
    const got = document.querySelectorAll('.book-cell.got').length;
    return {
      got, empties,
      brow: svg && svg.getAttribute('data-brow'),
      eyes: svg && svg.getAttribute('data-eyes'),
      mouth: svg && svg.getAttribute('data-mouth'),
      parts: svg ? svg.querySelectorAll('path[data-part]').length : 0,
    };
  });
  expect(m.got >= 2, '켜진 칸 수: ' + m.got);
  expect(m.brow === 'up' && m.eyes === 'squint' && m.mouth === 'wave',
    '화남 칸의 얼굴이 내가 만든 것과 다르다: ' + JSON.stringify(m));
  expect(m.parts >= 3, '도감 얼굴에 부품이 안 그려졌다: ' + m.parts);
  expect(m.empties === 12 - m.got, '빈 칸이 점선으로 안 그려졌다: ' + m.empties);
  expect((await page.locator('#book-count').textContent()).includes(m.got + ' / 12'), '도감 셈');
});

await check('④ 새로고침 후에도 도감의 얼굴이 그대로', async () => {
  const before = await page.evaluate(() => JSON.stringify(App.debug().bookCount));
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-book');
  await page.waitForSelector('#scr-book.on');
  const m = await page.evaluate(() => {
    const svg = document.querySelector('.book-cell[data-mood="angry"] svg.face-svg');
    return {
      bookCount: App.debug().bookCount,
      brow: svg && svg.getAttribute('data-brow'),
      eyes: svg && svg.getAttribute('data-eyes'),
      mouth: svg && svg.getAttribute('data-mouth'),
      stars: document.getElementById('book-count').textContent,
    };
  });
  expect(String(m.bookCount) === before, '도감 칸 수 유지: ' + before + ' → ' + m.bookCount);
  expect(m.brow === 'up' && m.eyes === 'squint' && m.mouth === 'wave',
    '새로고침 뒤 얼굴이 바뀌었다: ' + JSON.stringify(m));
});

await check('진행도 유지: 홈 진행 표기 · 모은 마음', async () => {
  await page.click('#scr-book [data-go="scr-home"]');
  await page.waitForSelector('#scr-home.on');
  const stars = Number(await page.locator('#home-stars').textContent());
  expect(stars >= 2, '모은 마음: ' + stars);
  const l1 = await page.locator('.menu-card.c-l1 .mc-prog').textContent();
  expect(l1.includes('/ 9'), '집 묶음 진행: ' + l1);
});

/* ═══════════ 자유 모드 ═══════════ */

await check('자유 모드: 장면 없이 얼굴만 만들어 스티커로 담긴다', async () => {
  await page.click('.menu-card.c-free');
  await page.waitForSelector('#scr-free.on');
  expect(await page.locator('#free-parts .parts-row').count() === 3, '자유 모드 부품 띠 3줄');
  const before = await page.evaluate(() => App.debug().freeCount);
  await page.evaluate(() => {
    App._freePut('brow', 'high'); App._freePut('eyes', 'wide'); App._freePut('mouth', 'open');
  });
  const face = await page.evaluate(() => {
    const svg = document.querySelector('#free-face svg.face-svg');
    return { brow: svg.getAttribute('data-brow'), parts: svg.querySelectorAll('path[data-part]').length };
  });
  expect(face.brow === 'high' && face.parts >= 3, '자유 모드 얼굴이 안 바뀜: ' + JSON.stringify(face));
  await page.click('#btn-free-save');
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => App.debug().freeCount);
  expect(after === before + 1, '스티커가 안 담겼다: ' + before + ' → ' + after);
});

await check('자유 모드 스티커가 도감 옆에 남고 새로고침 후에도 있다', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await page.click('.menu-card.c-book');
  await page.waitForSelector('#scr-book.on');
  expect(await page.locator('#sticker-row .sticker').count() >= 1, '스티커 줄이 비었다');
  const m = await page.evaluate(() => {
    const svg = document.querySelector('#sticker-row .sticker svg.face-svg');
    return { brow: svg.getAttribute('data-brow'), eyes: svg.getAttribute('data-eyes'), mouth: svg.getAttribute('data-mouth') };
  });
  expect(m.brow === 'high' && m.eyes === 'wide' && m.mouth === 'open', '담긴 스티커가 만든 얼굴과 다르다: ' + JSON.stringify(m));
});

/* ═══════════ 진짜 손가락 드래그 ═══════════ */

await check('진짜 마우스 드래그로 부품이 붙고 카드가 건네진다 (내부 함수가 아니라 포인터로)', async () => {
  /* 위 검사들은 App._put/_give 라는 **내부 함수**를 부른다. 그것만 있으면 포인터 배선이
   * 통째로 죽어도 전부 통과한다 — 아이는 아무것도 못 하는데 초록불인 것이다. */
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await enterScene(page, 'c-l2');
  const sceneId = await page.evaluate(() => App.debug().sceneId);

  // ① 부품을 얼굴 밖(장면 카드)에 놓아 본다 — 붙지 않고, 잃는 것도 없다
  const item0 = await page.locator('#parts .parts-row[data-slot="brow"] .part-item').first().boundingBox();
  const sceneBox = await page.locator('#scene-pic').boundingBox();
  await page.mouse.move(item0.x + item0.width / 2, item0.y + item0.height / 2);
  await page.mouse.down();
  await page.mouse.move(sceneBox.x + sceneBox.width / 2, sceneBox.y + sceneBox.height / 2, { steps: 8 });
  const ghost = await page.locator('#drag-ghost').isVisible();
  expect(ghost, '끄는 동안 조각이 손끝을 따라오지 않는다');
  await page.mouse.up();
  await page.waitForTimeout(120);
  let d = await page.evaluate(() => App.debug());
  expect(d.filled === 0, '얼굴 밖에 놓았는데 붙었다: ' + d.filled);
  expect(d.stars === 0 || d.stars >= 0, '벌점이 있다');

  // ② 얼굴 위로 끌어다 놓으면 붙는다 (세 부위 모두 드래그로)
  const faceBox = await page.locator('#face-box').boundingBox();
  for (const slot of ['brow', 'eyes', 'mouth']) {
    const it = await page.locator('#parts .parts-row[data-slot="' + slot + '"] .part-item').nth(1).boundingBox();
    await page.mouse.move(it.x + it.width / 2, it.y + it.height / 2);
    await page.mouse.down();
    await page.mouse.move(faceBox.x + faceBox.width / 2, faceBox.y + faceBox.height / 2, { steps: 8 });
    await page.waitForTimeout(60);
    const hov = await page.locator('#face-box.hover').count();
    expect(hov === 1, slot + ': 얼굴판 위에서 안내 표시가 안 켜진다');
    await page.mouse.up();
    await page.waitForTimeout(100);
    const got = await page.evaluate(s => App.debug().sel[s], slot);
    expect(got, '드래그로 ' + slot + ' 이 안 붙었다');
  }
  d = await page.evaluate(() => App.debug());
  expect(d.filled === 3, '드래그로 세 부위가 다 붙지 않았다: ' + d.filled);
  expect(d.cardsShown === true && d.cardCount === 4, '드래그로 채운 뒤 카드가 안 펼쳐졌다');

  // ③ 카드를 친구에게 끌어다 준다
  const cardBox = await page.locator('#help-cards .help-card').nth(1).boundingBox();
  const friend = await page.locator('#scene-card').boundingBox();
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(friend.x + friend.width / 2, friend.y + friend.height * 0.6, { steps: 8 });
  await page.waitForTimeout(60);
  expect(await page.locator('#scene-card.hover').count() === 1, '친구 위에서 안내 표시가 안 켜진다');
  await page.mouse.up();
  await page.waitForTimeout(200);
  d = await page.evaluate(() => App.debug());
  expect(d.helped, '드래그로 카드를 줬는데 반영되지 않았다');
  expect(d.done === true, '장면이 끝나지 않았다');
  expect(d.bookFace && d.bookFace.brow === d.sel.brow, '드래그로 만든 얼굴이 도감에 안 담겼다');
  await page.waitForSelector('#reward.on', { timeout: 4000 });
  expect(String(sceneId).length > 0, '장면 id');
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

await check('친구 표정이 도움을 받고 바뀐다', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await enterScene(page, 'c-l3');
  const before = await page.evaluate(() => {
    const svg = document.querySelector('#scene-pic .face-svg');
    return { brow: svg.getAttribute('data-brow'), eyes: svg.getAttribute('data-eyes'), mouth: svg.getAttribute('data-mouth') };
  });
  const after = await page.evaluate(() => {
    App._put('brow', 'curve'); App._put('eyes', 'open'); App._put('mouth', 'flat');
    App._give(HeartData.sceneById(App.debug().sceneId).cards[0].id);
    const svg = document.querySelector('#scene-pic .face-svg');
    return { brow: svg.getAttribute('data-brow'), eyes: svg.getAttribute('data-eyes'), mouth: svg.getAttribute('data-mouth'),
      happy: HeartData.HAPPY };
  });
  expect(JSON.stringify(after.happy) === JSON.stringify({ brow: after.brow, eyes: after.eyes, mouth: after.mouth }),
    '도움을 받은 뒤 친구 얼굴이 밝아지지 않았다: ' + JSON.stringify(after));
  expect(JSON.stringify(before) !== JSON.stringify({ brow: after.brow, eyes: after.eyes, mouth: after.mouth }),
    '친구 표정이 그대로다');
  await page.click('#reward-close');
  await page.waitForSelector('#scr-list.on');
});

/* ═══════════ 낙서장 규격 ═══════════ */

await check('놀이판 무변형 (얼굴판·부품·카드·장면에 transform none)', async () => {
  // 끌어 놓기 좌표를 getBoundingClientRect 로 잰다. 조금이라도 기울거나 커지면 손끝이 어긋난다.
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await enterScene(page, 'c-l1');
  const read = () => page.evaluate(() => {
    const sels = ['#face-box', '#face-box svg', '#scene-card', '#scene-pic', '#scene-pic svg',
      '#parts', '#parts .parts-row', '#parts .part-item', '#parts .part-item svg',
      '#help-cards', '#help-cards .help-card', '#tray-wrap', '.play-stage'];
    const bad = []; let seen = 0;
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      seen++;
      const t = getComputedStyle(el).transform;
      if (t !== 'none') bad.push(sel + ' → ' + t);
    }));
    return { bad, seen };
  });
  let r = await read();
  expect(r.seen >= 40, '검사한 놀이판 요소가 너무 적다: ' + r.seen);
  expect(r.bad.length === 0, '변형이 걸린 요소: ' + r.bad.slice(0, 4).join(' , '));
  // 카드가 펼쳐진 뒤에도 그대로여야 한다
  await page.evaluate(() => { App._put('brow', 'flat'); App._put('eyes', 'open'); App._put('mouth', 'smile'); });
  await page.waitForTimeout(120);
  r = await read();
  expect(r.bad.length === 0, '카드가 펼쳐진 뒤 변형이 걸린 요소: ' + r.bad.slice(0, 4).join(' , '));
});

await check('첫 화면 규격 — 칸마다 다른 기울기, 먼저 할 것이 가장 크다, 시작 화살표 하나', async () => {
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
      firstArrow: !!cards[0] && has(cards[0]),
      restArrow: cards.slice(1).filter(has).length,
      old: document.querySelectorAll('.start-arrow, .first-arrow, .mc-arrow').length,
      h1c: (() => { const h = document.querySelector('h1'); return getComputedStyle(h).textAlign; })(),
    };
  });
  expect(m.rots.every(r => r && r !== 'none'), '기울지 않은 칸이 있다: ' + m.rots.join(' | '));
  expect(new Set(m.rots).size === 5, '칸끼리 기울기가 겹친다: ' + m.rots.join(' | '));
  expect(m.widths[0] >= Math.max(...m.widths.slice(1)) * 1.05, '첫 칸이 확실히 크지 않다: ' + m.widths.join(' / '));
  expect(m.firstArrow, '첫 놀이를 가리키는 공용 시작 화살표가 없다');
  expect(m.restArrow === 0, '첫 칸이 아닌 칸에도 화살표가 있다');
  expect(m.old === 0, '앱이 따로 그린 옛 화살표가 있다');
  expect(m.h1c === 'center', '제목이 가운데가 아니다');
});

await check('이모지 대신 손그림 SVG — 얼굴 부품은 반드시 path', async () => {
  const m = await page.evaluate(() => {
    const EMOJI = /[\u{1F300}-\u{1FAFF}]/u;
    const bad = [];
    ['h1', '.stat', '.mc-name', '.mc-desc', '.scene-line', '.hc-name', '.bc-name'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => { if (EMOJI.test(el.textContent)) bad.push(sel + ': ' + el.textContent.trim()); });
    });
    const partsArePaths = HeartData.SLOTS.every(s =>
      HeartData.PARTS[s].list.every(p => HeartData.partPaths(s, p.id).indexOf('<path') === 0));
    return { bad, partsArePaths, icons: document.querySelectorAll('#menu svg use').length };
  });
  expect(m.bad.length === 0, '이모지가 남아 있다 — ' + m.bad.join(' | '));
  expect(m.partsArePaths, '얼굴 부품이 <path> 가 아니다');
  expect(m.icons >= 5, '손그림 아이콘이 안 그려졌다: ' + m.icons);
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

/* ═══════════ 화면 크기 ═══════════ */

await check('3해상도 잘림 없음 (폰 세로·폰 가로·패드)', async () => {
  const sizes = [
    { w: 390, h: 844, name: '폰 세로' },
    { w: 844, h: 390, name: '폰 가로' },
    { w: 1180, h: 820, name: '패드' },
  ];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    for (const step of ['parts', 'cards']) {
      await page.goto(BASE);
      await page.waitForSelector('#scr-home.on');
      await enterScene(page, 'c-l3');
      if (step === 'cards') {
        await page.evaluate(() => { App._put('brow', 'flat'); App._put('eyes', 'open'); App._put('mouth', 'smile'); });
      }
      await page.waitForTimeout(180);
      const m = await page.evaluate(() => {
        const box = sel => { const el = document.querySelector(sel); if (!el) return null;
          const r = el.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; };
        const tray = document.querySelector('#help-cards').hidden ? '#parts' : '#help-cards';
        return {
          horiz: document.documentElement.scrollWidth - window.innerWidth,
          ih: window.innerHeight, iw: window.innerWidth,
          scene: box('#scene-card'), face: box('#face-box'), tray: box(tray),
        };
      });
      const at = s.name + '/' + step;
      expect(m.horiz <= 1, at + ': 가로 스크롤 ' + m.horiz + 'px');
      expect(m.scene.t >= -2, at + ': 장면이 위로 잘림 ' + Math.round(m.scene.t));
      expect(m.tray.b <= m.ih + 2, at + ': 아래 띠가 잘림 ' + Math.round(m.tray.b) + ' > ' + m.ih);
      expect(m.face.b <= m.ih + 2, at + ': 얼굴판이 아래로 잘림 ' + Math.round(m.face.b));
      expect(m.tray.r <= m.iw + 2 && m.tray.l >= -2, at + ': 아래 띠가 옆으로 잘림');
      expect(m.scene.r <= m.iw + 2 && m.scene.l >= -2, at + ': 장면이 옆으로 잘림');
    }
  }
  await page.setViewportSize({ width: 1180, height: 820 });
});

await check('패드 가로: 얼굴판이 장면 카드보다 작지 않다 (빈 공간 지적 재발 방지)', async () => {
  /* 부모님 지적: "여기 역시 메인화면인 얼굴이 너무 작아. 쓸데없이 예시장면이 너무 커."
   * 예전엔 장면 카드가 최대 420px, 정작 아이가 만드는 얼굴은 최대 150px 였다 —
   * 참고 그림이 작업판보다 훨씬 컸다. 최댓값을 조정했을 뿐이라 회귀하기 쉽다. */
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  await enterScene(page, 'c-l3');
  await page.waitForTimeout(200);
  const m = await page.evaluate(() => {
    const box = sel => document.querySelector(sel).getBoundingClientRect();
    const f = box('#face-box'), s = box('#scene-card');
    return { faceW: f.width, faceH: f.height, sceneW: s.width, sceneH: s.height };
  });
  expect(m.faceW >= 220, '패드 가로 얼굴판이 ' + m.faceW.toFixed(0) + 'px 뿐이다(220px 이상이어야 함)');
  expect(m.faceW >= m.sceneW * 0.9,
    '얼굴판(' + m.faceW.toFixed(0) + 'px)이 장면 카드(' + m.sceneW.toFixed(0) + 'px)보다 훨씬 작다');
});

await check('폰·패드: 겹침 없음 · 터치 46px · 화면 이탈 없음', async () => {
  const sizes = [{ w: 390, h: 844, name: '폰 세로' }, { w: 1180, h: 820, name: '패드' }];
  for (const s of sizes) {
    await page.setViewportSize({ width: s.w, height: s.h });
    for (const where of ['home', 'list', 'play', 'book', 'free']) {
      await page.goto(BASE);
      await page.waitForSelector('#scr-home.on');
      if (where === 'list' || where === 'play') {
        await page.click('.menu-card.c-l1');
        await page.waitForSelector('#scr-list.on');
      }
      if (where === 'play') {
        await page.click('#list .scene-card-btn');
        await page.waitForSelector('#scr-play.on');
      }
      if (where === 'book') { await page.click('.menu-card.c-book'); await page.waitForSelector('#scr-book.on'); }
      if (where === 'free') { await page.click('.menu-card.c-free'); await page.waitForSelector('#scr-free.on'); }
      await page.waitForTimeout(220);
      const m = await page.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
        const box = el => { const r = el.getBoundingClientRect();
          return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
        const hit = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;

        const floats = [];
        const home = document.querySelector('.enjoy-home-btn');
        const tag = document.querySelector('.tl-bar-tag');
        if (home && vis(home)) floats.push(['집 단추', box(home)]);
        if (tag && vis(tag) && !tag.closest('.tl-hidden')) floats.push(['시간 쪽지', box(tag)]);

        const targetSel = '.screen.on .bar > *, .screen.on .home-head > *, .screen.on .stats > *,' +
          '.screen.on .back, .screen.on #btn-listen, .screen.on #btn-free-save,' +
          '.screen.on .menu-card, .screen.on .scene-card-btn, .screen.on .part-item,' +
          '.screen.on .help-card, .screen.on .book-cell, .screen.on .page-count, .screen.on .stat';
        const targets = [...document.querySelectorAll(targetSel)].filter(vis);
        const overlaps = [];
        floats.forEach(([fname, f]) => targets.forEach(t => {
          if (hit(f, box(t))) overlaps.push(fname + ' ↔ ' + (t.id || t.className));
        }));

        const tapSel = '.screen.on .back, .screen.on #btn-listen, .screen.on #btn-free-save,' +
          '.screen.on .menu-card, .screen.on .scene-card-btn, .screen.on .part-item,' +
          '.screen.on .help-card, .screen.on .book-cell';
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

/* ═══════════ 보상 ═══════════ */

await check('장면을 마치면 펫 간식 · 묶음을 다 하면 펫 식사', async () => {
  await page.goto(BASE);
  await page.waitForSelector('#scr-home.on');
  const r = await page.evaluate(async () => {
    const snackBefore = window.Pet ? Pet.state().snacks : 0;
    App._openScene('p1');
    App._put('brow', 'down'); App._put('eyes', 'teary'); App._put('mouth', 'wave');
    App._give('a');
    const snackAfter = window.Pet ? Pet.state().snacks : 0;
    // 놀이터 묶음 9개를 다 마치면 식사가 한 번 더 들어온다
    const mealBefore = window.Pet ? Pet.state().meals : 0;
    HeartData.scenesOf('park').forEach(s => {
      App._openScene(s.id);
      App._put('brow', 'flat'); App._put('eyes', 'open'); App._put('mouth', 'smile');
      App._give(s.cards[0].id);
    });
    const mealAfter = window.Pet ? Pet.state().meals : 0;
    return { snackBefore, snackAfter, mealBefore, mealAfter, has: !!window.Pet };
  });
  expect(r.has, '펫이 실려 있지 않다');
  expect(r.snackAfter === r.snackBefore + 1, '펫 간식: ' + r.snackBefore + ' → ' + r.snackAfter);
  expect(r.mealAfter === r.mealBefore + 1, '묶음 완주 펫 식사: ' + r.mealBefore + ' → ' + r.mealAfter);
});

await check('콘솔 오류 0 (아이콘 404 는 예외)', async () => {
  expect(consoleErrors.length === 0, consoleErrors.join(' | '));
});

await browser.close();
console.log(`\n${failed ? '❌' : '✅'} 통과 ${passed} · 실패 ${failed}`);
process.exit(failed ? 1 : 0);
