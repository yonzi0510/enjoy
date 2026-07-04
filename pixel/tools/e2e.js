/* E2E 자동 플레이 검증 — 사용법:
 *   PW_MODULE=<playwright-core 경로> node pixel/tools/e2e.js
 * Chromium이 실제 클릭·드래그로 도안을 처음부터 끝까지 칠한다.
 * 검사: 갤러리·필터 / 오답 washed·고치기 / 전체 플레이스루→완성 / 드래그 채색 /
 *       폭탄·마법봉 부스터 / 새로고침 이어하기(칸·부스터) / 줌 후 좌표 정확도 /
 *       완성작 감상·다시 색칠 / 콘솔 오류 0
 */
const path = require('path');
const http = require('http');
const fs = require('fs');
const pw = require(process.env.PW_MODULE || 'playwright-core');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.md': 'text/markdown' };

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra != null ? ' — ' + extra : '')); }
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end('nf'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await pw.chromium.launch({
    executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

  const shot = async name => {
    const dir = process.env.SHOT_DIR;
    if (dir) await page.screenshot({ path: path.join(dir, name + '.png') });
  };
  const px = () => page.evaluate(() => ({
    correct: window.__pixel.correct(), total: window.__pixel.total(),
    mistakes: window.__pixel.mistakes(), boosters: window.__pixel.boosters(),
    sel: window.__pixel.sel(), playing: window.__pixel.playing()
  }));

  await page.goto(url);
  await page.waitForSelector('#pic-grid .pic-card');

  console.log('■ 홈 갤러리');
  const picIds = await page.evaluate(() => window.__pixel.pics());
  check('도안 카드 수 = 도안 수 (' + picIds.length + ')', await page.locator('#pic-grid .pic-card').count() === picIds.length);
  await page.locator('.cat-chip', { hasText: '동물' }).click();
  check('카테고리 필터(동물)', await page.locator('#pic-grid .pic-card').count() === 2);
  await page.locator('.cat-chip', { hasText: '전체' }).click();
  check('카테고리 필터(전체 복귀)', await page.locator('#pic-grid .pic-card').count() === picIds.length);
  await shot('01-home');

  console.log('■ 오답은 washed로 표시되고 고칠 수 있다');
  await page.evaluate(() => window.__pixel.open('heart'));
  const wrongCell = await page.evaluate(() => {
    const { W, H } = window.__pixel.size();
    const sel = window.__pixel.sel();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (window.__pixel.target(x, y) !== sel) return { x, y, t: window.__pixel.target(x, y) };
    return null;
  });
  let pt = await page.evaluate(c => window.__pixel.cellToClient(c.x, c.y), wrongCell);
  await page.mouse.click(pt.x, pt.y);
  let s = await px();
  check('오답 1개 기록·정답 아님', s.mistakes === 1 && s.correct === 0);
  await page.locator('.pal-btn[data-c="' + wrongCell.t + '"]').click();
  pt = await page.evaluate(c => window.__pixel.cellToClient(c.x, c.y), wrongCell);
  await page.mouse.click(pt.x, pt.y);
  s = await px();
  check('올바른 색으로 고치기', s.mistakes === 0 && s.correct === 1);

  console.log('■ 전체 플레이스루: heart (12×12)');
  const palLen = await page.evaluate(() => window.PIXELS.find(p => p.id === 'heart').palette.length);
  for (let c = 0; c < palLen; c++) {
    await page.locator('.pal-btn[data-c="' + c + '"]').click();
    const targets = await page.evaluate(c => {
      const { W, H } = window.__pixel.size();
      const out = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        if (window.__pixel.target(x, y) === c && window.__pixel.painted(x, y) !== c)
          out.push(window.__pixel.cellToClient(x, y));
      return out;
    }, c);
    for (const t of targets) await page.mouse.click(t.x, t.y);
    const remain = await page.evaluate(c => {
      const { W, H } = window.__pixel.size();
      let n = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        if (window.__pixel.target(x, y) === c && window.__pixel.painted(x, y) !== c) n++;
      return n;
    }, c);
    check('색 ' + (c + 1) + ' 완료 (' + targets.length + '칸)', remain === 0, '남은 칸 ' + remain);
  }
  await page.waitForSelector('#complete-overlay:not(.hidden)', { timeout: 6000 });
  s = await px();
  check('완성 오버레이 + 전 칸 정답', s.correct === s.total);
  await shot('02-complete');
  await page.locator('#complete-home').click();
  check('완성 뱃지 표시', await page.locator('#pic-grid .done-badge').count() === 1);
  await page.locator('#btn-works').click();
  check('내 작품에 1개 등록', await page.locator('#works-grid .pic-card').count() === 1);
  await page.locator('#works-back').click();

  console.log('■ 드래그 채색: star');
  await page.evaluate(() => window.__pixel.open('star'));
  // 5행의 노란(1) 가로 줄을 드래그로 칠한다
  await page.locator('.pal-btn[data-c="1"]').click();
  const run = await page.evaluate(() => {
    const a = window.__pixel.cellToClient(2, 5);
    const b = window.__pixel.cellToClient(9, 5);
    return { a, b };
  });
  await page.mouse.move(run.a.x, run.a.y);
  await page.mouse.down();
  await page.mouse.move(run.b.x, run.b.y, { steps: 12 });
  await page.mouse.up();
  const dragPainted = await page.evaluate(() => {
    let n = 0;
    for (let x = 2; x <= 9; x++) if (window.__pixel.painted(x, 5) === 1) n++;
    return n;
  });
  check('드래그로 여러 칸 채색 (' + dragPainted + '/8)', dragPainted >= 6, dragPainted);

  console.log('■ 부스터');
  await page.locator('#btn-bomb').click();
  check('폭탄 조준 안내 표시', await page.locator('#bomb-hint:not(.hidden)').count() === 1);
  pt = await page.evaluate(() => window.__pixel.cellToClient(7, 7));
  await page.mouse.click(pt.x, pt.y);
  const afterBomb = await page.evaluate(() => {
    let ok = true;
    for (let y = 5; y <= 9; y++) for (let x = 5; x <= 9; x++)
      if (window.__pixel.painted(x, y) !== window.__pixel.target(x, y)) ok = false;
    return { ok, boosters: window.__pixel.boosters() };
  });
  check('폭탄: 5×5 자동 채색 · 잔량 2', afterBomb.ok && afterBomb.boosters.bomb === 2, JSON.stringify(afterBomb.boosters));

  await page.locator('.pal-btn[data-c="0"]').click();
  await page.locator('#btn-wand').click();
  const afterWand = await page.evaluate(() => {
    const { W, H } = window.__pixel.size();
    let remain = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (window.__pixel.target(x, y) === 0 && window.__pixel.painted(x, y) !== 0) remain++;
    return { remain, boosters: window.__pixel.boosters() };
  });
  check('마법봉: 선택 색 전부 채색 · 잔량 0', afterWand.remain === 0 && afterWand.boosters.wand === 0);

  console.log('■ 이어하기(자동 저장 복원)');
  const before = await px();
  await page.reload();
  await page.waitForSelector('#pic-grid .pic-card');
  const badge = await page.locator('#pic-grid .pic-card .pic-card-badge:not(.done-badge)').first().textContent();
  check('새로고침 후 진행률 뱃지(' + badge.trim() + ')', /%$/.test(badge.trim()));
  await page.evaluate(() => window.__pixel.open('star'));
  const after = await px();
  check('칸 상태 복원 (' + after.correct + '/' + after.total + ')', after.correct === before.correct);
  check('부스터 잔량 복원', after.boosters.bomb === 2 && after.boosters.wand === 0, JSON.stringify(after.boosters));

  console.log('■ 줌 후 좌표 정확도');
  const cell = await page.evaluate(() => {
    const { W, H } = window.__pixel.size();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = window.__pixel.target(x, y);
      if (window.__pixel.painted(x, y) !== t) return { x, y, t };
    }
    return null;
  });
  await page.locator('.pal-btn[data-c="' + cell.t + '"]').click();
  const v0 = await page.evaluate(() => window.__pixel.view());
  pt = await page.evaluate(c => window.__pixel.cellToClient(c.x, c.y), cell);
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.wheel(0, -240);
  await page.mouse.wheel(0, -240);
  const v1 = await page.evaluate(() => window.__pixel.view());
  check('휠 줌인 (칸 ' + v0.s.toFixed(0) + '→' + v1.s.toFixed(0) + 'px)', v1.s > v0.s * 1.2);
  const prevCorrect = (await px()).correct;
  pt = await page.evaluate(c => window.__pixel.cellToClient(c.x, c.y), cell);
  await page.mouse.click(pt.x, pt.y);
  check('줌 상태에서 탭 채색 정확', (await px()).correct === prevCorrect + 1);
  await shot('03-paint');

  console.log('■ 완성작 감상·다시 색칠');
  await page.locator('#paint-back').click();
  await page.evaluate(() => window.__pixel.open('heart'));
  s = await px();
  check('완성작은 감상 모드', !s.playing);
  check('다시 색칠 버튼 표시', await page.locator('#viewer-bar:not(.hidden)').count() === 1);
  await page.locator('#btn-repaint').click();
  await page.locator('#confirm-ok').click();
  s = await px();
  check('다시 색칠: 초기화·부스터 리필·플레이 재개',
    s.correct === 0 && s.playing && s.boosters.bomb === 3 && s.boosters.wand === 1);

  console.log('■ 페이지 오류');
  check('콘솔/페이지 오류 0건', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  await browser.close();
  server.close();
  console.log('\n' + (fail ? '❌ 실패 ' + fail + ' · 통과 ' + pass : '✅ 전체 통과 (' + pass + ')'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌ E2E 실행 오류:', e); process.exit(1); });
