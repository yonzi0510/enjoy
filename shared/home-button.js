/* ═══════════ 공용 집 단추 ═══════════
 * 어느 놀이의 어느 화면에서든 **한 번만 누르면** 놀이터 홈으로 간다.
 *
 * 왜 만들었나 — 예전에는 🏠 가 앱의 첫 화면에만 있었고 그마저 42px 이었다.
 * 놀이에 들어가면 아예 사라져서, ◀ 를 두세 번 눌러 첫 화면까지 나온 뒤에야
 * 집으로 갈 수 있었다. 다섯 살에게는 너무 먼 길이다.
 *
 * 자리는 오른쪽 위. 앱들이 그 자리에 두던 것들(자음/모음 고르기, 남은 시간 표시)은
 * 아래 CSS 가 왼쪽으로 밀어 준다.
 *
 * 불러오는 법 — 각 앱 index.html 의 스크립트 중 아무 데나:
 *   <script src="../shared/home-button.js"></script>
 */
(() => {
  if (document.querySelector('.enjoy-home-btn')) return;

  const CSS = `
.enjoy-home-btn{
  position:fixed;
  right:calc(12px + env(safe-area-inset-right,0px));
  top:calc(12px + env(safe-area-inset-top,0px));
  z-index:900;
  width:clamp(60px,8.6vw,80px); height:clamp(60px,8.6vw,80px);
  display:grid; place-items:center;
  padding:0; border:0; background:none; cursor:pointer;
  -webkit-tap-highlight-color:transparent;
}
/* 눈에 보이는 동그라미보다 손가락이 닿는 범위를 12px 더 넓게 잡는다 */
.enjoy-home-btn::before{ content:""; position:absolute; inset:-12px; border-radius:50% }
.enjoy-home-btn svg{ width:100%; height:100%; display:block }
.enjoy-home-btn:active{ transform:translate(2px,3px) }
.enjoy-home-btn:focus-visible{ outline:4px dashed rgba(214,157,19,.9); outline-offset:4px; border-radius:50% }

/* 앱 안에 있던 작은 🏠 는 숨긴다 — 집 단추가 둘이면 아이가 헷갈린다 */
a.vs-btn[href="../"], .home-head a[href="../"]{ display:none !important }

/* 앱들이 오른쪽 위에 두던 것들을 집 단추 왼쪽으로 밀어 준다 */
.tl-bar-tag{ right:calc(108px + env(safe-area-inset-right,0px)) !important }
.bar, .home-head{ padding-right:104px !important }
@media (prefers-reduced-motion: reduce){ .enjoy-home-btn:active{ transform:none } }
`;

  /* 다섯 살이 그리는 집 — 세모 지붕에 네모, 문 하나.
     자로 그은 티가 나지 않게 획을 실제로 떨리게 한다. */
  const SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <defs><filter id="enjoy-home-kid" x="-14%" y="-14%" width="128%" height="128%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="9"/>
    <feDisplacementMap in="SourceGraphic" scale="3.2"/>
  </filter></defs>
  <g filter="url(#enjoy-home-kid)" fill="none" stroke="#2E2A24"
     stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 51 L50 14 L89 51" stroke-width="8"/>
    <path d="M22 46 L23 84 L78 83 L77 45" stroke-width="8"/>
    <path d="M41 84 L40 60 L60 59 L61 83" fill="#F6C453" stroke-width="6"/>
  </g>
</svg>`;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const a = document.createElement('a');
  a.className = 'enjoy-home-btn';
  a.href = '../';
  a.setAttribute('aria-label', '놀이터 홈으로');
  a.innerHTML = SVG;

  /* 누르면 어디로 가는지 소리로도 알려준다 */
  a.addEventListener('click', e => {
    if (!window.speechSynthesis) return;
    e.preventDefault();
    let spoke = 0;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('놀이터로 갈까요?');
      u.lang = 'ko-KR'; u.pitch = 1.15;
      u.rate = window.VoiceSettings ? VoiceSettings.rateFactor() : 1;
      if (window.VoiceSettings) { const v = VoiceSettings.koVoice(); if (v) u.voice = v; }
      speechSynthesis.speak(u);
      spoke = 1;
    } catch (err) {}
    setTimeout(() => { location.href = '../'; }, spoke ? 700 : 0);
  });

  (document.body || document.documentElement).appendChild(a);
})();
