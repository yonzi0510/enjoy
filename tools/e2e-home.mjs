#!/usr/bin/env node
/* 홈 화면 e2e — 저장소 루트에서 정적 서버를 띄운 뒤 실행한다.
 *
 *   python3 -m http.server 8777 &
 *   node tools/e2e-home.mjs
 *
 * 홈은 그림 한 장이 아니라 코드로 짜여 있어서, 화면 크기마다 다시 배치된다.
 * 그래서 폰·패드 × 가로·세로 네 경우를 모두 재서
 *   · 콘솔 오류 0
 *   · 놀이 링크가 실제로 있는 폴더를 가리키는지
 *   · 5세 손가락 하한 44px 을 지키는지
 *   · 가로로 넘쳐 스크롤이 생기지 않는지
 * 를 확인한다.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PW = process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright';
const { chromium } = await import(PW + '/index.mjs');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8777/';
const TOUCH_MIN = 44;   // 5세 손가락 하한

const CASES = [
  ['폰 세로', 390, 844],
  ['폰 가로', 844, 390],
  ['패드 세로', 820, 1180],
  ['패드 가로', 1180, 820],
];

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
};

const browser = await chromium.launch();

for (const [label, width, height] of CASES) {
  console.log(`\n[${label} ${width}×${height}]`);
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  ok('콘솔 오류 0', errors.length === 0, errors[0]);

  const info = await page.evaluate(() => {
    const vis = el => el.offsetParent !== null || el === document.body;
    const touch = [...document.querySelectorAll('.bar, .who button, .game')]
      .filter(vis)
      .map(el => ({ name: el.getAttribute('aria-label') || el.textContent.trim(),
                    h: Math.round(el.getBoundingClientRect().height) }));
    return {
      groups: document.querySelectorAll('.group').length,
      openCount: document.querySelectorAll('.group[aria-expanded="true"]').length,
      games: [...document.querySelectorAll('.game')].map(a => a.dataset.id),
      titleShown: !!document.querySelector('.title')?.clientWidth,
      touch,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      screens: +(document.documentElement.scrollHeight / window.innerHeight).toFixed(2),
    };
  });

  ok('묶음 6개', info.groups === 6, `${info.groups}개`);
  ok('처음에는 모두 접혀 있음', info.openCount === 0, `${info.openCount}개 펼침`);
  ok('제목 글씨 보임', info.titleShown);

  const smallTop = info.touch.filter(t => t.h < TOUCH_MIN);
  ok(`첫 화면 단추가 모두 ${TOUCH_MIN}px 이상`, smallTop.length === 0,
     smallTop.map(t => `${t.name} ${t.h}px`).join(', '));

  ok('가로 스크롤 없음', !info.overflowX);
  ok('한 화면에 대체로 들어옴 (1.3쪽 이하)', info.screens <= 1.3, `${info.screens}쪽`);

  /* 언어 토끼 — 홈에 늘 앉아 있고, 아무것도 가리지 않아야 한다.
     떠 있는 단추가 아니라 **글 흐름 안**(누가 노나 줄과 놀이 묶음 사이)에 두었기 때문에
     여기서 겹침 0 이 나온다. 누군가 fixed 로 바꾸면 이 검사가 걸린다. */
  const bunny = await page.evaluate(() => {
    const btn = document.getElementById('lb-btn');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const hit = [...document.querySelectorAll('.bar, .game, .who button, .parent-link, .pet-btn')]
      .filter(el => el.offsetParent !== null)
      .filter(el => {
        const o = el.getBoundingClientRect();
        return !(o.right <= r.left + 1 || o.left >= r.right - 1 ||
                 o.bottom <= r.top + 1 || o.top >= r.bottom - 1);
      })
      .map(el => el.getAttribute('aria-label') || el.textContent.trim().slice(0, 12));
    return { h: Math.round(r.height), w: Math.round(r.width), shown: r.width > 0 && r.height > 0, hit };
  });
  ok('언어 토끼가 홈에 보임', !!bunny && bunny.shown);
  ok('언어 토끼 터치 46px 이상', !!bunny && bunny.h >= 46, bunny ? bunny.h + 'px' : '없음');
  ok('언어 토끼가 아무것도 안 가림 (겹침 0)', !!bunny && bunny.hit.length === 0,
     bunny ? bunny.hit.join(', ') : '');

  /* 한 번에 한 묶음만 열리므로(아코디언) 하나씩 열어 가며 잰다 */
  const keys = await page.$$eval('.group', gs => gs.map(g => g.dataset.key));
  const small = [], wrapped = [], noIcon = [], bunnyHit = [];
  let shownTotal = 0;
  for (const k of keys) {
    await page.click(`.group[data-key="${k}"] .bar`);
    await page.waitForTimeout(120);
    const r = await page.evaluate(() => {
      const games = [...document.querySelectorAll('.group[aria-expanded="true"] .game:not([hidden])')];
      const lineOver = el => {
        const st = getComputedStyle(el);
        const lh = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.4;
        return el.getBoundingClientRect().height / lh > 1.5;
      };
      return {
        shown: games.length,
        small: games.filter(a => a.getBoundingClientRect().height < 44).map(a => a.dataset.id),
        wrapped: games.map(a => a.querySelector('span:not(.lock)'))
                      .filter(el => el && lineOver(el)).map(el => el.textContent.trim()),
        noIcon: games.filter(a => {
          const u = a.querySelector('.gi use');
          const id = u && u.getAttribute('href').slice(1);
          return !id || !document.getElementById(id);
        }).map(a => a.dataset.id),
        // 묶음을 펼친 뒤에도 언어 토끼가 놀이를 덮지 않는지
        bunnyHit: (() => {
          const btn = document.getElementById('lb-btn');
          if (!btn) return ['토끼 없음'];
          const r = btn.getBoundingClientRect();
          return games.filter(el => {
            const o = el.getBoundingClientRect();
            return !(o.right <= r.left + 1 || o.left >= r.right - 1 ||
                     o.bottom <= r.top + 1 || o.top >= r.bottom - 1);
          }).map(el => el.dataset.id);
        })(),
      };
    });
    shownTotal += r.shown;
    small.push(...r.small); wrapped.push(...r.wrapped); noIcon.push(...r.noIcon);
    bunnyHit.push(...r.bunnyHit);
  }
  /* 마지막으로 연 묶음은 닫아 둔다 */
  await page.click(`.group[data-key="${keys[keys.length - 1]}"] .bar`);
  await page.waitForTimeout(100);

  const opened = await page.evaluate(() => {
    const games = [...document.querySelectorAll('.game')];
    /* 묶음 이름이 두 줄로 넘어가면 안 된다 — 5세는 한 줄로 읽는다 */
    const barWrapped = [...document.querySelectorAll('.bar .name')].filter(el => {
      const st = getComputedStyle(el);
      const lh = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.4;
      return el.getBoundingClientRect().height / lh > 1.5;
    }).map(el => el.textContent.trim());
    return { count: games.length, barWrapped,
             practikaHidden: !!document.querySelector('.game[data-id="practika"]')?.hidden };
  });

  ok('놀이 32개', opened.count === 32, `${opened.count}개`);   // 신작 셋(발굴·로봇·마음) 추가
  ok('모든 놀이에 아이콘이 있음', noIcon.length === 0, noIcon.join(', '));
  ok(`펼친 뒤에도 ${TOUCH_MIN}px 이상`, small.length === 0, small.join(', '));
  ok('프랙티카는 부모님이 켜야 보임 (기본 숨김)', opened.practikaHidden);
  ok('이름이 두 줄로 안 넘어감',
     wrapped.length === 0 && opened.barWrapped.length === 0,
     [...wrapped, ...opened.barWrapped].join(', '));
  ok('묶음을 펼쳐도 언어 토끼가 놀이를 안 가림', bunnyHit.length === 0, bunnyHit.join(', '));

  await page.close();
}

/* 아코디언 — 한 번에 한 묶음만 펼쳐진다 */
console.log('\n[아코디언]');
{
  const pg = await browser.newPage({ viewport: { width: 820, height: 1180 } });
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  const openCount = () => pg.$$eval('.group[aria-expanded="true"]', e => e.length);

  ok('처음엔 하나도 안 펼쳐짐', (await openCount()) === 0);

  await pg.click('.group[data-key="learn"] .bar');
  await pg.waitForTimeout(120);
  ok('배우기를 누르면 그것만 펼쳐짐', (await openCount()) === 1);

  await pg.click('.group[data-key="find"] .bar');
  await pg.waitForTimeout(120);
  const only = await pg.$$eval('.group[aria-expanded="true"]', e => e.map(x => x.dataset.key));
  ok('다른 것을 열면 앞의 것은 저절로 접힘', only.length === 1 && only[0] === 'find', only.join(','));

  await pg.click('.group[data-key="find"] .bar');
  await pg.waitForTimeout(120);
  ok('같은 것을 다시 누르면 접힘', (await openCount()) === 0);
  await pg.close();
}

/* ── 언어 토끼 ────────────────────────────────────────────────
 * 아이가 홈에서 아무 때나 묻는다 — 한글도 영어도 일본어도.
 * 여기서 재는 것은 ① 사전을 첫 화면에 얹지 않는가 ② 세 갈래를 제대로 가르는가
 * ③ **발화 언어가 새지 않는가**(영어가 한국어 목소리로 나오면 발음이 망가진다)
 * ④ 못 알아들어도 혼내지 않는가 ⑤ 마이크를 껐을 때 다른 길이 있는가.
 */
console.log('\n[언어 토끼]');
{
  const pg = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('pageerror', e => errs.push(String(e)));
  const reqs = [];
  pg.on('request', r => reqs.push(r.url()));
  // 음성 엔진이 없는 환경이라 발화가 끝났다고 알려 준다 (없으면 워치독으로 1.2초씩 기다린다)
  await pg.addInitScript(() => {
    const orig = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = u => { setTimeout(() => { if (u.onend) u.onend(); }, 5); };
    void orig;
  });
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(300);

  ok('낱말 사전은 첫 화면에서 안 받는다 (토끼를 눌러야 온다)',
     !reqs.some(u => /dict\/|dict-ja\//.test(u)),
     reqs.filter(u => /dict/.test(u))[0] || '');

  const say = async (text, wait = 1500) => {
    await pg.evaluate(() => LanguageBunny._clearSpoken());
    const r = await pg.evaluate(t => LanguageBunny.ask(t), text);
    await pg.waitForTimeout(wait);
    const spoken = await pg.evaluate(() => LanguageBunny._spoken());
    const stage = await pg.$eval('#lb-stage', e => e.textContent);
    return { r, spoken, stage };
  };

  /* ① "코끼리가 영어로 뭐야" → elephant, 영어 목소리로 */
  {
    const { r, spoken, stage } = await say('코끼리가 영어로 뭐야');
    ok('「코끼리가 영어로 뭐야」 → elephant',
       r.intent === 'en' && r.word && r.word.en && r.word.en.en === 'elephant',
       JSON.stringify(r.word && r.word.en));
    ok('영어 낱말은 en-US 로 읽는다',
       spoken.some(s => s.lang === 'en-US' && s.text === 'elephant'), JSON.stringify(spoken));
    ok('영어 낱말이 한국어 목소리로 새지 않는다',
       !spoken.some(s => s.lang !== 'en-US' && /elephant/i.test(s.text)), JSON.stringify(spoken));
    ok('영어 답 카드에 한글 발음이 보인다', stage.includes('엘리펀트'), stage.slice(0, 60));
  }

  /* ② "코끼리가 일본어로 뭐야" → ぞう, 일본어 목소리로 */
  {
    const { r, spoken, stage } = await say('코끼리가 일본어로 뭐야');
    ok('「코끼리가 일본어로 뭐야」 → ぞう',
       r.intent === 'ja' && r.word && r.word.ja && r.word.ja.ja === 'ぞう',
       JSON.stringify(r.word && r.word.ja));
    ok('일본어 낱말은 ja-JP 로 읽는다',
       spoken.some(s => s.lang === 'ja-JP' && s.text === 'ぞう'), JSON.stringify(spoken));
    ok('일본어 낱말이 한국어 목소리로 새지 않는다',
       !spoken.some(s => s.lang !== 'ja-JP' && /ぞう/.test(s.text)), JSON.stringify(spoken));
    ok('일본어 답 카드에 한글 발음이 보인다', stage.includes('조우'), stage.slice(0, 60));
  }

  /* ③ "토끼는 어떻게 써" → 낱말 카드 (한글 낱글자 + 영어·일본어 함께) */
  {
    const { r, stage, spoken } = await say('토끼는 어떻게 써', 2500);
    ok('「토끼는 어떻게 써」 → 낱말 카드', r.intent === 'word' && r.word && r.word.ko === '토끼',
       JSON.stringify(r.word && r.word.ko));
    const chips = await pg.$$eval('.lb-chips span', els => els.map(e => e.textContent).join(''));
    ok('낱말 카드에 한글 낱글자가 보인다', chips === '토끼', chips);
    ok('낱말 카드에 영어·일본어가 함께 나온다',
       /RABBIT/.test(stage) && /うさぎ/.test(stage), stage.slice(0, 80));
    ok('낱말 카드도 언어를 가려 읽는다',
       spoken.some(s => s.lang === 'ko-KR' && s.text.includes('토끼')) &&
       spoken.some(s => s.lang === 'en-US' && s.text === 'rabbit'), JSON.stringify(spoken));

    /* 「글씨 놀이터에서 써 보기」는 **물어본 낱말을 실어 보내야** 한다.
     * 그냥 write/ 로 보내면 아이가 첫 화면 메뉴를 만나고, 거기서 🎤 물어보고 쓰기를
     * 다시 찾아 낱말을 또 말해야 한다 — 부모님이 "게임화면이 나와" 라고 짚으신 자리다.
     * 받는 쪽은 write/js/app.js 의 openFromUrl (write e2e 가 그쪽을 잰다). */
    const href = await pg.$eval('.lb-act.plain[href*="write/"]', a => a.getAttribute('href'))
      .catch(() => null);
    ok('낱말 카드에 「글씨 놀이터에서 써 보기」가 있다', !!href, String(href));
    ok('그 링크가 물어본 낱말을 실어 보낸다',
       !!href && href.includes('write/?word=' + encodeURIComponent('토끼')), String(href));
  }

  /* 갈래를 가르는 말이 낱말을 잘라먹지 않는지 — '일어나기' 가 '일어'(로) 에 잘렸던 자리 */
  {
    const got = await pg.evaluate(() => [
      ['일어나기 영어로 뭐야', 'en', '일어나기'],
      ['일본이 일본어로 뭐야', 'ja', '일본'],
      ['고양이가 영어로 뭐라고 해요', 'en', '고양이'],
      ['별 어떻게 써', 'word', '별']
    ].map(([t, i, k]) => {
      const w = LanguageBunny.findWord(t);
      return LanguageBunny.intentOf(t) === i && w && w.ko === k ? null : t;
    }).filter(Boolean));
    ok('갈래를 가르는 말이 낱말을 잘라먹지 않는다', got.length === 0, got.join(', '));
  }

  /* ④ 모르는 말 — 혼내지 않는다 */
  {
    const { r, stage } = await say('삐뽀삐뽀 랄랄라 뭐야');
    ok('모르는 말은 낱말 없음으로 처리', !r.word, JSON.stringify(r.word && r.word.ko));
    ok('모르는 말에 혼내는 문구가 없다',
       !/틀렸|안 돼|안돼|아니야|잘못|왜 그래|다시 해/.test(stage), stage.slice(0, 60));
    ok('모르는 말에 부드럽게 다시 권한다', /다시 한번 말해 줄래/.test(stage), stage.slice(0, 60));
    const misses = await pg.evaluate(() => LanguageBunny.misses().length);
    ok('못 알아들은 말은 부모 확인용으로 남는다 (새 저장 키 없이)', misses >= 1, String(misses));
  }

  ok('언어 토끼에서 콘솔 오류 0', errs.length === 0, errs[0]);
  await pg.close();
}

/* 마이크를 부모님이 꺼 두었을 때 — 글자·그림으로 고르는 길이 있어야 한다 */
{
  const pg = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pg.addInitScript(() => {
    localStorage.setItem('enjoy-parent-v1', JSON.stringify({ stt: false }));
    speechSynthesis.speak = u => { setTimeout(() => { if (u.onend) u.onend(); }, 5); };
  });
  await pg.goto(BASE, { waitUntil: 'networkidle' });
  await pg.click('#lb-btn');
  await pg.waitForTimeout(1200);
  const picks = await pg.$$eval('.lb-pick', els => els.length);
  ok('마이크가 꺼져 있으면 골라서 물어보는 길이 나온다', picks > 0, `${picks}개`);
  const tall = await pg.$$eval('.lb-pick', els =>
    els.filter(e => e.getBoundingClientRect().height < 46).length);
  ok('고르는 칸도 46px 이상', tall === 0, `${tall}개 작음`);
  await pg.click('.lb-pick');
  await pg.waitForTimeout(200);
  await pg.click('.lb-pick');
  await pg.waitForTimeout(400);
  const stage = await pg.$eval('#lb-stage', e => e.textContent);
  ok('그림을 고르면 낱말 카드가 나온다', /🔊/.test(stage), stage.slice(0, 60));
  await pg.close();
}

/* 링크가 실제 폴더를 가리키는지 (화면 크기와 무관하므로 한 번만) */
console.log('\n[링크]');
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
const ids = await page.evaluate(() =>
  [...document.querySelectorAll('.game')].map(a => a.dataset.id));
const missing = ids.filter(id => !existsSync(join(ROOT, id, 'index.html')));
ok('모든 놀이 폴더가 있음', missing.length === 0, missing.join(', '));
ok('중복 없음', new Set(ids).size === ids.length);
await page.close();

/* ── 서비스 워커 정책 (소스 검사) ────────────────────────────────
 * 아래 동작 검사는 브라우저 타이밍을 타서 전체 e2e 안에서는 가끔 헐거웠다.
 * 정책 자체는 소스에서 확실히 못 박는다 — 이게 다시 캐시 우선으로 돌아가면 여기서 걸린다. */
{
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const fetchBody = sw.slice(sw.indexOf("addEventListener('fetch'"));
  const iFetch = fetchBody.indexOf('await fetch(');
  const iMatch = fetchBody.indexOf('cache.match(');
  ok('sw.js 가 네트워크 우선이다 (fetch 를 cache.match 보다 먼저 한다)',
    iFetch > -1 && iMatch > -1 && iFetch < iMatch,
    `fetch@${iFetch} vs cache.match@${iMatch}`);
  ok('sw.js 에 오프라인 대비 캐시 폴백이 있다', /catch[\s\S]{0,200}cache\.match\(/.test(fetchBody));
  ok('캐시 이름이 고정 v1 이 아니다 (배포 때 옛 캐시가 청소되게)',
    !/enjoy-cache-v1['"]/.test(sw), sw.match(/const CACHE = [^;]+/)?.[0] || '');
}

/* ── 서비스 워커: 배포한 새 파일이 아이 기기에 실제로 닿는가 ──────────────
 * 예전 sw.js 는 캐시를 먼저 주고 새 파일은 뒤에서 받았다(stale-while-revalidate).
 * 그래서 배포해도 아이 화면은 늘 한 발 늦었고, 자주 안 여는 놀이는 몇 달 전 모습이
 * 그대로 남았다(햄버거 가게가 낙서장 개편 이전으로 보여서 발견했다).
 * 캐시에 일부러 옛 파일을 심고, 그래도 서버의 새것이 오는지 잰다. */
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + 'burger/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 워커가 **페이지를 장악할 때까지** 기다린다. 이걸 안 기다리면 첫 방문은
  // 워커를 거치지 않고 그냥 서버에서 받아 와, 아래 검사가 옛 워커에서도 통과해 버린다.
  const swOn = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return true;
    return await new Promise(res => {
      const t = setTimeout(() => res(!!navigator.serviceWorker.controller), 5000);
      navigator.serviceWorker.addEventListener('controllerchange',
        () => { clearTimeout(t); res(true); }, { once: true });
    });
  });
  ok('서비스 워커가 페이지를 장악함', swOn);

  // 캐시에 '옛 파일'을 심는다 — 첫 칸을 엉뚱한 색으로 칠하는 가짜 CSS
  await page.evaluate(async () => {
    const ks = await caches.keys();
    const c = await caches.open(ks[0]);
    await c.put(new Request(location.origin + '/shared/screen.css'),
      new Response('.menu > .menu-card { background: rgb(1,2,3) !important }',
        { status: 200, headers: { 'Content-Type': 'text/css' } }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const bg = await page.evaluate(() => {
    const c = document.querySelector('.menu > .menu-card');
    return c ? getComputedStyle(c).backgroundColor : '';
  });
  ok('옛 캐시를 제치고 서버의 새 파일을 받는다', bg !== 'rgb(1, 2, 3)', '받은 색: ' + bg);

  // 비행기 모드에서도 이미 가 본 놀이터는 열려야 한다
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(1000);
  const offlineOk = await page.evaluate(() => !!document.querySelector('.menu'));
  ok('비행기 모드에서도 놀이터가 열림', offlineOk);
  await ctx.close();
}

await browser.close();
console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
