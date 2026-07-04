/* 테마: 농장 — 레퍼런스 씬 (난이도 3레벨)
 * 계약:
 *  - buildScene('A'|'B', 1|2|3) → viewBox="0 0 1200 800" SVG 문자열
 *  - 숨은그림: L1 6개·L2 7개·L3 8개 = 총 21개. 모든 레벨 대상을 항상 그린다(하위 레벨에선 장식)
 *    <g data-find="id" data-label="이름" data-level="2">  (data-level 없으면 1)
 *    크기: L1 40~90px, L2 28~55px(보호색·부분 가림), L3 20~40px(강한 보호색)
 *  - 다른그림: L1 5개(id 1~5)·L2 6개(id 6~11)·L3 7개(id 12~18). 마커 그룹은 항상 출력하되
 *    내용 차이는 해당 레벨의 B에서만 적용: const D1=!A&&L===1 … fill="${D1?'바뀐색':'원래색'}"
 *    <g data-diff="6" data-level="2" data-cx=".." data-cy=".." data-r=".."> (속성 순서 고정, L1은 data-level 생략)
 *  - defs/그라디언트/url(#…) 금지 — 단색 fill만. 백틱 금지(템플릿 리터럴 내부)
 */
window.SCENES = window.SCENES || [];

SCENES.push({
  id: 'farm',
  name: '농장',
  emoji: '🐄',
  bg: '#FFF3D6',

  buildScene(v, level) {
    const A = v === 'A';
    const L = +level || 1;
    const D1 = !A && L === 1, D2 = !A && L === 2, D3 = !A && L === 3;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
  <!-- 하늘 (단색 레이어 — defs/그라디언트 사용 금지) -->
  <rect x="0" y="0" width="1200" height="580" fill="#9BDCF8"/>
  <rect x="0" y="320" width="1200" height="260" fill="#C4EBFB" opacity="0.55"/>

  <!-- 해 -->
  <g>
    <circle cx="1080" cy="100" r="58" fill="#FFD93D"/>
    <g stroke="#FFD93D" stroke-width="10" stroke-linecap="round">
      <line x1="1080" y1="10" x2="1080" y2="30"/><line x1="1080" y1="170" x2="1080" y2="190"/>
      <line x1="990" y1="100" x2="1010" y2="100"/><line x1="1150" y1="100" x2="1170" y2="100"/>
      <line x1="1016" y1="36" x2="1030" y2="50"/><line x1="1130" y1="150" x2="1144" y2="164"/>
      <line x1="1144" y1="36" x2="1130" y2="50"/><line x1="1030" y1="150" x2="1016" y2="164"/>
    </g>
    <circle cx="1062" cy="92" r="7" fill="#E8A800"/><circle cx="1098" cy="92" r="7" fill="#E8A800"/>
    <!-- ★차이16(L3): 해 입 모양 (웃는 입 → 동그란 입) -->
    <g data-diff="16" data-level="3" data-cx="1080" data-cy="122" data-r="45">${D3
      ? '<circle cx="1080" cy="120" r="9" fill="#E8A800"/>'
      : '<path d="M1062 118 Q1080 132 1098 118" stroke="#E8A800" stroke-width="6" fill="none" stroke-linecap="round"/>'}
    </g>
  </g>

  <!-- 구름 1 (고정) -->
  <g fill="#FFFFFF" opacity="0.95">
    <circle cx="210" cy="115" r="34"/><circle cx="255" cy="100" r="42"/><circle cx="300" cy="118" r="32"/>
    <rect x="200" y="108" width="110" height="40" rx="20"/>
  </g>

  <!-- ★차이3(L1): 구름 2 — B에서는 사라짐 -->
  <g data-diff="3" data-cx="620" data-cy="95" data-r="85">${D1 ? '' : `
    <g fill="#FFFFFF" opacity="0.95">
      <circle cx="580" cy="98" r="30"/><circle cx="622" cy="82" r="38"/><circle cx="664" cy="100" r="28"/>
      <rect x="570" y="92" width="104" height="36" rx="18"/>
    </g>`}
  </g>

  <!-- 언덕 & 땅 -->
  <path d="M0 470 Q250 340 520 450 Q820 340 1200 455 L1200 800 L0 800 Z" fill="#A9DC8C"/>
  <path d="M0 560 Q400 500 800 565 Q1010 595 1200 555 L1200 800 L0 800 Z" fill="#8BCF6B"/>

  <!-- 헛간 -->
  <g>
    <rect x="110" y="380" width="280" height="185" fill="#E8574B"/>
    <rect x="110" y="380" width="280" height="185" fill="none" stroke="#C74437" stroke-width="6"/>
    <!-- ★차이1(L1): 지붕 색 (빨강 → 파랑) -->
    <g data-diff="1" data-cx="250" data-cy="335" data-r="95">
      <polygon points="85,380 250,275 415,380" fill="${D1 ? '#3F6FB5' : '#A93F35'}"/>
      <polygon points="85,380 250,275 415,380" fill="none" stroke="${D1 ? '#2F5590' : '#8E2F26'}" stroke-width="6" stroke-linejoin="round"/>
    </g>
    <!-- ★차이18(L3): 지붕 위 굴뚝 — B에서는 사라짐 -->
    <g data-diff="18" data-level="3" data-cx="186" data-cy="315" data-r="45">${D3 ? '' : `
      <rect x="176" y="294" width="22" height="40" rx="4" fill="#8E2F26"/>
      <rect x="172" y="288" width="30" height="10" rx="4" fill="#6E241E"/>`}
    </g>
    <!-- ★차이6(L2): 둥근 창문 색 (크림 → 노랑) -->
    <g data-diff="6" data-level="2" data-cx="250" data-cy="425" data-r="50">
      <circle cx="250" cy="425" r="26" fill="${D2 ? '#FFE04D' : '#FFF7DE'}" stroke="#C74437" stroke-width="6"/>
    </g>
    <line x1="250" y1="399" x2="250" y2="451" stroke="#C74437" stroke-width="4"/>
    <line x1="224" y1="425" x2="276" y2="425" stroke="#C74437" stroke-width="4"/>
    <rect x="208" y="472" width="84" height="93" rx="8" fill="#7A4A2B"/>
    <!-- ★차이15(L3): 문 X자 → 대각선 하나 -->
    <g data-diff="15" data-level="3" data-cx="250" data-cy="518" data-r="50">
      <line x1="208" y1="472" x2="292" y2="565" stroke="#5E3820" stroke-width="5"/>
      ${D3 ? '' : '<line x1="292" y1="472" x2="208" y2="565" stroke="#5E3820" stroke-width="5"/>'}
    </g>
  </g>

  <!-- 숨은그림 L3: 단추 (헛간 벽, 빨강 보호색) -->
  <g data-find="button" data-label="단추" data-level="3">
    <circle cx="165" cy="470" r="12" fill="#C7362B" stroke="#A32A20" stroke-width="3"/>
    <circle cx="161" cy="466" r="2" fill="#7E1F17"/><circle cx="169" cy="466" r="2" fill="#7E1F17"/>
    <circle cx="161" cy="474" r="2" fill="#7E1F17"/><circle cx="169" cy="474" r="2" fill="#7E1F17"/>
  </g>

  <!-- 숨은그림 L2: 생쥐 (헛간 아래 구석) -->
  <g data-find="mouse" data-label="생쥐" data-level="2">
    <ellipse cx="140" cy="592" rx="20" ry="14" fill="#B8B2C4"/>
    <circle cx="124" cy="584" r="8" fill="#B8B2C4"/>
    <circle cx="120" cy="580" r="4.5" fill="#D8CFE0"/>
    <circle cx="122" cy="586" r="1.8" fill="#3B3B3B"/>
    <path d="M158 594 Q174 590 172 578" stroke="#9C93AC" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L1: 물뿌리개 (헛간 옆) -->
  <g data-find="can" data-label="물뿌리개">
    <path d="M432 522 Q430 508 444 508 L482 508 Q496 508 494 522 L490 560 Q489 570 478 570 L448 570 Q437 570 436 560 Z" fill="#4FA8A0"/>
    <path d="M436 518 L408 500 L404 512 L434 530 Z" fill="#4FA8A0"/>
    <circle cx="404" cy="506" r="9" fill="#3D8781"/>
    <path d="M492 520 Q512 528 508 550" stroke="#3D8781" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="463" cy="512" rx="22" ry="6" fill="#3D8781"/>
  </g>

  <!-- 울타리 -->
  <g fill="#C68B4F" stroke="#A96F35" stroke-width="4">
    <rect x="462" y="470" width="18" height="90" rx="6"/>
    <rect x="560" y="470" width="18" height="90" rx="6"/>
    <rect x="658" y="470" width="18" height="90" rx="6"/>
    <rect x="756" y="470" width="18" height="90" rx="6"/>
    <rect x="450" y="488" width="340" height="16" rx="8"/>
    <rect x="450" y="528" width="340" height="16" rx="8"/>
  </g>

  <!-- 숨은그림 L1: 밀짚모자 (울타리 기둥 위) -->
  <g data-find="hat" data-label="밀짚모자">
    <ellipse cx="667" cy="462" rx="42" ry="12" fill="#E8C05A"/>
    <path d="M645 462 Q645 434 667 434 Q689 434 689 462 Z" fill="#F2D178"/>
    <path d="M645 456 Q667 464 689 456" stroke="#C99B3A" stroke-width="6" fill="none"/>
  </g>

  <!-- 건초더미 -->
  <g>
    <path d="M760 560 Q760 480 830 478 Q902 480 902 560 Q902 576 830 576 Q760 576 760 560 Z" fill="#E8C05A"/>
    <!-- ★차이9(L2): 건초 줄 2개 → 1개 -->
    <g data-diff="9" data-level="2" data-cx="830" data-cy="536" data-r="70">
      <path d="M782 520 Q830 508 884 522" stroke="#C99B3A" stroke-width="5" fill="none" stroke-linecap="round"/>
      ${D2 ? '' : '<path d="M774 548 Q830 536 892 550" stroke="#C99B3A" stroke-width="5" fill="none" stroke-linecap="round"/>'}
    </g>
  </g>

  <!-- 숨은그림 L3: 열쇠 (건초 속, 짚색 보호색) -->
  <g data-find="key" data-label="열쇠" data-level="3">
    <circle cx="828" cy="560" r="8" fill="none" stroke="#D9A93C" stroke-width="5"/>
    <line x1="835" y1="563" x2="856" y2="570" stroke="#D9A93C" stroke-width="5" stroke-linecap="round"/>
    <line x1="849" y1="568" x2="847" y2="576" stroke="#D9A93C" stroke-width="4" stroke-linecap="round"/>
    <line x1="856" y1="570" x2="854" y2="578" stroke="#D9A93C" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 양동이 (건초더미 옆, 짚색 보호색) -->
  <g data-find="bucket" data-label="양동이" data-level="2">
    <path d="M906 540 L942 540 L936 574 L912 574 Z" fill="#D9A94F" stroke="#B8863A" stroke-width="3"/>
    <path d="M908 540 Q924 522 940 540" stroke="#B8863A" stroke-width="4" fill="none"/>
    <ellipse cx="924" cy="540" rx="18" ry="5" fill="#EFC97E"/>
  </g>

  <!-- 숨은그림 L1: 강아지 (건초더미 뒤에서 빼꼼) -->
  <g data-find="dog" data-label="강아지">
    <path d="M726 470 Q718 440 736 444 L744 458 Z" fill="#8A5A2E"/>
    <path d="M772 468 Q784 440 766 442 L756 456 Z" fill="#8A5A2E"/>
    <circle cx="748" cy="482" r="30" fill="#A9743F"/>
    <circle cx="738" cy="476" r="5.5" fill="#3B2A18"/><circle cx="760" cy="476" r="5.5" fill="#3B2A18"/>
    <ellipse cx="749" cy="492" rx="8" ry="6" fill="#3B2A18"/>
    <path d="M741 500 Q749 506 757 500" stroke="#3B2A18" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 개구리 (건초더미 아래 풀밭, 초록 보호색) -->
  <g data-find="frog" data-label="개구리" data-level="2">
    <ellipse cx="790" cy="622" rx="22" ry="15" fill="#6DBF5A"/>
    <circle cx="780" cy="608" r="7" fill="#6DBF5A"/><circle cx="800" cy="608" r="7" fill="#6DBF5A"/>
    <circle cx="780" cy="607" r="3" fill="#2F4F2A"/><circle cx="800" cy="607" r="3" fill="#2F4F2A"/>
    <path d="M782 624 Q790 630 798 624" stroke="#2F4F2A" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 젖소 -->
  <g>
    <ellipse cx="595" cy="625" rx="108" ry="66" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="5"/>
    <!-- ★차이4(L1): 젖소 무늬 색 (검정 → 갈색) -->
    <g data-diff="4" data-cx="575" data-cy="615" data-r="80">
      <path d="M540 590 Q568 578 580 600 Q588 622 560 630 Q532 626 540 590 Z" fill="${D1 ? '#C4763B' : '#3B3B3B'}"/>
      <path d="M615 636 Q642 626 652 648 Q650 668 624 666 Q604 658 615 636 Z" fill="${D1 ? '#C4763B' : '#3B3B3B'}"/>
    </g>
    <rect x="522" y="668" width="22" height="52" rx="10" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="4"/>
    <rect x="572" y="676" width="22" height="48" rx="10" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="4"/>
    <rect x="626" y="676" width="22" height="48" rx="10" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="4"/>
    <path d="M492 610 Q462 616 466 646" stroke="#D8D3C8" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="466" cy="650" r="10" fill="#3B3B3B"/>
    <circle cx="694" cy="574" r="44" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="5"/>
    <!-- ★차이12(L3): 왼쪽 귀 안 색 (크림 → 분홍) -->
    <g data-diff="12" data-level="3" data-cx="664" data-cy="540" data-r="40">
      <path d="M658 548 Q642 532 660 528 L672 542 Z" fill="${D3 ? '#F5B8C4' : '#E8DFD2'}"/>
    </g>
    <path d="M730 548 Q746 532 728 528 L716 542 Z" fill="#E8DFD2"/>
    <circle cx="682" cy="566" r="6" fill="#3B3B3B"/><circle cx="708" cy="566" r="6" fill="#3B3B3B"/>
    <ellipse cx="695" cy="594" rx="24" ry="15" fill="#F5B8C4"/>
    <circle cx="687" cy="592" r="4" fill="#D98B9C"/><circle cx="703" cy="592" r="4" fill="#D98B9C"/>
  </g>

  <!-- 나무 -->
  <g>
    <rect x="938" y="330" width="46" height="160" rx="16" fill="#8B5A2B"/>
    <circle cx="905" cy="290" r="62" fill="#5FA84E"/>
    <circle cx="975" cy="250" r="72" fill="#6BB55A"/>
    <circle cx="1030" cy="305" r="58" fill="#5FA84E"/>
    <circle cx="960" cy="330" r="52" fill="#6BB55A"/>
    <!-- ★차이7(L2): 왼쪽 사과 색 (빨강 → 노랑) -->
    <g data-diff="7" data-level="2" data-cx="912" data-cy="268" data-r="50">
      <circle cx="912" cy="268" r="14" fill="${D2 ? '#FFD93D' : '#E8574B'}"/>
    </g>
    <circle cx="1022" cy="330" r="14" fill="#E8574B"/>
    <!-- ★차이2(L1): 사과 하나 — B에서는 사라짐 -->
    <g data-diff="2" data-cx="988" data-cy="248" data-r="60">${D1 ? '' : `
      <circle cx="988" cy="248" r="15" fill="#E8574B"/>
      <path d="M988 234 Q992 224 1000 226" stroke="#5E3820" stroke-width="4" fill="none"/>`}
    </g>
  </g>

  <!-- 숨은그림 L2: 파랑새 (나뭇잎 사이) -->
  <g data-find="bird" data-label="파랑새" data-level="2">
    <ellipse cx="1035" cy="288" rx="17" ry="13" fill="#5FA8E8"/>
    <circle cx="1049" cy="278" r="9" fill="#5FA8E8"/>
    <circle cx="1052" cy="276" r="2.5" fill="#2A3B5E"/>
    <polygon points="1057,279 1066,282 1057,285" fill="#F2A33C"/>
    <path d="M1026 286 Q1018 280 1022 292 Z" fill="#3F84C4"/>
  </g>

  <!-- 숨은그림 L1: 나비 (나무 옆) -->
  <g data-find="butterfly" data-label="나비">
    <ellipse cx="856" cy="212" rx="13" ry="20" transform="rotate(-28 856 212)" fill="#FF8FC7"/>
    <ellipse cx="884" cy="212" rx="13" ry="20" transform="rotate(28 884 212)" fill="#FFB0D8"/>
    <!-- ★차이11(L2): 아랫날개 색 (분홍 → 보라) -->
    <g data-diff="11" data-level="2" data-cx="870" data-cy="236" data-r="50">
      <ellipse cx="858" cy="236" rx="10" ry="14" transform="rotate(-24 858 236)" fill="${D2 ? '#C77DFF' : '#FFB0D8'}"/>
      <ellipse cx="882" cy="236" rx="10" ry="14" transform="rotate(24 882 236)" fill="${D2 ? '#C77DFF' : '#FF8FC7'}"/>
    </g>
    <rect x="866" y="204" width="8" height="42" rx="4" fill="#6B4A7A"/>
    <path d="M868 206 Q860 192 852 190 M872 206 Q880 192 888 190" stroke="#6B4A7A" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 나뭇잎 (나무 아래 풀밭, 초록 보호색) -->
  <g data-find="leaf" data-label="나뭇잎" data-level="3">
    <path d="M1092 538 Q1106 522 1122 534 Q1114 554 1094 550 Z" fill="#6BB55A"/>
    <path d="M1096 546 Q1106 538 1116 536" stroke="#4E8C40" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 연못 -->
  <g>
    <ellipse cx="1010" cy="726" rx="168" ry="54" fill="#7BC8E8"/>
    <ellipse cx="1010" cy="726" rx="168" ry="54" fill="none" stroke="#5FA8CC" stroke-width="5"/>
    <!-- ★차이14(L3): 물결 2개 → 1개 -->
    <g data-diff="14" data-level="3" data-cx="1060" data-cy="736" data-r="55">
      <path d="M930 726 Q960 716 990 726" stroke="#A8DFF2" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${D3 ? '' : '<path d="M1030 738 Q1060 728 1090 738" stroke="#A8DFF2" stroke-width="6" fill="none" stroke-linecap="round"/>'}
    </g>
  </g>

  <!-- 돼지 -->
  <g>
    <ellipse cx="880" cy="648" rx="66" ry="45" fill="#F7A8B8"/>
    <!-- ★차이13(L3): 왼쪽 귀 색 (진분홍 → 노랑) -->
    <g data-diff="13" data-level="3" data-cx="844" data-cy="608" data-r="40">
      <path d="M836 618 Q826 600 844 602 L852 614 Z" fill="${D3 ? '#F2C63C' : '#E88CA0'}"/>
    </g>
    <path d="M906 610 Q912 592 926 600 L918 614 Z" fill="#E88CA0"/>
    <circle cx="856" cy="632" r="6" fill="#5E3844"/><circle cx="892" cy="628" r="6" fill="#5E3844"/>
    <ellipse cx="874" cy="650" rx="17" ry="12" fill="#E88CA0"/>
    <circle cx="868" cy="650" r="3.5" fill="#B85E74"/><circle cx="880" cy="650" r="3.5" fill="#B85E74"/>
    <rect x="842" y="680" width="16" height="22" rx="7" fill="#F7A8B8"/>
    <rect x="898" y="680" width="16" height="22" rx="7" fill="#F7A8B8"/>
    <path d="M944 640 Q960 632 954 648 Q948 660 958 656" stroke="#E88CA0" stroke-width="7" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 텃밭 -->
  <g>
    <rect x="60" y="640" width="310" height="122" rx="20" fill="#9C6B3F"/>
    <rect x="60" y="640" width="310" height="122" rx="20" fill="none" stroke="#7E5430" stroke-width="6"/>
    <line x1="86" y1="682" x2="344" y2="682" stroke="#7E5430" stroke-width="6" stroke-linecap="round"/>
    <line x1="86" y1="722" x2="344" y2="722" stroke="#7E5430" stroke-width="6" stroke-linecap="round"/>
    <g fill="#5FA84E">
      <path d="M110 668 q6 -18 12 0 z"/><path d="M200 668 q6 -18 12 0 z"/><path d="M300 668 q6 -18 12 0 z"/>
      <path d="M96 708 q6 -18 12 0 z"/>
    </g>
    <!-- ★차이10(L2): 새싹 하나 — B에서는 사라짐 -->
    <g data-diff="10" data-level="2" data-cx="262" data-cy="700" data-r="45">${D2 ? '' : '<path d="M256 708 q6 -18 12 0 z" fill="#5FA84E"/>'}
    </g>
  </g>

  <!-- 숨은그림 L2: 호박 (텃밭 흙 위) -->
  <g data-find="pumpkin" data-label="호박" data-level="2">
    <ellipse cx="330" cy="702" rx="21" ry="16" fill="#E8853C"/>
    <path d="M322 688 Q322 716 322 716 M338 688 Q338 716 338 716" stroke="#C46A28" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M330 686 Q328 676 336 674" stroke="#5E8C3A" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 지렁이 (텃밭 흙, 흙색 보호색) -->
  <g data-find="worm" data-label="지렁이" data-level="3">
    <path d="M222 734 Q232 724 242 734 Q252 744 262 734" stroke="#C88A6A" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="220" cy="733" r="2" fill="#5E3820"/>
  </g>

  <!-- 숨은그림 L1: 당근 (텃밭 이랑 사이) -->
  <g data-find="carrot" data-label="당근">
    <path d="M158 700 L172 748 L186 700 Z" fill="#F28C28"/>
    <path d="M162 706 L182 706 M166 720 L178 720" stroke="#D9731A" stroke-width="4" stroke-linecap="round"/>
    <path d="M164 700 Q158 682 148 680 M172 700 Q172 680 172 676 M180 700 Q186 682 196 680" stroke="#4DA644" stroke-width="6" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 닭 -->
  <g>
    <ellipse cx="420" cy="676" rx="42" ry="34" fill="#FFFFFF" stroke="#E4DCC8" stroke-width="4"/>
    <circle cx="452" cy="646" r="22" fill="#FFFFFF" stroke="#E4DCC8" stroke-width="4"/>
    <!-- ★차이8(L2): 닭 볏 색 (빨강 → 주황) -->
    <g data-diff="8" data-level="2" data-cx="456" data-cy="620" data-r="45">
      <path d="M444 626 Q444 614 452 620 Q454 610 462 618 Q468 610 470 622 Q460 628 452 626 Z" fill="${D2 ? '#F2A33C' : '#E8574B'}"/>
    </g>
    <circle cx="458" cy="642" r="5" fill="#3B3B3B"/>
    <polygon points="472,646 490,652 472,658" fill="#F2A33C"/>
    <path d="M388 664 Q368 652 372 672 Q360 668 366 684 Q378 690 392 682 Z" fill="#F2EDE2"/>
    <line x1="408" y1="708" x2="408" y2="726" stroke="#F2A33C" stroke-width="6" stroke-linecap="round"/>
    <line x1="432" y1="708" x2="432" y2="726" stroke="#F2A33C" stroke-width="6" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 달걀 (닭 아래 풀밭) -->
  <g data-find="egg" data-label="달걀" data-level="2">
    <ellipse cx="392" cy="726" rx="13" ry="17" fill="#FBF3E4" stroke="#E0D4BC" stroke-width="3"/>
  </g>

  <!-- 숨은그림 L3: 깃털 (닭 옆 풀밭) -->
  <g data-find="feather" data-label="깃털" data-level="3">
    <path d="M340 700 Q330 682 342 668 Q356 680 348 700 Q344 706 340 700 Z" fill="#F2EDE2" stroke="#D8CDB4" stroke-width="2"/>
    <line x1="344" y1="702" x2="344" y2="674" stroke="#D8CDB4" stroke-width="2"/>
  </g>

  <!-- 숨은그림 L3: 애벌레 (풀밭, 초록 보호색) -->
  <g data-find="caterpillar" data-label="애벌레" data-level="3">
    <circle cx="466" cy="744" r="7" fill="#8FD06A"/><circle cx="477" cy="742" r="7" fill="#7CC258"/>
    <circle cx="488" cy="744" r="7" fill="#8FD06A"/><circle cx="498" cy="748" r="8" fill="#7CC258"/>
    <circle cx="496" cy="746" r="1.8" fill="#2F4F2A"/><circle cx="502" cy="746" r="1.8" fill="#2F4F2A"/>
    <path d="M494 740 Q492 734 488 733 M502 740 Q504 734 508 733" stroke="#4E8C40" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 꽃밭 -->
  <g>
    ${[[262, 758], [312, 774], [668, 762]].map(([x, y]) => `
    <g>
      <circle cx="${x - 12}" cy="${y}" r="9" fill="#FF8FC7"/><circle cx="${x + 12}" cy="${y}" r="9" fill="#FF8FC7"/>
      <circle cx="${x}" cy="${y - 12}" r="9" fill="#FF8FC7"/><circle cx="${x}" cy="${y + 12}" r="9" fill="#FF8FC7"/>
      <circle cx="${x}" cy="${y}" r="8" fill="#FFD93D"/>
    </g>`).join('')}
    <!-- ★차이17(L3): 작은 꽃 꽃잎 색 (진분홍 → 연분홍) -->
    <g data-diff="17" data-level="3" data-cx="566" data-cy="756" data-r="42">
      <circle cx="554" cy="756" r="9" fill="${D3 ? '#FFC9E2' : '#FF8FC7'}"/><circle cx="578" cy="756" r="9" fill="${D3 ? '#FFC9E2' : '#FF8FC7'}"/>
      <circle cx="566" cy="744" r="9" fill="${D3 ? '#FFC9E2' : '#FF8FC7'}"/><circle cx="566" cy="768" r="9" fill="${D3 ? '#FFC9E2' : '#FF8FC7'}"/>
      <circle cx="566" cy="756" r="8" fill="#FFD93D"/>
    </g>
    <!-- ★차이5(L1): 큰 꽃 색 (분홍 → 노랑) -->
    <g data-diff="5" data-cx="500" data-cy="738" data-r="60">
      <line x1="500" y1="742" x2="500" y2="782" stroke="#4DA644" stroke-width="7" stroke-linecap="round"/>
      <circle cx="482" cy="738" r="13" fill="${D1 ? '#FFD93D' : '#FF8FC7'}"/><circle cx="518" cy="738" r="13" fill="${D1 ? '#FFD93D' : '#FF8FC7'}"/>
      <circle cx="500" cy="720" r="13" fill="${D1 ? '#FFD93D' : '#FF8FC7'}"/><circle cx="500" cy="756" r="13" fill="${D1 ? '#FFD93D' : '#FF8FC7'}"/>
      <circle cx="487" cy="725" r="11" fill="${D1 ? '#FFE68A' : '#FFB0D8'}"/><circle cx="513" cy="725" r="11" fill="${D1 ? '#FFE68A' : '#FFB0D8'}"/>
      <circle cx="487" cy="751" r="11" fill="${D1 ? '#FFE68A' : '#FFB0D8'}"/><circle cx="513" cy="751" r="11" fill="${D1 ? '#FFE68A' : '#FFB0D8'}"/>
      <circle cx="500" cy="738" r="11" fill="#F2A33C"/>
    </g>
  </g>

  <!-- 숨은그림 L3: 리본 (꽃밭 사이, 분홍 보호색) -->
  <g data-find="ribbon" data-label="리본" data-level="3">
    <path d="M296 748 L282 740 L282 756 Z" fill="#FF6FA8"/>
    <path d="M296 748 L310 740 L310 756 Z" fill="#FF6FA8"/>
    <circle cx="296" cy="748" r="5" fill="#E04D88"/>
  </g>

  <!-- 숨은그림 L3: 네잎클로버 (풀밭, 초록 보호색) -->
  <g data-find="clover" data-label="네잎클로버" data-level="3">
    <circle cx="614" cy="750" r="7" fill="#4DA644"/><circle cx="626" cy="750" r="7" fill="#4DA644"/>
    <circle cx="620" cy="744" r="7" fill="#4DA644"/><circle cx="620" cy="756" r="7" fill="#4DA644"/>
    <line x1="620" y1="758" x2="618" y2="772" stroke="#3D8536" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 꿀벌 (큰 꽃 옆) -->
  <g data-find="bee" data-label="꿀벌" data-level="2">
    <ellipse cx="536" cy="700" rx="13" ry="9" fill="#FFD93D"/>
    <path d="M530 692 L530 708 M538 691 L538 709" stroke="#3B3B3B" stroke-width="4" stroke-linecap="round"/>
    <circle cx="547" cy="698" r="5" fill="#3B3B3B"/>
    <ellipse cx="528" cy="688" rx="6" ry="4" transform="rotate(-30 528 688)" fill="#D6F0FF" opacity="0.9"/>
    <ellipse cx="538" cy="686" rx="6" ry="4" transform="rotate(-10 538 686)" fill="#D6F0FF" opacity="0.9"/>
  </g>

  <!-- 숨은그림 L1: 병아리 (꽃밭 사이) -->
  <g data-find="chick" data-label="병아리">
    <circle cx="352" cy="742" r="20" fill="#FFE04D"/>
    <circle cx="366" cy="726" r="14" fill="#FFE04D"/>
    <circle cx="370" cy="723" r="3.5" fill="#3B3B3B"/>
    <polygon points="379,727 391,731 379,735" fill="#F2A33C"/>
    <path d="M340 742 Q332 736 336 748 Z" fill="#F2C63C"/>
    <line x1="346" y1="760" x2="346" y2="770" stroke="#F2A33C" stroke-width="4" stroke-linecap="round"/>
    <line x1="358" y1="760" x2="358" y2="770" stroke="#F2A33C" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`;
  },

  hidden: [
    /* ── L1: 쉬움 (6) ── */
    {
      id: 'dog', label: '강아지',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 22 Q8 4 22 8 L26 18 Z" fill="#8A5A2E"/><path d="M46 22 Q52 4 38 8 L34 18 Z" fill="#8A5A2E"/>
        <circle cx="30" cy="32" r="20" fill="#A9743F"/>
        <circle cx="23" cy="28" r="3.5" fill="#3B2A18"/><circle cx="37" cy="28" r="3.5" fill="#3B2A18"/>
        <ellipse cx="30" cy="38" rx="5.5" ry="4" fill="#3B2A18"/>
        <path d="M25 44 Q30 48 35 44" stroke="#3B2A18" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'chick', label: '병아리',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="27" cy="36" r="16" fill="#FFE04D"/><circle cx="38" cy="22" r="11" fill="#FFE04D"/>
        <circle cx="41" cy="20" r="2.8" fill="#3B3B3B"/><polygon points="48,23 57,26 48,29" fill="#F2A33C"/>
        <line x1="22" y1="51" x2="22" y2="57" stroke="#F2A33C" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="32" y1="51" x2="32" y2="57" stroke="#F2A33C" stroke-width="3.5" stroke-linecap="round"/></svg>`
    },
    {
      id: 'carrot', label: '당근',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 20 L30 54 L38 20 Z" fill="#F28C28"/>
        <path d="M24 26 L36 26 M26 36 L34 36" stroke="#D9731A" stroke-width="3" stroke-linecap="round"/>
        <path d="M25 20 Q20 8 12 6 M30 20 Q30 8 30 5 M35 20 Q40 8 48 6" stroke="#4DA644" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'hat', label: '밀짚모자',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="38" rx="26" ry="8" fill="#E8C05A"/>
        <path d="M16 38 Q16 18 30 18 Q44 18 44 38 Z" fill="#F2D178"/>
        <path d="M16 34 Q30 40 44 34" stroke="#C99B3A" stroke-width="4" fill="none"/></svg>`
    },
    {
      id: 'butterfly', label: '나비',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="19" cy="24" rx="11" ry="16" transform="rotate(-28 19 24)" fill="#FF8FC7"/>
        <ellipse cx="41" cy="24" rx="11" ry="16" transform="rotate(28 41 24)" fill="#FFB0D8"/>
        <ellipse cx="21" cy="42" rx="8" ry="11" transform="rotate(-24 21 42)" fill="#FFB0D8"/>
        <ellipse cx="39" cy="42" rx="8" ry="11" transform="rotate(24 39 42)" fill="#FF8FC7"/>
        <rect x="27" y="18" width="6" height="32" rx="3" fill="#6B4A7A"/>
        <path d="M29 20 Q23 8 17 6 M31 20 Q37 8 43 6" stroke="#6B4A7A" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'can', label: '물뿌리개',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 22 Q18 14 26 14 L44 14 Q52 14 51 22 L48 46 Q47 52 40 52 L28 52 Q21 52 20 46 Z" fill="#4FA8A0"/>
        <path d="M21 20 L6 10 L3 18 L19 28 Z" fill="#4FA8A0"/><circle cx="5" cy="13" r="5" fill="#3D8781"/>
        <path d="M50 22 Q60 28 56 42" stroke="#3D8781" stroke-width="5" fill="none" stroke-linecap="round"/>
        <ellipse cx="34" cy="17" rx="13" ry="4" fill="#3D8781"/></svg>`
    },
    /* ── L2: 보통 (7) ── */
    {
      id: 'mouse', label: '생쥐', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="32" cy="36" rx="20" ry="14" fill="#B8B2C4"/>
        <circle cx="16" cy="28" r="9" fill="#B8B2C4"/><circle cx="12" cy="24" r="5" fill="#D8CFE0"/>
        <circle cx="14" cy="30" r="2" fill="#3B3B3B"/>
        <path d="M50 38 Q58 32 54 22" stroke="#9C93AC" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'frog', label: '개구리', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="38" rx="22" ry="15" fill="#6DBF5A"/>
        <circle cx="20" cy="22" r="8" fill="#6DBF5A"/><circle cx="40" cy="22" r="8" fill="#6DBF5A"/>
        <circle cx="20" cy="21" r="3.5" fill="#2F4F2A"/><circle cx="40" cy="21" r="3.5" fill="#2F4F2A"/>
        <path d="M22 42 Q30 48 38 42" stroke="#2F4F2A" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'bird', label: '파랑새', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="28" cy="36" rx="18" ry="14" fill="#5FA8E8"/>
        <circle cx="43" cy="24" r="10" fill="#5FA8E8"/><circle cx="46" cy="22" r="2.5" fill="#2A3B5E"/>
        <polygon points="52,25 60,28 52,31" fill="#F2A33C"/>
        <path d="M18 34 Q10 28 14 42 Z" fill="#3F84C4"/></svg>`
    },
    {
      id: 'bee', label: '꿀벌', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="36" rx="18" ry="13" fill="#FFD93D"/>
        <path d="M22 25 L22 47 M32 24 L32 48" stroke="#3B3B3B" stroke-width="5" stroke-linecap="round"/>
        <circle cx="46" cy="33" r="7" fill="#3B3B3B"/>
        <ellipse cx="20" cy="18" rx="8" ry="5" transform="rotate(-30 20 18)" fill="#D6F0FF"/>
        <ellipse cx="34" cy="16" rx="8" ry="5" transform="rotate(-10 34 16)" fill="#D6F0FF"/></svg>`
    },
    {
      id: 'bucket', label: '양동이', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 22 L46 22 L40 52 L20 52 Z" fill="#D9A94F" stroke="#B8863A" stroke-width="3"/>
        <path d="M16 22 Q30 4 44 22" stroke="#B8863A" stroke-width="4" fill="none"/>
        <ellipse cx="30" cy="22" rx="16" ry="5" fill="#EFC97E"/></svg>`
    },
    {
      id: 'egg', label: '달걀', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="34" rx="16" ry="21" fill="#FBF3E4" stroke="#E0D4BC" stroke-width="3"/>
        <ellipse cx="24" cy="26" rx="4" ry="6" fill="#FFFFFF"/></svg>`
    },
    {
      id: 'pumpkin', label: '호박', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="36" rx="22" ry="17" fill="#E8853C"/>
        <path d="M21 21 Q21 51 21 51 M39 21 Q39 51 39 51" stroke="#C46A28" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M30 19 Q28 8 38 6" stroke="#5E8C3A" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`
    },
    /* ── L3: 어려움 (8) ── */
    {
      id: 'clover', label: '네잎클로버', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="21" cy="27" r="10" fill="#4DA644"/><circle cx="39" cy="27" r="10" fill="#4DA644"/>
        <circle cx="30" cy="18" r="10" fill="#4DA644"/><circle cx="30" cy="36" r="10" fill="#4DA644"/>
        <line x1="30" y1="40" x2="26" y2="56" stroke="#3D8536" stroke-width="4" stroke-linecap="round"/></svg>`
    },
    {
      id: 'key', label: '열쇠', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="24" r="11" fill="none" stroke="#D9A93C" stroke-width="6"/>
        <line x1="27" y1="30" x2="52" y2="44" stroke="#D9A93C" stroke-width="6" stroke-linecap="round"/>
        <line x1="43" y1="40" x2="40" y2="50" stroke="#D9A93C" stroke-width="5" stroke-linecap="round"/>
        <line x1="52" y1="44" x2="49" y2="54" stroke="#D9A93C" stroke-width="5" stroke-linecap="round"/></svg>`
    },
    {
      id: 'button', label: '단추', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="22" fill="#C7362B" stroke="#A32A20" stroke-width="4"/>
        <circle cx="23" cy="23" r="3.5" fill="#7E1F17"/><circle cx="37" cy="23" r="3.5" fill="#7E1F17"/>
        <circle cx="23" cy="37" r="3.5" fill="#7E1F17"/><circle cx="37" cy="37" r="3.5" fill="#7E1F17"/></svg>`
    },
    {
      id: 'feather', label: '깃털', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M26 52 Q10 30 30 8 Q52 28 34 52 Q30 58 26 52 Z" fill="#F2EDE2" stroke="#D8CDB4" stroke-width="3"/>
        <line x1="30" y1="54" x2="30" y2="14" stroke="#D8CDB4" stroke-width="3"/></svg>`
    },
    {
      id: 'caterpillar', label: '애벌레', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="38" r="8" fill="#8FD06A"/><circle cx="24" cy="35" r="8" fill="#7CC258"/>
        <circle cx="36" cy="38" r="8" fill="#8FD06A"/><circle cx="47" cy="42" r="9" fill="#7CC258"/>
        <circle cx="45" cy="40" r="2" fill="#2F4F2A"/><circle cx="51" cy="40" r="2" fill="#2F4F2A"/>
        <path d="M44 33 Q42 26 38 25 M52 33 Q54 26 58 25" stroke="#4E8C40" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'ribbon', label: '리본', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 30 L8 18 L8 42 Z" fill="#FF6FA8"/>
        <path d="M30 30 L52 18 L52 42 Z" fill="#FF6FA8"/>
        <circle cx="30" cy="30" r="7" fill="#E04D88"/></svg>`
    },
    {
      id: 'worm', label: '지렁이', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 38 Q18 22 28 38 Q38 54 48 38" stroke="#C88A6A" stroke-width="10" fill="none" stroke-linecap="round"/>
        <circle cx="8" cy="36" r="2.5" fill="#5E3820"/></svg>`
    },
    {
      id: 'leaf', label: '나뭇잎', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 44 Q16 14 48 12 Q46 46 18 48 Z" fill="#6BB55A"/>
        <path d="M16 44 Q28 32 44 16" stroke="#4E8C40" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    }
  ],

  sticker: {
    name: '젖소 스티커',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#FFF7DE" stroke="#FFD93D" stroke-width="7"/>
      <path d="M34 34 Q22 22 36 20 L46 30 Z" fill="#E8DFD2"/><path d="M86 34 Q98 22 84 20 L74 30 Z" fill="#E8DFD2"/>
      <circle cx="60" cy="58" r="32" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="4"/>
      <path d="M40 42 Q52 36 54 48 Q52 58 42 54 Q36 48 40 42 Z" fill="#3B3B3B"/>
      <circle cx="50" cy="56" r="4.5" fill="#3B3B3B"/><circle cx="70" cy="56" r="4.5" fill="#3B3B3B"/>
      <ellipse cx="60" cy="74" rx="18" ry="12" fill="#F5B8C4"/>
      <circle cx="54" cy="73" r="3" fill="#D98B9C"/><circle cx="66" cy="73" r="3" fill="#D98B9C"/></svg>`
  }
});
