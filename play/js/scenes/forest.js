/* 테마: 숲 — 찾기 놀이터 (난이도 3레벨)
 * 계약:
 *  - buildScene('A'|'B', 1|2|3) → viewBox="0 0 1200 800" SVG 문자열
 *  - 숨은그림: L1 6개·L2 7개·L3 8개 = 총 21개. 모든 레벨 대상을 항상 그린다(하위 레벨에선 장식)
 *    <g data-find="id" data-label="이름" data-level="2">  (data-level 없으면 1)
 *    크기: L1 40~90px, L2 28~55px(보호색·부분 가림), L3 20~40px(강한 보호색)
 *  - 다른그림: L1 5개(id 1~5)·L2 6개(id 6~11)·L3 7개(id 12~18). 마커 그룹은 항상 출력하되
 *    내용 차이는 해당 레벨의 B에서만 적용: const D1=!A&&L===1 …
 *    <g data-diff="6" data-level="2" data-cx=".." data-cy=".." data-r=".."> (속성 순서 고정, L1은 data-level 생략)
 *  - defs/그라디언트/url(#…) 금지 — 단색 fill만. 백틱 금지(템플릿 리터럴 내부)
 */
window.SCENES = window.SCENES || [];

SCENES.push({
  id: 'forest',
  name: '숲',
  emoji: '🦊',
  bg: '#E4F3D8',

  buildScene(v, level) {
    const A = v === 'A';
    const L = +level || 1;
    const D1 = !A && L === 1, D2 = !A && L === 2, D3 = !A && L === 3;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
  <!-- 하늘 (단색 레이어) -->
  <rect x="0" y="0" width="1200" height="560" fill="#B4E4F7"/>
  <rect x="0" y="300" width="1200" height="260" fill="#CDEFFA" opacity="0.55"/>

  <!-- 해 -->
  <g>
    <circle cx="112" cy="100" r="54" fill="#FFD93D"/>
    <g stroke="#FFD93D" stroke-width="10" stroke-linecap="round">
      <line x1="112" y1="16" x2="112" y2="34"/><line x1="112" y1="166" x2="112" y2="184"/>
      <line x1="28" y1="100" x2="46" y2="100"/><line x1="178" y1="100" x2="196" y2="100"/>
      <line x1="52" y1="40" x2="65" y2="53"/><line x1="159" y1="147" x2="172" y2="160"/>
      <line x1="172" y1="40" x2="159" y2="53"/><line x1="65" y1="147" x2="52" y2="160"/>
    </g>
    <circle cx="96" cy="92" r="6.5" fill="#E8A800"/><circle cx="128" cy="92" r="6.5" fill="#E8A800"/>
    <!-- ★차이12(L3): 해 입 모양 (웃는 입 → 동그란 입) -->
    <g data-diff="12" data-level="3" data-cx="112" data-cy="116" data-r="45">${D3
      ? '<circle cx="112" cy="118" r="8" fill="#E8A800"/>'
      : '<path d="M96 116 Q112 130 128 116" stroke="#E8A800" stroke-width="6" fill="none" stroke-linecap="round"/>'}
    </g>
  </g>

  <!-- 구름 1 (고정) -->
  <g fill="#FFFFFF" opacity="0.95">
    <circle cx="420" cy="98" r="30"/><circle cx="462" cy="82" r="38"/><circle cx="504" cy="100" r="28"/>
    <rect x="410" y="92" width="104" height="36" rx="18"/>
  </g>
  <!-- ★차이6(L2): 작은 구름 — B에서는 사라짐 -->
  <g data-diff="6" data-level="2" data-cx="670" data-cy="62" data-r="55">${D2 ? '' : `
    <g fill="#FFFFFF" opacity="0.9">
      <circle cx="640" cy="62" r="22"/><circle cx="672" cy="52" r="28"/><circle cx="704" cy="64" r="20"/>
      <rect x="632" y="58" width="80" height="26" rx="13"/>
    </g>`}
  </g>

  <!-- ★차이4(L1): 파랑새 — B에서는 위쪽 1마리 사라짐 -->
  <g data-diff="4" data-cx="795" data-cy="130" data-r="80">${D1 ? '' : `
    <g>
      <ellipse cx="842" cy="112" rx="22" ry="17" fill="#7BAFE0"/>
      <path d="M834 106 Q822 90 840 94 Q848 98 844 108 Z" fill="#5E90C9"/>
      <circle cx="854" cy="105" r="3.5" fill="#2F3B52"/>
      <polygon points="863,109 875,113 863,117" fill="#F2A33C"/>
      <path d="M824 118 Q812 114 816 126 Z" fill="#5E90C9"/>
    </g>`}
    <g>
      <ellipse cx="760" cy="140" rx="22" ry="17" fill="#7BAFE0"/>
      <path d="M752 134 Q740 118 758 122 Q766 126 762 136 Z" fill="#5E90C9"/>
      <circle cx="772" cy="133" r="3.5" fill="#2F3B52"/>
      <polygon points="781,137 793,141 781,145" fill="#F2A33C"/>
      <path d="M742 146 Q730 142 734 154 Z" fill="#5E90C9"/>
    </g>
  </g>

  <!-- 뒷숲 나무들 (원경 레이어) -->
  <g fill="#BCE3AA">
    <circle cx="60" cy="480" r="66"/><circle cx="180" cy="470" r="72"/><circle cx="310" cy="482" r="62"/>
    <circle cx="430" cy="468" r="70"/><circle cx="555" cy="480" r="64"/><circle cx="760" cy="474" r="70"/>
    <circle cx="880" cy="484" r="60"/><circle cx="1090" cy="470" r="72"/><circle cx="1180" cy="486" r="58"/>
  </g>
  <g fill="#B0DD9E">
    <circle cx="120" cy="492" r="58"/><circle cx="370" cy="494" r="56"/><circle cx="660" cy="490" r="62"/>
    <circle cx="985" cy="492" r="64"/><circle cx="1150" cy="500" r="52"/>
  </g>

  <!-- 풀밭 -->
  <path d="M0 505 Q300 468 600 500 Q900 532 1200 492 L1200 800 L0 800 Z" fill="#A9DC8C"/>
  <path d="M0 645 Q400 602 800 652 Q1010 676 1200 640 L1200 800 L0 800 Z" fill="#8BCF6B"/>

  <!-- 가운데 작은 나무 (뒤) -->
  <g>
    <rect x="598" y="352" width="40" height="150" rx="14" fill="#A9743F"/>
    <!-- ★차이3(L1): 작은 나무 잎 색 (초록 → 주황) -->
    <g data-diff="3" data-cx="640" data-cy="300" data-r="95">
      <circle cx="586" cy="322" r="52" fill="${D1 ? '#F2A33C' : '#7CC46B'}"/>
      <circle cx="642" cy="288" r="60" fill="${D1 ? '#F7B85C' : '#8FD07E'}"/>
      <circle cx="694" cy="328" r="48" fill="${D1 ? '#F2A33C' : '#7CC46B'}"/>
      <circle cx="640" cy="342" r="44" fill="${D1 ? '#F7B85C' : '#8FD07E'}"/>
    </g>
  </g>

  <!-- 왼쪽 큰 나무 -->
  <g>
    <rect x="105" y="280" width="52" height="290" rx="18" fill="#8B5A2B"/>
    <path d="M131 380 Q131 340 131 320 M131 430 Q118 416 110 410" stroke="#6E441F" stroke-width="6" fill="none" stroke-linecap="round"/>
    <!-- ★차이16(L3): 나무껍질 홈 하나 — B에서는 사라짐 -->
    <g data-diff="16" data-level="3" data-cx="142" data-cy="452" data-r="40">${D3 ? '' : '<path d="M131 460 Q146 448 152 444" stroke="#6E441F" stroke-width="6" fill="none" stroke-linecap="round"/>'}
    </g>
    <rect x="150" y="452" width="88" height="20" rx="10" fill="#8B5A2B"/>
    <circle cx="92" cy="238" r="66" fill="#5FA84E"/>
    <circle cx="168" cy="188" r="80" fill="#6BB55A"/>
    <circle cx="244" cy="244" r="62" fill="#5FA84E"/>
    <circle cx="162" cy="266" r="58" fill="#6BB55A"/>
  </g>

  <!-- 숨은그림 L3: 나방 (나무껍질 위, 갈색 보호색) -->
  <g data-find="moth" data-label="나방" data-level="3">
    <ellipse cx="122" cy="324" rx="9" ry="12" transform="rotate(-30 122 324)" fill="#9C7448"/>
    <ellipse cx="138" cy="324" rx="9" ry="12" transform="rotate(30 138 324)" fill="#8B6238"/>
    <ellipse cx="130" cy="328" rx="4" ry="10" fill="#6E522F"/>
    <circle cx="121" cy="322" r="2" fill="#6E522F"/><circle cx="139" cy="322" r="2" fill="#6E522F"/>
    <path d="M128 319 Q125 312 121 310 M132 319 Q135 312 139 310" stroke="#6E522F" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 반딧불이 (나뭇잎 그늘 사이) -->
  <g data-find="firefly" data-label="반딧불이" data-level="2">
    <circle cx="222" cy="172" r="8" fill="#FFE04D"/>
    <ellipse cx="222" cy="158" rx="7" ry="10" fill="#4A3B28"/>
    <ellipse cx="213" cy="150" rx="7" ry="4" transform="rotate(-35 213 150)" fill="#D6F0FF" opacity="0.85"/>
    <ellipse cx="231" cy="150" rx="7" ry="4" transform="rotate(35 231 150)" fill="#D6F0FF" opacity="0.85"/>
    <path d="M219 149 Q216 142 211 140 M225 149 Q228 142 233 140" stroke="#4A3B28" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 솔방울 (왼쪽 나무 밑동 옆, 갈색 보호색) -->
  <g data-find="pinecone" data-label="솔방울" data-level="2">
    <line x1="140" y1="596" x2="140" y2="590" stroke="#6E441F" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="140" cy="614" rx="13" ry="18" fill="#A5793F"/>
    <path d="M129 604 Q140 610 151 604 M128 614 Q140 620 152 614 M130 624 Q140 630 150 624" stroke="#7E5B2E" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L1: 다람쥐 (왼쪽 나뭇가지 위) -->
  <g data-find="squirrel" data-label="다람쥐">
    <path d="M232 448 Q262 442 258 408 Q254 384 230 392 Q244 400 240 418 Q236 438 216 440 Z" fill="#D98B4A"/>
    <ellipse cx="200" cy="430" rx="26" ry="23" fill="#C4763B"/>
    <circle cx="182" cy="410" r="16" fill="#C4763B"/>
    <path d="M172 400 Q166 386 180 390 L184 398 Z" fill="#A85C28"/>
    <circle cx="177" cy="408" r="3.5" fill="#3B2A18"/>
    <circle cx="169" cy="415" r="3" fill="#8A4A1C"/>
    <path d="M172 420 Q177 424 182 420" stroke="#3B2A18" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="196" cy="440" rx="12" ry="14" fill="#F2D1A8"/>
  </g>

  <!-- 오른쪽 큰 나무 -->
  <g>
    <rect x="922" y="248" width="58" height="330" rx="20" fill="#8B5A2B"/>
    <path d="M951 320 Q951 290 951 276" stroke="#6E441F" stroke-width="6" fill="none" stroke-linecap="round"/>
    <!-- ★차이14(L3): 아래쪽 나무껍질 홈 — B에서는 사라짐 -->
    <g data-diff="14" data-level="3" data-cx="940" data-cy="470" data-r="45">${D3 ? '' : '<path d="M951 480 Q936 468 928 462" stroke="#6E441F" stroke-width="6" fill="none" stroke-linecap="round"/>'}
    </g>
    <circle cx="884" cy="206" r="70" fill="#5FA84E"/>
    <circle cx="962" cy="156" r="84" fill="#6BB55A"/>
    <circle cx="1042" cy="212" r="66" fill="#5FA84E"/>
    <circle cx="958" cy="238" r="58" fill="#6BB55A"/>
  </g>

  <!-- 숨은그림 L2: 딱따구리 (오른쪽 나무 줄기에 붙어 있음) -->
  <g data-find="woodpecker" data-label="딱따구리" data-level="2">
    <path d="M942 338 Q938 348 946 345 L951 340 Z" fill="#4A3828"/>
    <ellipse cx="947" cy="325" rx="10" ry="15" fill="#5E4630"/>
    <ellipse cx="951" cy="328" rx="5" ry="9" fill="#E8D5B8"/>
    <circle cx="942" cy="306" r="8" fill="#5E4630"/>
    <path d="M936 300 Q942 293 948 300 L946 305 L938 305 Z" fill="#D8574B"/>
    <circle cx="939" cy="305" r="2" fill="#F5EFE0"/>
    <polygon points="934,307 924,310 934,312" fill="#3B2A18"/>
  </g>

  <!-- 숨은그림 L3: 거미줄 (오른쪽 나뭇잎 가장자리, 옅은 색) -->
  <g data-find="spiderweb" data-label="거미줄" data-level="3">
    <g stroke="#DCEEF8" stroke-width="2" fill="none" opacity="0.9">
      <line x1="1000" y1="240" x2="1000" y2="276"/>
      <line x1="982" y1="258" x2="1018" y2="258"/>
      <line x1="987" y1="245" x2="1013" y2="271"/>
      <line x1="1013" y1="245" x2="987" y2="271"/>
      <circle cx="1000" cy="258" r="7"/>
      <circle cx="1000" cy="258" r="13"/>
    </g>
    <circle cx="1005" cy="263" r="2.5" fill="#4A3828"/>
  </g>

  <!-- 숨은그림 L1: 부엉이 (나무 구멍 속) -->
  <g data-find="owl" data-label="부엉이">
    <ellipse cx="951" cy="392" rx="34" ry="42" fill="#4A3018"/>
    <path d="M932 366 Q926 352 940 358 L944 366 Z" fill="#A5793F"/>
    <path d="M970 366 Q976 352 962 358 L958 366 Z" fill="#A5793F"/>
    <ellipse cx="951" cy="392" rx="26" ry="30" fill="#C9A06A"/>
    <circle cx="941" cy="384" r="9.5" fill="#FFF7E8"/><circle cx="961" cy="384" r="9.5" fill="#FFF7E8"/>
    <circle cx="941" cy="385" r="4.5" fill="#3B2A18"/><circle cx="961" cy="385" r="4.5" fill="#3B2A18"/>
    <polygon points="946,396 951,403 956,396" fill="#F2A33C"/>
    <path d="M917 412 Q951 442 985 412 L985 436 L917 436 Z" fill="#4A3018"/>
  </g>

  <!-- 개울 -->
  <g>
    <path d="M755 800 Q795 702 900 668 Q1010 636 1200 648 L1200 800 Z" fill="#7BC8E8"/>
    <path d="M755 800 Q795 702 900 668 Q1010 636 1200 648" fill="none" stroke="#5FA8CC" stroke-width="6" stroke-linecap="round"/>
    <path d="M860 710 Q890 700 920 708 M1090 668 Q1120 660 1150 666 M900 756 Q930 746 960 754" stroke="#A8DFF2" stroke-width="6" fill="none" stroke-linecap="round"/>
    <!-- ★차이8(L2): 물결 하나 — B에서는 사라짐 -->
    <g data-diff="8" data-level="2" data-cx="1010" data-cy="675" data-r="50">${D2 ? '' : '<path d="M980 680 Q1010 670 1040 678" stroke="#A8DFF2" stroke-width="6" fill="none" stroke-linecap="round"/>'}
    </g>
    <ellipse cx="792" cy="756" rx="26" ry="16" fill="#C9CBB8"/>
    <!-- ★차이11(L2): 큰 바위 색 (연회색 → 회청색) -->
    <g data-diff="11" data-level="2" data-cx="1052" data-cy="722" data-r="45">
      <ellipse cx="1052" cy="722" rx="30" ry="18" fill="${D2 ? '#9FB8CC' : '#DADCCB'}"/>
    </g>
  </g>

  <!-- 숨은그림 L2: 물고기 (개울 물속, 물색 보호색) -->
  <g data-find="fish" data-label="물고기" data-level="2">
    <polygon points="900,722 889,713 889,731" fill="#4A90B8"/>
    <ellipse cx="920" cy="722" rx="20" ry="10" fill="#5FA0C4"/>
    <path d="M914 714 Q920 706 926 714 Z" fill="#4A90B8"/>
    <circle cx="931" cy="719" r="3" fill="#F5F9FC"/><circle cx="932" cy="719" r="1.6" fill="#1F3B52"/>
    <path d="M908 722 Q914 728 920 722" stroke="#4A90B8" stroke-width="2.5" fill="none"/>
  </g>

  <!-- 숨은그림 L1: 도토리 (오른쪽 나무 아래 풀밭) -->
  <g data-find="acorn" data-label="도토리">
    <path d="M846 624 Q846 604 868 604 Q890 604 890 624 Q890 648 868 654 Q846 648 846 624 Z" fill="#C9A06A"/>
    <path d="M840 616 Q840 596 868 596 Q896 596 896 616 Q896 624 868 624 Q840 624 840 616 Z" fill="#8B5A2B"/>
    <line x1="868" y1="596" x2="868" y2="584" stroke="#6E441F" stroke-width="6" stroke-linecap="round"/>
    <path d="M856 634 Q868 640 880 634" stroke="#A5793F" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 토끼 -->
  <g>
    <ellipse cx="688" cy="522" rx="10" ry="27" fill="#F7F3EC"/>
    <ellipse cx="714" cy="522" rx="10" ry="27" fill="#F7F3EC"/>
    <!-- ★차이7(L2): 토끼 귀 안쪽 색 (분홍 → 하늘색) -->
    <g data-diff="7" data-level="2" data-cx="701" data-cy="522" data-r="50">
      <ellipse cx="688" cy="526" rx="5" ry="18" fill="${D2 ? '#A8D8F0' : '#F5C4CE'}"/>
      <ellipse cx="714" cy="526" rx="5" ry="18" fill="${D2 ? '#A8D8F0' : '#F5C4CE'}"/>
    </g>
    <circle cx="701" cy="565" r="25" fill="#F7F3EC"/>
    <circle cx="692" cy="560" r="4" fill="#3B3B3B"/><circle cx="710" cy="560" r="4" fill="#3B3B3B"/>
    <ellipse cx="701" cy="572" rx="5" ry="4" fill="#F090A8"/>
    <path d="M694 580 Q701 585 708 580" stroke="#3B3B3B" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="701" cy="608" rx="30" ry="25" fill="#F7F3EC"/>
    <!-- ★차이18(L3): 토끼 왼쪽 발 색 (크림 → 연분홍) -->
    <g data-diff="18" data-level="3" data-cx="682" data-cy="626" data-r="40">
      <ellipse cx="682" cy="626" rx="12" ry="8" fill="${D3 ? '#F2C8D2' : '#EFE8DC'}"/>
    </g>
    <ellipse cx="720" cy="626" rx="12" ry="8" fill="#EFE8DC"/>
  </g>

  <!-- 그루터기 -->
  <g>
    <path d="M128 662 L128 712 Q128 728 176 728 Q224 728 224 712 L224 662 Z" fill="#A9743F"/>
    <ellipse cx="176" cy="662" rx="48" ry="20" fill="#D9B98C"/>
    <ellipse cx="176" cy="662" rx="30" ry="12" fill="none" stroke="#B08D5B" stroke-width="4"/>
    <ellipse cx="176" cy="662" rx="14" ry="6" fill="none" stroke="#B08D5B" stroke-width="3"/>
    <path d="M136 690 L136 714 M216 690 L216 714" stroke="#8A5A2E" stroke-width="5" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 개미 (그루터기 옆면, 진갈색 보호색) -->
  <g data-find="ant" data-label="개미" data-level="3">
    <circle cx="146" cy="703" r="4" fill="#3B2412"/>
    <circle cx="154" cy="702" r="3.5" fill="#4A3018"/>
    <circle cx="163" cy="701" r="4.5" fill="#3B2412"/>
    <path d="M150 706 L147 712 M155 706 L154 712 M160 705 L162 711 M149 699 L145 694 M160 697 L163 692" stroke="#3B2412" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L1: 버섯 (그루터기 옆) -->
  <g data-find="mushroom" data-label="버섯">
    <rect x="252" y="688" width="24" height="34" rx="10" fill="#FFF3E0"/>
    <path d="M232 692 Q232 654 264 654 Q296 654 296 692 Q296 700 264 700 Q232 700 232 692 Z" fill="#E8574B"/>
    <circle cx="250" cy="676" r="6" fill="#FFF3E0"/>
    <circle cx="276" cy="672" r="7" fill="#FFF3E0"/>
    <circle cx="262" cy="688" r="4.5" fill="#FFF3E0"/>
  </g>

  <!-- 이파리 풀포기 + 숨은그림: 무당벌레 (잎 위) -->
  <g>
    <path d="M330 585 Q296 560 302 522 Q330 540 336 578 Z" fill="#5FA84E"/>
    <path d="M342 585 Q376 560 370 522 Q342 540 336 578 Z" fill="#6BB55A"/>
    <path d="M336 585 Q336 540 336 512" stroke="#4DA644" stroke-width="6" fill="none" stroke-linecap="round"/>
  </g>
  <!-- 숨은그림 L3: 이슬방울 (오른쪽 이파리 위, 옅은 물색) -->
  <g data-find="dewdrop" data-label="이슬방울" data-level="3">
    <path d="M356 546 Q365 558 365 564 Q365 572 356 572 Q347 572 347 564 Q347 558 356 546 Z" fill="#B8E0F2"/>
    <circle cx="352" cy="562" r="2.5" fill="#FFFFFF" opacity="0.9"/>
  </g>
  <g data-find="ladybug" data-label="무당벌레">
    <circle cx="336" cy="500" r="20" fill="#E8574B"/>
    <path d="M320 488 Q328 480 340 482 Q334 490 322 492 Z" fill="#3B3B3B"/>
    <circle cx="322" cy="486" r="8" fill="#3B3B3B"/>
    <line x1="340" y1="483" x2="352" y2="516" stroke="#3B3B3B" stroke-width="3"/>
    <circle cx="334" cy="496" r="3.5" fill="#3B3B3B"/><circle cx="348" cy="500" r="3.5" fill="#3B3B3B"/>
    <circle cx="340" cy="510" r="3.5" fill="#3B3B3B"/>
    <path d="M316 478 Q310 470 304 468 M324 474 Q322 466 318 460" stroke="#3B3B3B" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 여우 -->
  <g>
    <!-- ★차이1(L1): 여우 꼬리 색 (주황 → 청록) -->
    <g data-diff="1" data-cx="320" data-cy="615" data-r="70">
      <path d="M362 648 Q286 676 258 622 Q244 574 296 570 Q346 570 368 616 Z" fill="${D1 ? '#6FC3BE' : '#F2914B'}"/>
      <circle cx="276" cy="596" r="22" fill="${D1 ? '#DFF4F2' : '#FFE9D2'}"/>
    </g>
    <ellipse cx="420" cy="632" rx="76" ry="50" fill="#F2914B"/>
    <ellipse cx="436" cy="650" rx="38" ry="26" fill="#FFE9D2"/>
    <rect x="372" y="660" width="18" height="40" rx="8" fill="#E8763B"/>
    <rect x="452" y="660" width="18" height="40" rx="8" fill="#E8763B"/>
    <polygon points="444,540 458,498 478,532" fill="#F2914B"/>
    <polygon points="484,532 502,496 516,538" fill="#F2914B"/>
    <!-- ★차이9(L2): 여우 왼쪽 귀 안쪽 색 (크림 → 분홍) -->
    <g data-diff="9" data-level="2" data-cx="460" data-cy="524" data-r="42">
      <polygon points="452,534 459,512 469,530" fill="${D2 ? '#F5A8C0' : '#FFE9D2'}"/>
    </g>
    <polygon points="491,528 500,510 507,532" fill="#FFE9D2"/>
    <circle cx="480" cy="568" r="40" fill="#F2914B"/>
    <ellipse cx="463" cy="582" rx="17" ry="15" fill="#FFE9D2"/>
    <ellipse cx="497" cy="582" rx="17" ry="15" fill="#FFE9D2"/>
    <circle cx="466" cy="560" r="5" fill="#3B2A18"/><circle cx="494" cy="560" r="5" fill="#3B2A18"/>
    <!-- ★차이13(L3): 여우 코 색 (진갈색 → 분홍) -->
    <g data-diff="13" data-level="3" data-cx="480" data-cy="580" data-r="40">
      <ellipse cx="480" cy="580" rx="6.5" ry="5.5" fill="${D3 ? '#D96A8A' : '#3B2A18'}"/>
    </g>
    <path d="M470 592 Q480 600 490 592" stroke="#3B2A18" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 메뚜기 (풀밭, 초록 보호색) -->
  <g data-find="grasshopper" data-label="메뚜기" data-level="3">
    <path d="M495 690 Q485 676 481 682 L478 692" stroke="#4E9440" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="497" cy="690" rx="13" ry="6" fill="#6DBF5A"/>
    <circle cx="511" cy="687" r="5" fill="#5FAF4C"/>
    <circle cx="513" cy="686" r="1.5" fill="#2F4F2A"/>
    <path d="M513 683 Q516 677 520 675 M511 682 Q512 676 515 673" stroke="#4E9440" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 고슴도치 (여우 아래 풀숲, 부분 가림) -->
  <g data-find="hedgehog" data-label="고슴도치" data-level="2">
    <path d="M398 750 Q394 728 412 722 Q430 716 438 731 Q443 740 440 750 Z" fill="#8A6A45"/>
    <path d="M404 726 L399 716 L410 721 M414 721 L414 710 L422 719 M426 722 L431 712 L434 723" stroke="#6E522F" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M438 742 Q448 740 447 747 Q446 752 438 750 Z" fill="#C9A06A"/>
    <circle cx="447" cy="746" r="2.6" fill="#3B2A18"/>
    <circle cx="437" cy="740" r="2.2" fill="#3B2A18"/>
    <path d="M408 752 Q404 738 397 733 M420 752 Q420 738 423 730" stroke="#4DA644" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L1: 달팽이 (여우 앞 풀밭) -->
  <g data-find="snail" data-label="달팽이">
    <path d="M652 774 Q636 774 636 762 Q636 750 650 750 L706 750 Q716 752 714 764 Q712 774 700 774 Z" fill="#F2D178"/>
    <path d="M650 752 Q646 736 650 726 M662 752 Q660 738 664 728" stroke="#E0B95A" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="650" cy="723" r="4.5" fill="#8A6A2E"/><circle cx="665" cy="725" r="4.5" fill="#8A6A2E"/>
    <circle cx="655" cy="742" r="2.5" fill="#8A6A2E"/>
    <path d="M648 748 Q653 751 658 748" stroke="#8A6A2E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="692" cy="734" r="24" fill="#E8955A"/>
    <path d="M692 734 Q706 732 704 720 Q700 710 688 714 Q680 720 684 730 Q688 738 696 734" stroke="#C06A32" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 클로버 (풀밭, 초록 보호색) -->
  <g data-find="clover" data-label="클로버" data-level="3">
    <circle cx="738" cy="686" r="6.5" fill="#4DA644"/>
    <circle cx="751" cy="686" r="6.5" fill="#4DA644"/>
    <circle cx="744" cy="678" r="6.5" fill="#4DA644"/>
    <line x1="744" y1="691" x2="742" y2="702" stroke="#3D8536" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- 베리 덤불 -->
  <g>
    <circle cx="1044" cy="556" r="40" fill="#5FA84E"/>
    <circle cx="1086" cy="530" r="46" fill="#6BB55A"/>
    <circle cx="1122" cy="562" r="36" fill="#5FA84E"/>
    <!-- ★차이5(L1): 베리 색 (빨강 → 노랑) -->
    <g data-diff="5" data-cx="1082" data-cy="542" data-r="70">
      <circle cx="1058" cy="542" r="10" fill="${D1 ? '#FFD93D' : '#E8574B'}"/>
      <circle cx="1092" cy="518" r="10" fill="${D1 ? '#FFD93D' : '#E8574B'}"/>
      <circle cx="1112" cy="556" r="10" fill="${D1 ? '#FFD93D' : '#E8574B'}"/>
      <circle cx="1076" cy="566" r="10" fill="${D1 ? '#FFD93D' : '#E8574B'}"/>
    </g>
  </g>

  <!-- 숨은그림 L2: 산딸기 (풀밭, 붉은 열매) -->
  <g data-find="raspberry" data-label="산딸기" data-level="2">
    <path d="M984 586 Q980 578 988 578 L992 584 Z" fill="#5FA84E"/>
    <circle cx="983" cy="594" r="5.5" fill="#C94A66"/><circle cx="997" cy="594" r="5.5" fill="#C94A66"/>
    <circle cx="990" cy="590" r="5.5" fill="#D8607A"/>
    <circle cx="984" cy="604" r="5.5" fill="#D8607A"/><circle cx="996" cy="604" r="5.5" fill="#C94A66"/>
    <circle cx="990" cy="612" r="5.5" fill="#D8607A"/>
  </g>

  <!-- 숨은그림 L3: 깃털 (개울가 풀밭, 옅은 크림색) -->
  <g data-find="feather" data-label="깃털" data-level="3">
    <path d="M1134 704 Q1126 690 1132 674 Q1146 678 1146 696 Q1145 706 1134 704 Z" fill="#EFE9DA" stroke="#D2C9B0" stroke-width="2"/>
    <line x1="1138" y1="706" x2="1136" y2="676" stroke="#D2C9B0" stroke-width="2"/>
  </g>

  <!-- 왼쪽 작은 덤불 -->
  <g>
    <circle cx="34" cy="600" r="44" fill="#6BB55A"/>
    <circle cx="82" cy="616" r="36" fill="#7CC46B"/>
  </g>

  <!-- 숨은그림 L3: 새알 (덤불 잎사귀 속) -->
  <g data-find="birdegg" data-label="새알" data-level="3">
    <ellipse cx="60" cy="640" rx="9" ry="12" fill="#EAF2DC" stroke="#C2D2AC" stroke-width="2"/>
    <circle cx="57" cy="636" r="1.5" fill="#A8BC8E"/><circle cx="63" cy="642" r="1.5" fill="#A8BC8E"/>
    <circle cx="59" cy="646" r="1.5" fill="#A8BC8E"/>
  </g>

  <!-- 꽃 (고정) -->
  ${[[95, 742], [906, 602]].map(([x, y]) => `
  <g>
    <circle cx="${x - 11}" cy="${y}" r="8" fill="#FF8FC7"/><circle cx="${x + 11}" cy="${y}" r="8" fill="#FF8FC7"/>
    <circle cx="${x}" cy="${y - 11}" r="8" fill="#FF8FC7"/><circle cx="${x}" cy="${y + 11}" r="8" fill="#FF8FC7"/>
    <circle cx="${x}" cy="${y}" r="7" fill="#FFD93D"/>
  </g>`).join('')}

  <!-- ★차이10(L2): 왼쪽 꽃 꽃잎 색 (분홍 → 흰색) -->
  <g data-diff="10" data-level="2" data-cx="208" data-cy="558" data-r="42">
    <circle cx="197" cy="558" r="8" fill="${D2 ? '#FFFFFF' : '#FF8FC7'}"/><circle cx="219" cy="558" r="8" fill="${D2 ? '#FFFFFF' : '#FF8FC7'}"/>
    <circle cx="208" cy="547" r="8" fill="${D2 ? '#FFFFFF' : '#FF8FC7'}"/><circle cx="208" cy="569" r="8" fill="${D2 ? '#FFFFFF' : '#FF8FC7'}"/>
    <circle cx="208" cy="558" r="7" fill="#FFD93D"/>
  </g>

  <!-- ★차이17(L3): 가운데 꽃 수술 색 (노랑 → 주황) -->
  <g data-diff="17" data-level="3" data-cx="560" data-cy="640" data-r="40">
    <circle cx="549" cy="640" r="8" fill="#FF8FC7"/><circle cx="571" cy="640" r="8" fill="#FF8FC7"/>
    <circle cx="560" cy="629" r="8" fill="#FF8FC7"/><circle cx="560" cy="651" r="8" fill="#FF8FC7"/>
    <circle cx="560" cy="640" r="7" fill="${D3 ? '#F2A33C' : '#FFD93D'}"/>
  </g>

  <!-- ★차이2(L1): 보라 꽃 무리 — B에서는 사라짐 -->
  <g data-diff="2" data-cx="560" data-cy="730" data-r="60">${D1 ? '' : `
    <line x1="536" y1="742" x2="536" y2="772" stroke="#4DA644" stroke-width="6" stroke-linecap="round"/>
    <line x1="584" y1="736" x2="584" y2="770" stroke="#4DA644" stroke-width="6" stroke-linecap="round"/>
    <circle cx="525" cy="734" r="9" fill="#B99AE8"/><circle cx="547" cy="734" r="9" fill="#B99AE8"/>
    <circle cx="536" cy="723" r="9" fill="#B99AE8"/><circle cx="536" cy="745" r="9" fill="#B99AE8"/>
    <circle cx="536" cy="734" r="7" fill="#FFD93D"/>
    <circle cx="573" cy="728" r="9" fill="#B99AE8"/><circle cx="595" cy="728" r="9" fill="#B99AE8"/>
    <circle cx="584" cy="717" r="9" fill="#B99AE8"/><circle cx="584" cy="739" r="9" fill="#B99AE8"/>
    <circle cx="584" cy="728" r="7" fill="#FFD93D"/>`}
  </g>

  <!-- 풀 포기 -->
  <g stroke="#4DA644" stroke-width="6" fill="none" stroke-linecap="round">
    <path d="M310 690 Q306 672 298 666 M320 690 Q320 672 320 664 M330 690 Q336 672 344 666"/>
    <!-- ★차이15(L3): 풀잎 한 가닥 — B에서는 사라짐 -->
    <g data-diff="15" data-level="3" data-cx="760" data-cy="608" data-r="40">
      <path d="M760 620 Q756 604 748 598"/>
      ${D3 ? '' : '<path d="M770 620 Q770 604 770 596"/>'}
    </g>
    <path d="M60 700 Q56 682 48 676 M70 700 Q70 682 70 674 M80 700 Q86 682 94 676"/>
    <path d="M1150 610 Q1146 594 1138 588 M1160 610 Q1160 594 1160 586"/>
    <path d="M480 720 Q476 704 468 698 M490 720 Q490 704 490 696"/>
  </g>

  <!-- 숨은그림 L2: 두더지 (흙두둑에서 빼꼼) -->
  <g data-find="mole" data-label="두더지" data-level="2">
    <path d="M220 782 Q222 762 245 758 Q268 762 270 782 Z" fill="#8A5A34"/>
    <circle cx="245" cy="756" r="13" fill="#70605A"/>
    <ellipse cx="245" cy="762" rx="6" ry="4.5" fill="#C9A0A0"/>
    <circle cx="239" cy="752" r="2" fill="#2F2825"/><circle cx="251" cy="752" r="2" fill="#2F2825"/>
    <path d="M231 760 Q226 764 229 768 M259 760 Q264 764 261 768" stroke="#D9B08C" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
  },

  hidden: [
    /* ── L1: 쉬움 (6) ── */
    {
      id: 'mushroom', label: '버섯',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <rect x="23" y="32" width="14" height="22" rx="6" fill="#FFF3E0"/>
        <path d="M8 34 Q8 8 30 8 Q52 8 52 34 Q52 40 30 40 Q8 40 8 34 Z" fill="#E8574B"/>
        <circle cx="20" cy="24" r="4.5" fill="#FFF3E0"/><circle cx="38" cy="20" r="5" fill="#FFF3E0"/>
        <circle cx="30" cy="32" r="3.5" fill="#FFF3E0"/></svg>`
    },
    {
      id: 'squirrel', label: '다람쥐',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 46 Q56 42 54 20 Q52 6 36 12 Q46 18 44 30 Q42 42 30 44 Z" fill="#D98B4A"/>
        <ellipse cx="24" cy="38" rx="17" ry="15" fill="#C4763B"/>
        <circle cx="14" cy="24" r="11" fill="#C4763B"/>
        <path d="M8 16 Q4 6 14 9 L17 15 Z" fill="#A85C28"/>
        <circle cx="11" cy="23" r="2.8" fill="#3B2A18"/>
        <path d="M8 31 Q12 34 16 31" stroke="#3B2A18" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="22" cy="44" rx="8" ry="9" fill="#F2D1A8"/></svg>`
    },
    {
      id: 'owl', label: '부엉이',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 18 Q8 4 22 10 L26 18 Z" fill="#A5793F"/>
        <path d="M46 18 Q52 4 38 10 L34 18 Z" fill="#A5793F"/>
        <ellipse cx="30" cy="34" rx="20" ry="23" fill="#C9A06A"/>
        <circle cx="22" cy="28" r="8" fill="#FFF7E8"/><circle cx="38" cy="28" r="8" fill="#FFF7E8"/>
        <circle cx="22" cy="29" r="4" fill="#3B2A18"/><circle cx="38" cy="29" r="4" fill="#3B2A18"/>
        <polygon points="26,38 30,45 34,38" fill="#F2A33C"/>
        <ellipse cx="30" cy="50" rx="10" ry="5" fill="#A5793F"/></svg>`
    },
    {
      id: 'acorn', label: '도토리',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 30 Q14 16 30 16 Q46 16 46 30 Q46 48 30 54 Q14 48 14 30 Z" fill="#C9A06A"/>
        <path d="M10 24 Q10 10 30 10 Q50 10 50 24 Q50 30 30 30 Q10 30 10 24 Z" fill="#8B5A2B"/>
        <line x1="30" y1="10" x2="30" y2="3" stroke="#6E441F" stroke-width="4" stroke-linecap="round"/>
        <path d="M22 38 Q30 43 38 38" stroke="#A5793F" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'snail', label: '달팽이',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 50 Q6 50 6 44 Q6 38 14 38 L44 38 Q52 39 51 46 Q50 50 42 50 Z" fill="#F2D178"/>
        <path d="M13 40 Q10 28 13 20 M22 40 Q20 28 24 20" stroke="#E0B95A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <circle cx="13" cy="17" r="3.5" fill="#8A6A2E"/><circle cx="24" cy="18" r="3.5" fill="#8A6A2E"/>
        <circle cx="40" cy="26" r="15" fill="#E8955A"/>
        <path d="M40 26 Q49 25 48 17 Q45 11 38 14 Q33 18 36 24 Q38 29 44 26" stroke="#C06A32" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'ladybug', label: '무당벌레',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="34" r="20" fill="#E8574B"/>
        <circle cx="18" cy="20" r="8.5" fill="#3B3B3B"/>
        <line x1="36" y1="17" x2="48" y2="50" stroke="#3B3B3B" stroke-width="3"/>
        <circle cx="30" cy="30" r="3.5" fill="#3B3B3B"/><circle cx="44" cy="34" r="3.5" fill="#3B3B3B"/>
        <circle cx="36" cy="44" r="3.5" fill="#3B3B3B"/>
        <path d="M13 12 Q8 5 3 3 M22 9 Q20 2 17 -2" stroke="#3B3B3B" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    /* ── L2: 보통 (7) ── */
    {
      id: 'woodpecker', label: '딱따구리', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 46 Q26 56 34 52 L40 46 Z" fill="#4A3828"/>
        <ellipse cx="33" cy="34" rx="12" ry="16" fill="#5E4630"/>
        <ellipse cx="37" cy="38" rx="6" ry="10" fill="#E8D5B8"/>
        <circle cx="26" cy="16" r="9" fill="#5E4630"/>
        <path d="M19 10 Q26 2 33 10 L31 16 L21 16 Z" fill="#D8574B"/>
        <circle cx="23" cy="15" r="2.2" fill="#F5EFE0"/>
        <polygon points="17,18 5,22 17,24" fill="#3B2A18"/></svg>`
    },
    {
      id: 'hedgehog', label: '고슴도치', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 44 Q4 20 26 14 Q44 10 50 28 Q54 38 50 44 Z" fill="#8A6A45"/>
        <path d="M14 22 L8 12 L20 17 M26 15 L26 4 L34 13 M38 15 L44 5 L47 16" stroke="#6E522F" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M48 36 Q57 34 56 41 Q55 46 47 44 Z" fill="#C9A06A"/>
        <circle cx="56" cy="40" r="2.8" fill="#3B2A18"/>
        <circle cx="46" cy="33" r="2.5" fill="#3B2A18"/></svg>`
    },
    {
      id: 'pinecone', label: '솔방울', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="30" y1="10" x2="30" y2="4" stroke="#6E441F" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="30" cy="33" rx="16" ry="23" fill="#A5793F"/>
        <path d="M17 22 Q30 29 43 22 M15 34 Q30 41 45 34 M18 46 Q30 53 42 46" stroke="#7E5B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'raspberry', label: '산딸기', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 16 Q16 4 30 6 L36 14 Z" fill="#5FA84E"/>
        <circle cx="20" cy="28" r="8" fill="#C94A66"/><circle cx="40" cy="28" r="8" fill="#C94A66"/>
        <circle cx="30" cy="23" r="8" fill="#D8607A"/>
        <circle cx="21" cy="41" r="8" fill="#D8607A"/><circle cx="39" cy="41" r="8" fill="#C94A66"/>
        <circle cx="30" cy="50" r="8" fill="#D8607A"/></svg>`
    },
    {
      id: 'mole', label: '두더지', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 56 Q8 36 30 32 Q52 36 54 56 Z" fill="#8A5A34"/>
        <circle cx="30" cy="26" r="14" fill="#70605A"/>
        <ellipse cx="30" cy="32" rx="6.5" ry="5" fill="#C9A0A0"/>
        <circle cx="24" cy="22" r="2.2" fill="#2F2825"/><circle cx="36" cy="22" r="2.2" fill="#2F2825"/>
        <path d="M15 30 Q10 34 13 38 M45 30 Q50 34 47 38" stroke="#D9B08C" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'firefly', label: '반딧불이', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="44" r="11" fill="#FFE04D"/>
        <ellipse cx="30" cy="24" rx="9" ry="13" fill="#4A3B28"/>
        <ellipse cx="19" cy="14" rx="9" ry="5" transform="rotate(-35 19 14)" fill="#D6F0FF"/>
        <ellipse cx="41" cy="14" rx="9" ry="5" transform="rotate(35 41 14)" fill="#D6F0FF"/>
        <path d="M26 12 Q22 5 17 3 M34 12 Q38 5 43 3" stroke="#4A3B28" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'fish', label: '물고기', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <polygon points="16,30 4,20 4,40" fill="#4A90B8"/>
        <ellipse cx="34" cy="30" rx="22" ry="12" fill="#5FA0C4"/>
        <path d="M28 20 Q34 10 40 20 Z" fill="#4A90B8"/>
        <circle cx="45" cy="27" r="3.5" fill="#F5F9FC"/><circle cx="46" cy="27" r="1.8" fill="#1F3B52"/>
        <path d="M22 30 Q28 37 34 30" stroke="#4A90B8" stroke-width="2.5" fill="none"/></svg>`
    },
    /* ── L3: 어려움 (8) ── */
    {
      id: 'moth', label: '나방', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="18" cy="30" rx="12" ry="17" transform="rotate(-30 18 30)" fill="#9C7448"/>
        <ellipse cx="42" cy="30" rx="12" ry="17" transform="rotate(30 42 30)" fill="#8B6238"/>
        <ellipse cx="30" cy="35" rx="5.5" ry="14" fill="#6E522F"/>
        <circle cx="17" cy="27" r="3" fill="#6E522F"/><circle cx="43" cy="27" r="3" fill="#6E522F"/>
        <path d="M27 22 Q23 12 17 9 M33 22 Q37 12 43 9" stroke="#6E522F" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'spiderweb', label: '거미줄', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#9FC4D8" stroke-width="2.5" fill="none">
          <line x1="30" y1="4" x2="30" y2="56"/>
          <line x1="4" y1="30" x2="56" y2="30"/>
          <line x1="12" y1="12" x2="48" y2="48"/>
          <line x1="48" y1="12" x2="12" y2="48"/>
          <circle cx="30" cy="30" r="9"/>
          <circle cx="30" cy="30" r="18"/>
        </g>
        <circle cx="37" cy="37" r="4" fill="#4A3828"/></svg>`
    },
    {
      id: 'ant', label: '개미', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="13" cy="32" r="8" fill="#3B2412"/>
        <circle cx="29" cy="30" r="7" fill="#4A3018"/>
        <circle cx="46" cy="28" r="9" fill="#3B2412"/>
        <path d="M20 38 L14 48 M30 37 L28 48 M40 35 L44 46 M20 26 L12 16 M42 20 L48 10" stroke="#3B2412" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'clover', label: '클로버', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="19" cy="28" r="11" fill="#4DA644"/>
        <circle cx="41" cy="28" r="11" fill="#4DA644"/>
        <circle cx="30" cy="15" r="11" fill="#4DA644"/>
        <line x1="30" y1="36" x2="27" y2="56" stroke="#3D8536" stroke-width="4" stroke-linecap="round"/></svg>`
    },
    {
      id: 'birdegg', label: '새알', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="32" rx="17" ry="23" fill="#EAF2DC" stroke="#C2D2AC" stroke-width="3"/>
        <circle cx="24" cy="24" r="2.8" fill="#A8BC8E"/><circle cx="36" cy="34" r="2.8" fill="#A8BC8E"/>
        <circle cx="27" cy="42" r="2.8" fill="#A8BC8E"/><circle cx="34" cy="18" r="2.4" fill="#A8BC8E"/></svg>`
    },
    {
      id: 'dewdrop', label: '이슬방울', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 6 Q48 30 48 40 Q48 54 30 54 Q12 54 12 40 Q12 30 30 6 Z" fill="#B8E0F2"/>
        <circle cx="23" cy="40" r="4.5" fill="#FFFFFF"/></svg>`
    },
    {
      id: 'grasshopper', label: '메뚜기', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M26 34 Q12 16 6 24 L4 40" stroke="#4E9440" stroke-width="4" fill="none" stroke-linecap="round"/>
        <ellipse cx="28" cy="36" rx="18" ry="9" fill="#6DBF5A"/>
        <circle cx="47" cy="31" r="7" fill="#5FAF4C"/>
        <circle cx="50" cy="30" r="2" fill="#2F4F2A"/>
        <path d="M50 25 Q54 18 58 16 M46 24 Q48 17 52 13" stroke="#4E9440" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'feather', label: '깃털', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 52 Q10 30 26 8 Q48 16 46 40 Q44 54 24 52 Z" fill="#EFE9DA" stroke="#D2C9B0" stroke-width="3"/>
        <line x1="30" y1="54" x2="32" y2="14" stroke="#D2C9B0" stroke-width="3"/></svg>`
    }
  ],

  sticker: {
    name: '여우 스티커',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#FFF0E0" stroke="#F2914B" stroke-width="7"/>
      <polygon points="30,44 38,16 56,40" fill="#F2914B"/>
      <polygon points="64,40 82,16 90,44" fill="#F2914B"/>
      <polygon points="37,40 41,26 49,38" fill="#FFE9D2"/>
      <polygon points="71,38 79,26 83,40" fill="#FFE9D2"/>
      <circle cx="60" cy="64" r="34" fill="#F2914B"/>
      <ellipse cx="46" cy="76" rx="15" ry="13" fill="#FFE9D2"/>
      <ellipse cx="74" cy="76" rx="15" ry="13" fill="#FFE9D2"/>
      <circle cx="48" cy="58" r="4.5" fill="#3B2A18"/><circle cx="72" cy="58" r="4.5" fill="#3B2A18"/>
      <ellipse cx="60" cy="74" rx="6" ry="5" fill="#3B2A18"/>
      <path d="M51 85 Q60 92 69 85" stroke="#3B2A18" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`
  }
});
