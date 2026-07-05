/* KanjiVG SVG → japanese/js/strokes.js 변환
 * 히라가나 46자의 획 경로(M/C/S/L 등)를 파싱해 꺾은선으로 평탄화하고,
 * 글자별 바운딩박스를 [8,92] 범위로 균일 확대·중앙 정렬한다.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = '/tmp/claude-0/-home-user-enjoy/742aaa97-cbaa-54cc-bcf4-d28c7c2eb32f/scratchpad/pip/kanji/';
const OUT = '/home/user/enjoy/japanese/js/strokes.js';

// SVG path d 파서 — KanjiVG가 쓰는 명령(M m L l H h V v C c S s Z)만 지원
function parsePath(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let i = 0, cmd = '';
  let x = 0, y = 0, sx = 0, sy = 0, pcx = null, pcy = null;
  const pts = [];
  const num = () => parseFloat(tokens[i++]);
  function cubic(x1, y1, x2, y2, x3, y3) {
    const x0 = x, y0 = y;
    for (let t = 1; t <= 16; t++) {
      const s = t / 16, r = 1 - s;
      pts.push([
        r*r*r*x0 + 3*r*r*s*x1 + 3*r*s*s*x2 + s*s*s*x3,
        r*r*r*y0 + 3*r*r*s*y1 + 3*r*s*s*y2 + s*s*s*y3,
      ]);
    }
    pcx = x2; pcy = y2; x = x3; y = y3;
  }
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case 'M': x = num(); y = num(); sx = x; sy = y; pts.push([x, y]); pcx = pcy = null; cmd = 'L'; break;
      case 'm': x += num(); y += num(); sx = x; sy = y; pts.push([x, y]); pcx = pcy = null; cmd = 'l'; break;
      case 'L': x = num(); y = num(); pts.push([x, y]); pcx = pcy = null; break;
      case 'l': x += num(); y += num(); pts.push([x, y]); pcx = pcy = null; break;
      case 'H': x = num(); pts.push([x, y]); pcx = pcy = null; break;
      case 'h': x += num(); pts.push([x, y]); pcx = pcy = null; break;
      case 'V': y = num(); pts.push([x, y]); pcx = pcy = null; break;
      case 'v': y += num(); pts.push([x, y]); pcx = pcy = null; break;
      case 'C': cubic(num(), num(), num(), num(), num(), num()); break;
      case 'c': { const a=x+num(),b=y+num(),c2=x+num(),d2=y+num(),e=x+num(),f=y+num(); cubic(a,b,c2,d2,e,f); break; }
      case 'S': { const rx = pcx==null?x:2*x-pcx, ry = pcy==null?y:2*y-pcy; cubic(rx, ry, num(), num(), num(), num()); break; }
      case 's': { const rx = pcx==null?x:2*x-pcx, ry = pcy==null?y:2*y-pcy; const c2=x+num(),d2=y+num(),e=x+num(),f=y+num(); cubic(rx, ry, c2, d2, e, f); break; }
      case 'Z': case 'z': x = sx; y = sy; pts.push([x, y]); break;
      default: throw new Error('지원하지 않는 명령: ' + cmd);
    }
  }
  return pts;
}

const kana = [];
for (let c = 0x3042; c <= 0x3093; c++) kana.push(c);
// 기본 46자만 (작은 글자 ぁぃぅぇぉっゃゅょゎ와 탁음·반탁음 제외)
const BASIC = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';

const out = {};
for (const ch of BASIC) {
  const file = SRC + '0' + ch.codePointAt(0).toString(16) + '.svg';
  const svg = readFileSync(file, 'utf8');
  const ds = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map(m => m[1]);
  if (!ds.length) throw new Error(ch + ': path 없음');
  let strokes = ds.map(parsePath);
  // 바운딩박스 → [8,92] 균일 스케일 + 중앙 정렬
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  strokes.flat().forEach(([px, py]) => {
    if (px < minX) minX = px; if (px > maxX) maxX = px;
    if (py < minY) minY = py; if (py > maxY) maxY = py;
  });
  const span = Math.max(maxX - minX, maxY - minY);
  const s = 84 / span;
  const ox = 8 + (84 - (maxX - minX) * s) / 2;
  const oy = 8 + (84 - (maxY - minY) * s) / 2;
  strokes = strokes.map(st => st.map(([px, py]) => [
    Math.round((ox + (px - minX) * s) * 10) / 10,
    Math.round((oy + (py - minY) * s) * 10) / 10,
  ]));
  // 촘촘한 점 솎아내기 (0.8 미만 간격 제거, 시작/끝 유지)
  strokes = strokes.map(st => {
    const keep = [st[0]];
    for (let i = 1; i < st.length - 1; i++) {
      const last = keep[keep.length - 1];
      if (Math.hypot(st[i][0] - last[0], st[i][1] - last[1]) >= 0.8) keep.push(st[i]);
    }
    keep.push(st[st.length - 1]);
    return keep;
  });
  out[ch] = strokes;
}

const body = Object.entries(out)
  .map(([ch, st]) => "  '" + ch + "': " + JSON.stringify(st))
  .join(',\n');
writeFileSync(OUT, `/* 히라가나 획순 데이터 — KanjiVG에서 변환 (자동 생성: tools/convert 참고)
 * 원본: KanjiVG © Ulrich Apel, CC BY-SA 3.0 — http://kanjivg.tagaini.net
 * 109×109 SVG 경로를 평탄화해 글자별로 8~92 범위에 정규화했다.
 */
window.KanaStrokes = {
${body}
};
`);
console.log('written', Object.keys(out).length, '자');
