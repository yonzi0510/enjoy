/* E2E 자동 플레이 검증 — 사용법:
 *   PW_MODULE=<playwright-core 경로> node color/tools/e2e.js
 * 내장 정적 서버로 color/를 띄우고 Chromium이 실제 클릭으로 도안 하나를 처음부터 끝까지 색칠한다.
 * 검사: 갤러리·카테고리 필터 / 전 도안 번호 배치(도달 불가 영역 없음) / 오답 무시 /
 *       전체 플레이스루→완성 오버레이 / 새로고침 이어하기 / 줌·팬 후 탭 정확도 / 다시 색칠 / 페이지 오류 0
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

  await page.goto(url);
  await page.waitForSelector('#pic-grid .pic-card');

  console.log('■ 홈 갤러리');
  const picIds = await page.evaluate(() => window.__color.pics());
  check('도안 카드 수 = 도안 수 (' + picIds.length + ')', await page.locator('#pic-grid .pic-card').count() === picIds.length);
  await page.locator('.cat-chip', { hasText: '동물' }).click();
  check('카테고리 필터(동물)', await page.locator('#pic-grid .pic-card').count() === 3);
  await page.locator('.cat-chip', { hasText: '전체' }).click();
  check('카테고리 필터(전체 복귀)', await page.locator('#pic-grid .pic-card').count() === picIds.length);
  await shot('01-home');

  console.log('■ 전 도안: 번호 배치·팔레트');
  for (const id of picIds) {
    const r = await page.evaluate(id => {
      window.__color.open(id);
      const pic = window.PICTURES.find(p => p.id === id);
      return {
        unreachable: window.__color.unreachable(),
        labels: document.querySelectorAll('#canvas-wrap text').length,
        regions: pic.regions.length,
        palBtns: document.querySelectorAll('.pal-btn').length,
        palette: pic.palette.length
      };
    }, id);
    check(id + ': 도달 불가 영역 0 · 번호 ' + r.labels + '/' + r.regions,
      r.unreachable.length === 0 && r.labels === r.regions && r.palBtns === r.palette,
      'unreachable=' + JSON.stringify(r.unreachable) + ' pal=' + r.palBtns + '/' + r.palette);
  }

  console.log('■ 오답 탭은 채색되지 않음');
  const first = picIds[0];
  await page.evaluate(id => window.__color.open(id), first);
  const wrong = await page.evaluate(() => {
    const sel = window.__color.sel();
    const r = window.__color.regions().find(x => !x.filled && x.c !== sel);
    return { pt: window.__color.toClient(r.lx, r.ly), i: r.i };
  });
  await page.mouse.click(wrong.pt.x, wrong.pt.y);
  check('오답 탭 후 채색 수 0', await page.evaluate(() => window.__color.filledCount()) === 0);

  console.log('■ 전체 플레이스루: ' + first);
  const palLen = await page.evaluate(() => window.PICTURES[0].palette.length);
  for (let c = 0; c < palLen; c++) {
    await page.locator('.pal-btn[data-c="' + c + '"]').click();
    // 한 색을 칠하는 동안 강조(HIGHLIGHT)가 그 색에만 적용됐는지도 훑기
    const targets = await page.evaluate(c =>
      window.__color.regions().filter(r => !r.filled && r.c === c)
        .map(r => ({ i: r.i, pt: window.__color.toClient(r.lx, r.ly) })), c);
    for (const t of targets) await page.mouse.click(t.pt.x, t.pt.y);
    const remain = await page.evaluate(c =>
      window.__color.regions().filter(r => !r.filled && r.c === c).length, c);
    check('색 ' + (c + 1) + ' 완료 (' + targets.length + '칸)', remain === 0, '남은 칸 ' + remain);
  }
  await page.waitForSelector('#complete-overlay:not(.hidden)', { timeout: 6000 });
  check('완성 오버레이 표시', true);
  check('전 영역 채색 완료', await page.evaluate(() => window.__color.filledCount()) ===
    await page.evaluate(() => window.PICTURES[0].regions.length));
  await shot('02-complete');
  await page.locator('#complete-home').click();
  check('완성 뱃지 표시', await page.locator('#pic-grid .done-badge').count() === 1);

  console.log('■ 내 작품');
  await page.locator('#btn-works').click();
  check('내 작품에 1개 등록', await page.locator('#works-grid .pic-card').count() === 1);
  await page.locator('#works-back').click();

  console.log('■ 이어하기(자동 저장 복원)');
  const second = picIds[1];
  await page.evaluate(id => window.__color.open(id), second);
  const three = await page.evaluate(() =>
    window.__color.regions().filter(r => !r.filled).slice(0, 3)
      .map(r => ({ c: r.c, lx: r.lx, ly: r.ly })));
  for (const t of three) {
    await page.locator('.pal-btn[data-c="' + t.c + '"]').click();
    const pt = await page.evaluate(t => window.__color.toClient(t.lx, t.ly), t);
    await page.mouse.click(pt.x, pt.y);
  }
  check('3칸 채색', await page.evaluate(() => window.__color.filledCount()) === 3);
  await page.reload();
  await page.waitForSelector('#pic-grid .pic-card');
  const badge = await page.locator('#pic-grid .pic-card .pic-card-badge:not(.done-badge)').first().textContent();
  check('새로고침 후 진행률 뱃지(' + badge.trim() + ')', /%$/.test(badge.trim()));
  await page.evaluate(id => window.__color.open(id), second);
  check('새로고침 후 채색 3칸 복원', await page.evaluate(() => window.__color.filledCount()) === 3);

  console.log('■ 줌/팬 후 탭 정확도');
  const before = await page.evaluate(() => window.__color.view());
  const wrapBox = await page.locator('#canvas-wrap').boundingBox();
  const cx = wrapBox.x + wrapBox.width / 2, cy = wrapBox.y + wrapBox.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -240); await page.mouse.wheel(0, -240);
  const afterZoom = await page.evaluate(() => window.__color.view());
  check('휠 줌인 (w ' + Math.round(before.w) + '→' + Math.round(afterZoom.w) + ')', afterZoom.w < before.w * 0.8);
  await page.mouse.move(cx, cy); await page.mouse.down();
  await page.mouse.move(cx + 120, cy + 80, { steps: 8 }); await page.mouse.up();
  const afterPan = await page.evaluate(() => window.__color.view());
  check('드래그 팬 (x 이동)', Math.abs(afterPan.x - afterZoom.x) > 1);
  // 전체 보기로 리셋 후, 선택 색의 남은 칸 하나를 탭 (좌표 변환이 뷰 상태를 따라가는지)
  const prevCount = await page.evaluate(() => window.__color.filledCount());
  await page.locator('#paint-fit').click();
  await page.waitForTimeout(500);
  const one = await page.evaluate(() => {
    const sel = window.__color.sel();
    const r = window.__color.regions().find(x => !x.filled && x.c === sel);
    return window.__color.toClient(r.lx, r.ly);
  });
  await page.mouse.click(one.x, one.y);
  check('줌/팬/리셋 후 탭 채색 정확', await page.evaluate(() => window.__color.filledCount()) === prevCount + 1);
  await shot('03-paint');

  console.log('■ 완성작 감상·다시 색칠');
  await page.locator('#paint-back').click();
  await page.locator('#pic-grid .pic-card').first().click(); // 완성작(butterfly)
  check('완성작은 감상 모드', await page.evaluate(() => !window.__color.playing()));
  check('다시 색칠 버튼 표시', await page.locator('#viewer-bar:not(.hidden)').count() === 1);
  await page.locator('#btn-repaint').click();
  await page.locator('#confirm-ok').click();
  check('다시 색칠: 초기화·플레이 재개',
    await page.evaluate(() => window.__color.filledCount() === 0 && window.__color.playing()));

  console.log('■ 페이지 오류');
  check('콘솔/페이지 오류 0건', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  await browser.close();
  server.close();
  console.log('\n' + (fail ? '❌ 실패 ' + fail + ' · 통과 ' + pass : '✅ 전체 통과 (' + pass + ')'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌ E2E 실행 오류:', e); process.exit(1); });
