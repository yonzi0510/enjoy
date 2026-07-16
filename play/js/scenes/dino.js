/* 테마: 공룡 — farm.js 레퍼런스 구조를 따름 (난이도 3레벨)
 * 계약:
 *  - buildScene('A'|'B', 1|2|3) → viewBox="0 0 1200 800" SVG 문자열
 *  - 숨은그림: L1 6개·L2 7개·L3 8개 = 총 21개. 모든 레벨 대상을 항상 그린다(하위 레벨에선 장식)
 *    <g data-find="id" data-label="이름" data-level="2">  (data-level 없으면 1)
 *    크기: L1 40~90px, L2 28~55px(보호색·부분 가림), L3 20~40px(강한 보호색)
 *  - 다른그림: L1 5개(id 1~5)·L2 6개(id 6~11)·L3 7개(id 12~18). 마커 그룹은 항상 출력하되
 *    내용 차이는 해당 레벨의 B에서만 적용: const D1=!A&&L===1 … fill="${D1?'바뀐색':'원래색'}"
 *    <g data-diff="6" data-level="2" data-cx=".." data-cy=".." data-r=".."> (속성 순서 고정, L1은 data-level 생략)
 *  - defs/그라디언트/url(#…) 참조 금지 — 단색 fill만 사용 (명암은 반투명 단색 겹침)
 */
window.SCENES = window.SCENES || [];

SCENES.push({
  id: 'dino',
  name: '공룡',
  emoji: '🦕',
  bg: '#E8F5DC',

  buildScene(v, level) {
    const A = v === 'A';
    const L = +level || 1;
    const D1 = !A && L === 1, D2 = !A && L === 2, D3 = !A && L === 3;
    // 브라키오사우루스(차이1)·익룡(차이4) 색 — B에서만 바뀜
    const BR = D1 ? '#8FB8E8' : '#74C561';   // 몸통
    const BRb = D1 ? '#CBDFF6' : '#C9EAAA';  // 배·반점
    const PW = D1 ? '#9BD98A' : '#F5A8C6';   // 익룡 날개
    const PC = D1 ? '#7BC26E' : '#E88CAE';   // 익룡 볏
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
  <!-- 하늘 (파스텔 층) -->
  <rect x="0" y="0" width="1200" height="580" fill="#B9E0F4"/>
  <rect x="0" y="250" width="1200" height="330" fill="#CDEAF8" opacity="0.75"/>
  <rect x="0" y="430" width="1200" height="150" fill="#E6F6FC" opacity="0.85"/>

  <!-- 원경 산맥 (파스텔 실루엣 + 눈모자) -->
  <g>
    <path d="M-40 470 L30 418 L110 470 Z" fill="#CFE0EF"/>
    <path d="M0 470 L70 384 L150 470 Z" fill="#BFD5E8"/>
    <path d="M58 400 L70 384 L82 400 Q76 395 70 400 Q64 395 58 400 Z" fill="#FFFFFF" opacity="0.95"/>
    <path d="M900 470 L1000 388 L1100 470 Z" fill="#BFD5E8"/>
    <path d="M988 403 L1000 388 L1012 403 Q1006 398 1000 403 Q994 398 988 403 Z" fill="#FFFFFF" opacity="0.95"/>
    <path d="M1040 470 L1120 410 L1200 470 Z" fill="#CFE0EF"/>
    <path d="M1110 422 L1120 410 L1130 422 Q1125 418 1120 422 Q1115 418 1110 422 Z" fill="#FFFFFF" opacity="0.9"/>
  </g>

  <!-- 해 (하이라이트·볼터치) -->
  <g>
    <circle cx="110" cy="95" r="52" fill="#FFD93D"/>
    <circle cx="98" cy="83" r="30" fill="#FFE887" opacity="0.85"/>
    <g stroke="#FFD93D" stroke-width="10" stroke-linecap="round">
      <line x1="110" y1="12" x2="110" y2="30"/><line x1="110" y1="160" x2="110" y2="178"/>
      <line x1="27" y1="95" x2="45" y2="95"/><line x1="175" y1="95" x2="193" y2="95"/>
      <line x1="52" y1="37" x2="65" y2="50"/>
      <line x1="168" y1="37" x2="155" y2="50"/><line x1="65" y1="140" x2="52" y2="153"/>
    </g>
    <!-- ★차이12(L3): 해 오른쪽 아래 광선 — B에서는 사라짐 -->
    <g data-diff="12" data-level="3" data-cx="162" data-cy="146" data-r="40">${D3 ? '' : '<line x1="155" y1="140" x2="168" y2="153" stroke="#FFD93D" stroke-width="10" stroke-linecap="round"/>'}
    </g>
    <circle cx="94" cy="88" r="6.5" fill="#E8A800"/><circle cx="126" cy="88" r="6.5" fill="#E8A800"/>
    <circle cx="92" cy="86" r="2" fill="#FFF3B8"/><circle cx="124" cy="86" r="2" fill="#FFF3B8"/>
    <path d="M94 112 Q110 124 126 112" stroke="#E8A800" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="82" cy="110" r="6.5" fill="#F2A33C" opacity="0.55"/><circle cx="138" cy="110" r="6.5" fill="#F2A33C" opacity="0.55"/>
  </g>

  <!-- 높은 하늘 얇은 구름 층 -->
  <g fill="#FFFFFF">
    <rect x="196" y="250" width="88" height="13" rx="6.5" opacity="0.5"/>
    <rect x="320" y="232" width="70" height="11" rx="5.5" opacity="0.5"/>
    <rect x="688" y="254" width="78" height="11" rx="5.5" opacity="0.45"/>
  </g>

  <!-- 구름 (오른쪽, 밑면 그늘) -->
  <g fill="#FFFFFF" opacity="0.95">
    <circle cx="960" cy="100" r="30"/><circle cx="1002" cy="84" r="38"/>
    <rect x="950" y="94" width="104" height="36" rx="18"/>
    <ellipse cx="1002" cy="126" rx="46" ry="8" fill="#BFD8E8" opacity="0.6"/>
  </g>
  <!-- ★차이15(L3): 구름 오른쪽 뭉게 원 — B에서는 사라짐 -->
  <g data-diff="15" data-level="3" data-cx="1030" data-cy="102" data-r="55">${D3 ? '' : '<circle cx="1044" cy="102" r="28" fill="#FFFFFF" opacity="0.95"/>'}
  </g>

  <!-- ★차이5(L1): 구름 — B에서는 사라짐 -->
  <g data-diff="5" data-cx="400" data-cy="105" data-r="80">${D1 ? '' : '<g fill="#FFFFFF" opacity="0.95"><circle cx="360" cy="110" r="28"/><circle cx="400" cy="94" r="36"/><circle cx="440" cy="112" r="26"/><rect x="352" y="104" width="98" height="34" rx="17"/><ellipse cx="400" cy="133" rx="42" ry="7" fill="#C8DEEC" opacity="0.7"/></g>'}
  </g>

  <!-- 작은 구름 (가운데 위) -->
  <g fill="#FFFFFF" opacity="0.85">
    <circle cx="728" cy="66" r="13"/><circle cx="748" cy="58" r="17"/><circle cx="766" cy="68" r="11"/>
    <rect x="722" y="62" width="58" height="22" rx="11"/>
  </g>

  <!-- ★차이4(L1): 익룡 — 날개 색 (분홍 → 연두) -->
  <g data-diff="4" data-cx="862" data-cy="172" data-r="95">
    <path d="M852 190 Q790 130 726 152 Q782 182 838 200 Z" fill="${PW}"/>
    <path d="M872 190 Q934 130 998 152 Q942 182 886 200 Z" fill="${PW}"/>
    <path d="M840 186 Q800 158 764 156" stroke="${PC}" stroke-width="2.5" fill="none" opacity="0.8"/>
    <path d="M884 186 Q924 158 960 156" stroke="${PC}" stroke-width="2.5" fill="none" opacity="0.8"/>
    <ellipse cx="862" cy="196" rx="26" ry="16" fill="#F8E3C2"/>
    <ellipse cx="860" cy="201" rx="16" ry="8" fill="#FFFFFF" opacity="0.45"/>
    <circle cx="890" cy="180" r="13" fill="#F8E3C2"/>
    <polygon points="884,172 870,152 892,166" fill="${PC}"/>
    <polygon points="900,176 924,182 900,188" fill="#F2A33C"/>
    <circle cx="891" cy="178" r="4.5" fill="#FFFFFF"/>
    <circle cx="892" cy="178" r="2.8" fill="#5A4632"/>
    <circle cx="891" cy="177" r="1" fill="#FFFFFF"/>
    <circle cx="884" cy="186" r="3" fill="#F5A8C6" opacity="0.7"/>
    <path d="M886 190 Q891 193 896 190" stroke="#5A4632" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 아기 익룡 (하늘, 하늘색 보호색 날개) -->
  <g data-find="babyptero" data-label="아기 익룡" data-level="2">
    <path d="M285 246 Q273 237 262 241 Q273 249 281 253 Z" fill="#A8CFE8"/>
    <path d="M291 246 Q303 237 314 241 Q303 249 295 253 Z" fill="#A8CFE8"/>
    <ellipse cx="288" cy="252" rx="10" ry="6" fill="#E8D9BE"/>
    <circle cx="298" cy="245" r="5" fill="#E8D9BE"/>
    <polygon points="296,241 291,233 301,239" fill="#8FB8D8"/>
    <polygon points="302,244 312,247 302,250" fill="#F2A33C"/>
    <circle cx="298" cy="244" r="1.6" fill="#5A4632"/>
  </g>

  <!-- 작은 화산 (왼쪽 뒤: 명암·바위점·연기) -->
  <g>
    <path d="M110 470 L212 322 Q232 306 252 322 L354 470 Z" fill="#D8A48B"/>
    <path d="M252 322 L354 470 L282 470 Z" fill="#000000" opacity="0.08"/>
    <path d="M212 324 L118 462 L160 462 Z" fill="#FFFFFF" opacity="0.14"/>
    <circle cx="280" cy="416" r="4" fill="#8F5F44" opacity="0.5"/>
    <circle cx="176" cy="356" r="3.5" fill="#8F5F44" opacity="0.45"/>
    <ellipse cx="232" cy="323" rx="32" ry="11" fill="#9C6B4A"/>
    <!-- ★차이8(L2): 분화구 색 (갈색 → 풀색) -->
    <g data-diff="8" data-level="2" data-cx="232" data-cy="321" data-r="50">
      <ellipse cx="232" cy="321" rx="30" ry="10" fill="${D2 ? '#7FA85C' : '#B07E63'}"/>
    </g>
    <circle cx="228" cy="302" r="7" fill="#F2EEE8" opacity="0.7"/>
    <circle cx="238" cy="286" r="5" fill="#F2EEE8" opacity="0.6"/>
    <circle cx="212" cy="380" r="5" fill="#8A5A3C"/><circle cx="252" cy="380" r="5" fill="#8A5A3C"/>
    <circle cx="210" cy="378" r="1.6" fill="#F5E6D8"/><circle cx="250" cy="378" r="1.6" fill="#F5E6D8"/>
    <path d="M214 396 Q232 406 250 396" stroke="#8A5A3C" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="194" cy="390" r="6.5" fill="#E8A98A" opacity="0.6"/><circle cx="270" cy="390" r="6.5" fill="#E8A98A" opacity="0.6"/>
  </g>

  <!-- 큰 화산 (가운데 뒤: 명암·용암 줄기·바위점) -->
  <g>
    <path d="M420 560 L562 252 Q600 224 638 252 L780 560 Z" fill="#C08A6B"/>
    <path d="M638 252 L780 560 L646 560 Z" fill="#000000" opacity="0.08"/>
    <path d="M560 260 L432 552 L516 552 Z" fill="#FFFFFF" opacity="0.10"/>
    <circle cx="620" cy="382" r="5" fill="#9C6B4A" opacity="0.55"/>
    <circle cx="566" cy="350" r="4" fill="#9C6B4A" opacity="0.5"/>
    <ellipse cx="600" cy="252" rx="44" ry="13" fill="#9C6B4A"/>
    <!-- ★차이6(L2): 용암 색 (주황 → 노랑) -->
    <g data-diff="6" data-level="2" data-cx="600" data-cy="268" data-r="55">
      <path d="M560 254 Q572 284 584 260 Q594 288 606 260 Q618 286 630 256 Q636 274 642 252 L560 252 Z" fill="${D2 ? '#FFD24D' : '#FF9A66'}"/>
    </g>
    <path d="M584 266 Q579 290 587 310" stroke="#FF8A5C" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M617 264 Q623 288 615 308" stroke="#FF8A5C" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="578" cy="332" r="7" fill="#8A5A3C"/><circle cx="626" cy="332" r="7" fill="#8A5A3C"/>
    <circle cx="576" cy="330" r="2.2" fill="#F5E6D8"/><circle cx="624" cy="330" r="2.2" fill="#F5E6D8"/>
    <path d="M578 350 Q602 364 626 350" stroke="#8A5A3C" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="562" cy="346" r="8" fill="#E8A98A" opacity="0.7"/>
    <!-- ★차이16(L3): 화산 오른쪽 볼터치 — B에서는 사라짐 -->
    <g data-diff="16" data-level="3" data-cx="642" data-cy="346" data-r="40">${D3 ? '' : '<circle cx="642" cy="346" r="8" fill="#E8A98A" opacity="0.7"/>'}
    </g>
  </g>

  <!-- ★차이2(L1): 화산 연기 — B에서는 사라짐 -->
  <g data-diff="2" data-cx="604" data-cy="155" data-r="78">${D1 ? '' : '<g fill="#F2EEE8" opacity="0.95"><circle cx="592" cy="202" r="20"/><circle cx="620" cy="172" r="27"/><circle cx="590" cy="140" r="22"/><circle cx="618" cy="108" r="16"/><circle cx="602" cy="190" r="11" fill="#D9D2C8" opacity="0.8"/><circle cx="628" cy="160" r="9" fill="#D9D2C8" opacity="0.6"/></g>'}
  </g>

  <!-- 초원 언덕 (3단 + 크레스트 하이라이트) -->
  <path d="M0 470 Q250 380 520 460 Q850 370 1200 470 L1200 800 L0 800 Z" fill="#B4E39A"/>
  <path d="M0 474 Q250 384 520 464" stroke="#FFFFFF" stroke-width="6" fill="none" opacity="0.3"/>
  <path d="M520 464 Q850 374 1200 474" stroke="#FFFFFF" stroke-width="6" fill="none" opacity="0.3"/>
  <path d="M0 560 Q400 500 800 570 Q1000 600 1200 560 L1200 800 L0 800 Z" fill="#8FD177"/>
  <path d="M0 564 Q400 504 800 574" stroke="#FFFFFF" stroke-width="5" fill="none" opacity="0.22"/>
  <path d="M0 708 Q200 688 420 704 Q700 728 900 708 Q1050 694 1200 708 L1200 800 L0 800 Z" fill="#7FCB68"/>
  <path d="M0 800 L1200 800 L1200 782 Q600 766 0 782 Z" fill="#4E9440" opacity="0.25"/>

  <!-- 풀밭 장식: 덤불·결·조약돌·낙엽·꽃줄기 -->
  <g>
    <circle cx="358" cy="456" r="11" fill="#9BD483"/><circle cx="374" cy="450" r="13" fill="#9BD483"/><circle cx="388" cy="457" r="10" fill="#9BD483"/>
    <circle cx="373" cy="460" r="9" fill="#83C46C" opacity="0.85"/>
    <circle cx="872" cy="462" r="10" fill="#9BD483"/><circle cx="886" cy="456" r="12" fill="#9BD483"/><circle cx="899" cy="463" r="9" fill="#9BD483"/>
    <circle cx="885" cy="466" r="8" fill="#83C46C" opacity="0.85"/>
    <circle cx="58" cy="512" r="9" fill="#9BD483"/><circle cx="72" cy="506" r="11" fill="#9BD483"/><circle cx="84" cy="513" r="8" fill="#9BD483"/>
  </g>
  <g stroke="#6BB456" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8">
    <path d="M140 612 q7 -7 14 0"/><path d="M320 598 q7 -7 14 0"/><path d="M508 586 q7 -7 14 0"/>
    <path d="M724 614 q7 -7 14 0"/><path d="M860 618 q7 -7 14 0"/><path d="M1052 602 q7 -7 14 0"/>
    <path d="M258 702 q7 -7 14 0"/><path d="M618 692 q7 -7 14 0"/><path d="M60 662 q7 -7 14 0"/>
    <path d="M1152 604 q7 -7 14 0"/>
  </g>
  <g fill="#E8DFC8">
    <circle cx="612" cy="724" r="6"/><circle cx="652" cy="732" r="4.5"/>
    <circle cx="64" cy="770" r="5"/><circle cx="112" cy="766" r="4"/>
    <ellipse cx="613" cy="729" rx="6" ry="1.6" fill="#B8AE90" opacity="0.6"/>
  </g>
  <g fill="#E8AE5C">
    <ellipse cx="984" cy="622" rx="7" ry="3.5" transform="rotate(-25 984 622)"/>
    <ellipse cx="1032" cy="602" rx="6" ry="3" transform="rotate(20 1032 602)" fill="#DFA050"/>
    <ellipse cx="1004" cy="631" rx="6" ry="3" transform="rotate(10 1004 631)"/>
  </g>
  <g stroke="#5E9950" stroke-width="3" fill="none" stroke-linecap="round">
    <path d="M86 659 Q84 670 82 682"/>
    <path d="M1156 645 Q1154 658 1157 670"/>
  </g>
  <ellipse cx="78" cy="670" rx="6" ry="3" transform="rotate(-30 78 670)" fill="#5E9950"/>
  <ellipse cx="94" cy="674" rx="6" ry="3" transform="rotate(30 94 674)" fill="#5E9950"/>
  <ellipse cx="1148" cy="662" rx="6" ry="3" transform="rotate(-30 1148 662)" fill="#5E9950"/>

  <!-- 숨은그림 L3: 화석 조각 (작은 화산 비탈, 돌색 보호색) -->
  <g data-find="fossilbit" data-label="화석 조각" data-level="3">
    <ellipse cx="195" cy="412" rx="17" ry="12" fill="#C69476"/>
    <path d="M184 412 L206 412" stroke="#EFE3CE" stroke-width="2" stroke-linecap="round"/>
    <path d="M189 406 L189 418 M195 405 L195 419 M201 406 L201 418" stroke="#EFE3CE" stroke-width="2" stroke-linecap="round"/>
    <circle cx="182" cy="412" r="2.2" fill="#EFE3CE"/>
  </g>

  <!-- 숨은그림 L2: 화산석 (큰 화산 비탈, 진갈색 보호색) -->
  <g data-find="lavarock" data-label="화산석" data-level="2">
    <path d="M654 412 Q652 396 668 390 Q686 388 690 400 Q692 414 678 418 Q660 420 654 412 Z" fill="#8A6248"/>
    <circle cx="666" cy="400" r="3" fill="#6B4A34"/><circle cx="678" cy="406" r="3.5" fill="#6B4A34"/><circle cx="668" cy="411" r="2.5" fill="#6B4A34"/>
  </g>

  <!-- 숨은그림: 도마뱀 (큰 화산 비탈에서 일광욕) -->
  <g data-find="lizard" data-label="도마뱀">
    <path d="M506 420 Q518 408 532 412 Q546 418 552 410 Q562 400 570 392" stroke="#58B368" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M566 394 Q576 386 584 376" stroke="#58B368" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="502" cy="418" r="10" fill="#58B368"/>
    <circle cx="499" cy="415" r="2.5" fill="#2E5A38"/>
    <circle cx="498" cy="414" r="0.9" fill="#FFFFFF"/>
    <path d="M496 422 Q499 425 502 423" stroke="#2E5A38" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M514 424 L509 434 M526 420 L524 431 M544 415 L541 427 M553 410 L553 421" stroke="#3F8F50" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 반짝이는 돌 (풀밭, 연두 보호색) -->
  <g data-find="shinystone" data-label="반짝이는 돌" data-level="3">
    <path d="M468 512 L473 497 L487 494 L494 505 L485 515 Z" fill="#A8C48E"/>
    <path d="M474 503 L480 509" stroke="#FFF3B8" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M484 499 L488 504" stroke="#FFF3B8" stroke-width="2" stroke-linecap="round"/>
    <path d="M497 492 L501 488 M498 497 L504 497" stroke="#FFF3B8" stroke-width="2" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 공룡 발자국 (풀밭, 진초록 보호색) -->
  <g data-find="footprint" data-label="공룡 발자국" data-level="3">
    <ellipse cx="600" cy="558" rx="10" ry="11" fill="#74B85E"/>
    <ellipse cx="589" cy="545" rx="4" ry="6" transform="rotate(-20 589 545)" fill="#74B85E"/>
    <ellipse cx="600" cy="541" rx="4" ry="6" fill="#74B85E"/>
    <ellipse cx="611" cy="545" rx="4" ry="6" transform="rotate(20 611 545)" fill="#74B85E"/>
  </g>

  <!-- 야자수 (그림자·잎 두 겹·잎맥) -->
  <g>
    <ellipse cx="1083" cy="560" rx="32" ry="7" fill="#3A6B2E" opacity="0.15"/>
    <path d="M1070 560 Q1072 460 1078 348 L1096 350 Q1092 462 1092 560 Z" fill="#B98A5C"/>
    <path d="M1080 356 Q1077 460 1079 552" stroke="#D2A47A" stroke-width="4" fill="none" opacity="0.8" stroke-linecap="round"/>
    <path d="M1076 420 Q1084 426 1093 420 M1073 520 Q1081 526 1091 520" stroke="#996E42" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- ★차이14(L3): 줄기 가운데 마디 — B에서는 사라짐 -->
    <g data-diff="14" data-level="3" data-cx="1083" data-cy="472" data-r="40">${D3 ? '' : '<path d="M1074 470 Q1082 476 1092 470" stroke="#996E42" stroke-width="4" fill="none" stroke-linecap="round"/>'}
    </g>
    <path d="M1084 346 Q1032 334 998 350 Q1042 358 1084 352 Z" fill="#4E9E4C"/>
    <path d="M1084 346 Q1136 334 1170 350 Q1126 358 1084 352 Z" fill="#4E9E4C"/>
    <path d="M1084 338 Q1030 300 990 318 Q1040 340 1084 348 Z" fill="#6FC26B"/>
    <path d="M1084 338 Q1138 300 1178 318 Q1128 340 1084 348 Z" fill="#6FC26B"/>
    <path d="M1084 338 Q1044 282 1006 280 Q1052 320 1080 344 Z" fill="#5FB35C"/>
    <path d="M1084 338 Q1124 282 1162 280 Q1116 320 1088 344 Z" fill="#5FB35C"/>
    <path d="M1084 338 Q1078 276 1050 258 Q1076 300 1082 342 Z" fill="#6FC26B"/>
    <path d="M1084 338 Q1090 276 1118 258 Q1092 300 1086 342 Z" fill="#6FC26B"/>
    <path d="M1082 336 Q1046 296 1014 288" stroke="#4E9E4C" stroke-width="2" fill="none" opacity="0.6"/>
    <path d="M1086 336 Q1122 296 1154 288" stroke="#4E9E4C" stroke-width="2" fill="none" opacity="0.6"/>
    <!-- ★차이3(L1): 야자수 열매 개수 (3개 → 1개) -->
    <g data-diff="3" data-cx="1084" data-cy="362" data-r="60">${D1 ? '<circle cx="1084" cy="366" r="14" fill="#8A5636"/><circle cx="1079" cy="361" r="4" fill="#A87B54"/>' : '<circle cx="1064" cy="360" r="14" fill="#8A5636"/><circle cx="1059" cy="355" r="4" fill="#A87B54"/><circle cx="1104" cy="360" r="14" fill="#8A5636"/><circle cx="1099" cy="355" r="4" fill="#A87B54"/><circle cx="1084" cy="382" r="14" fill="#8A5636"/><circle cx="1079" cy="377" r="4" fill="#A87B54"/>'}
    </g>
    <path d="M1062 560 q5 -16 10 0 z M1096 562 q5 -16 10 0 z" fill="#4DA644"/>
    <circle cx="1058" cy="566" r="5" fill="#C9C2BA"/><circle cx="1100" cy="570" r="4" fill="#C9C2BA"/>
  </g>

  <!-- 숨은그림 L3: 도롱뇽 (야자수 아래 풀밭, 올리브 보호색) -->
  <g data-find="salamander" data-label="도롱뇽" data-level="3">
    <circle cx="1112" cy="556" r="6.5" fill="#A0B860"/>
    <circle cx="1110" cy="554" r="1.8" fill="#4A5A28"/>
    <path d="M1117 558 Q1125 553 1131 556 Q1138 559 1142 552" stroke="#A0B860" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="1124" cy="556" r="2" fill="#E8894B"/><circle cx="1132" cy="558" r="2" fill="#E8894B"/>
    <path d="M1121 561 L1117 569 M1131 562 L1129 570" stroke="#7E9448" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- 호수 (모래톱·깊은 물·물풀·수련) -->
  <g>
    <ellipse cx="970" cy="702" rx="214" ry="68" fill="#E9DCB2"/>
    <ellipse cx="970" cy="700" rx="198" ry="60" fill="#8ED2EC"/>
    <ellipse cx="966" cy="712" rx="150" ry="38" fill="#6FBEDF" opacity="0.5"/>
    <ellipse cx="970" cy="700" rx="198" ry="60" fill="none" stroke="#69B4D8" stroke-width="5"/>
    <path d="M870 700 Q900 690 930 700" stroke="#C2E9F7" stroke-width="6" fill="none" stroke-linecap="round"/>
    <!-- ★차이11(L2): 오른쪽 물결 — B에서는 사라짐 -->
    <g data-diff="11" data-level="2" data-cx="1010" data-cy="712" data-r="50">${D2 ? '' : '<path d="M980 716 Q1010 706 1040 716" stroke="#C2E9F7" stroke-width="6" fill="none" stroke-linecap="round"/>'}
    </g>
    <ellipse cx="890" cy="684" rx="10" ry="3" fill="#FFFFFF" opacity="0.5"/>
    <ellipse cx="912" cy="742" rx="10" ry="3" fill="#FFFFFF" opacity="0.45"/>
    <path d="M796 702 Q794 672 799 650 M809 704 Q811 676 807 654 M818 700 Q820 678 816 660" stroke="#5E9950" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="795" y="638" width="7" height="15" rx="3.5" fill="#A87B54"/>
    <rect x="803" y="644" width="7" height="14" rx="3.5" fill="#8F6844"/>
    <rect x="812" y="650" width="6" height="13" rx="3" fill="#A87B54"/>
    <ellipse cx="898" cy="682" rx="18" ry="11" fill="#6FC26B"/>
    <polygon points="898,682 918,676 918,688" fill="#8ED2EC"/>
    <ellipse cx="1052" cy="674" rx="15" ry="8" fill="#6FC26B"/>
    <polygon points="1052,674 1068,669 1068,679" fill="#8ED2EC"/>
    <circle cx="1046" cy="662" r="4.5" fill="#F9A8C6"/><circle cx="1056" cy="662" r="4.5" fill="#F9A8C6"/><circle cx="1051" cy="656" r="4.5" fill="#F9A8C6"/>
    <circle cx="1051" cy="661" r="3" fill="#FFD93D"/>
  </g>

  <!-- 숨은그림 L2: 물고기 (호수 물속, 물색 보호색) -->
  <g data-find="fish" data-label="물고기" data-level="2">
    <ellipse cx="876" cy="730" rx="16" ry="9" fill="#6FB8DC"/>
    <polygon points="888,730 902,721 902,739" fill="#6FB8DC"/>
    <path d="M872 722 Q876 714 882 717 L878 723 Z" fill="#5AA3C8"/>
    <circle cx="866" cy="727" r="2.5" fill="#1E4A5C"/>
    <circle cx="865" cy="726" r="0.9" fill="#FFFFFF"/>
    <path d="M876 726 Q880 730 876 734" stroke="#5AA3C8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 호박 보석 (고사리 아래, 주황 보석 속 곤충) -->
  <g data-find="amber" data-label="호박 보석" data-level="3">
    <ellipse cx="1008" cy="610" rx="13" ry="15" fill="#E8A24B"/>
    <ellipse cx="1008" cy="610" rx="8" ry="10" fill="#F2BC6E"/>
    <circle cx="1006" cy="608" r="3" fill="#8A5A2E"/>
    <path d="M1003 605 L1000 602 M1009 605 L1012 602 M1003 611 L1000 613 M1009 611 L1012 613" stroke="#8A5A2E" stroke-width="1.5" stroke-linecap="round"/>
  </g>

  <!-- 브라키오사우루스 그림자 -->
  <ellipse cx="245" cy="666" rx="112" ry="14" fill="#3A6B2E" opacity="0.16"/>
  <!-- ★차이1(L1): 브라키오사우루스 몸 색 (초록 → 파랑) -->
  <g data-diff="1" data-cx="250" data-cy="500" data-r="130">
    <path d="M158 566 Q92 580 84 628" stroke="${BR}" stroke-width="26" fill="none" stroke-linecap="round"/>
    <rect x="175" y="598" width="34" height="64" rx="15" fill="${BR}"/>
    <rect x="235" y="608" width="34" height="58" rx="15" fill="${BR}"/>
    <rect x="284" y="602" width="34" height="62" rx="15" fill="${BR}"/>
    <circle cx="184" cy="656" r="4" fill="#FFF6E3"/><circle cx="200" cy="656" r="4" fill="#FFF6E3"/>
    <circle cx="244" cy="660" r="4" fill="#FFF6E3"/><circle cx="260" cy="660" r="4" fill="#FFF6E3"/>
    <circle cx="293" cy="658" r="4" fill="#FFF6E3"/><circle cx="309" cy="658" r="4" fill="#FFF6E3"/>
    <circle cx="168" cy="515" r="9" fill="${BRb}"/><circle cx="214" cy="499" r="9" fill="${BRb}"/>
    <circle cx="262" cy="497" r="9" fill="${BRb}"/><circle cx="300" cy="505" r="9" fill="${BRb}"/>
    <ellipse cx="245" cy="560" rx="108" ry="64" fill="${BR}"/>
    <ellipse cx="245" cy="584" rx="68" ry="32" fill="${BRb}"/>
    <ellipse cx="218" cy="522" rx="58" ry="16" fill="#FFFFFF" opacity="0.2"/>
    <ellipse cx="245" cy="602" rx="86" ry="18" fill="#000000" opacity="0.06"/>
    <path d="M298 540 Q335 420 356 318" stroke="${BR}" stroke-width="44" fill="none" stroke-linecap="round"/>
    <path d="M305 522 Q338 420 354 332" stroke="#FFFFFF" stroke-width="9" fill="none" opacity="0.25" stroke-linecap="round"/>
    <circle cx="360" cy="271" r="8" fill="${BRb}"/>
    <circle cx="360" cy="300" r="28" fill="${BR}"/>
    <circle cx="196" cy="528" r="10" fill="${BRb}"/>
    <circle cx="248" cy="516" r="12" fill="${BRb}"/>
    <circle cx="222" cy="548" r="8" fill="${BRb}"/>
    <circle cx="350" cy="293" r="7" fill="#FFFFFF"/><circle cx="371" cy="293" r="7" fill="#FFFFFF"/>
    <circle cx="351" cy="294" r="4.5" fill="#3B4A2E"/><circle cx="372" cy="294" r="4.5" fill="#3B4A2E"/>
    <circle cx="349" cy="292" r="1.6" fill="#FFFFFF"/><circle cx="370" cy="292" r="1.6" fill="#FFFFFF"/>
    <path d="M350 309 Q360 317 371 309" stroke="#3B4A2E" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>
  <!-- ★차이13(L3): 브라키오사우루스 볼터치 색 (분홍 → 노랑) -->
  <g data-diff="13" data-level="3" data-cx="360" data-cy="303" data-r="45">
    <circle cx="342" cy="303" r="5" fill="${D3 ? '#F2C63C' : '#F5A8C6'}" opacity="0.75"/><circle cx="379" cy="303" r="5" fill="${D3 ? '#F2C63C' : '#F5A8C6'}" opacity="0.75"/>
  </g>
  <!-- ★차이18(L3): 등 뒤쪽 반점 — B에서는 사라짐 -->
  <g data-diff="18" data-level="3" data-cx="300" data-cy="540" data-r="45">${D3 ? '' : '<circle cx="300" cy="540" r="9" fill="' + BRb + '"/>'}
  </g>

  <!-- 바위 + 숨은그림: 아기공룡 (바위 뒤에서 빼꼼) -->
  <g>
    <ellipse cx="560" cy="700" rx="62" ry="9" fill="#3A6B2E" opacity="0.14"/>
    <ellipse cx="560" cy="668" rx="58" ry="36" fill="#CDC6BC" stroke="#B0A89E" stroke-width="5"/>
    <path d="M528 654 Q548 644 572 650" stroke="#E2DCD2" stroke-width="6" fill="none" stroke-linecap="round"/>
    <ellipse cx="560" cy="690" rx="40" ry="9" fill="#000000" opacity="0.06"/>
    <circle cx="592" cy="676" r="4" fill="#B0A89E" opacity="0.7"/>
  </g>
  <g data-find="baby" data-label="아기공룡">
    <polygon points="540,596 548,580 556,596" fill="#6FBF5A"/>
    <polygon points="556,594 564,576 572,594" fill="#6FBF5A"/>
    <circle cx="556" cy="616" r="27" fill="#A8E08C"/>
    <ellipse cx="556" cy="628" rx="13" ry="8" fill="#C8ECAE"/>
    <circle cx="547" cy="611" r="4.5" fill="#3B4A2E"/><circle cx="566" cy="611" r="4.5" fill="#3B4A2E"/>
    <circle cx="546" cy="609" r="1.5" fill="#FFFFFF"/><circle cx="565" cy="609" r="1.5" fill="#FFFFFF"/>
    <path d="M547 626 Q556 633 566 626" stroke="#3B4A2E" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="536" cy="620" r="4.5" fill="#F5A8C6" opacity="0.7"/><circle cx="576" cy="620" r="4.5" fill="#F5A8C6" opacity="0.7"/>
    <ellipse cx="536" cy="640" rx="9" ry="6" fill="#A8E08C"/>
    <ellipse cx="576" cy="640" rx="9" ry="6" fill="#A8E08C"/>
  </g>

  <!-- 숨은그림 L2: 무당개구리 (풀밭, 초록 보호색 — 꼬리에 살짝 가림) -->
  <g data-find="toad" data-label="무당개구리" data-level="2">
    <ellipse cx="920" cy="582" rx="19" ry="13" fill="#6FBF5A"/>
    <circle cx="912" cy="570" r="6" fill="#6FBF5A"/><circle cx="928" cy="570" r="6" fill="#6FBF5A"/>
    <circle cx="912" cy="569" r="2.5" fill="#2E5A38"/><circle cx="928" cy="569" r="2.5" fill="#2E5A38"/>
    <circle cx="913" cy="580" r="3" fill="#E8734B"/><circle cx="924" cy="586" r="3" fill="#E8734B"/><circle cx="930" cy="578" r="2.5" fill="#E8734B"/>
    <path d="M914 590 Q920 594 926 590" stroke="#2E5A38" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 트리케라톱스 (프릴 무늬·등혹·발톱·명암) -->
  <ellipse cx="790" cy="742" rx="100" ry="14" fill="#3A6B2E" opacity="0.16"/>
  <g>
    <path d="M872 640 Q922 630 938 596" stroke="#F2B279" stroke-width="20" fill="none" stroke-linecap="round"/>
    <circle cx="903" cy="632" r="4" fill="#F8D9B0"/><circle cx="925" cy="614" r="4" fill="#F8D9B0"/>
    <circle cx="706" cy="600" r="46" fill="#F7CDA0" stroke="#E5AE7E" stroke-width="5"/>
    <circle cx="668" cy="589" r="3" fill="#E5AE7E"/><circle cx="683" cy="568" r="3" fill="#E5AE7E"/>
    <circle cx="706" cy="562" r="3" fill="#E5AE7E"/><circle cx="729" cy="568" r="3" fill="#E5AE7E"/>
    <circle cx="744" cy="589" r="3" fill="#E5AE7E"/>
    <!-- ★차이17(L3): 프릴 안쪽 색 (크림 → 연분홍) -->
    <g data-diff="17" data-level="3" data-cx="706" data-cy="600" data-r="50">
      <circle cx="706" cy="600" r="30" fill="${D3 ? '#F5CDD8' : '#FBE3C8'}"/>
    </g>
    <polygon points="664,590 671,564 681,592" fill="#FFF3DE"/>
    <polygon points="692,590 699,564 709,592" fill="#FFF3DE"/>
    <circle cx="735" cy="606" r="8" fill="#E8A672"/><circle cx="770" cy="596" r="8" fill="#E8A672"/>
    <circle cx="805" cy="596" r="8" fill="#E8A672"/><circle cx="840" cy="604" r="8" fill="#E8A672"/>
    <ellipse cx="790" cy="648" rx="92" ry="52" fill="#F2B279"/>
    <ellipse cx="790" cy="668" rx="58" ry="26" fill="#F8D9B0"/>
    <ellipse cx="772" cy="618" rx="50" ry="14" fill="#FFFFFF" opacity="0.22"/>
    <ellipse cx="790" cy="686" rx="70" ry="12" fill="#000000" opacity="0.06"/>
    <circle cx="826" cy="630" r="6" fill="#E8A672" opacity="0.8"/><circle cx="850" cy="646" r="5" fill="#E8A672" opacity="0.8"/>
    <rect x="732" y="690" width="30" height="50" rx="13" fill="#F2B279"/>
    <rect x="792" y="694" width="30" height="48" rx="13" fill="#F2B279"/>
    <rect x="844" y="688" width="30" height="50" rx="13" fill="#F2B279"/>
    <circle cx="740" cy="736" r="4" fill="#FBE3C8"/><circle cx="754" cy="736" r="4" fill="#FBE3C8"/>
    <circle cx="800" cy="738" r="4" fill="#FBE3C8"/><circle cx="814" cy="738" r="4" fill="#FBE3C8"/>
    <circle cx="852" cy="734" r="4" fill="#FBE3C8"/><circle cx="866" cy="734" r="4" fill="#FBE3C8"/>
    <circle cx="682" cy="618" r="36" fill="#F2B279"/>
    <!-- ★차이7(L2): 코 뿔 색 (크림 → 노랑) -->
    <g data-diff="7" data-level="2" data-cx="650" data-cy="597" data-r="40">
      <polygon points="640,608 650,584 660,610" fill="${D2 ? '#FFD93D' : '#FFF3DE'}"/>
    </g>
    <circle cx="670" cy="614" r="7" fill="#FFFFFF"/><circle cx="696" cy="614" r="7" fill="#FFFFFF"/>
    <circle cx="671" cy="615" r="4.5" fill="#5A3E2B"/><circle cx="697" cy="615" r="4.5" fill="#5A3E2B"/>
    <circle cx="669" cy="613" r="1.6" fill="#FFFFFF"/><circle cx="695" cy="613" r="1.6" fill="#FFFFFF"/>
    <path d="M668 632 Q682 641 696 632" stroke="#5A3E2B" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="658" cy="626" r="6" fill="#F5A8C6" opacity="0.75"/><circle cx="708" cy="628" r="6" fill="#F5A8C6" opacity="0.75"/>
  </g>

  <!-- 숨은그림 L3: 작은 뿔 (풀밭에 떨어진 크림색 뿔) -->
  <g data-find="horn" data-label="작은 뿔" data-level="3">
    <path d="M628 714 Q627 696 643 686 Q640 700 636 714 Z" fill="#F2E6CE" stroke="#D8C8A8" stroke-width="2"/>
    <path d="M630 706 Q634 704 637 706" stroke="#D8C8A8" stroke-width="2" fill="none"/>
  </g>

  <!-- 숨은그림: 뼈다귀 (작은 바위 옆) -->
  <g>
    <ellipse cx="756" cy="748" rx="20" ry="13" fill="#C9C2BA"/>
    <path d="M744 743 Q754 738 766 742" stroke="#E2DCD2" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <g data-find="bone" data-label="뼈다귀">
    <g transform="rotate(-10 700 752)">
      <rect x="674" y="746" width="52" height="12" rx="6" fill="#F8F4E6"/>
      <circle cx="672" cy="745" r="9" fill="#F8F4E6"/><circle cx="672" cy="759" r="9" fill="#F8F4E6"/>
      <circle cx="728" cy="745" r="9" fill="#F8F4E6"/><circle cx="728" cy="759" r="9" fill="#F8F4E6"/>
      <path d="M684 752 L716 752" stroke="#DDD3BC" stroke-width="4" stroke-linecap="round"/>
    </g>
  </g>

  <!-- 숨은그림 L3: 이빨 화석 (작은 바위 옆, 크림색 작은 이빨) -->
  <g data-find="tooth" data-label="이빨 화석" data-level="3">
    <path d="M776 746 Q784 741 792 746 L788 766 Q784 770 780 766 Z" fill="#EFE6CE" stroke="#D6C8A8" stroke-width="2"/>
    <path d="M780 750 Q784 752 788 750" stroke="#D6C8A8" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 둥지 + 숨은그림: 공룡알 (고사리 뒤) -->
  <g>
    <ellipse cx="156" cy="728" rx="32" ry="9" fill="#C9A06A"/>
    <path d="M128 726 L148 732 M186 726 L166 732 M136 734 L176 734" stroke="#A87B54" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g data-find="egg" data-label="공룡알">
    <ellipse cx="156" cy="704" rx="25" ry="33" fill="#FFF6E3" stroke="#E5D6B4" stroke-width="4"/>
    <ellipse cx="147" cy="690" rx="7" ry="11" fill="#FFFFFF" opacity="0.6"/>
    <ellipse cx="164" cy="718" rx="9" ry="8" fill="#E5D6B4" opacity="0.4"/>
    <circle cx="148" cy="692" r="5" fill="#A8DBA0"/>
    <circle cx="165" cy="702" r="6" fill="#A8DBA0"/>
    <circle cx="152" cy="717" r="5" fill="#A8DBA0"/>
  </g>

  <!-- 숨은그림 L3: 알껍질 조각 (풀밭, 공룡알과 같은 무늬) -->
  <g data-find="eggshell" data-label="알껍질 조각" data-level="3">
    <path d="M74 750 L82 738 L89 748 L97 738 L104 752 Q89 760 74 750 Z" fill="#FFF6E3" stroke="#E5D6B4" stroke-width="2"/>
    <circle cx="85" cy="750" r="2.8" fill="#A8DBA0"/><circle cx="96" cy="749" r="2.4" fill="#A8DBA0"/>
  </g>

  <!-- 고사리 1 (공룡알을 살짝 가림) -->
  <g stroke="#4DA644" fill="none" stroke-linecap="round">
    <path d="M118 742 Q100 690 76 668" stroke-width="7"/>
    <path d="M126 748 Q128 688 118 652" stroke-width="7"/>
    <path d="M134 746 Q158 700 176 676" stroke-width="7"/>
    <path d="M104 712 L90 706 M110 694 L98 684 M124 716 L112 716 M122 682 L112 672 M146 720 L138 710 M158 700 L148 692 M168 686 L158 678" stroke-width="4"/>
  </g>

  <!-- 숨은그림 L2: 버섯 (풀밭 구석) -->
  <g data-find="mushroom" data-label="버섯" data-level="2">
    <rect x="209" y="750" width="12" height="15" rx="5" fill="#F2E3C8"/>
    <path d="M200 752 Q200 736 215 736 Q230 736 230 752 Z" fill="#D96A4B"/>
    <circle cx="208" cy="744" r="3" fill="#F2E3C8"/><circle cx="221" cy="746" r="2.5" fill="#F2E3C8"/>
  </g>
  <path d="M228 766 q6 -18 12 0 z" fill="#4DA644"/>

  <!-- 숨은그림 L2: 고사리 새싹 (풀밭, 초록 보호색 돌돌이) -->
  <g data-find="sprout" data-label="고사리 새싹" data-level="2">
    <path d="M358 710 Q356 692 360 680" stroke="#4DA644" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M360 680 Q362 666 372 668 Q380 672 374 680 Q369 684 366 679" stroke="#4DA644" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M358 700 L350 694 M359 690 L368 686" stroke="#4DA644" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 암모나이트 (고사리 2에 살짝 가림) -->
  <g data-find="ammonite" data-label="암모나이트" data-level="2">
    <circle cx="478" cy="706" r="20" fill="#D9BC8E" stroke="#B08F5E" stroke-width="3"/>
    <path d="M478 692 A14 14 0 1 1 464 706 A10 10 0 1 1 484 706 A6 6 0 1 1 472 706" stroke="#B08F5E" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 고사리 2 -->
  <g stroke="#4DA644" fill="none" stroke-linecap="round">
    <path d="M446 766 Q432 720 410 700" stroke-width="7"/>
    <path d="M454 768 Q456 716 448 684" stroke-width="7"/>
    <path d="M462 766 Q484 724 500 704" stroke-width="7"/>
    <path d="M434 740 L422 734 M440 720 L428 712 M452 736 L442 736 M451 706 L441 698 M472 742 L464 732 M482 724 L472 716" stroke-width="4"/>
  </g>

  <!-- 고사리 3 (야자수 아래) -->
  <g stroke="#4DA644" fill="none" stroke-linecap="round">
    <path d="M1022 592 Q1010 558 992 544" stroke-width="6"/>
    <path d="M1030 594 Q1032 554 1026 530" stroke-width="6"/>
    <path d="M1038 592 Q1054 558 1068 544" stroke-width="6"/>
    <path d="M1012 572 L1002 566 M1027 566 L1017 558 M1048 570 L1040 562" stroke-width="4"/>
  </g>

  <!-- 숨은그림: 잠자리 (호수 위 하늘) -->
  <g data-find="dragonfly" data-label="잠자리">
    <ellipse cx="938" cy="490" rx="16" ry="7" transform="rotate(-30 938 490)" fill="#CFEFF8" stroke="#9AD4E8" stroke-width="2"/>
    <ellipse cx="962" cy="490" rx="16" ry="7" transform="rotate(30 962 490)" fill="#CFEFF8" stroke="#9AD4E8" stroke-width="2"/>
    <ellipse cx="940" cy="512" rx="14" ry="6" transform="rotate(28 940 512)" fill="#CFEFF8" stroke="#9AD4E8" stroke-width="2"/>
    <ellipse cx="960" cy="512" rx="14" ry="6" transform="rotate(-28 960 512)" fill="#CFEFF8" stroke="#9AD4E8" stroke-width="2"/>
    <path d="M950 496 L950 536" stroke="#4FB3A6" stroke-width="7" stroke-linecap="round"/>
    <path d="M946 508 L954 508 M946 518 L954 518" stroke="#2E8A7E" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="950" cy="490" r="8" fill="#3E8FB0"/>
    <circle cx="946" cy="487" r="2.5" fill="#1E4A5C"/><circle cx="954" cy="487" r="2.5" fill="#1E4A5C"/>
    <circle cx="945" cy="486" r="0.9" fill="#FFFFFF"/><circle cx="953" cy="486" r="0.9" fill="#FFFFFF"/>
  </g>

  <!-- 숨은그림: 거북이 (호숫가) -->
  <g data-find="turtle" data-label="거북이">
    <ellipse cx="1062" cy="740" rx="10" ry="6" fill="#8FBF7E"/>
    <ellipse cx="1108" cy="740" rx="10" ry="6" fill="#8FBF7E"/>
    <path d="M1052 736 Q1052 702 1085 702 Q1118 702 1118 736 Z" fill="#7FBF6E"/>
    <path d="M1070 712 Q1085 704 1100 712 M1064 726 L1106 726 M1085 704 L1085 726" stroke="#5E9950" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M1062 714 Q1070 708 1080 707" stroke="#A8D998" stroke-width="3" fill="none" opacity="0.8" stroke-linecap="round"/>
    <rect x="1049" y="732" width="72" height="10" rx="5" fill="#6AAE59"/>
    <circle cx="1128" cy="728" r="10" fill="#A8D998"/>
    <circle cx="1131" cy="725" r="2.5" fill="#2E5A38"/>
    <circle cx="1130" cy="724" r="0.9" fill="#FFFFFF"/>
    <path d="M1128 733 Q1132 735 1135 732" stroke="#2E5A38" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="1124" cy="730" r="2.5" fill="#F5A8C6" opacity="0.7"/>
  </g>

  <!-- 꽃 -->
  <g>
    <circle cx="289" cy="758" r="8" fill="#F9A8C6"/><circle cx="311" cy="758" r="8" fill="#F9A8C6"/>
    <circle cx="300" cy="747" r="8" fill="#F9A8C6"/><circle cx="300" cy="769" r="8" fill="#F9A8C6"/>
    <circle cx="300" cy="758" r="7" fill="#FFD93D"/><circle cx="298" cy="756" r="2.2" fill="#FFF3B8"/>
    <circle cx="629" cy="766" r="8" fill="#C9A8F0"/><circle cx="651" cy="766" r="8" fill="#C9A8F0"/>
    <circle cx="640" cy="755" r="8" fill="#C9A8F0"/><circle cx="640" cy="777" r="8" fill="#C9A8F0"/>
    <circle cx="640" cy="766" r="7" fill="#FFD93D"/><circle cx="638" cy="764" r="2.2" fill="#FFF3B8"/>
    <circle cx="1145" cy="626" r="8" fill="#FFB27A"/><circle cx="1167" cy="626" r="8" fill="#FFB27A"/>
    <circle cx="1156" cy="615" r="8" fill="#FFB27A"/><circle cx="1156" cy="637" r="8" fill="#FFB27A"/>
    <circle cx="1156" cy="626" r="7" fill="#FFD93D"/><circle cx="1154" cy="624" r="2.2" fill="#FFF3B8"/>
    <!-- ★차이9(L2): 왼쪽 꽃 색 (분홍 → 하늘색) -->
    <g data-diff="9" data-level="2" data-cx="86" data-cy="640" data-r="45">
      <circle cx="75" cy="640" r="8" fill="${D2 ? '#8CC6F0' : '#F9A8C6'}"/><circle cx="97" cy="640" r="8" fill="${D2 ? '#8CC6F0' : '#F9A8C6'}"/>
      <circle cx="86" cy="629" r="8" fill="${D2 ? '#8CC6F0' : '#F9A8C6'}"/><circle cx="86" cy="651" r="8" fill="${D2 ? '#8CC6F0' : '#F9A8C6'}"/>
      <circle cx="86" cy="640" r="7" fill="#FFD93D"/><circle cx="84" cy="638" r="2.2" fill="#FFF3B8"/>
    </g>
  </g>

  <!-- 풀포기 -->
  <g fill="#4DA644">
    <path d="M660 600 q6 -20 12 0 z"/>
    <path d="M330 690 q6 -20 12 0 z"/><path d="M905 610 q6 -20 12 0 z"/>
    <path d="M240 748 q6 -20 12 0 z"/><path d="M560 730 q6 -20 12 0 z"/>
    <path d="M60 590 q6 -20 12 0 z"/><path d="M1160 700 q6 -20 12 0 z"/>
  </g>
  <!-- ★차이10(L2): 풀포기 하나 — B에서는 사라짐 -->
  <g data-diff="10" data-level="2" data-cx="426" data-cy="582" data-r="40">${D2 ? '' : '<path d="M420 590 q6 -20 12 0 z" fill="#4DA644"/>'}
  </g>
</svg>`;
  },

  hidden: [
    /* ── L1: 쉬움 (6) ── */
    {
      id: 'egg', label: '공룡알',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="32" rx="18" ry="24" fill="#FFF6E3" stroke="#E5D6B4" stroke-width="3"/>
        <ellipse cx="23" cy="22" rx="5" ry="8" fill="#FFFFFF" opacity="0.6"/>
        <circle cx="24" cy="24" r="4" fill="#A8DBA0"/><circle cx="36" cy="32" r="5" fill="#A8DBA0"/>
        <circle cx="27" cy="42" r="4" fill="#A8DBA0"/></svg>`
    },
    {
      id: 'baby', label: '아기공룡',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <polygon points="19,17 24,6 29,17" fill="#6FBF5A"/><polygon points="30,15 35,4 40,17" fill="#6FBF5A"/>
        <circle cx="30" cy="32" r="19" fill="#A8E08C"/>
        <ellipse cx="30" cy="41" rx="9" ry="5.5" fill="#C8ECAE"/>
        <circle cx="24" cy="28" r="3.2" fill="#3B4A2E"/><circle cx="37" cy="28" r="3.2" fill="#3B4A2E"/>
        <circle cx="23" cy="27" r="1.1" fill="#FFFFFF"/><circle cx="36" cy="27" r="1.1" fill="#FFFFFF"/>
        <path d="M24 39 Q30 44 37 39" stroke="#3B4A2E" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="17" cy="34" r="3" fill="#F5A8C6" opacity="0.75"/><circle cx="43" cy="34" r="3" fill="#F5A8C6" opacity="0.75"/>
        <ellipse cx="17" cy="49" rx="6" ry="4" fill="#A8E08C"/><ellipse cx="43" cy="49" rx="6" ry="4" fill="#A8E08C"/></svg>`
    },
    {
      id: 'bone', label: '뼈다귀',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(-18 30 30)">
          <rect x="14" y="26" width="32" height="8" rx="4" fill="#F8F4E6" stroke="#DDD3BC" stroke-width="2"/>
          <circle cx="13" cy="25" r="6" fill="#F8F4E6" stroke="#DDD3BC" stroke-width="2"/>
          <circle cx="13" cy="35" r="6" fill="#F8F4E6" stroke="#DDD3BC" stroke-width="2"/>
          <circle cx="47" cy="25" r="6" fill="#F8F4E6" stroke="#DDD3BC" stroke-width="2"/>
          <circle cx="47" cy="35" r="6" fill="#F8F4E6" stroke="#DDD3BC" stroke-width="2"/>
        </g></svg>`
    },
    {
      id: 'dragonfly', label: '잠자리',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="19" cy="18" rx="13" ry="6" transform="rotate(-30 19 18)" fill="#CFEFF8" stroke="#9AD4E8" stroke-width="2"/>
        <ellipse cx="41" cy="18" rx="13" ry="6" transform="rotate(30 41 18)" fill="#CFEFF8" stroke="#9AD4E8" stroke-width="2"/>
        <ellipse cx="21" cy="34" rx="11" ry="5" transform="rotate(28 21 34)" fill="#CFEFF8" stroke="#9AD4E8" stroke-width="2"/>
        <ellipse cx="39" cy="34" rx="11" ry="5" transform="rotate(-28 39 34)" fill="#CFEFF8" stroke="#9AD4E8" stroke-width="2"/>
        <path d="M30 22 L30 54" stroke="#4FB3A6" stroke-width="6" stroke-linecap="round"/>
        <path d="M27 32 L33 32 M27 40 L33 40" stroke="#2E8A7E" stroke-width="2" stroke-linecap="round"/>
        <circle cx="30" cy="15" r="7" fill="#3E8FB0"/>
        <circle cx="27" cy="13" r="2" fill="#1E4A5C"/><circle cx="33" cy="13" r="2" fill="#1E4A5C"/>
        <circle cx="26.3" cy="12.3" r="0.8" fill="#FFFFFF"/><circle cx="32.3" cy="12.3" r="0.8" fill="#FFFFFF"/></svg>`
    },
    {
      id: 'turtle', label: '거북이',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="16" cy="44" rx="6" ry="4" fill="#8FBF7E"/><ellipse cx="38" cy="44" rx="6" ry="4" fill="#8FBF7E"/>
        <path d="M8 40 Q8 16 27 16 Q46 16 46 40 Z" fill="#7FBF6E"/>
        <path d="M18 24 Q27 18 36 24 M13 33 L41 33 M27 18 L27 33" stroke="#5E9950" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M14 25 Q19 21 25 20" stroke="#A8D998" stroke-width="2.5" fill="none" opacity="0.8" stroke-linecap="round"/>
        <rect x="6" y="38" width="42" height="7" rx="3.5" fill="#6AAE59"/>
        <circle cx="51" cy="34" r="7" fill="#A8D998"/><circle cx="53" cy="32" r="2" fill="#2E5A38"/>
        <circle cx="52.3" cy="31.3" r="0.8" fill="#FFFFFF"/></svg>`
    },
    {
      id: 'lizard', label: '도마뱀',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 38 Q22 28 32 34 Q42 40 48 30 Q52 24 56 18" stroke="#58B368" stroke-width="8" fill="none" stroke-linecap="round"/>
        <circle cx="10" cy="37" r="7" fill="#58B368"/><circle cx="8" cy="35" r="2" fill="#2E5A38"/>
        <circle cx="7.3" cy="34.3" r="0.8" fill="#FFFFFF"/>
        <path d="M20 42 L16 50 M30 40 L28 50 M40 38 L36 47" stroke="#3F8F50" stroke-width="3" stroke-linecap="round"/></svg>`
    },
    /* ── L2: 보통 (7) ── */
    {
      id: 'ammonite', label: '암모나이트', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="24" fill="#D9BC8E" stroke="#B08F5E" stroke-width="3"/>
        <path d="M30 13 A17 17 0 1 1 13 30 A12 12 0 1 1 37 30 A7 7 0 1 1 23 30" stroke="#B08F5E" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'babyptero', label: '아기 익룡', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M27 30 Q14 20 3 24 Q15 32 25 36 Z" fill="#A8CFE8"/>
        <path d="M33 30 Q46 20 57 24 Q45 32 35 36 Z" fill="#A8CFE8"/>
        <ellipse cx="30" cy="36" rx="10" ry="6.5" fill="#E8D9BE"/>
        <circle cx="39" cy="28" r="6" fill="#E8D9BE"/>
        <polygon points="37,23 32,14 43,20" fill="#8FB8D8"/>
        <polygon points="44,26 55,30 44,33" fill="#F2A33C"/>
        <circle cx="39" cy="27" r="2" fill="#5A4632"/></svg>`
    },
    {
      id: 'lavarock', label: '화산석', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 38 Q10 20 30 14 Q50 12 52 28 Q54 42 38 48 Q16 50 12 38 Z" fill="#8A6248"/>
        <circle cx="24" cy="28" r="4.5" fill="#6B4A34"/><circle cx="38" cy="34" r="5" fill="#6B4A34"/>
        <circle cx="27" cy="40" r="3.5" fill="#6B4A34"/></svg>`
    },
    {
      id: 'sprout', label: '고사리 새싹', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M26 56 Q24 38 28 24" stroke="#4DA644" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M28 24 Q30 8 42 10 Q52 14 45 24 Q39 29 35 22" stroke="#4DA644" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M26 46 L16 40 M27 34 L38 30" stroke="#4DA644" stroke-width="4" stroke-linecap="round"/></svg>`
    },
    {
      id: 'toad', label: '무당개구리', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="36" rx="21" ry="15" fill="#6FBF5A"/>
        <circle cx="21" cy="22" r="7" fill="#6FBF5A"/><circle cx="39" cy="22" r="7" fill="#6FBF5A"/>
        <circle cx="21" cy="21" r="3" fill="#2E5A38"/><circle cx="39" cy="21" r="3" fill="#2E5A38"/>
        <circle cx="22" cy="36" r="3.5" fill="#E8734B"/><circle cx="33" cy="42" r="3.5" fill="#E8734B"/>
        <circle cx="40" cy="33" r="3" fill="#E8734B"/>
        <path d="M23 46 Q30 50 37 46" stroke="#2E5A38" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'mushroom', label: '버섯', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <rect x="22" y="34" width="16" height="20" rx="7" fill="#F2E3C8"/>
        <path d="M8 34 Q8 10 30 10 Q52 10 52 34 Z" fill="#D96A4B"/>
        <circle cx="20" cy="22" r="4" fill="#F2E3C8"/><circle cx="38" cy="25" r="3.5" fill="#F2E3C8"/></svg>`
    },
    {
      id: 'fish', label: '물고기', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="26" cy="30" rx="18" ry="11" fill="#6FB8DC"/>
        <polygon points="40,30 56,20 56,40" fill="#6FB8DC"/>
        <path d="M22 20 Q27 10 34 14 L28 22 Z" fill="#5AA3C8"/>
        <circle cx="14" cy="27" r="3" fill="#1E4A5C"/>
        <circle cx="13" cy="26" r="1" fill="#FFFFFF"/>
        <path d="M26 25 Q31 30 26 35" stroke="#5AA3C8" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    /* ── L3: 어려움 (8) ── */
    {
      id: 'footprint', label: '공룡 발자국', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="36" rx="14" ry="15" fill="#74B85E"/>
        <ellipse cx="14" cy="18" rx="6" ry="9" transform="rotate(-20 14 18)" fill="#74B85E"/>
        <ellipse cx="30" cy="13" rx="6" ry="9" fill="#74B85E"/>
        <ellipse cx="46" cy="18" rx="6" ry="9" transform="rotate(20 46 18)" fill="#74B85E"/></svg>`
    },
    {
      id: 'fossilbit', label: '화석 조각', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="30" rx="25" ry="18" fill="#C69476"/>
        <path d="M14 30 L46 30" stroke="#EFE3CE" stroke-width="3" stroke-linecap="round"/>
        <path d="M21 21 L21 39 M30 19 L30 41 M39 21 L39 39" stroke="#EFE3CE" stroke-width="3" stroke-linecap="round"/>
        <circle cx="11" cy="30" r="3" fill="#EFE3CE"/></svg>`
    },
    {
      id: 'amber', label: '호박 보석', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="30" rx="19" ry="23" fill="#E8A24B"/>
        <ellipse cx="30" cy="30" rx="12" ry="15" fill="#F2BC6E"/>
        <circle cx="28" cy="28" r="4.5" fill="#8A5A2E"/>
        <path d="M24 24 L19 19 M33 24 L38 19 M24 32 L19 36 M33 32 L38 36" stroke="#8A5A2E" stroke-width="2.5" stroke-linecap="round"/></svg>`
    },
    {
      id: 'tooth', label: '이빨 화석', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 16 Q30 8 42 16 L36 48 Q30 54 24 48 Z" fill="#EFE6CE" stroke="#D6C8A8" stroke-width="3"/>
        <path d="M23 24 Q30 27 37 24" stroke="#D6C8A8" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'salamander', label: '도롱뇽', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="28" r="8" fill="#A0B860"/>
        <circle cx="10" cy="25" r="2.2" fill="#4A5A28"/>
        <path d="M18 30 Q30 22 38 28 Q48 34 54 24" stroke="#A0B860" stroke-width="9" fill="none" stroke-linecap="round"/>
        <circle cx="28" cy="26" r="2.8" fill="#E8894B"/><circle cx="38" cy="29" r="2.8" fill="#E8894B"/>
        <path d="M24 33 L19 43 M37 34 L34 44" stroke="#7E9448" stroke-width="4" stroke-linecap="round"/></svg>`
    },
    {
      id: 'eggshell', label: '알껍질 조각', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 34 L20 18 L28 32 L38 18 L48 36 Q30 48 10 34 Z" fill="#FFF6E3" stroke="#E5D6B4" stroke-width="3"/>
        <circle cx="24" cy="36" r="4" fill="#A8DBA0"/><circle cx="38" cy="34" r="3.5" fill="#A8DBA0"/></svg>`
    },
    {
      id: 'shinystone', label: '반짝이는 돌', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 40 L20 16 L42 12 L52 30 L36 46 Z" fill="#A8C48E"/>
        <path d="M24 26 L32 34" stroke="#FFF3B8" stroke-width="4" stroke-linecap="round"/>
        <path d="M38 20 L43 27" stroke="#FFF3B8" stroke-width="3" stroke-linecap="round"/>
        <path d="M8 12 L14 8 M9 20 L17 19" stroke="#FFD93D" stroke-width="3" stroke-linecap="round"/></svg>`
    },
    {
      id: 'horn', label: '작은 뿔', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 54 Q14 26 40 8 Q38 34 30 54 Z" fill="#F2E6CE" stroke="#D8C8A8" stroke-width="3"/>
        <path d="M19 40 Q26 36 33 40 M22 26 Q30 22 36 26" stroke="#D8C8A8" stroke-width="3" fill="none"/></svg>`
    }
  ],

  sticker: {
    name: '공룡 스티커',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#EAF7DF" stroke="#8FCF7C" stroke-width="7"/>
      <path d="M36 82 L45 71 L52 82 L60 71 L68 82 L75 71 L84 82 Q84 100 60 100 Q36 100 36 82 Z" fill="#FFF6E3" stroke="#E5D6B4" stroke-width="3"/>
      <polygon points="47,36 53,24 59,36" fill="#6FBF5A"/><polygon points="61,35 67,22 73,36" fill="#6FBF5A"/>
      <circle cx="60" cy="56" r="24" fill="#A8E08C"/>
      <ellipse cx="60" cy="66" rx="11" ry="6.5" fill="#C8ECAE"/>
      <circle cx="52" cy="52" r="4" fill="#3B4A2E"/><circle cx="69" cy="52" r="4" fill="#3B4A2E"/>
      <circle cx="50.8" cy="50.8" r="1.4" fill="#FFFFFF"/><circle cx="67.8" cy="50.8" r="1.4" fill="#FFFFFF"/>
      <path d="M52 64 Q60 70 69 64" stroke="#3B4A2E" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <circle cx="45" cy="60" r="4.5" fill="#F5A8C6" opacity="0.8"/><circle cx="76" cy="60" r="4.5" fill="#F5A8C6" opacity="0.8"/></svg>`
  }
});
