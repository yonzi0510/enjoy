/* 테마: 바다 — 바닷속 풍경 (난이도 3레벨)
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
  id: 'ocean',
  name: '바다',
  emoji: '🐠',
  bg: '#D6F0FF',

  buildScene(v, level) {
    const A = v === 'A';
    const L = +level || 1;
    const D1 = !A && L === 1, D2 = !A && L === 2, D3 = !A && L === 3;
    // 물결 곡선 조립 (백틱 중첩 없이 문자열로)
    const wave = (y, amp) => {
      let d = 'M0 ' + y;
      for (let i = 0; i < 12; i++) d += ' Q' + (i * 100 + 50) + ' ' + (i % 2 ? y - amp : y + amp) + ' ' + (i * 100 + 100) + ' ' + y;
      return d;
    };
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
  <!-- 물 레이어 (단색 밴드 — defs/그라디언트 사용 금지) -->
  <rect x="0" y="0" width="1200" height="800" fill="#9FDCF6"/>
  <rect x="0" y="0" width="1200" height="150" fill="#C9ECFB"/>
  <rect x="0" y="150" width="1200" height="170" fill="#AEE4F8" opacity="0.7"/>
  <rect x="0" y="430" width="1200" height="370" fill="#7FC4EC" opacity="0.45"/>
  <rect x="0" y="565" width="1200" height="235" fill="#5B9FD6" opacity="0.18"/>

  <!-- 물결 표면 + 물거품 -->
  <path d="${wave(44, 20)} L1200 0 L0 0 Z" fill="#E6F7FF"/>
  <path d="${wave(74, 16)}" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.5"/>
  <path d="${wave(98, 10)}" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.28"/>
  <g fill="#FFFFFF" opacity="0.55">
    <circle cx="150" cy="58" r="4"/><circle cx="365" cy="52" r="3"/><circle cx="590" cy="60" r="4"/>
    <circle cx="812" cy="52" r="3"/><circle cx="1030" cy="58" r="4"/><circle cx="1145" cy="50" r="3"/>
  </g>

  <!-- 햇살 기둥 (넓은 빛 + 밝은 심) -->
  <polygon points="150,0 265,0 430,340 305,340" fill="#FFFFFF" opacity="0.10"/>
  <polygon points="185,0 240,0 385,330 325,330" fill="#FFFFFF" opacity="0.10"/>
  <polygon points="480,0 575,0 705,285 610,285" fill="#FFFFFF" opacity="0.09"/>
  <polygon points="512,0 552,0 668,275 622,275" fill="#FFFFFF" opacity="0.09"/>
  <polygon points="860,0 950,0 1065,245 980,245" fill="#FFFFFF" opacity="0.09"/>
  <polygon points="890,0 928,0 1032,238 990,238" fill="#FFFFFF" opacity="0.09"/>

  <!-- 물속 반짝임 -->
  <g fill="#FFFFFF" opacity="0.35">
    <circle cx="330" cy="120" r="2.5"/><circle cx="560" cy="95" r="2"/><circle cx="672" cy="140" r="2.5"/>
    <circle cx="808" cy="110" r="2"/><circle cx="958" cy="140" r="2.5"/><circle cx="120" cy="140" r="2"/>
    <circle cx="245" cy="95" r="2"/><circle cx="1160" cy="120" r="2.5"/>
  </g>

  <!-- 원경 물고기 떼 (흐릿한 실루엣 — 깊이감) -->
  <g fill="#7FBEDE" opacity="0.45">
    <ellipse cx="560" cy="136" rx="9" ry="5"/><polygon points="551,136 543,131 543,141"/>
    <ellipse cx="596" cy="122" rx="9" ry="5"/><polygon points="587,122 579,117 579,127"/>
    <ellipse cx="612" cy="150" rx="9" ry="5"/><polygon points="603,150 595,145 595,155"/>
    <ellipse cx="648" cy="132" rx="9" ry="5"/><polygon points="639,132 631,127 631,137"/>
    <ellipse cx="640" cy="164" rx="8" ry="4.5"/><polygon points="632,164 625,160 625,168"/>
  </g>
  <g fill="#7FBEDE" opacity="0.4">
    <ellipse cx="100" cy="238" rx="8" ry="4.5"/><polygon points="108,238 115,234 115,242"/>
    <ellipse cx="130" cy="222" rx="8" ry="4.5"/><polygon points="138,222 145,218 145,226"/>
    <ellipse cx="142" cy="252" rx="8" ry="4.5"/><polygon points="150,252 157,248 157,256"/>
  </g>
  <g fill="#8CC8E4" opacity="0.4">
    <ellipse cx="300" cy="488" rx="8" ry="4.5"/><polygon points="292,488 285,484 285,492"/>
    <ellipse cx="332" cy="472" rx="8" ry="4.5"/><polygon points="324,472 317,468 317,476"/>
    <ellipse cx="340" cy="502" rx="7" ry="4"/><polygon points="333,502 327,498 327,506"/>
  </g>

  <!-- 숨은그림 L3: 플랑크톤 (밝은 물빛 보호색, 위쪽 물속) -->
  <g data-find="plankton" data-label="플랑크톤" data-level="3">
    <g stroke="#A8DCE8" stroke-width="2.5" stroke-linecap="round">
      <line x1="479" y1="102" x2="474" y2="98"/><line x1="501" y1="102" x2="506" y2="98"/>
      <line x1="479" y1="118" x2="474" y2="122"/><line x1="501" y1="118" x2="506" y2="122"/>
    </g>
    <circle cx="490" cy="110" r="10" fill="#C2E8DC"/>
    <circle cx="486" cy="108" r="1.8" fill="#4A7A6A"/><circle cx="494" cy="108" r="1.8" fill="#4A7A6A"/>
    <path d="M486 114 Q490 117 494 114" stroke="#4A7A6A" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 모래 바닥 (언덕 두 겹 + 밝은 능선 + 결·조약돌) -->
  <path d="M0 668 Q150 640 300 662 Q450 684 600 660 Q750 638 900 664 Q1050 686 1200 656 L1200 800 L0 800 Z" fill="#F2E2AE"/>
  <path d="M0 672 Q150 646 300 667 Q450 688 600 665 Q750 643 900 668 Q1050 690 1200 661" fill="none" stroke="#FFFFFF" stroke-width="5" opacity="0.35"/>
  <path d="M0 742 Q300 716 600 742 Q900 766 1200 738 L1200 800 L0 800 Z" fill="#E8CF8E" opacity="0.85"/>
  <g stroke="#DDC078" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.8">
    <path d="M60 706 Q80 700 100 706"/><path d="M496 700 Q516 694 536 700"/>
    <path d="M596 720 Q616 714 636 720"/><path d="M1010 726 Q1030 720 1050 726"/>
    <path d="M330 764 Q350 758 370 764"/><path d="M860 700 Q880 694 900 700"/>
  </g>
  <g fill="#D9BC74">
    <circle cx="140" cy="770" r="5"/><circle cx="520" cy="762" r="4"/><circle cx="702" cy="776" r="5"/>
    <circle cx="1130" cy="760" r="4"/><circle cx="465" cy="712" r="4"/><circle cx="880" cy="720" r="4"/>
    <circle cx="95" cy="748" r="4"/><circle cx="612" cy="772" r="3.5"/><circle cx="1058" cy="752" r="4"/>
  </g>
  <!-- 모래 위 장식 조개·조약돌 -->
  <g>
    <path d="M636 776 Q630 764 646 760 Q662 764 656 776 Q646 781 636 776 Z" fill="#E8C8D8"/>
    <path d="M646 778 L639 766 M646 778 L646 762 M646 778 L653 766" stroke="#D4A8BC" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="70" cy="764" rx="14" ry="8" fill="#C8B2C4"/>
    <ellipse cx="66" cy="761" rx="5" ry="3" fill="#DCC8D8"/>
  </g>

  <!-- 뇌산호 (왼쪽 구석) -->
  <g>
    <ellipse cx="52" cy="712" rx="46" ry="30" fill="#E8A8D8"/>
    <path d="M20 706 Q34 694 48 706 M40 720 Q54 708 68 720 M60 700 Q74 690 86 702 M26 726 Q38 716 50 726" stroke="#D488C0" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="38" cy="696" rx="12" ry="6" fill="#F5C8E8" opacity="0.7"/>
  </g>

  <!-- 관 산호 (오른쪽 성게 위쪽) -->
  <g>
    <path d="M1104 664 L1108 606 Q1113 596 1120 606 L1122 664 Z" fill="#9BD8E8"/>
    <path d="M1126 664 L1128 620 Q1133 611 1139 620 L1141 664 Z" fill="#7FC8DC"/>
    <ellipse cx="1114" cy="605" rx="7" ry="4" fill="#5FA8BC"/>
    <ellipse cx="1134" cy="619" rx="6.5" ry="3.5" fill="#5FA8BC"/>
    <circle cx="1111" cy="624" r="2.5" fill="#C8ECF4"/><circle cx="1133" cy="636" r="2" fill="#C8ECF4"/>
  </g>

  <!-- 바다풀 새싹 -->
  <g fill="#5FBF57">
    <path d="M760 668 q6 -24 12 0 z"/>
    <path d="M245 672 q6 -22 12 0 z"/><path d="M1150 668 q6 -24 12 0 z"/>
    <path d="M330 664 q5 -20 10 0 z"/>
  </g>
  <!-- ★차이11(L2): 바다풀 새싹 하나 — B에서는 사라짐 -->
  <g data-diff="11" data-level="2" data-cx="484" data-cy="656" data-r="40">${D2 ? '' : '<path d="M478 664 q6 -26 12 0 z" fill="#5FBF57"/>'}
  </g>

  <!-- 물고기 떼 (왼쪽 위) -->
  <g>
    <path d="M242 166 Q250 152 262 165" fill="#F28C3C"/>
    <ellipse cx="250" cy="180" rx="26" ry="16" fill="#FFB25E"/>
    <!-- ★차이9(L2): 주황 물고기 꼬리 색 (주황 → 청록) -->
    <g data-diff="9" data-level="2" data-cx="284" data-cy="180" data-r="42">
      <polygon points="274,180 298,166 298,194" fill="${D2 ? '#4FA8A0' : '#F28C3C'}"/>
    </g>
    <path d="M258 168 Q263 180 258 192" stroke="#F28C3C" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M267 171 Q271 180 267 189" stroke="#F28C3C" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.6"/>
    <path d="M234 190 Q250 197 266 190" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>
    <polygon points="250,184 260,196 246,194" fill="#F28C3C" opacity="0.9"/>
    <circle cx="238" cy="176" r="4.5" fill="#6B4A2E"/>
    <circle cx="236.5" cy="174.5" r="1.6" fill="#FFFFFF"/>
    <circle cx="229" cy="183" r="3" fill="#F5808C" opacity="0.55"/>
    <path d="M232 186 Q238 190 244 186" stroke="#6B4A2E" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <g>
    <path d="M293 245 Q300 232 311 244" fill="#F2C63C"/>
    <ellipse cx="300" cy="258" rx="24" ry="15" fill="#FFD93D"/>
    <polygon points="322,258 344,245 344,271" fill="#F2C63C"/>
    <path d="M308 247 Q312 258 308 269" stroke="#F2C63C" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M286 267 Q300 273 314 267" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>
    <polygon points="300,261 309,272 296,271" fill="#F2C63C" opacity="0.9"/>
    <circle cx="289" cy="254" r="4" fill="#6B4A2E"/>
    <circle cx="287.5" cy="252.5" r="1.5" fill="#FFFFFF"/>
    <circle cx="281" cy="259" r="2.8" fill="#F5808C" opacity="0.5"/>
    <!-- ★차이14(L3): 노랑 물고기 입 — B에서는 사라짐 -->
    <g data-diff="14" data-level="3" data-cx="289" data-cy="264" data-r="40">${D3 ? '' : '<path d="M283 264 Q289 268 295 264" stroke="#6B4A2E" stroke-width="3" fill="none" stroke-linecap="round"/>'}
    </g>
  </g>
  <g>
    <path d="M411 155 Q418 143 429 155" fill="#4FA8A0"/>
    <ellipse cx="418" cy="168" rx="24" ry="15" fill="#6BC8C0"/>
    <polygon points="440,168 462,155 462,181" fill="#4FA8A0"/>
    <path d="M426 157 Q430 168 426 179" stroke="#4FA8A0" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M404 177 Q418 183 432 177" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>
    <polygon points="418,171 427,182 414,181" fill="#4FA8A0" opacity="0.9"/>
    <circle cx="407" cy="164" r="4" fill="#2F5B58"/>
    <circle cx="405.5" cy="162.5" r="1.5" fill="#FFFFFF"/>
    <circle cx="399" cy="170" r="2.8" fill="#F5A0B0" opacity="0.5"/>
    <path d="M401 174 Q407 178 413 174" stroke="#2F5B58" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <!-- ★차이1(L1): 큰 물고기 색 (주황 → 보라) -->
  <g data-diff="1" data-cx="340" data-cy="215" data-r="60">
    <path d="M330 197 Q338 182 350 196" fill="${D1 ? '#A87BD0' : '#F28C3C'}"/>
    <ellipse cx="338" cy="215" rx="32" ry="20" fill="${D1 ? '#C39BE8' : '#FFB25E'}"/>
    <polygon points="366,215 394,198 394,232" fill="${D1 ? '#A87BD0' : '#F28C3C'}"/>
    <path d="M348 200 Q354 215 348 230" stroke="${D1 ? '#A87BD0' : '#F28C3C'}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85"/>
    <path d="M358 204 Q362 215 358 226" stroke="${D1 ? '#A87BD0' : '#F28C3C'}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.6"/>
    <path d="M318 227 Q338 236 358 227" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.5"/>
    <polygon points="336,220 348,234 331,232" fill="${D1 ? '#A87BD0' : '#F28C3C'}"/>
    <circle cx="322" cy="210" r="5" fill="#5E4430"/>
    <circle cx="320" cy="208" r="1.8" fill="#FFFFFF"/>
    <circle cx="312" cy="217" r="3" fill="#F5808C" opacity="0.55"/>
    <path d="M314 222 Q322 227 330 222" stroke="#5E4430" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 오징어 (연한 물빛 보호색, 왼쪽 물속) -->
  <g data-find="squid" data-label="오징어" data-level="2">
    <polygon points="180,296 166,318 194,318" fill="#A9D6EE"/>
    <ellipse cx="180" cy="322" rx="14" ry="14" fill="#B8DFF2"/>
    <ellipse cx="175" cy="314" rx="4" ry="2.5" fill="#FFFFFF" opacity="0.5"/>
    <circle cx="174" cy="320" r="3" fill="#3E6A88"/><circle cx="186" cy="320" r="3" fill="#3E6A88"/>
    <circle cx="169" cy="326" r="2.2" fill="#8FB8D8" opacity="0.8"/><circle cx="191" cy="326" r="2.2" fill="#8FB8D8" opacity="0.8"/>
    <path d="M176 328 Q180 331 184 328" stroke="#3E6A88" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M172 335 Q168 344 172 348 M180 336 Q182 344 178 348 M188 335 Q192 344 188 348" stroke="#A9D6EE" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 작은 물고기 한 쌍 (가운데) -->
  <g>
    <path d="M434 319 Q440 309 449 318" fill="#E87FA8"/>
    <ellipse cx="440" cy="330" rx="20" ry="12" fill="#FF8FC7"/>
    <polygon points="458,330 476,320 476,340" fill="#E87FA8"/>
    <path d="M448 322 Q451 330 448 338" stroke="#E87FA8" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M428 337 Q440 342 452 337" stroke="#FFFFFF" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.5"/>
    <circle cx="431" cy="327" r="3.5" fill="#6B3A50"/>
    <circle cx="429.8" cy="325.8" r="1.3" fill="#FFFFFF"/>
    <circle cx="425" cy="332" r="2.2" fill="#F5607C" opacity="0.5"/>
    <path d="M427 336 Q432 339 437 336" stroke="#6B3A50" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>
  <g>
    <path d="M487 289 Q492 280 500 288" fill="#E87FA8"/>
    <ellipse cx="492" cy="298" rx="17" ry="10" fill="#FF8FC7"/>
    <!-- ★차이10(L2): 분홍 물고기 꼬리 색 (분홍 → 파랑) -->
    <g data-diff="10" data-level="2" data-cx="505" data-cy="298" data-r="42">
      <polygon points="507,298 523,289 523,307" fill="${D2 ? '#8FB8E8' : '#E87FA8'}"/>
    </g>
    <path d="M498 291 Q501 298 498 305" stroke="#E87FA8" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>
    <circle cx="484" cy="295" r="3" fill="#6B3A50"/>
    <circle cx="483" cy="294" r="1.1" fill="#FFFFFF"/>
    <path d="M480 302 Q484 305 488 302" stroke="#6B3A50" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- ★차이2(L1): 공기방울 무리 — B에서는 사라짐 -->
  <g data-diff="2" data-cx="610" data-cy="225" data-r="60">${D1 ? '' : '<g fill="#EAF8FF" stroke="#6FB8E0" stroke-width="3"><circle cx="588" cy="260" r="9"/><circle cx="612" cy="224" r="14"/><circle cx="596" cy="188" r="7"/><circle cx="631" cy="192" r="10"/></g><g fill="#FFFFFF" opacity="0.85"><circle cx="585" cy="257" r="2.5"/><circle cx="607" cy="219" r="4"/><circle cx="593" cy="185" r="2"/><circle cx="628" cy="189" r="3"/></g>'}
  </g>

  <!-- 숨은그림: 닻 (물 위에서 내려온 밧줄 끝) -->
  <g data-find="anchor" data-label="닻">
    <path d="M700 8 Q707 90 700 168" stroke="#C9A26B" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M698 40 L706 46 M699 80 L707 86 M698 120 L705 126" stroke="#B08850" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="700" cy="180" r="10" fill="none" stroke="#7C8FA6" stroke-width="7"/>
    <line x1="700" y1="190" x2="700" y2="250" stroke="#7C8FA6" stroke-width="10" stroke-linecap="round"/>
    <line x1="676" y1="207" x2="724" y2="207" stroke="#7C8FA6" stroke-width="8" stroke-linecap="round"/>
    <path d="M700 250 Q668 250 662 222" stroke="#7C8FA6" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M700 250 Q732 250 738 222" stroke="#7C8FA6" stroke-width="10" fill="none" stroke-linecap="round"/>
    <polygon points="652,226 668,216 666,236" fill="#7C8FA6"/>
    <polygon points="748,226 732,216 734,236" fill="#7C8FA6"/>
    <line x1="697" y1="196" x2="697" y2="242" stroke="#A5B4C6" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- 고래 (오른쪽 가운데) -->
  <g>
    <path d="M990 320 Q1040 300 1052 262 Q1070 296 1056 322 Q1084 318 1106 338 Q1072 358 1036 352 Q1002 346 990 320 Z" fill="#7FA9DE"/>
    <path d="M1046 282 Q1056 300 1050 316" stroke="#6B94CC" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.7"/>
    <ellipse cx="880" cy="330" rx="125" ry="72" fill="#8FB8E8"/>
    <path d="M780 292 Q860 252 950 280" stroke="#FFFFFF" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.35"/>
    <path d="M772 352 Q880 420 986 350 Q944 398 880 400 Q808 396 772 352 Z" fill="#D8E9F8"/>
    <path d="M800 372 Q806 384 804 394 M836 386 Q840 394 838 399 M872 392 Q874 398 873 400" stroke="#B8D2EC" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="885" cy="372" rx="30" ry="14" transform="rotate(-18 885 372)" fill="#7FA9DE"/>
    <ellipse cx="878" cy="368" rx="18" ry="7" transform="rotate(-18 878 368)" fill="#FFFFFF" opacity="0.25"/>
    <circle cx="915" cy="296" r="4" fill="#7FA9DE" opacity="0.8"/><circle cx="945" cy="312" r="3" fill="#7FA9DE" opacity="0.8"/><circle cx="895" cy="278" r="3" fill="#7FA9DE" opacity="0.8"/>
    <circle cx="798" cy="314" r="7" fill="#35506B"/>
    <circle cx="795.5" cy="311.5" r="2.4" fill="#FFFFFF"/>
    <!-- ★차이12(L3): 고래 볼 색 (분홍 → 하늘) -->
    <g data-diff="12" data-level="3" data-cx="780" data-cy="330" data-r="40">
      <circle cx="780" cy="330" r="8" fill="${D3 ? '#A8D8F0' : '#F5B8C4'}" opacity="0.85"/>
    </g>
    <path d="M792 338 Q806 348 820 338" stroke="#35506B" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- ★차이6(L2): 고래 물방울 3개 → 2개 -->
    <g data-diff="6" data-level="2" data-cx="906" data-cy="222" data-r="45">
      <g fill="#E6F7FF" opacity="0.8">
        <circle cx="898" cy="240" r="6"/><circle cx="914" cy="220" r="8"/>
        ${D2 ? '' : '<circle cx="906" cy="200" r="5"/>'}
      </g>
    </g>
  </g>

  <!-- 해파리 두 마리 (오른쪽 위) -->
  <g>
    <path d="M1058 160 Q1058 112 1096 112 Q1134 112 1134 160 Q1121 168 1096 168 Q1071 168 1058 160 Z" fill="#D9B8F2"/>
    <ellipse cx="1082" cy="126" rx="12" ry="7" transform="rotate(-24 1082 126)" fill="#FFFFFF" opacity="0.45"/>
    <circle cx="1067" cy="136" r="2.5" fill="#C9A2E8"/><circle cx="1125" cy="136" r="2.5" fill="#C9A2E8"/><circle cx="1111" cy="121" r="2.5" fill="#C9A2E8"/>
    <path d="M1064 166 Q1058 184 1064 200 M1128 166 Q1134 184 1128 200" stroke="#D9B8F2" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M1072 164 Q1066 188 1074 208 M1096 168 Q1102 192 1093 214 M1120 164 Q1126 188 1118 208" stroke="#C9A2E8" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="1084" cy="142" r="4.5" fill="#7A5A96"/><circle cx="1108" cy="142" r="4.5" fill="#7A5A96"/>
    <circle cx="1082.5" cy="140.5" r="1.6" fill="#FFFFFF"/><circle cx="1106.5" cy="140.5" r="1.6" fill="#FFFFFF"/>
    <circle cx="1074" cy="150" r="3" fill="#E8A8D8" opacity="0.7"/><circle cx="1118" cy="150" r="3" fill="#E8A8D8" opacity="0.7"/>
    <!-- ★차이13(L3): 보라 해파리 입 (웃는 입 → 동그란 입) -->
    <g data-diff="13" data-level="3" data-cx="1096" data-cy="152" data-r="40">${D3
      ? '<circle cx="1096" cy="154" r="4" fill="#7A5A96"/>'
      : '<path d="M1088 152 Q1096 157 1104 152" stroke="#7A5A96" stroke-width="3" fill="none" stroke-linecap="round"/>'}
    </g>
  </g>
  <g>
    <path d="M978 244 Q978 210 1004 210 Q1030 210 1030 244 Q1021 250 1004 250 Q987 250 978 244 Z" fill="#F5B8C4"/>
    <ellipse cx="994" cy="221" rx="8" ry="5" transform="rotate(-24 994 221)" fill="#FFFFFF" opacity="0.45"/>
    <!-- ★차이7(L2): 분홍 해파리 다리 3개 → 2개 -->
    <g data-diff="7" data-level="2" data-cx="1004" data-cy="262" data-r="45">
      <path d="M988 248 Q984 266 990 280 M1020 248 Q1024 266 1018 280" stroke="#E89CB0" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${D2 ? '' : '<path d="M1004 250 Q1008 268 1002 284" stroke="#E89CB0" stroke-width="4" fill="none" stroke-linecap="round"/>'}
    </g>
    <circle cx="996" cy="230" r="3.5" fill="#8A5468"/><circle cx="1012" cy="230" r="3.5" fill="#8A5468"/>
    <circle cx="995" cy="229" r="1.2" fill="#FFFFFF"/><circle cx="1011" cy="229" r="1.2" fill="#FFFFFF"/>
    <circle cx="988" cy="237" r="2.2" fill="#F09CB4" opacity="0.9"/><circle cx="1020" cy="237" r="2.2" fill="#F09CB4" opacity="0.9"/>
    <path d="M998 238 Q1004 242 1010 238" stroke="#8A5468" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림: 복어 (오른쪽 물속에 동동) -->
  <g data-find="puffer" data-label="복어">
    <g stroke="#F2C63C" stroke-width="5" stroke-linecap="round">
      <line x1="1090" y1="447" x2="1090" y2="435"/><line x1="1090" y1="523" x2="1090" y2="535"/>
      <line x1="1052" y1="485" x2="1040" y2="485"/><line x1="1128" y1="485" x2="1140" y2="485"/>
      <line x1="1063" y1="458" x2="1054" y2="449"/><line x1="1117" y1="458" x2="1126" y2="449"/>
      <line x1="1063" y1="512" x2="1054" y2="521"/><line x1="1117" y1="512" x2="1126" y2="521"/>
    </g>
    <circle cx="1090" cy="485" r="32" fill="#FFE08A"/>
    <path d="M1068 466 Q1080 458 1094 462" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.55"/>
    <circle cx="1104" cy="464" r="4" fill="#F2C63C" opacity="0.85"/><circle cx="1071" cy="464" r="3.5" fill="#F2C63C" opacity="0.85"/>
    <circle cx="1106" cy="504" r="3.5" fill="#F2C63C" opacity="0.85"/><circle cx="1074" cy="506" r="3.5" fill="#F2C63C" opacity="0.85"/>
    <polygon points="1120,485 1138,473 1138,497" fill="#F2C63C"/>
    <circle cx="1078" cy="478" r="5" fill="#6B5A2E"/><circle cx="1100" cy="478" r="5" fill="#6B5A2E"/>
    <circle cx="1076" cy="476" r="1.8" fill="#FFFFFF"/><circle cx="1098" cy="476" r="1.8" fill="#FFFFFF"/>
    <circle cx="1067" cy="490" r="3.5" fill="#F2A24C" opacity="0.6"/><circle cx="1111" cy="490" r="3.5" fill="#F2A24C" opacity="0.6"/>
    <path d="M1080 496 Q1089 503 1098 496" stroke="#6B5A2E" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 거북이 (가운데) -->
  <g>
    <ellipse cx="472" cy="438" rx="30" ry="14" transform="rotate(-28 472 438)" fill="#A8E0B2"/>
    <ellipse cx="466" cy="434" rx="12" ry="5" transform="rotate(-28 466 434)" fill="#C8ECC8" opacity="0.8"/>
    <ellipse cx="602" cy="456" rx="26" ry="13" transform="rotate(24 602 456)" fill="#A8E0B2"/>
    <ellipse cx="607" cy="452" rx="10" ry="4.5" transform="rotate(24 607 452)" fill="#C8ECC8" opacity="0.8"/>
    <ellipse cx="540" cy="400" rx="85" ry="60" fill="#7ACB8B"/>
    <ellipse cx="540" cy="400" rx="85" ry="60" fill="none" stroke="#5FAF70" stroke-width="5"/>
    <path d="M468 380 Q505 344 560 348" stroke="#FFFFFF" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.35"/>
    <path d="M462 420 Q540 462 618 418" stroke="#5FAF70" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>
    <circle cx="510" cy="385" r="14" fill="#5FAF70"/>
    <circle cx="506" cy="381" r="4" fill="#8FD89C" opacity="0.9"/>
    <!-- ★차이8(L2): 등딱지 무늬 색 (초록 → 노랑) -->
    <g data-diff="8" data-level="2" data-cx="566" data-cy="380" data-r="42">
      <circle cx="566" cy="380" r="13" fill="${D2 ? '#E8C05A' : '#5FAF70'}"/>
    </g>
    <circle cx="540" cy="422" r="15" fill="#5FAF70"/>
    <circle cx="536" cy="418" r="4" fill="#8FD89C" opacity="0.9"/>
    <circle cx="600" cy="410" r="8" fill="#5FAF70" opacity="0.85"/>
    <circle cx="497" cy="352" r="7" fill="#5FAF70" opacity="0.85"/>
    <circle cx="480" cy="415" r="7" fill="#5FAF70" opacity="0.85"/>
    <circle cx="640" cy="378" r="26" fill="#A8E0B2"/>
    <ellipse cx="633" cy="366" rx="8" ry="5" transform="rotate(-20 633 366)" fill="#FFFFFF" opacity="0.5"/>
    <circle cx="661" cy="384" r="4.5" fill="#F5B8C4" opacity="0.7"/>
    <!-- ★차이18(L3): 거북이 눈 (뜬 눈 → 감은 눈) -->
    <g data-diff="18" data-level="3" data-cx="649" data-cy="373" data-r="40">${D3
      ? '<path d="M643 371 Q649 376 655 371" stroke="#2F5B3A" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
      : '<circle cx="649" cy="371" r="5" fill="#2F5B3A"/>'}
    </g>
    <path d="M638 388 Q648 394 658 388" stroke="#2F5B3A" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g fill="#E6F7FF" opacity="0.8">
      <circle cx="662" cy="332" r="5"/><circle cx="676" cy="312" r="7"/>
    </g>
  </g>

  <!-- 왼쪽 해초 숲 (잎 달린 줄기) -->
  <path d="M85 692 Q60 600 90 520 Q110 460 88 420" stroke="#4DA644" stroke-width="14" fill="none" stroke-linecap="round"/>
  <g fill="#4DA644">
    <path d="M76 647 q-24 -8 -28 -30 q24 6 28 30 z"/>
    <path d="M74 603 q-24 -8 -28 -30 q24 6 28 30 z"/>
  </g>
  <path d="M115 700 Q142 610 112 540 Q92 480 118 432" stroke="#5FBF57" stroke-width="12" fill="none" stroke-linecap="round"/>
  <path d="M127 639 q24 -8 28 -30 q-24 6 -28 30 z" fill="#5FBF57"/>

  <!-- 숨은그림: 해마 (해초 사이 초록 보호색) -->
  <g data-find="seahorse" data-label="해마">
    <ellipse cx="116" cy="512" rx="15" ry="25" fill="#8FCF8B"/>
    <circle cx="108" cy="474" r="13" fill="#8FCF8B"/>
    <path d="M98 476 Q84 476 82 481" stroke="#8FCF8B" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M112 534 Q104 562 124 564 Q136 562 130 550" stroke="#7ABD76" stroke-width="9" fill="none" stroke-linecap="round"/>
    <polygon points="128,496 142,502 128,510" fill="#7ABD76"/>
    <polygon points="112,462 118,450 122,462" fill="#7ABD76"/>
    <circle cx="104" cy="471" r="3.5" fill="#2F5B3A"/>
  </g>
  <path d="M140 696 Q120 648 148 590" stroke="#4DA644" stroke-width="10" fill="none" stroke-linecap="round"/>

  <!-- 문어 (왼쪽 아래 모래 위) -->
  <g>
    <ellipse cx="165" cy="716" rx="66" ry="10" fill="#5E3220" opacity="0.10"/>
    <path d="M125 640 Q106 690 126 714" stroke="#F2A0C0" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M150 650 Q144 700 162 718" stroke="#F2A0C0" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M182 650 Q188 700 172 718" stroke="#F2A0C0" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M206 640 Q226 690 206 712" stroke="#F2A0C0" stroke-width="14" fill="none" stroke-linecap="round"/>
    <circle cx="165" cy="600" r="52" fill="#F2A0C0"/>
    <ellipse cx="148" cy="576" rx="16" ry="9" transform="rotate(-24 148 576)" fill="#FFFFFF" opacity="0.45"/>
    <circle cx="194" cy="576" r="3" fill="#E87FA8" opacity="0.9"/><circle cx="176" cy="558" r="3" fill="#E87FA8" opacity="0.9"/>
    <circle cx="148" cy="594" r="6" fill="#6B3A50"/><circle cx="182" cy="594" r="6" fill="#6B3A50"/>
    <circle cx="146" cy="592" r="2.2" fill="#FFFFFF"/><circle cx="180" cy="592" r="2.2" fill="#FFFFFF"/>
    <!-- ★차이16(L3): 문어 왼쪽 볼 색 (진분홍 → 보라) -->
    <g data-diff="16" data-level="3" data-cx="136" data-cy="612" data-r="40">
      <circle cx="136" cy="612" r="7" fill="${D3 ? '#B08CD9' : '#E87FA8'}" opacity="0.8"/>
    </g>
    <circle cx="194" cy="612" r="7" fill="#E87FA8" opacity="0.8"/>
    <path d="M152 616 Q165 626 178 616" stroke="#6B3A50" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g fill="#E87FA8">
      <circle cx="120" cy="700" r="3.5"/><circle cx="158" cy="706" r="3.5"/><circle cx="176" cy="706" r="3.5"/><circle cx="212" cy="698" r="3.5"/>
      <circle cx="114" cy="680" r="2.5"/><circle cx="149" cy="690" r="2.5"/><circle cx="182" cy="692" r="2.5"/><circle cx="216" cy="682" r="2.5"/>
    </g>
    <g fill="#E6F7FF" opacity="0.8">
      <circle cx="228" cy="540" r="5"/><circle cx="242" cy="518" r="7"/>
    </g>
  </g>

  <!-- 숨은그림 L3: 멍게 (문어 옆, 분홍 보호색) -->
  <g data-find="seasquirt" data-label="멍게" data-level="3">
    <path d="M220 640 Q216 618 232 613 Q248 618 244 640 Q240 648 232 648 Q224 648 220 640 Z" fill="#E8899C"/>
    <path d="M226 616 L223 608" stroke="#D9788C" stroke-width="5" stroke-linecap="round"/>
    <path d="M239 617 L243 610" stroke="#D9788C" stroke-width="5" stroke-linecap="round"/>
    <circle cx="227" cy="630" r="2" fill="#D9788C"/><circle cx="236" cy="626" r="2" fill="#D9788C"/><circle cx="231" cy="638" r="2" fill="#D9788C"/>
  </g>

  <!-- 숨은그림 L3: 해삼 (모래색 보호색, 문어 옆 모래) -->
  <g data-find="seacucumber" data-label="해삼" data-level="3">
    <path d="M228 746 Q226 736 238 734 L256 734 Q266 736 264 746 Q264 752 254 752 L238 752 Q228 752 228 746 Z" fill="#D2AC66"/>
    <circle cx="238" cy="734" r="2" fill="#BC954E"/><circle cx="248" cy="733" r="2" fill="#BC954E"/><circle cx="256" cy="735" r="2" fill="#BC954E"/>
    <circle cx="261" cy="742" r="1.8" fill="#6B4A20"/>
    <path d="M262 747 Q265 748 267 746" stroke="#6B4A20" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림: 불가사리 (모래색 보호색, 바위 옆에 빼꼼) -->
  <g data-find="starfish" data-label="불가사리">
    <polygon points="322,690 331,712 354,714 336,729 342,752 322,739 302,752 308,729 290,714 313,712"
      fill="#F2B95E" stroke="#E0A040" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="322" cy="700" r="2" fill="#E0A040"/><circle cx="345" cy="716" r="2" fill="#E0A040"/><circle cx="336" cy="744" r="2" fill="#E0A040"/>
    <circle cx="308" cy="744" r="2" fill="#E0A040"/><circle cx="299" cy="716" r="2" fill="#E0A040"/>
    <circle cx="315" cy="720" r="3.5" fill="#8A5A2E"/><circle cx="329" cy="720" r="3.5" fill="#8A5A2E"/>
    <circle cx="314" cy="719" r="1.2" fill="#FFFFFF"/><circle cx="328" cy="719" r="1.2" fill="#FFFFFF"/>
    <circle cx="308" cy="726" r="2.5" fill="#F09070" opacity="0.7"/><circle cx="336" cy="726" r="2.5" fill="#F09070" opacity="0.7"/>
    <path d="M315 728 Q322 733 329 728" stroke="#8A5A2E" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 바위 (불가사리 팔 하나를 살짝 가림) -->
  <g>
    <ellipse cx="380" cy="742" rx="42" ry="9" fill="#5E3220" opacity="0.08"/>
    <ellipse cx="382" cy="724" rx="38" ry="26" fill="#B8C4CE"/>
    <ellipse cx="352" cy="740" rx="22" ry="14" fill="#A8B4BE"/>
    <ellipse cx="374" cy="716" rx="10" ry="6" fill="#CBD5DD"/>
    <circle cx="398" cy="732" r="3" fill="#A8B4BE"/><circle cx="366" cy="732" r="2.5" fill="#98A6B2"/><circle cx="410" cy="720" r="2.5" fill="#98A6B2"/>
  </g>

  <!-- 숨은그림 L3: 따개비 (바위 위, 회색 보호색) -->
  <g data-find="barnacle" data-label="따개비" data-level="3">
    <path d="M388 714 L391 700 Q398 695 405 700 L408 714 Z" fill="#C8D2DA" stroke="#98A6B2" stroke-width="2.5"/>
    <ellipse cx="398" cy="700" rx="4.5" ry="2.5" fill="#7E90A0"/>
    <line x1="394" y1="703" x2="393" y2="713" stroke="#98A6B2" stroke-width="1.5"/>
    <line x1="402" y1="703" x2="403" y2="713" stroke="#98A6B2" stroke-width="1.5"/>
  </g>

  <!-- ★차이3(L1): 산호 색 (분홍 → 파랑) -->
  <g data-diff="3" data-cx="435" data-cy="655" data-r="70">
    <g stroke="${D1 ? '#8FB8E8' : '#FF9EB5'}" stroke-width="16" stroke-linecap="round" fill="none">
      <path d="M435 712 L435 636"/>
      <path d="M435 672 Q410 660 404 630"/>
      <path d="M435 682 Q462 668 468 638"/>
    </g>
    <path d="M435 656 Q448 650 452 642" stroke="${D1 ? '#8FB8E8' : '#FF9EB5'}" stroke-width="9" stroke-linecap="round" fill="none"/>
    <circle cx="435" cy="630" r="10" fill="${D1 ? '#B8D4F2' : '#FFC2D1'}"/>
    <circle cx="403" cy="624" r="9" fill="${D1 ? '#B8D4F2' : '#FFC2D1'}"/>
    <circle cx="469" cy="632" r="9" fill="${D1 ? '#B8D4F2' : '#FFC2D1'}"/>
    <circle cx="453" cy="639" r="6" fill="${D1 ? '#B8D4F2' : '#FFC2D1'}"/>
    <circle cx="430" cy="690" r="3" fill="${D1 ? '#D6E6F8' : '#FFD6E0'}"/>
    <circle cx="440" cy="668" r="3" fill="${D1 ? '#D6E6F8' : '#FFD6E0'}"/>
    <circle cx="414" cy="650" r="3" fill="${D1 ? '#D6E6F8' : '#FFD6E0'}"/>
  </g>

  <!-- 숨은그림 L2: 소라게 (모래색 보호색, 산호 아래 모래) -->
  <g data-find="hermitcrab" data-label="소라게" data-level="2">
    <circle cx="454" cy="748" r="16" fill="#DDBE7A"/>
    <circle cx="454" cy="748" r="10" fill="#CBA65C"/>
    <circle cx="454" cy="748" r="4.5" fill="#B08E48"/>
    <path d="M438 754 Q430 748 432 738" stroke="#E8935E" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="431" cy="735" r="4" fill="#E8935E"/>
    <circle cx="429" cy="733" r="1.8" fill="#5E3220"/>
    <circle cx="428.4" cy="732.4" r="0.7" fill="#FFFFFF"/>
    <line x1="436" y1="760" x2="426" y2="764" stroke="#E8935E" stroke-width="4" stroke-linecap="round"/>
    <line x1="444" y1="762" x2="438" y2="768" stroke="#E8935E" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- 가운데 바위 -->
  <ellipse cx="545" cy="702" rx="34" ry="22" fill="#B8C4CE"/>
  <ellipse cx="536" cy="694" rx="9" ry="5" fill="#CBD5DD"/>
  <circle cx="556" cy="710" r="2.5" fill="#A8B4BE"/><circle cx="532" cy="712" r="2" fill="#A8B4BE"/>

  <!-- 숨은그림 L2: 바다달팽이 (가운데 바위 위, 바위색 보호색) -->
  <g data-find="seasnail" data-label="바다달팽이" data-level="2">
    <path d="M536 690 Q534 682 542 682 L568 682 Q576 684 572 690 Q556 696 536 690 Z" fill="#CBD5DD"/>
    <circle cx="560" cy="674" r="11" fill="#AAB8C2"/>
    <circle cx="560" cy="674" r="6.5" fill="#96A6B2"/>
    <circle cx="560" cy="674" r="2.5" fill="#7E90A0"/>
    <path d="M540 684 Q538 676 534 674 M546 683 Q546 675 542 672" stroke="#AAB8C2" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="540" cy="686" r="1.8" fill="#3E5566"/>
  </g>

  <!-- 숨은그림 L3: 가자미 (모래 속, 모래색 보호색) -->
  <g data-find="flounder" data-label="가자미" data-level="3">
    <ellipse cx="583" cy="752" rx="15" ry="9" fill="#E4C77E"/>
    <polygon points="597,752 607,745 607,759" fill="#D3B266"/>
    <circle cx="575" cy="748" r="2.2" fill="#6B5220"/><circle cx="583" cy="747" r="2.2" fill="#6B5220"/>
    <path d="M574 754 Q577 756 580 754" stroke="#6B5220" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="589" cy="751" r="1.6" fill="#D3B266"/><circle cx="592" cy="755" r="1.6" fill="#D3B266"/>
  </g>

  <!-- ★차이5(L1): 해초 줄기 개수 (3줄 → 2줄) -->
  <path d="M625 706 Q605 640 632 590 Q650 552 630 516" stroke="#4DA644" stroke-width="13" fill="none" stroke-linecap="round"/>
  <g fill="#4DA644">
    <path d="M617 644 q-24 -8 -28 -30 q24 6 28 30 z"/>
    <path d="M640 552 q-24 -8 -28 -30 q24 6 28 30 z"/>
  </g>
  <path d="M668 710 Q690 645 664 595 Q646 560 670 522" stroke="#5FBF57" stroke-width="12" fill="none" stroke-linecap="round"/>
  <g fill="#5FBF57">
    <path d="M678 660 q24 -8 28 -30 q-24 6 -28 30 z"/>
    <path d="M656 559 q24 -8 28 -30 q-24 6 -28 30 z"/>
  </g>
  <g data-diff="5" data-cx="650" data-cy="600" data-r="95">${D1 ? '' : '<path d="M646 708 Q638 630 660 570 Q676 528 656 484" stroke="#3F9E3B" stroke-width="12" fill="none" stroke-linecap="round"/>'}
  </g>

  <!-- 숨은그림 L2: 뱀장어 (해초 사이 초록 보호색) -->
  <g data-find="eel" data-label="뱀장어" data-level="2">
    <path d="M642 478 Q632 464 648 455 Q662 446 652 436" stroke="#66B85E" stroke-width="10" fill="none" stroke-linecap="round"/>
    <circle cx="650" cy="433" r="8" fill="#66B85E"/>
    <polygon points="646,426 652,419 657,427" fill="#4E9E48"/>
    <circle cx="647" cy="430" r="2.2" fill="#24421F"/>
    <path d="M654 436 Q658 438 661 436" stroke="#24421F" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 주황 부채 산호 (조개 옆) -->
  <g stroke="#FFB25E" stroke-width="11" stroke-linecap="round" fill="none">
    <path d="M772 706 L772 660"/>
    <path d="M772 686 Q754 676 750 656"/>
    <path d="M772 690 Q790 680 794 660"/>
  </g>
  <circle cx="772" cy="657" r="7" fill="#FFC98A"/><circle cx="750" cy="653" r="6" fill="#FFC98A"/><circle cx="794" cy="657" r="6" fill="#FFC98A"/>

  <!-- 숨은그림 L3: 새우 (주황 산호 위, 주황 보호색) -->
  <g data-find="shrimp" data-label="새우" data-level="3">
    <path d="M748 634 Q760 620 772 632 Q774 644 762 646" stroke="#FFAA70" stroke-width="8" fill="none" stroke-linecap="round"/>
    <polygon points="750,636 741,629 743,642" fill="#F29659"/>
    <circle cx="769" cy="630" r="2.2" fill="#7A4620"/>
    <path d="M772 627 Q776 622 780 621 M773 631 Q777 630 781 631" stroke="#F29659" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 가리비 (모래색 보호색, 모래 위) -->
  <g data-find="scallop" data-label="가리비" data-level="2">
    <path d="M700 772 Q680 766 680 746 Q700 732 720 746 Q720 766 700 772 Z" fill="#EFC08A"/>
    <path d="M700 770 L687 748 M700 770 L700 738 M700 770 L713 748" stroke="#D9A45E" stroke-width="3" stroke-linecap="round"/>
    <rect x="693" y="769" width="14" height="7" rx="3" fill="#D9A45E"/>
  </g>

  <!-- 숨은그림: 조개 (모래 위, 산호 뒤에 살짝) -->
  <g data-find="shell" data-label="조개">
    <path d="M800 748 Q794 718 826 710 Q858 718 852 748 Q840 757 826 757 Q812 757 800 748 Z" fill="#F7C9D9"/>
    <path d="M826 755 L808 722 M826 755 L826 712 M826 755 L844 722" stroke="#E8A8C0" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="826" cy="754" rx="9" ry="5" fill="#E8A8C0"/>
    <circle cx="812" cy="722" r="3" fill="#FFFFFF" opacity="0.6"/>
  </g>
  <path d="M796 754 Q788 730 800 716" stroke="#FFB25E" stroke-width="9" fill="none" stroke-linecap="round"/>
  <circle cx="800" cy="713" r="5" fill="#FFC98A"/>

  <!-- 숨은그림 L2: 말미잘 (모래색 보호색, 조개 옆) -->
  <g data-find="anemone" data-label="말미잘" data-level="2">
    <g stroke="#F2A88A" stroke-width="6" stroke-linecap="round" fill="none">
      <path d="M877 744 Q873 734 877 726"/>
      <path d="M886 742 Q885 730 889 722"/>
      <path d="M895 742 Q897 730 894 722"/>
      <path d="M903 744 Q907 734 904 727"/>
    </g>
    <ellipse cx="890" cy="750" rx="17" ry="8" fill="#E0AC76"/>
  </g>

  <!-- 숨은그림: 게 (보물상자 뒤에서 빼꼼) -->
  <g data-find="crab" data-label="게">
    <line x1="918" y1="676" x2="912" y2="660" stroke="#F28C6B" stroke-width="5" stroke-linecap="round"/>
    <line x1="938" y1="676" x2="944" y2="660" stroke="#F28C6B" stroke-width="5" stroke-linecap="round"/>
    <circle cx="912" cy="657" r="6" fill="#FFF7F2"/><circle cx="912" cy="657" r="3" fill="#6B3A2E"/>
    <circle cx="944" cy="657" r="6" fill="#FFF7F2"/><circle cx="944" cy="657" r="3" fill="#6B3A2E"/>
    <circle cx="911" cy="656" r="1.1" fill="#FFFFFF"/><circle cx="943" cy="656" r="1.1" fill="#FFFFFF"/>
    <path d="M906 686 Q894 684 890 676" stroke="#F28C6B" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="888" cy="672" r="9" fill="#F28C6B"/>
    <path d="M910 702 L898 714 M920 706 L912 720" stroke="#F28C6B" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="928" cy="690" rx="25" ry="19" fill="#F28C6B"/>
    <circle cx="921" cy="683" r="2.5" fill="#F8B09A"/><circle cx="934" cy="681" r="2.5" fill="#F8B09A"/>
    <path d="M918 692 Q926 698 934 692" stroke="#B85E3C" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 보물상자 (오른쪽 아래) -->
  <g>
    <ellipse cx="1020" cy="706" rx="85" ry="10" fill="#5E3220" opacity="0.10"/>
    <path d="M945 632 Q945 578 1020 578 Q1095 578 1095 632 Z" fill="#8B5A2B"/>
    <path d="M945 632 Q945 578 1020 578 Q1095 578 1095 632 Z" fill="none" stroke="#7E5430" stroke-width="5"/>
    <path d="M985 584 L983 632 M1055 584 L1057 632" stroke="#7E5430" stroke-width="3.5" opacity="0.7"/>
    <path d="M962 596 Q1020 570 1078 596" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.25"/>
    <rect x="945" y="632" width="150" height="70" rx="10" fill="#A9743F"/>
    <rect x="945" y="632" width="150" height="70" rx="10" fill="none" stroke="#7E5430" stroke-width="5"/>
    <line x1="983" y1="636" x2="983" y2="698" stroke="#7E5430" stroke-width="3.5" opacity="0.7"/>
    <line x1="1057" y1="636" x2="1057" y2="698" stroke="#7E5430" stroke-width="3.5" opacity="0.7"/>
    <rect x="938" y="626" width="164" height="13" rx="6" fill="#E8C05A"/>
    <circle cx="948" cy="632" r="2.5" fill="#B8923C"/><circle cx="1092" cy="632" r="2.5" fill="#B8923C"/>
    <!-- ★차이15(L3): 자물쇠 색 (금색 → 은색) -->
    <g data-diff="15" data-level="3" data-cx="1020" data-cy="643" data-r="40">
      <rect x="1008" y="632" width="24" height="22" rx="4" fill="${D3 ? '#C2CCD6' : '#E8C05A'}"/>
    </g>
    <circle cx="1020" cy="641" r="3" fill="#8A6A2E"/>
    <rect x="1018" y="643" width="4" height="7" rx="2" fill="#8A6A2E"/>
    <!-- ★차이4(L1): 보석 색 (빨강 → 초록) -->
    <g data-diff="4" data-cx="1020" data-cy="602" data-r="60">
      <circle cx="1020" cy="602" r="14" fill="${D1 ? '#4DA644' : '#E8574B'}"/>
      <circle cx="1015" cy="597" r="4" fill="${D1 ? '#9BD98A' : '#F5978E'}"/>
    </g>
    <g fill="#FFD93D">
      <circle cx="930" cy="710" r="8"/><circle cx="950" cy="716" r="7"/><circle cx="1110" cy="712" r="8"/><circle cx="962" cy="708" r="6"/>
    </g>
    <g fill="#F2CE6B">
      <circle cx="930" cy="710" r="4"/><circle cx="950" cy="716" r="3.5"/><circle cx="1110" cy="712" r="4"/><circle cx="962" cy="708" r="3"/>
    </g>
    <circle cx="1098" cy="722" r="4" fill="#F5EDE2"/><circle cx="1108" cy="728" r="3.5" fill="#F5EDE2"/><circle cx="1088" cy="728" r="3.5" fill="#F5EDE2"/>
  </g>

  <!-- 숨은그림 L3: 반지 (금화 근처, 금색 보호색) -->
  <g data-find="ring" data-label="반지" data-level="3">
    <circle cx="995" cy="750" r="8" fill="none" stroke="#E8C05A" stroke-width="4.5"/>
    <polygon points="989,741 1001,741 995,733" fill="#9BD8E8"/>
    <circle cx="993" cy="737" r="1.5" fill="#D6F0F7"/>
  </g>

  <!-- 숨은그림 L2: 성게 (오른쪽 아래 모래에 반쯤 묻힘) -->
  <g data-find="urchin" data-label="성게" data-level="2">
    <g stroke="#5E4A78" stroke-width="3" stroke-linecap="round">
      <line x1="1133" y1="691" x2="1126" y2="686"/><line x1="1155" y1="691" x2="1162" y2="686"/>
      <line x1="1138" y1="694" x2="1130" y2="690"/><line x1="1150" y1="694" x2="1158" y2="690"/>
      <line x1="1144" y1="689" x2="1144" y2="682"/>
    </g>
    <circle cx="1144" cy="702" r="15" fill="#6B5589"/>
    <circle cx="1140" cy="698" r="2" fill="#9B85C4"/><circle cx="1148" cy="700" r="2" fill="#9B85C4"/><circle cx="1144" cy="706" r="2" fill="#9B85C4"/>
    <path d="M1126 710 Q1144 702 1162 710 L1164 718 L1124 718 Z" fill="#E8CF8E"/>
  </g>

  <!-- 떠오르는 공기방울 -->
  <g fill="#E6F7FF" opacity="0.75">
    <circle cx="1155" cy="360" r="6"/><circle cx="1168" cy="330" r="8"/>
    <circle cx="738" cy="450" r="5"/><circle cx="752" cy="426" r="7"/>
    <circle cx="70" cy="380" r="5"/><circle cx="82" cy="352" r="6"/><circle cx="60" cy="330" r="4"/>
  </g>
  <g fill="#FFFFFF" opacity="0.8">
    <circle cx="1153" cy="358" r="2"/><circle cx="1165" cy="327" r="2.5"/><circle cx="750" cy="423" r="2.2"/><circle cx="80" cy="350" r="2"/>
  </g>

  <!-- 숨은그림 L3: 진주 (공기방울 사이, 방울 보호색) -->
  <g data-find="pearl" data-label="진주" data-level="3">
    <circle cx="745" cy="440" r="9" fill="#F5EDE2" stroke="#D9C9B8" stroke-width="2"/>
    <circle cx="742" cy="436" r="3" fill="#FFFFFF"/>
  </g>

  <!-- 작은 물고기 (오른쪽 아래) -->
  <g>
    <path d="M814 511 Q820 502 828 510" fill="#4FA8A0"/>
    <ellipse cx="820" cy="520" rx="18" ry="11" fill="#6BC8C0"/>
    <!-- ★차이17(L3): 청록 물고기 꼬리 색 (청록 → 주황) -->
    <g data-diff="17" data-level="3" data-cx="833" data-cy="520" data-r="40">
      <polygon points="836,520 852,511 852,529" fill="${D3 ? '#F2A33C' : '#4FA8A0'}"/>
    </g>
    <path d="M810 526 Q820 530 830 526" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.5"/>
    <circle cx="812" cy="517" r="3.5" fill="#2F5B58"/>
    <circle cx="811" cy="516" r="1.2" fill="#FFFFFF"/>
    <path d="M807 523 Q811 526 815 523" stroke="#2F5B58" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </g>
  <g>
    <path d="M1160 592 Q1165 584 1172 591" fill="#F2C63C"/>
    <ellipse cx="1165" cy="600" rx="16" ry="10" fill="#FFD93D"/>
    <polygon points="1179,600 1194,592 1194,608" fill="#F2C63C"/>
    <circle cx="1158" cy="597" r="3" fill="#6B4A2E"/>
    <circle cx="1157" cy="596" r="1.1" fill="#FFFFFF"/>
    <path d="M1154 603 Q1158 606 1162 603" stroke="#6B4A2E" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
  },
  hidden: [
    /* ── L1: 쉬움 (6) ── */
    {
      id: 'starfish', label: '불가사리',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <polygon points="30,4 36,19 53,21 40,31 44,47 30,39 16,47 20,31 7,21 24,19"
          fill="#F2B95E" stroke="#E0A040" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="30" cy="12" r="1.8" fill="#E0A040"/><circle cx="45" cy="24" r="1.8" fill="#E0A040"/><circle cx="15" cy="24" r="1.8" fill="#E0A040"/>
        <circle cx="25" cy="25" r="2.5" fill="#8A5A2E"/><circle cx="35" cy="25" r="2.5" fill="#8A5A2E"/>
        <circle cx="24" cy="24" r="0.9" fill="#FFFFFF"/><circle cx="34" cy="24" r="0.9" fill="#FFFFFF"/>
        <circle cx="20" cy="30" r="2" fill="#F09070" opacity="0.7"/><circle cx="40" cy="30" r="2" fill="#F09070" opacity="0.7"/>
        <path d="M25 31 Q30 35 35 31" stroke="#8A5A2E" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'shell', label: '조개',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 44 Q6 16 30 8 Q54 16 48 44 Q40 52 30 52 Q20 52 12 44 Z" fill="#F7C9D9"/>
        <path d="M30 50 L15 20 M30 50 L30 12 M30 50 L45 20" stroke="#E8A8C0" stroke-width="3.5" stroke-linecap="round"/>
        <ellipse cx="30" cy="49" rx="7" ry="4" fill="#E8A8C0"/></svg>`
    },
    {
      id: 'crab', label: '게',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="24" y1="26" x2="20" y2="14" stroke="#F28C6B" stroke-width="4" stroke-linecap="round"/>
        <line x1="36" y1="26" x2="40" y2="14" stroke="#F28C6B" stroke-width="4" stroke-linecap="round"/>
        <circle cx="20" cy="12" r="5" fill="#FFF7F2"/><circle cx="20" cy="12" r="2.5" fill="#6B3A2E"/>
        <circle cx="40" cy="12" r="5" fill="#FFF7F2"/><circle cx="40" cy="12" r="2.5" fill="#6B3A2E"/>
        <circle cx="8" cy="28" r="7" fill="#F28C6B"/><circle cx="52" cy="28" r="7" fill="#F28C6B"/>
        <path d="M14 42 L6 50 M22 46 L16 54 M46 42 L54 50 M38 46 L44 54" stroke="#F28C6B" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="30" cy="38" rx="18" ry="14" fill="#F28C6B"/>
        <circle cx="17" cy="10" r="1.5" fill="#FFFFFF"/><circle cx="37" cy="10" r="1.5" fill="#FFFFFF"/>
        <circle cx="25" cy="33" r="2" fill="#F8B09A"/><circle cx="35" cy="31" r="2" fill="#F8B09A"/>
        <path d="M23 40 Q30 45 37 40" stroke="#B85E3C" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'seahorse', label: '해마',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="31" cy="33" rx="11" ry="17" fill="#8FCF8B"/>
        <circle cx="25" cy="13" r="9" fill="#8FCF8B"/>
        <path d="M18 14 Q8 14 7 18" stroke="#8FCF8B" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M28 48 Q22 57 34 58 Q42 57 38 50" stroke="#7ABD76" stroke-width="6" fill="none" stroke-linecap="round"/>
        <polygon points="40,26 50,30 40,36" fill="#7ABD76"/>
        <polygon points="27,5 32,-1 34,6" fill="#7ABD76"/>
        <circle cx="22" cy="11" r="2.5" fill="#2F5B3A"/></svg>`
    },
    {
      id: 'puffer', label: '복어',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#F2C63C" stroke-width="3.5" stroke-linecap="round">
          <line x1="27" y1="12" x2="27" y2="5"/><line x1="27" y1="48" x2="27" y2="55"/>
          <line x1="9" y1="30" x2="2" y2="30"/>
          <line x1="14" y1="17" x2="9" y2="12"/><line x1="40" y1="17" x2="45" y2="12"/>
          <line x1="14" y1="43" x2="9" y2="48"/><line x1="40" y1="43" x2="45" y2="48"/>
        </g>
        <circle cx="27" cy="30" r="16" fill="#FFE08A"/>
        <path d="M16 21 Q22 16 29 18" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.55"/>
        <circle cx="35" cy="20" r="2.2" fill="#F2C63C" opacity="0.85"/><circle cx="18" cy="40" r="2" fill="#F2C63C" opacity="0.85"/><circle cx="36" cy="40" r="2" fill="#F2C63C" opacity="0.85"/>
        <polygon points="42,30 56,21 56,39" fill="#F2C63C"/>
        <circle cx="21" cy="27" r="2.8" fill="#6B5A2E"/><circle cx="33" cy="27" r="2.8" fill="#6B5A2E"/>
        <circle cx="20" cy="26" r="1" fill="#FFFFFF"/><circle cx="32" cy="26" r="1" fill="#FFFFFF"/>
        <circle cx="15" cy="33" r="2" fill="#F2A24C" opacity="0.6"/><circle cx="39" cy="33" r="2" fill="#F2A24C" opacity="0.6"/>
        <path d="M22 35 Q27 39 32 35" stroke="#6B5A2E" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'anchor', label: '닻',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="10" r="6" fill="none" stroke="#7C8FA6" stroke-width="5"/>
        <line x1="30" y1="16" x2="30" y2="46" stroke="#7C8FA6" stroke-width="7" stroke-linecap="round"/>
        <line x1="17" y1="25" x2="43" y2="25" stroke="#7C8FA6" stroke-width="5" stroke-linecap="round"/>
        <path d="M30 46 Q13 46 10 30" stroke="#7C8FA6" stroke-width="7" fill="none" stroke-linecap="round"/>
        <path d="M30 46 Q47 46 50 30" stroke="#7C8FA6" stroke-width="7" fill="none" stroke-linecap="round"/>
        <polygon points="4,33 13,26 13,40" fill="#7C8FA6"/>
        <polygon points="56,33 47,26 47,40" fill="#7C8FA6"/></svg>`
    },
    /* ── L2: 보통 (7) ── */
    {
      id: 'squid', label: '오징어', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <polygon points="30,4 14,28 46,28" fill="#A9D6EE"/>
        <ellipse cx="30" cy="32" rx="14" ry="13" fill="#B8DFF2"/>
        <ellipse cx="25" cy="25" rx="4" ry="2.5" fill="#FFFFFF" opacity="0.5"/>
        <circle cx="24" cy="31" r="3" fill="#3E6A88"/><circle cx="36" cy="31" r="3" fill="#3E6A88"/>
        <circle cx="19" cy="37" r="2.2" fill="#8FB8D8" opacity="0.8"/><circle cx="41" cy="37" r="2.2" fill="#8FB8D8" opacity="0.8"/>
        <path d="M26 39 Q30 42 34 39" stroke="#3E6A88" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M21 44 Q17 52 21 56 M30 45 Q32 52 28 57 M39 44 Q43 52 39 56" stroke="#A9D6EE" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'eel', label: '뱀장어', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 56 Q8 40 26 30 Q42 22 32 14" stroke="#66B85E" stroke-width="9" fill="none" stroke-linecap="round"/>
        <circle cx="31" cy="12" r="9" fill="#66B85E"/>
        <polygon points="26,4 34,0 38,8" fill="#4E9E48"/>
        <circle cx="28" cy="9" r="2.5" fill="#24421F"/>
        <path d="M35 15 Q39 17 42 15" stroke="#24421F" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'seasnail', label: '바다달팽이', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 46 Q6 38 14 38 L46 38 Q54 40 50 46 Q30 54 8 46 Z" fill="#CBD5DD"/>
        <circle cx="38" cy="26" r="13" fill="#AAB8C2"/><circle cx="38" cy="26" r="8" fill="#96A6B2"/><circle cx="38" cy="26" r="3.5" fill="#7E90A0"/>
        <path d="M14 40 Q12 28 6 24 M22 38 Q22 28 16 22" stroke="#AAB8C2" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <circle cx="13" cy="43" r="2.2" fill="#3E5566"/></svg>`
    },
    {
      id: 'hermitcrab', label: '소라게', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="35" cy="30" r="19" fill="#DDBE7A"/>
        <circle cx="35" cy="30" r="12" fill="#CBA65C"/>
        <circle cx="35" cy="30" r="5.5" fill="#B08E48"/>
        <path d="M17 38 Q7 32 9 20" stroke="#E8935E" stroke-width="5" fill="none" stroke-linecap="round"/>
        <circle cx="9" cy="16" r="5" fill="#E8935E"/>
        <circle cx="7" cy="13" r="2" fill="#5E3220"/>
        <line x1="15" y1="46" x2="7" y2="52" stroke="#E8935E" stroke-width="5" stroke-linecap="round"/>
        <line x1="25" y1="50" x2="19" y2="56" stroke="#E8935E" stroke-width="5" stroke-linecap="round"/></svg>`
    },
    {
      id: 'scallop', label: '가리비', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 50 Q8 42 8 22 Q30 4 52 22 Q52 42 30 50 Z" fill="#EFC08A"/>
        <path d="M30 48 L14 24 M30 48 L30 12 M30 48 L46 24" stroke="#D9A45E" stroke-width="4" stroke-linecap="round"/>
        <rect x="22" y="47" width="16" height="8" rx="4" fill="#D9A45E"/></svg>`
    },
    {
      id: 'anemone', label: '말미잘', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#F2A88A" stroke-width="7" stroke-linecap="round" fill="none">
          <path d="M14 36 Q8 24 14 12"/><path d="M25 34 Q24 20 28 8"/>
          <path d="M35 34 Q37 20 33 8"/><path d="M46 36 Q52 24 47 13"/>
        </g>
        <ellipse cx="30" cy="46" rx="24" ry="11" fill="#E0AC76"/></svg>`
    },
    {
      id: 'urchin', label: '성게', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#5E4A78" stroke-width="4" stroke-linecap="round">
          <line x1="30" y1="12" x2="30" y2="4"/><line x1="14" y1="18" x2="8" y2="12"/><line x1="46" y1="18" x2="52" y2="12"/>
          <line x1="10" y1="32" x2="2" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/>
          <line x1="14" y1="46" x2="8" y2="52"/><line x1="46" y1="46" x2="52" y2="52"/>
        </g>
        <circle cx="30" cy="32" r="18" fill="#6B5589"/>
        <circle cx="25" cy="27" r="2.5" fill="#9B85C4"/><circle cx="35" cy="29" r="2.5" fill="#9B85C4"/><circle cx="30" cy="37" r="2.5" fill="#9B85C4"/></svg>`
    },
    /* ── L3: 어려움 (8) ── */
    {
      id: 'shrimp', label: '새우', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 30 Q30 8 46 26 Q50 42 32 46" stroke="#FFAA70" stroke-width="10" fill="none" stroke-linecap="round"/>
        <polygon points="16,32 4,22 6,42" fill="#F29659"/>
        <circle cx="43" cy="23" r="3" fill="#7A4620"/>
        <path d="M46 18 Q52 12 57 11 M48 26 Q54 26 58 28" stroke="#F29659" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'pearl', label: '진주', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="18" fill="#F5EDE2" stroke="#D9C9B8" stroke-width="3"/>
        <circle cx="23" cy="23" r="5" fill="#FFFFFF"/></svg>`
    },
    {
      id: 'flounder', label: '가자미', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="26" cy="32" rx="21" ry="13" fill="#E4C77E"/>
        <polygon points="45,32 57,24 57,40" fill="#D3B266"/>
        <circle cx="16" cy="26" r="3" fill="#6B5220"/><circle cx="26" cy="25" r="3" fill="#6B5220"/>
        <path d="M14 36 Q18 39 22 36" stroke="#6B5220" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle cx="33" cy="30" r="2" fill="#D3B266"/><circle cx="37" cy="36" r="2" fill="#D3B266"/></svg>`
    },
    {
      id: 'ring', label: '반지', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="38" r="14" fill="none" stroke="#E8C05A" stroke-width="7"/>
        <polygon points="20,20 40,20 30,6" fill="#9BD8E8"/>
        <circle cx="26" cy="13" r="2.5" fill="#D6F0F7"/></svg>`
    },
    {
      id: 'barnacle', label: '따개비', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 50 L17 18 Q30 8 43 18 L50 50 Z" fill="#C8D2DA" stroke="#98A6B2" stroke-width="3"/>
        <ellipse cx="30" cy="17" rx="9" ry="5" fill="#7E90A0"/>
        <line x1="22" y1="24" x2="19" y2="48" stroke="#98A6B2" stroke-width="2.5"/>
        <line x1="38" y1="24" x2="41" y2="48" stroke="#98A6B2" stroke-width="2.5"/></svg>`
    },
    {
      id: 'seacucumber', label: '해삼', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 38 Q4 26 18 24 L44 24 Q56 26 54 38 Q54 46 42 46 L18 46 Q6 46 6 38 Z" fill="#D2AC66"/>
        <circle cx="18" cy="23" r="3" fill="#BC954E"/><circle cx="30" cy="21" r="3" fill="#BC954E"/><circle cx="42" cy="23" r="3" fill="#BC954E"/>
        <circle cx="49" cy="33" r="2.5" fill="#6B4A20"/>
        <path d="M48 40 Q52 42 55 39" stroke="#6B4A20" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'seasquirt', label: '멍게', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 40 Q8 16 30 10 Q52 16 46 40 Q42 52 30 52 Q18 52 14 40 Z" fill="#E8899C"/>
        <path d="M22 13 L18 4" stroke="#D9788C" stroke-width="7" stroke-linecap="round"/>
        <path d="M40 14 L45 6" stroke="#D9788C" stroke-width="7" stroke-linecap="round"/>
        <circle cx="24" cy="28" r="3" fill="#D9788C"/><circle cx="37" cy="24" r="3" fill="#D9788C"/><circle cx="30" cy="40" r="3" fill="#D9788C"/></svg>`
    },
    {
      id: 'plankton', label: '플랑크톤', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#A8DCE8" stroke-width="4" stroke-linecap="round">
          <line x1="12" y1="16" x2="5" y2="10"/><line x1="48" y1="16" x2="55" y2="10"/>
          <line x1="12" y1="44" x2="5" y2="50"/><line x1="48" y1="44" x2="55" y2="50"/>
        </g>
        <circle cx="30" cy="30" r="17" fill="#C2E8DC"/>
        <circle cx="24" cy="27" r="3" fill="#4A7A6A"/><circle cx="36" cy="27" r="3" fill="#4A7A6A"/>
        <path d="M23 35 Q30 40 37 35" stroke="#4A7A6A" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    }
  ],

  sticker: {
    name: '거북이 스티커',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#DFF5FF" stroke="#7ACB8B" stroke-width="7"/>
      <ellipse cx="30" cy="70" rx="12" ry="7" transform="rotate(-30 30 70)" fill="#A8E0B2"/>
      <ellipse cx="90" cy="70" rx="12" ry="7" transform="rotate(30 90 70)" fill="#A8E0B2"/>
      <circle cx="60" cy="42" r="17" fill="#A8E0B2"/>
      <ellipse cx="54" cy="34" rx="6" ry="3.5" transform="rotate(-20 54 34)" fill="#FFFFFF" opacity="0.5"/>
      <circle cx="54" cy="40" r="3.5" fill="#2F5B3A"/><circle cx="66" cy="40" r="3.5" fill="#2F5B3A"/>
      <circle cx="53" cy="39" r="1.2" fill="#FFFFFF"/><circle cx="65" cy="39" r="1.2" fill="#FFFFFF"/>
      <circle cx="47" cy="46" r="2.8" fill="#F5B8C4" opacity="0.7"/><circle cx="73" cy="46" r="2.8" fill="#F5B8C4" opacity="0.7"/>
      <path d="M53 48 Q60 53 67 48" stroke="#2F5B3A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="60" cy="74" rx="32" ry="24" fill="#7ACB8B" stroke="#5FAF70" stroke-width="4"/>
      <path d="M36 66 Q48 54 66 55" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.4"/>
      <circle cx="48" cy="68" r="7" fill="#5FAF70"/><circle cx="72" cy="68" r="7" fill="#5FAF70"/>
      <circle cx="60" cy="84" r="7" fill="#5FAF70"/><circle cx="82" cy="80" r="4" fill="#5FAF70" opacity="0.85"/><circle cx="38" cy="80" r="4" fill="#5FAF70" opacity="0.85"/></svg>`
  }
});
