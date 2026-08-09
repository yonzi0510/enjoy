/* 부모님 페이지 종단 검사.
 * 이 페이지는 오랫동안 검사가 하나도 없었다 — 낙서장 결로 바꾸면서 만들었다.
 * 하루 제한·사용시간 초기화·앱 노출·마이크·펫 돌보기 세기·다 낫게 하기·PIN·
 * 진행도 백업까지, 부모님이 실제로 누르는 것을 전부 눌러 본다.
 *
 * 실행: 저장소 루트에서 정적 서버(8777)를 띄운 뒤  node parent/tools/e2e.mjs
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

// 스크린샷은 임시 폴더에. 검사 자체는 화면을 재는 것이고, 그림은 눈검수용이다.
const OUT = process.env.SHOT_DIR || '/tmp/enjoy-parent-shots';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8777/parent/';
const SIZES = [
  ['pad-landscape', 1180, 820],
  ['phone-landscape', 844, 390],
  ['phone-portrait', 390, 844],
];

const errs = [];
const results = [];
function ok(name, cond, extra = '') {
  results.push([cond ? 'PASS' : 'FAIL', name, extra]);
  if (!cond) errs.push(name + ' ' + extra);
}

async function unlock(page) {
  await page.waitForSelector('#gate-pad button');
  for (const d of ['1', '2', '3', '4']) {
    await page.click(`#gate-pad button:text-is("${d}")`);
  }
  await page.waitForSelector('#main:not(.hidden)', { timeout: 3000 });
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// ── 1) 세 화면 스크린샷 + 가로 스크롤·터치 하한 검사 ──────────────
for (const [tag, w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const conerr = [];
  page.on('console', m => { if (m.type() === 'error') conerr.push(tag + ': ' + m.text()); });
  page.on('pageerror', e => conerr.push(tag + ': pageerror ' + e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/${tag}-gate.png`, fullPage: false });
  await unlock(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: true });

  const m = await page.evaluate(() => {
    const de = document.documentElement;
    const small = [];
    document.querySelectorAll('button, a, input, .switch').forEach(el => {
      if (!el.offsetParent && el.offsetWidth === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.width < 46 || r.height < 46) small.push(`${el.className || el.tagName}|${el.textContent.trim().slice(0, 10)}|${Math.round(r.width)}x${Math.round(r.height)}`);
    });
    // 겹침: 카드가 화면 밖으로 나가는지
    const over = [];
    document.querySelectorAll('.card, h1, .page .back').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > de.clientWidth + 1 || r.left < -1) over.push(el.className + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    });
    return { hScroll: de.scrollWidth - de.clientWidth, small, over, bg: getComputedStyle(document.body).backgroundImage.slice(0, 60) };
  });
  ok(`[${tag}] 가로 스크롤 0`, m.hScroll <= 0, 'scrollWidth-clientWidth=' + m.hScroll);
  ok(`[${tag}] 터치 하한 46px`, m.small.length === 0, m.small.join(' / '));
  ok(`[${tag}] 화면 밖 잘림 없음`, m.over.length === 0, m.over.join(' / '));
  ok(`[${tag}] 모눈 바탕 적용`, m.bg.includes('repeating-linear-gradient'), m.bg);
  ok(`[${tag}] 콘솔 오류 0`, conerr.length === 0, conerr.join(' | '));
  await ctx.close();
}

// ── 2) 기능 검증 (폰 세로에서) ────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const conerr = [];
  page.on('console', m => { if (m.type() === 'error') conerr.push(m.text()); });
  page.on('pageerror', e => conerr.push('pageerror ' + e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await unlock(page);

  // 하루 제한 45분 저장 → 새로고침 후 유지
  await page.click('#limit-seg button:text-is("45분")');
  let v = await page.evaluate(() => ParentSettings.get('limitMin'));
  ok('하루 제한 45분 저장', v === 45, 'limitMin=' + v);
  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  const selText = await page.textContent('#limit-seg button.sel');
  ok('새로고침 후 하루 제한 유지', selText.includes('45분'), 'sel=' + selText);
  // 눈에 띄게 칠해졌는지 (배경이 흰색이 아님)
  const selBg = await page.evaluate(() => getComputedStyle(document.querySelector('#limit-seg button.sel')).backgroundColor);
  const unselBg = await page.evaluate(() => getComputedStyle(document.querySelector('#limit-seg button:not(.sel)')).backgroundColor);
  ok('고른 것 색으로 구분', selBg !== unselBg, selBg + ' vs ' + unselBg);
  await page.click('#limit-seg button:text-is("30분")'); // 기본값 복구

  // 오늘 사용시간 초기화
  await page.evaluate(() => {
    const d = new Date(); const p = n => String(n).padStart(2, '0');
    const t = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    localStorage.setItem('enjoy-timelimit-v1', JSON.stringify({ date: t, used: 12 * 60000, extraMs: 0 }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  let used = await page.textContent('#used-min');
  ok('오늘 논 시간 표시', used === '12분', used);
  await page.click('#reset-usage');
  used = await page.textContent('#used-min');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('enjoy-timelimit-v1')).used);
  ok('사용 시간 초기화', used === '0분' && stored === 0, used + ' / stored=' + stored);

  // 앱 노출 토글 4종 + 마이크
  for (const key of ['showJapanese', 'showPractika', 'showWorksheets', 'showDictHard', 'stt']) {
    const before = await page.evaluate(k => !!ParentSettings.get(k), key);
    await page.click(`.switch[data-key="${key}"]`);
    const after = await page.evaluate(k => !!ParentSettings.get(k), key);
    const cls = await page.evaluate(k => document.querySelector(`.switch[data-key="${k}"]`).classList.contains('on'), key);
    const bg = await page.evaluate(k => getComputedStyle(document.querySelector(`.switch[data-key="${k}"]`)).backgroundColor, key);
    ok(`토글 ${key}`, after === !before && cls === after, `${before}→${after}, .on=${cls}, bg=${bg}`);
    await page.click(`.switch[data-key="${key}"]`); // 되돌리기
  }

  // 펫 돌보기 세기 3단계
  for (const [i, val] of [['soft'], ['normal'], ['tama']].entries()) {
    await page.click(`#petcare-seg button >> nth=${i}`);
    const cur = await page.evaluate(() => ParentSettings.get('petCare'));
    const selIdx = await page.evaluate(() => [...document.querySelectorAll('#petcare-seg button')].findIndex(b => b.classList.contains('sel')));
    const aria = await page.evaluate(i => document.querySelectorAll('#petcare-seg button')[i].getAttribute('aria-checked'), i);
    ok(`펫 돌보기 ${val[0]}`, cur === val[0] && selIdx === i && aria === 'true', `petCare=${cur}, sel=${selIdx}, aria=${aria}`);
  }
  await page.click('#petcare-seg button >> nth=1'); // normal 복구

  // 「다 낫게 하기」
  await page.evaluate(() => { Pet.awardMeal(1); });
  const before = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem(Profile ? Profile.key('enjoy-pet-v1') : 'enjoy-pet-v1'));
    s.poop = 4; s.sick = true; s.hunger = 0; s.mood = 0;
    localStorage.setItem(Profile.key('enjoy-pet-v1'), JSON.stringify(s));
    return s;
  });
  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  await page.click('#pet-heal');
  const after = await page.evaluate(() => Pet.state());
  ok('펫 다 낫게 하기', after.poop === 0 && !after.sick && after.hunger > 0 && after.mood > 0,
    JSON.stringify({ poop: after.poop, sick: after.sick, hunger: after.hunger, mood: after.mood }));
  const toastTxt = await page.textContent('#toast');
  ok('다 낫게 하기 안내 표시', toastTxt.includes('건강'), toastTxt);
  ok('돌보는 아이 이름 표시', (await page.textContent('#petcare-kid')).length > 0, await page.textContent('#petcare-kid'));

  // PIN 변경 → 새 번호로 다시 통과
  await page.fill('#new-pin', '4321');
  await page.click('#save-pin');
  let newPin = await page.evaluate(() => ParentSettings.get('pin'));
  ok('확인 번호 변경', newPin === '4321', 'pin=' + newPin);
  await page.reload({ waitUntil: 'networkidle' });
  for (const d of ['4', '3', '2', '1']) await page.click(`#gate-pad button:text-is("${d}")`);
  await page.waitForSelector('#main:not(.hidden)', { timeout: 3000 });
  ok('새 확인 번호로 통과', true);
  // 잘못된 번호 거부 확인
  await page.evaluate(() => { ParentSettings.set('pin', '1234'); });
  await page.reload({ waitUntil: 'networkidle' });
  for (const d of ['9', '9', '9', '9']) await page.click(`#gate-pad button:text-is("${d}")`);
  await page.waitForTimeout(300);
  ok('틀린 번호는 막힘', await page.isHidden('#main'));
  await unlock(page);

  // 진행도 백업 내려받기
  await page.evaluate(() => localStorage.setItem('hangul-playground-v1', JSON.stringify({ cards: { ㄱ: 1, ㄴ: 1 }, stars: 7 })));
  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export')]);
  const dlPath = `${OUT}/backup.json`;
  await download.saveAs(dlPath);
  const dumped = JSON.parse(fs.readFileSync(dlPath, 'utf8'));
  ok('진행도 내려받기', dumped._app === 'enjoy-backup' && dumped['hangul-playground-v1'], download.suggestedFilename());

  // 되살리기
  await page.evaluate(() => localStorage.removeItem('hangul-playground-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await unlock(page);
  await page.setInputFiles('#import-file', dlPath);
  await page.waitForTimeout(400);
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('hangul-playground-v1')));
  ok('진행도 되살리기', restored && restored.stars === 7, JSON.stringify(restored));
  ok('진행도 표 갱신', (await page.textContent('#sum-table')).includes('낱말 카드 2장'));
  ok('일본어 카드 수 표시', (await page.textContent('#hangul-cards-1')) === '2');

  // 떠 있는 펫 단추는 숨겨져 있어야 한다
  const petBtn = await page.evaluate(() => {
    const b = document.querySelector('.pet-btn');
    return b ? getComputedStyle(b).display : 'none(element absent)';
  });
  ok('떠 있는 펫 단추 숨김', petBtn.startsWith('none'), petBtn);

  ok('기능 검증 중 콘솔 오류 0', conerr.length === 0, conerr.join(' | '));
  await ctx.close();
}

await browser.close();

console.log('\n=== 결과 ===');
for (const [st, name, extra] of results) console.log(`${st}  ${name}${extra ? '   — ' + extra : ''}`);
console.log(`\n${results.filter(r => r[0] === 'PASS').length}/${results.length} 통과`);
if (errs.length) { console.log('\n실패:'); errs.forEach(e => console.log(' - ' + e)); process.exit(1); }
