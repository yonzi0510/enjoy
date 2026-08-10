#!/usr/bin/env node
/* 백업 목록 검증 — node parent/tools/validate-backup-keys.js
 *
 * ── 왜 필요한가 (2026-08) ──────────────────────────────────────
 * 부모님 페이지의 「진행도 내려받기」가 **29개 앱 중 8개만 담고 있었다.** 나머지 21개와
 * 학습 펫은 백업 파일에 아예 들어가지 않았다. 앱을 새로 만들 때마다 `js/progress.js` 에는
 * 키를 넣는데 `parent/index.html` 의 목록에는 아무도 안 넣었고, **그걸 잡을 검사가 없었다.**
 *
 * 기기를 바꾸거나 저장소를 지운 뒤 백업을 되살리면 대부분의 진행도가 안 돌아왔을 것이다.
 * CLAUDE.md 「기존 진행도 보존(필수)」의 정면 위반이라, 다시는 조용히 썩지 않게 검사를 둔다.
 *
 * 하는 일: 앱들의 `js/progress.js` 와 `shared/pet.js` 에서 실제로 쓰는 localStorage 키를
 * 훑어 모으고, 그 전부가 `parent/index.html` 의 백업 목록에 있는지 본다.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
let errors = 0;
const err = m => { errors++; console.error('❌ ' + m); };

/* ── ① 앱들이 실제로 쓰는 진행도 키를 모은다 ── */
const found = new Map(); // key → 어디서 나왔는지

function scan(file, label) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  // Profile.key('...') 로 감싼 것이 진행도 키다 (음소거·설정처럼 기기 공용인 것은 안 감싼다)
  const re = /Profile\.key\(\s*'([^']+)'\s*\)/g;
  let m;
  while ((m = re.exec(src))) found.set(m[1], label);
}

/* 앱 폴더의 **js 파일 전부**를 훑는다. progress.js 만 보면 놓친다 —
 * 스티커판은 play/js/stickerplay.js 에, 펫은 shared/pet.js 에 있다. */
fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules' && d.name !== 'tools')
  .forEach(d => {
    const jsDir = path.join(ROOT, d.name, 'js');
    if (!fs.existsSync(jsDir)) return;
    const walk = dir => {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(f => {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (f.name.endsWith('.js')) scan(p, d.name);
      });
    };
    walk(jsDir);
  });
fs.readdirSync(path.join(ROOT, 'shared'))
  .filter(f => f.endsWith('.js'))
  // profile.js 는 Profile.key() 를 **정의**하는 곳이라 주석 예시(xxx-v1)가 잡힌다
  .filter(f => f !== 'profile.js')
  .forEach(f => scan(path.join(ROOT, 'shared', f), 'shared/' + f.replace('.js', '')));

if (found.size < 20) err('진행도 키를 ' + found.size + '개밖에 못 찾았다 — 훑는 방식이 깨진 듯하다');

/* ── ② 부모님 페이지 백업 목록을 읽는다 ── */
const parentHtml = fs.readFileSync(path.join(ROOT, 'parent', 'index.html'), 'utf8');
const block = /const PROGRESS_KEYS = \[([\s\S]*?)\];/.exec(parentHtml);
if (!block) {
  err('parent/index.html 에서 PROGRESS_KEYS 목록을 찾지 못했다');
} else {
  const listed = new Set((block[1].match(/'([^']+)'/g) || []).map(s => s.slice(1, -1)));

  /* ③ 실제로 쓰는 키가 전부 목록에 있는가 */
  [...found.keys()].sort().forEach(k => {
    if (!listed.has(k)) err('백업 목록에 빠진 진행도 키: ' + k + '  (' + found.get(k) + ')');
  });

  /* ④ 목록에만 있고 아무도 안 쓰는 키 — 지워도 되는지 사람이 보게 알린다.
   *    (옛 앱의 키를 일부러 남겨 둔 것일 수 있으니 오류가 아니라 알림) */
  [...listed].sort().forEach(k => {
    if (!found.has(k)) console.log('ℹ️  아무도 안 쓰는 키가 목록에 있음(옛 키라면 그대로 두면 됨): ' + k);
  });

  /* ⑤ 두 아이 몫이 함께 담기는가 — 서하 진행도는 p2: 접두어다 */
  if (!/PROGRESS_KEYS\.map\(k => 'p2:' \+ k\)/.test(parentHtml)) {
    err("백업이 서하 몫(p2: 접두어)을 담지 않는다");
  }
}

if (errors) {
  console.error('\n검증 실패: 오류 ' + errors + '개');
  process.exit(1);
}
console.log('✅ 백업 목록 검증 통과 — 진행도 키 ' + found.size + '개가 모두 담긴다 (은아·서하 각각)');
