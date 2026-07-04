/* 도안 계약 검증기 — 사용법: node color/tools/validate-picture.js [pictureId]
 * (id 생략 시 전체 도안 검사. 번호 배치·탭 가능성 등 실기 검사는 tools/e2e.js가 담당)
 */
const fs = require('fs');
const path = require('path');

global.window = globalThis;
const picDir = path.join(__dirname, '..', 'js', 'pictures');
require(path.join(picDir, 'helpers.js'));
fs.readdirSync(picDir).filter(f => f.endsWith('.js') && f !== 'helpers.js').sort()
  .forEach(f => require(path.join(picDir, f)));

const PICS = globalThis.PICTURES || [];
const only = process.argv[2];
const CATS = ['animal', 'nature', 'scenery', 'vehicle', 'food'];
const HEX = /^#[0-9A-Fa-f]{6}$/;
let failed = false;

const num = v => typeof v === 'number' && isFinite(v);

function checkRegion(r, i, pal, vb, errs) {
  const tag = 'region[' + i + ']';
  if (!Number.isInteger(r.c) || r.c < 0 || r.c >= pal.length) { errs.push(tag + ': c 인덱스 불량 (' + r.c + ')'); return; }
  let bbox = null;
  switch (r.t) {
    case 'rect':
      if (!(num(r.x) && num(r.y) && num(r.w) && num(r.h) && r.w > 0 && r.h > 0)) errs.push(tag + ': rect 필드 불량');
      else bbox = [r.x, r.y, r.x + r.w, r.y + r.h];
      break;
    case 'circle':
      if (!(num(r.cx) && num(r.cy) && num(r.r) && r.r > 0)) errs.push(tag + ': circle 필드 불량');
      else bbox = [r.cx - r.r, r.cy - r.r, r.cx + r.r, r.cy + r.r];
      break;
    case 'ellipse':
      if (!(num(r.cx) && num(r.cy) && num(r.rx) && num(r.ry) && r.rx > 0 && r.ry > 0)) errs.push(tag + ': ellipse 필드 불량');
      else bbox = [r.cx - r.rx, r.cy - r.ry, r.cx + r.rx, r.cy + r.ry];
      break;
    case 'poly':
      if (!Array.isArray(r.pts) || r.pts.length < 3 || r.pts.some(p => !Array.isArray(p) || !num(p[0]) || !num(p[1]))) errs.push(tag + ': poly pts 불량');
      else {
        const xs = r.pts.map(p => p[0]), ys = r.pts.map(p => p[1]);
        bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        if (bbox[2] - bbox[0] < 2 || bbox[3] - bbox[1] < 2) errs.push(tag + ': poly가 지나치게 가늘음');
      }
      break;
    case 'path':
      if (typeof r.d !== 'string' || !/^M/i.test(r.d.trim()) || !/Z\s*$/i.test(r.d.trim())) errs.push(tag + ': path d는 M…Z 닫힌 경로여야 함');
      if (/[a-z]/.test(r.d.replace(/\s/g, '').replace(/[MLACQZHV]/gi, m => m))) { /* 소문자 상대명령 허용 안내만 */ }
      break;
    default:
      errs.push(tag + ': 알 수 없는 타입 "' + r.t + '"');
  }
  if (r.lx != null || r.ly != null) {
    if (!(num(r.lx) && num(r.ly))) errs.push(tag + ': lx/ly 불량');
  }
  if (bbox) {
    // 캔버스를 살짝 넘치는 도형(언덕·햇살 등)은 클리핑되므로 허용 — 완전히 밖이면 오류
    const [x0, y0, x1, y1] = bbox;
    const ix = Math.min(x1, vb[0] + vb[2]) - Math.max(x0, vb[0]);
    const iy = Math.min(y1, vb[1] + vb[3]) - Math.max(y0, vb[1]);
    if (ix < 4 || iy < 4)
      errs.push(tag + ' (' + r.t + '): viewBox와 겹치지 않음 [' + [x0, y0, x1, y1].map(Math.round) + ']');
  }
}

const ids = new Set();
PICS.filter(p => !only || p.id === only).forEach(pic => {
  const errs = [];
  ['id', 'name', 'emoji', 'category'].forEach(k => { if (!pic[k]) errs.push('필드 누락: ' + k); });
  if (ids.has(pic.id)) errs.push('id 중복: ' + pic.id);
  ids.add(pic.id);
  if (!CATS.includes(pic.category)) errs.push('알 수 없는 카테고리: ' + pic.category);
  if (!Array.isArray(pic.vb) || pic.vb.length !== 4 || pic.vb.some(v => !num(v)) || pic.vb[2] <= 0 || pic.vb[3] <= 0)
    errs.push('vb 불량');
  if (!Array.isArray(pic.palette) || pic.palette.length < 4 || pic.palette.length > 12)
    errs.push('palette는 4~12색이어야 함 (현재 ' + (pic.palette || []).length + ')');
  else pic.palette.forEach((h, i) => { if (!HEX.test(h)) errs.push('palette[' + i + '] hex 불량: ' + h); });

  if (!Array.isArray(pic.regions) || pic.regions.length < 15 || pic.regions.length > 120)
    errs.push('regions는 15~120개여야 함 (현재 ' + (pic.regions || []).length + ')');
  else {
    pic.regions.forEach((r, i) => checkRegion(r, i, pic.palette, pic.vb, errs));
    // 모든 색이 최소 1회 사용
    const used = new Set(pic.regions.map(r => r.c));
    pic.palette.forEach((_, c) => { if (!used.has(c)) errs.push('palette[' + c + '] (' + pic.palette[c] + ') 을 쓰는 영역이 없음'); });
  }

  if (errs.length) {
    failed = true;
    console.log('❌ ' + pic.id + ' 실패:');
    [...new Set(errs)].forEach(e => console.log('  - ' + e));
  } else {
    console.log('✅ ' + pic.id + ' — 영역 ' + pic.regions.length + '개 · 색 ' + pic.palette.length + '개 (' + pic.name + ')');
  }
});

if (only && !PICS.some(p => p.id === only)) { console.error('❌ id="' + only + '" 도안 없음'); process.exit(1); }
if (!PICS.length) { console.error('❌ 등록된 도안 없음'); process.exit(1); }
process.exit(failed ? 1 : 0);
