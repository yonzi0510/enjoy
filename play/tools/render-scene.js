/* 씬 미리보기 렌더러 — 사용법: NODE_PATH=/opt/node22/lib/node_modules node play/tools/render-scene.js <themeId> <출력.png> [level]
 * 지정 레벨의 A(위)/B(아래)와 그 레벨의 트레이 아이콘을 한 장의 PNG로 렌더링해 시각 검수에 사용한다.
 */
const path = require('path');
const { chromium } = require('playwright');

const themeId = process.argv[2];
const out = process.argv[3] || (themeId + '-preview.png');
const level = +(process.argv[4] || 1);
if (!themeId) { console.error('usage: node render-scene.js <themeId> <out.png> [level]'); process.exit(2); }

global.window = globalThis;
require(path.join(__dirname, '..', 'js', 'scenes', themeId + '.js'));
const scene = (globalThis.SCENES || []).find(s => s.id === themeId);
if (!scene) { console.error('테마 없음: ' + themeId); process.exit(1); }

const levelItems = scene.hidden.filter(h => (h.level || 1) === level);
const html = `<!DOCTYPE html><html><body style="margin:0;background:${scene.bg}">
<div style="width:1200px">${scene.buildScene('A', level)}</div>
<div style="width:1200px;border-top:4px dashed #999">${scene.buildScene('B', level)}</div>
<div style="display:flex;gap:8px;padding:10px;background:#fff">
  ${levelItems.map(h => `<div style="width:80px;height:80px;border:2px solid #ccc;border-radius:12px">${h.icon}</div>`).join('')}
  <div style="width:100px;height:100px;margin-left:30px">${scene.sticker.svg}</div>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1720 } });
  await page.setContent(html);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log('saved: ' + out);
})();
