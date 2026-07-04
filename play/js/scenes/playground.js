/* 테마: 놀이터 — farm.js 레퍼런스 구조를 따름 (난이도 3레벨)
 * 계약:
 *  - buildScene('A'|'B', 1|2|3) → viewBox="0 0 1200 800" SVG 문자열
 *  - 숨은그림: L1 6개·L2 7개·L3 8개 = 총 21개. 모든 레벨 대상을 항상 그린다(하위 레벨에선 장식)
 *    <g data-find="id" data-label="이름" data-level="2">  (data-level 없으면 1)
 *    크기: L1 40~90px, L2 28~55px(보호색·부분 가림), L3 20~40px(강한 보호색)
 *  - 다른그림: L1 5개(id 1~5)·L2 6개(id 6~11)·L3 7개(id 12~18). 마커 그룹은 항상 출력하되
 *    내용 차이는 해당 레벨의 B에서만 적용: const D1=!A&&L===1 …
 *    <g data-diff="6" data-level="2" data-cx=".." data-cy=".." data-r=".."> (속성 순서 고정, L1은 data-level 생략)
 *  - defs/그라디언트/url(#…) 참조 금지 — 단색 fill만 사용
 */
window.SCENES = window.SCENES || [];

SCENES.push({
  id: 'playground',
  name: '놀이터',
  emoji: '🎈',
  bg: '#FFE8EE',

  buildScene(v, level) {
    const A = v === 'A';
    const L = +level || 1;
    const D1 = !A && L === 1, D2 = !A && L === 2, D3 = !A && L === 3;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
  <!-- 하늘 (단색 레이어) -->
  <rect x="0" y="0" width="1200" height="560" fill="#A8DFF8"/>
  <rect x="0" y="300" width="1200" height="260" fill="#CDEEFC" opacity="0.55"/>

  <!-- 해 -->
  <g>
    <circle cx="112" cy="102" r="56" fill="#FFD93D"/>
    <g stroke="#FFD93D" stroke-width="10" stroke-linecap="round">
      <line x1="112" y1="14" x2="112" y2="34"/><line x1="112" y1="170" x2="112" y2="190"/>
      <line x1="24" y1="102" x2="44" y2="102"/><line x1="180" y1="102" x2="200" y2="102"/>
      <line x1="50" y1="40" x2="64" y2="54"/><line x1="160" y1="150" x2="174" y2="164"/>
      <line x1="174" y1="40" x2="160" y2="54"/><line x1="64" y1="150" x2="50" y2="164"/>
    </g>
    <circle cx="94" cy="94" r="7" fill="#E8A800"/><circle cx="130" cy="94" r="7" fill="#E8A800"/>
    <!-- ★차이12(L3): 해 입 모양 (웃는 입 → 동그란 입) -->
    <g data-diff="12" data-level="3" data-cx="112" data-cy="120" data-r="45">${D3
      ? '<circle cx="112" cy="122" r="8" fill="#E8A800"/>'
      : '<path d="M94 120 Q112 134 130 120" stroke="#E8A800" stroke-width="6" fill="none" stroke-linecap="round"/>'}
    </g>
  </g>

  <!-- 구름 1 -->
  <g fill="#FFFFFF" opacity="0.95">
    <circle cx="330" cy="128" r="32"/><circle cx="374" cy="112" r="40"/><circle cx="418" cy="130" r="30"/>
    <rect x="322" y="120" width="106" height="38" rx="19"/>
  </g>
  <!-- 구름 2 -->
  <g fill="#FFFFFF" opacity="0.95">
    <circle cx="656" cy="82" r="28"/><circle cx="696" cy="68" r="35"/>
    <rect x="648" y="78" width="98" height="34" rx="17"/>
  </g>
  <!-- ★차이18(L3): 구름 2 오른쪽 뭉게 — B에서는 사라짐 -->
  <g data-diff="18" data-level="3" data-cx="712" data-cy="80" data-r="55">${D3 ? '' : '<circle cx="736" cy="86" r="26" fill="#FFFFFF" opacity="0.95"/>'}
  </g>

  <!-- 숨은그림 L2: 종이비행기 (구름 옆 하늘, 흰색 보호색) -->
  <g data-find="paperplane" data-label="종이비행기" data-level="2">
    <polygon points="446,146 494,124 478,158" fill="#FFFFFF" stroke="#C5D2DE" stroke-width="2.5" stroke-linejoin="round"/>
    <polygon points="446,146 478,158 471,166" fill="#E8EEF4" stroke="#C5D2DE" stroke-width="2" stroke-linejoin="round"/>
    <line x1="446" y1="146" x2="494" y2="124" stroke="#C5D2DE" stroke-width="2.5" stroke-linecap="round"/>
  </g>

  <!-- ★차이2(L1): 연 — B에서는 사라짐 -->
  <g data-diff="2" data-cx="950" data-cy="150" data-r="95">${D1 ? '' : `
    <g>
      <polygon points="950,92 1005,152 950,212 895,152" fill="#FFB84D"/>
      <polygon points="950,92 1005,152 950,212 895,152" fill="none" stroke="#E8952E" stroke-width="5" stroke-linejoin="round"/>
      <line x1="950" y1="92" x2="950" y2="212" stroke="#E8952E" stroke-width="4"/>
      <line x1="895" y1="152" x2="1005" y2="152" stroke="#E8952E" stroke-width="4"/>
      <path d="M950 212 Q935 250 955 280 Q972 305 958 335" stroke="#E8952E" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M928 252 L948 244 L940 264 Z" fill="#FF8FC7"/>
      <path d="M948 300 L968 292 L960 312 Z" fill="#7FB8E8"/>
    </g>`}
  </g>

  <!-- 뒷배경 아파트 -->
  <g>
    <rect x="50" y="258" width="172" height="215" rx="10" fill="#C9BBEA"/>
    <rect x="50" y="258" width="172" height="34" rx="10" fill="#AC99DB"/>
    <g fill="#FFF7DE">
      <rect x="72" y="310" width="34" height="30" rx="6"/><rect x="166" y="310" width="34" height="30" rx="6"/>
      <rect x="72" y="360" width="34" height="30" rx="6"/><rect x="166" y="360" width="34" height="30" rx="6"/>
      <rect x="72" y="410" width="34" height="30" rx="6"/>
      <rect x="120" y="330" width="32" height="30" rx="6"/><rect x="120" y="390" width="32" height="30" rx="6"/>
    </g>
    <!-- ★차이13(L3): 보라 아파트 오른쪽 아래 창문 — B에서는 사라짐 -->
    <g data-diff="13" data-level="3" data-cx="183" data-cy="425" data-r="42">${D3 ? '' : '<rect x="166" y="410" width="34" height="30" rx="6" fill="#FFF7DE"/>'}
    </g>
    <rect x="248" y="304" width="132" height="170" rx="10" fill="#F9D77E"/>
    <rect x="248" y="304" width="132" height="28" rx="10" fill="#E8B95A"/>
    <g fill="#FFFDF2">
      <rect x="266" y="348" width="30" height="26" rx="6"/><rect x="332" y="348" width="30" height="26" rx="6"/>
      <rect x="266" y="392" width="30" height="26" rx="6"/><rect x="332" y="392" width="30" height="26" rx="6"/>
      <rect x="332" y="436" width="30" height="26" rx="6"/>
    </g>
    <!-- ★차이6(L2): 노란 아파트 왼쪽 아래 창문 색 (흰색 → 하늘색) -->
    <g data-diff="6" data-level="2" data-cx="281" data-cy="449" data-r="45">
      <rect x="266" y="436" width="30" height="26" rx="6" fill="${D2 ? '#7FB8E8' : '#FFFDF2'}"/>
    </g>
    <rect x="858" y="286" width="150" height="188" rx="10" fill="#A8D8EA"/>
    <rect x="858" y="286" width="150" height="30" rx="10" fill="#84BDD4"/>
    <g fill="#FFF7DE">
      <rect x="878" y="332" width="30" height="26" rx="6"/><rect x="958" y="332" width="30" height="26" rx="6"/>
      <rect x="878" y="378" width="30" height="26" rx="6"/><rect x="958" y="378" width="30" height="26" rx="6"/>
      <rect x="878" y="424" width="30" height="26" rx="6"/><rect x="958" y="424" width="30" height="26" rx="6"/>
    </g>
  </g>

  <!-- 숨은그림 L2: 비둘기 (파란 아파트 지붕 위, 회색 보호색) -->
  <g data-find="pigeon" data-label="비둘기" data-level="2">
    <ellipse cx="886" cy="272" rx="17" ry="12" fill="#B7BECD"/>
    <circle cx="901" cy="263" r="8" fill="#9AA5B1"/>
    <circle cx="904" cy="261" r="2.2" fill="#3B3B3B"/>
    <polygon points="908,264 917,266 908,268" fill="#F2A33C"/>
    <path d="M878 270 Q868 264 872 278 Z" fill="#9AA5B1"/>
    <line x1="882" y1="283" x2="882" y2="288" stroke="#C97B4A" stroke-width="3" stroke-linecap="round"/>
    <line x1="891" y1="283" x2="891" y2="288" stroke="#C97B4A" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 클로버 화분 (노란 아파트 창턱, 주황 보호색) -->
  <g data-find="pot" data-label="클로버 화분" data-level="2">
    <circle cx="342" cy="348" r="5" fill="#4DA644"/><circle cx="352" cy="348" r="5" fill="#4DA644"/>
    <circle cx="347" cy="342" r="5" fill="#4DA644"/>
    <path d="M334 358 L360 358 L356 376 L338 376 Z" fill="#C9764A"/>
    <rect x="332" y="353" width="30" height="7" rx="3" fill="#B25E38"/>
  </g>

  <!-- 잔디 -->
  <path d="M0 470 Q300 432 600 458 Q900 486 1200 452 L1200 800 L0 800 Z" fill="#A9DC8C"/>

  <!-- 울타리 -->
  <g>
    ${[30, 110, 190, 270, 350, 430, 510, 590, 670, 750, 830, 910, 990, 1070, 1150].map(x => `
    <rect x="${x}" y="464" width="16" height="62" rx="7" fill="#FDFDF6" stroke="#E3DCCB" stroke-width="2"/>`).join('')}
    <rect x="0" y="478" width="1200" height="10" rx="5" fill="#FDFDF6" stroke="#E3DCCB" stroke-width="2"/>
    <rect x="0" y="504" width="1200" height="10" rx="5" fill="#FDFDF6" stroke="#E3DCCB" stroke-width="2"/>
  </g>

  <!-- 숨은그림 L2: 야구모자 (울타리 기둥에 걸림) -->
  <g data-find="cap" data-label="야구모자" data-level="2">
    <path d="M580 470 Q580 450 598 450 Q616 450 616 470 Z" fill="#E8574B"/>
    <path d="M614 464 Q632 462 636 470 L614 473 Z" fill="#C74437"/>
    <path d="M580 467 L616 467" stroke="#C74437" stroke-width="3" stroke-linecap="round"/>
    <circle cx="598" cy="451" r="4" fill="#C74437"/>
  </g>

  <!-- 숨은그림 L3: 구슬 (울타리 기둥 밑 잔디 틈, 청록 보호색) -->
  <g data-find="marble" data-label="구슬" data-level="3">
    <circle cx="655" cy="524" r="10" fill="#8FD0C8"/>
    <path d="M650 519 Q655 515 660 519" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M649 529 Q655 533 661 529" stroke="#5FA89F" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 큰 나무 (오른쪽) -->
  <g>
    <rect x="1038" y="330" width="44" height="150" rx="16" fill="#8B5A2B"/>
    <circle cx="1015" cy="290" r="56" fill="#5FA84E"/>
    <circle cx="1080" cy="252" r="66" fill="#6BB55A"/>
    <circle cx="1135" cy="305" r="52" fill="#5FA84E"/>
    <circle cx="1068" cy="330" r="48" fill="#6BB55A"/>
    <circle cx="1030" cy="268" r="12" fill="#FF8FC7"/>
    <!-- ★차이7(L2): 나무 분홍 꽃 — B에서는 사라짐 -->
    <g data-diff="7" data-level="2" data-cx="1122" data-cy="278" data-r="45">${D2 ? '' : '<circle cx="1122" cy="278" r="12" fill="#FF8FC7"/>'}
    </g>
  </g>

  <!-- 숨은그림 L3: 매미 (나무 기둥, 갈색 보호색) -->
  <g data-find="cicada" data-label="매미" data-level="3">
    <ellipse cx="1052" cy="404" rx="5" ry="12" transform="rotate(14 1052 404)" fill="#D8CDB4" opacity="0.75"/>
    <ellipse cx="1068" cy="404" rx="5" ry="12" transform="rotate(-14 1068 404)" fill="#D8CDB4" opacity="0.75"/>
    <ellipse cx="1060" cy="402" rx="9" ry="14" fill="#7A4A2B"/>
    <circle cx="1060" cy="390" r="6" fill="#6E4224"/>
    <circle cx="1056" cy="388" r="1.8" fill="#3B2A18"/><circle cx="1064" cy="388" r="1.8" fill="#3B2A18"/>
    <path d="M1055 398 L1055 410 M1060 398 L1060 412 M1065 398 L1065 410" stroke="#4A3521" stroke-width="1.6"/>
  </g>

  <!-- 숨은그림 L1: 풍선 (그네 기둥에 묶여 하늘에 둥실) -->
  <g data-find="balloon" data-label="풍선">
    <ellipse cx="742" cy="312" rx="30" ry="36" fill="#FF8FC7"/>
    <ellipse cx="732" cy="300" rx="9" ry="12" fill="#FFB0D8"/>
    <polygon points="742,346 734,358 750,358" fill="#E86FA8"/>
    <path d="M742 358 Q730 400 756 424 Q772 438 768 448" stroke="#E86FA8" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 놀이터 바닥 (모래빛 우레탄) -->
  <path d="M0 612 Q600 565 1200 612 L1200 800 L0 800 Z" fill="#F5E6C4"/>
  <path d="M0 612 Q600 565 1200 612" fill="none" stroke="#E3CE9F" stroke-width="6" stroke-linecap="round"/>
  <g fill="#E8D5A8">
    <ellipse cx="460" cy="640" rx="16" ry="6"/><ellipse cx="560" cy="770" rx="20" ry="7"/>
    <ellipse cx="120" cy="660" rx="15" ry="6"/><ellipse cx="940" cy="770" rx="16" ry="6"/>
    <ellipse cx="380" cy="700" rx="14" ry="6"/>
  </g>
  <!-- ★차이14(L3): 모래 언덕 하나 — B에서는 사라짐 -->
  <g data-diff="14" data-level="3" data-cx="840" data-cy="700" data-r="40">${D3 ? '' : '<ellipse cx="840" cy="700" rx="18" ry="7" fill="#E8D5A8"/>'}
  </g>

  <!-- 숨은그림 L2: 운동화 한 짝 (바닥 구석, 모래색 보호색) -->
  <g data-find="sneaker" data-label="운동화" data-level="2">
    <path d="M54 618 L76 618 L79 631 Q98 633 102 641 L102 646 L54 646 Z" fill="#E8C878" stroke="#C9A055" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="52" y="644" width="52" height="8" rx="4" fill="#FFFFFF" stroke="#D8CDB4" stroke-width="2"/>
    <path d="M60 624 L72 624 M62 632 L75 632" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 조약돌 탑 (바닥 가장자리, 돌색 보호색) -->
  <g data-find="pebbles" data-label="조약돌 탑" data-level="3">
    <ellipse cx="180" cy="622" rx="14" ry="8" fill="#C9BFA8"/>
    <ellipse cx="180" cy="611" rx="11" ry="7" fill="#B8AE96"/>
    <ellipse cx="180" cy="601" rx="7" ry="5" fill="#C9BFA8"/>
  </g>

  <!-- 숨은그림 L3: 머리핀 (바닥, 금색 보호색) -->
  <g data-find="hairpin" data-label="머리핀" data-level="3">
    <path d="M548 763 L571 755" stroke="#E8C05A" stroke-width="4" stroke-linecap="round"/>
    <path d="M548 763 Q545 756 552 754 L571 754" stroke="#E8C05A" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="572" cy="754" r="4.5" fill="#FF8FC7"/>
  </g>

  <!-- 숨은그림 L3: 단풍잎 (바닥, 모래색에 섞임) -->
  <g data-find="mapleleaf" data-label="단풍잎" data-level="3">
    <path d="M940 648 L945 657 L955 653 L950 663 L958 669 L946 669 L944 679 L938 670 L928 672 L933 662 L925 656 L936 656 Z" fill="#E8A25C"/>
    <line x1="941" y1="672" x2="939" y2="681" stroke="#C9823E" stroke-width="2.5" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 개미 (바닥, 모래색 보호색) -->
  <g data-find="ant" data-label="개미" data-level="3">
    <circle cx="310" cy="662" r="4.5" fill="#B5854A"/><circle cx="318" cy="660" r="4" fill="#B5854A"/>
    <circle cx="326" cy="658" r="5" fill="#B5854A"/>
    <circle cx="328" cy="656" r="1.4" fill="#5E3820"/>
    <path d="M311 666 L308 672 M318 664 L317 671 M324 663 L327 670" stroke="#8A5A2E" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M328 654 Q331 649 335 649 M323 654 Q323 648 319 646" stroke="#8A5A2E" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 미끄럼틀 -->
  <g>
    <!-- 기둥 겸 사다리 -->
    <rect x="372" y="450" width="16" height="216" rx="7" fill="#E8A25C"/>
    <rect x="440" y="450" width="16" height="216" rx="7" fill="#E8A25C"/>
    <g stroke="#C9823E" stroke-width="10" stroke-linecap="round">
      <line x1="380" y1="492" x2="448" y2="492"/>
      <line x1="380" y1="534" x2="448" y2="534"/>
    </g>
    <!-- ★차이17(L3): 사다리 맨 아래 가로대 — B에서는 사라짐 -->
    <g data-diff="17" data-level="3" data-cx="414" data-cy="600" data-r="55">
      <line x1="380" y1="576" x2="448" y2="576" stroke="#C9823E" stroke-width="10" stroke-linecap="round"/>
      ${D3 ? '' : '<line x1="380" y1="618" x2="448" y2="618" stroke="#C9823E" stroke-width="10" stroke-linecap="round"/>'}
    </g>
    <!-- ★차이1(L1): 미끄럼판 색 (분홍 → 파랑) -->
    <g data-diff="1" data-cx="290" data-cy="555" data-r="110">
      <path d="M368 452 L368 500 Q360 560 280 610 L215 645 Q196 655 190 640 Q186 626 202 617 L262 584 Q330 542 330 492 L330 452 Z" fill="${D1 ? '#7FB8E8' : '#FF8FA3'}"/>
      <path d="M368 452 L368 500 Q360 560 280 610 L215 645 Q196 655 190 640 Q186 626 202 617 L262 584 Q330 542 330 492 L330 452 Z" fill="none" stroke="${D1 ? '#5E93C7' : '#E56E86'}" stroke-width="5" stroke-linejoin="round"/>
    </g>
    <!-- ★차이11(L2): 꼭대기 발판 색 (노랑 → 초록) -->
    <g data-diff="11" data-level="2" data-cx="414" data-cy="440" data-r="55">
      <rect x="356" y="426" width="116" height="28" rx="10" fill="${D2 ? '#8FD06A' : '#FFD93D'}" stroke="${D2 ? '#5FA84E' : '#E8B95A'}" stroke-width="4"/>
    </g>
  </g>

  <!-- 숨은그림 L1: 곰인형 (미끄럼틀 아래에 앉아 있음) -->
  <g data-find="teddy" data-label="곰인형">
    <circle cx="386" cy="622" r="8" fill="#A87844"/><circle cx="414" cy="622" r="8" fill="#A87844"/>
    <circle cx="386" cy="622" r="4" fill="#E8C79A"/><circle cx="414" cy="622" r="4" fill="#E8C79A"/>
    <circle cx="400" cy="638" r="18" fill="#C89562"/>
    <circle cx="394" cy="634" r="3" fill="#4A3521"/><circle cx="406" cy="634" r="3" fill="#4A3521"/>
    <ellipse cx="400" cy="644" rx="8" ry="6" fill="#E8C79A"/>
    <circle cx="400" cy="642" r="2.5" fill="#4A3521"/>
    <path d="M396 648 Q400 651 404 648" stroke="#4A3521" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="400" cy="668" rx="20" ry="15" fill="#C89562"/>
    <ellipse cx="384" cy="676" rx="7" ry="5" fill="#A87844"/><ellipse cx="416" cy="676" rx="7" ry="5" fill="#A87844"/>
  </g>

  <!-- 모래놀이터 -->
  <g>
    <rect x="52" y="688" width="296" height="98" rx="20" fill="#D9A05C"/>
    <rect x="52" y="688" width="296" height="98" rx="20" fill="none" stroke="#B9813F" stroke-width="6"/>
    <rect x="72" y="704" width="256" height="66" rx="14" fill="#F7E3A8"/>
    <!-- 모래성 -->
    <g>
      <rect x="252" y="722" width="34" height="40" rx="4" fill="#E8C878"/>
      <rect x="288" y="732" width="26" height="30" rx="4" fill="#E8C878"/>
      <polygon points="252,722 258,710 264,722 270,710 276,722 282,710 286,722" fill="#E8C878"/>
      <line x1="269" y1="712" x2="269" y2="698" stroke="#C9823E" stroke-width="3"/>
      <!-- ★차이8(L2): 모래성 깃발 색 (빨강 → 초록) -->
      <g data-diff="8" data-level="2" data-cx="272" data-cy="700" data-r="42">
        <path d="M269 698 L284 703 L269 708 Z" fill="${D2 ? '#5FA84E' : '#FF6B6B'}"/>
      </g>
    </g>
  </g>

  <!-- 숨은그림 L3: 동전 (모래 속, 모래색 보호색) -->
  <g data-find="coin" data-label="동전" data-level="3">
    <circle cx="205" cy="752" r="11" fill="#E8C05A" stroke="#C99B3A" stroke-width="3"/>
    <circle cx="205" cy="752" r="5" fill="none" stroke="#C99B3A" stroke-width="2"/>
  </g>

  <!-- 숨은그림 L1: 모래삽 (모래에 꽂혀 있음) -->
  <g data-find="shovel" data-label="모래삽">
    <rect x="134" y="676" width="10" height="52" rx="5" fill="#4A90D9"/>
    <rect x="120" y="668" width="38" height="12" rx="6" fill="#4A90D9"/>
    <path d="M122 724 L156 724 L152 746 Q145 762 139 766 Q133 762 126 746 Z" fill="#FF6B6B"/>
    <path d="M122 724 L156 724" stroke="#D94F4F" stroke-width="4" stroke-linecap="round"/>
    <line x1="139" y1="730" x2="139" y2="756" stroke="#D94F4F" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- ★차이4(L1): 꽃 개수 (3송이 → 2송이) -->
  <g data-diff="4" data-cx="432" data-cy="735" data-r="60">${D1 ? '' : `
    <g>
      <line x1="432" y1="736" x2="432" y2="770" stroke="#4DA644" stroke-width="6" stroke-linecap="round"/>
      <circle cx="421" cy="730" r="9" fill="#C9A0F0"/><circle cx="443" cy="730" r="9" fill="#C9A0F0"/>
      <circle cx="432" cy="719" r="9" fill="#C9A0F0"/><circle cx="432" cy="741" r="9" fill="#C9A0F0"/>
      <circle cx="432" cy="730" r="8" fill="#FFD93D"/>
    </g>`}
    ${[398, 466].map(x => `
    <g>
      <line x1="${x}" y1="742" x2="${x}" y2="772" stroke="#4DA644" stroke-width="6" stroke-linecap="round"/>
      <circle cx="${x - 10}" cy="738" r="8" fill="#FF8FC7"/><circle cx="${x + 10}" cy="738" r="8" fill="#FF8FC7"/>
      <circle cx="${x}" cy="728" r="8" fill="#FF8FC7"/><circle cx="${x}" cy="748" r="8" fill="#FF8FC7"/>
      <circle cx="${x}" cy="738" r="7" fill="#FFD93D"/>
    </g>`).join('')}
  </g>

  <!-- ★차이5(L1): 스프링 오리 색 (노랑 → 분홍) -->
  <g data-diff="5" data-cx="520" data-cy="680" data-r="70">
    <path d="M520 748 L544 738 L500 728 L544 718 L508 708" stroke="#8B8B9E" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="520" cy="682" rx="36" ry="26" fill="${D1 ? '#FF9FBF' : '#FFD93D'}"/>
    <path d="M496 682 Q484 692 498 696 Q508 698 510 690 Z" fill="${D1 ? '#E87FA5' : '#E8B95A'}"/>
    <circle cx="548" cy="656" r="17" fill="${D1 ? '#FF9FBF' : '#FFD93D'}"/>
    <polygon points="563,656 580,661 563,666" fill="#F2A33C"/>
    <circle cx="551" cy="652" r="3.5" fill="#3B3B3B"/>
    <rect x="514" y="654" width="8" height="18" rx="4" fill="#8B8B9E"/>
    <circle cx="518" cy="652" r="7" fill="#E8574B"/>
  </g>

  <!-- 시소 -->
  <g>
    <polygon points="648,698 616,748 680,748" fill="#9AA5B1"/>
    <polygon points="648,698 616,748 680,748" fill="none" stroke="#7E8894" stroke-width="5" stroke-linejoin="round"/>
    <g transform="rotate(-10 648 692)">
      <rect x="518" y="683" width="260" height="18" rx="9" fill="#6BCB77"/>
      <rect x="518" y="683" width="260" height="18" rx="9" fill="none" stroke="#4DA644" stroke-width="4"/>
      <rect x="524" y="668" width="8" height="16" rx="4" fill="#E8574B"/>
      <rect x="512" y="664" width="32" height="9" rx="4.5" fill="#E8574B"/>
      <!-- ★차이9(L2): 시소 오른쪽 손잡이 색 (빨강 → 파랑) -->
      <g data-diff="9" data-level="2" data-cx="762" data-cy="652" data-r="45">
        <rect x="764" y="668" width="8" height="16" rx="4" fill="${D2 ? '#4A90D9' : '#E8574B'}"/>
        <rect x="752" y="664" width="32" height="9" rx="4.5" fill="${D2 ? '#4A90D9' : '#E8574B'}"/>
      </g>
    </g>
    <!-- ★차이15(L3): 시소 가운데 동그라미 색 (노랑 → 주황) -->
    <g data-diff="15" data-level="3" data-cx="648" data-cy="696" data-r="40">
      <circle cx="648" cy="696" r="9" fill="${D3 ? '#F2A33C' : '#FFD93D'}" stroke="${D3 ? '#D9862E' : '#E8B95A'}" stroke-width="3"/>
    </g>
  </g>

  <!-- 숨은그림 L1: 공 (덤불 뒤에 반쯤 숨음) -->
  <g data-find="ball" data-label="공">
    <circle cx="712" cy="712" r="30" fill="#FF6B6B"/>
    <path d="M712 682 Q692 712 712 742 M712 682 Q732 712 712 742" stroke="#FFF3D6" stroke-width="7" fill="none"/>
    <circle cx="712" cy="712" r="30" fill="none" stroke="#D94F4F" stroke-width="4"/>
  </g>
  <!-- 덤불 (공 앞) -->
  <g fill="#6BB55A">
    <circle cx="688" cy="748" r="20"/><circle cx="714" cy="754" r="22"/><circle cx="740" cy="748" r="18"/>
    <circle cx="702" cy="736" r="16"/><circle cx="728" cy="738" r="15"/>
  </g>

  <!-- 그네 -->
  <g>
    <g stroke="#5FA8E8" stroke-width="14" stroke-linecap="round">
      <line x1="752" y1="446" x2="712" y2="664"/>
      <line x1="752" y1="446" x2="792" y2="664"/>
      <line x1="958" y1="446" x2="918" y2="664"/>
      <line x1="958" y1="446" x2="998" y2="664"/>
    </g>
    <rect x="738" y="436" width="234" height="16" rx="8" fill="#4A90D9"/>
    <g stroke="#8B8B9E" stroke-width="5" stroke-linecap="round">
      <line x1="800" y1="452" x2="800" y2="586"/>
      <line x1="832" y1="452" x2="832" y2="586"/>
    </g>
    <!-- ★차이10(L2): 왼쪽 그네 의자 색 (노랑 → 보라) -->
    <g data-diff="10" data-level="2" data-cx="816" data-cy="580" data-r="55">
      <rect x="788" y="586" width="56" height="15" rx="7" fill="${D2 ? '#C9A0F0' : '#FFD93D'}" stroke="${D2 ? '#A87DD9' : '#E8B95A'}" stroke-width="3"/>
    </g>
    <!-- ★차이3(L1): 오른쪽 그네 의자 색 (빨강 → 초록) -->
    <g data-diff="3" data-cx="896" data-cy="565" data-r="75">
      <g stroke="#8B8B9E" stroke-width="5" stroke-linecap="round">
        <line x1="880" y1="452" x2="880" y2="600"/>
        <line x1="912" y1="452" x2="912" y2="600"/>
      </g>
      <rect x="868" y="600" width="56" height="15" rx="7" fill="${D1 ? '#5FA84E' : '#E8574B'}" stroke="${D1 ? '#3F8534' : '#C74437'}" stroke-width="3"/>
    </g>
  </g>

  <!-- 숨은그림 L2: 참새 (그네 윗봉 위, 갈색 작은 새) -->
  <g data-find="sparrow" data-label="참새" data-level="2">
    <path d="M845 428 L837 422" stroke="#8A5A2E" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="858" cy="424" rx="15" ry="11" fill="#A9743F"/>
    <ellipse cx="856" cy="422" rx="8" ry="5" fill="#8A5A2E"/>
    <circle cx="871" cy="416" r="8" fill="#A9743F"/>
    <circle cx="874" cy="414" r="2.2" fill="#3B2A18"/>
    <polygon points="878,417 886,419 878,421" fill="#F2A33C"/>
  </g>

  <!-- 벤치 -->
  <g>
    <rect x="985" y="604" width="182" height="16" rx="8" fill="#C68B4F" stroke="#A96F35" stroke-width="4"/>
    <rect x="985" y="632" width="182" height="14" rx="7" fill="#C68B4F" stroke="#A96F35" stroke-width="4"/>
    <rect x="985" y="658" width="182" height="20" rx="9" fill="#C68B4F" stroke="#A96F35" stroke-width="4"/>
    <rect x="1000" y="676" width="14" height="62" rx="6" fill="#A96F35"/>
    <rect x="1138" y="676" width="14" height="62" rx="6" fill="#A96F35"/>
  </g>

  <!-- 숨은그림 L2: 물병 (벤치 오른쪽 끝에 세워짐) -->
  <g data-find="bottle" data-label="물병" data-level="2">
    <rect x="1130" y="614" width="24" height="44" rx="8" fill="#7FC8E8"/>
    <rect x="1136" y="604" width="12" height="12" rx="3" fill="#4A90D9"/>
    <rect x="1132" y="630" width="20" height="12" rx="3" fill="#FFFFFF" opacity="0.85"/>
  </g>

  <!-- 숨은그림 L3: 사탕 (벤치 밑 바닥, 모래색 보호색) -->
  <g data-find="candy" data-label="사탕" data-level="3">
    <path d="M1105 731 L1096 725 L1096 737 Z" fill="#EFCF8E"/>
    <path d="M1123 731 L1132 725 L1132 737 Z" fill="#EFCF8E"/>
    <circle cx="1114" cy="731" r="9" fill="#EFCF8E"/>
    <path d="M1109 726 Q1114 730 1119 726 M1109 736 Q1114 732 1119 736" stroke="#D9A94F" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L1: 아이스크림 (벤치 위에 놓임) -->
  <g data-find="icecream" data-label="아이스크림">
    <polygon points="1000,630 1024,630 1012,660" fill="#E8A25C"/>
    <path d="M1003 638 L1021 638 M1006 646 L1018 646" stroke="#C9823E" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="1012" cy="620" r="14" fill="#FF9FBF"/>
    <path d="M1000 616 Q1012 606 1024 616" stroke="#FFC6DA" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="1012" cy="604" r="4.5" fill="#E8574B"/>
  </g>

  <!-- 숨은그림 L1: 고양이 (벤치 아래) -->
  <g data-find="cat" data-label="고양이">
    <ellipse cx="1078" cy="718" rx="27" ry="18" fill="#9FA3C8"/>
    <path d="M1105 716 Q1124 708 1120 692" stroke="#9FA3C8" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="1048" cy="704" r="15" fill="#9FA3C8"/>
    <polygon points="1036,696 1032,680 1046,688" fill="#9FA3C8"/>
    <polygon points="1060,696 1064,680 1050,688" fill="#9FA3C8"/>
    <polygon points="1037,693 1036,685 1043,689" fill="#F0B7C8"/>
    <polygon points="1059,693 1060,685 1053,689" fill="#F0B7C8"/>
    <circle cx="1043" cy="702" r="2.8" fill="#3B3B3B"/><circle cx="1054" cy="702" r="2.8" fill="#3B3B3B"/>
    <path d="M1045 709 Q1048 712 1051 709" stroke="#3B3B3B" stroke-width="2" fill="none" stroke-linecap="round"/>
    <g stroke="#787CA0" stroke-width="1.8" stroke-linecap="round">
      <line x1="1032" y1="704" x2="1022" y2="702"/><line x1="1032" y1="708" x2="1022" y2="710"/>
      <line x1="1064" y1="704" x2="1074" y2="702"/><line x1="1064" y1="708" x2="1074" y2="710"/>
    </g>
  </g>

  <!-- 잔디 위 풀·꽃 장식 -->
  <g>
    <g fill="#8BCF6B">
      <path d="M60 640 q7 -20 14 0 z"/><path d="M600 622 q7 -20 14 0 z"/><path d="M1180 640 q7 -18 12 0 z"/>
      <path d="M866 776 q7 -20 14 0 z"/><path d="M170 782 q7 -18 12 0 z"/>
    </g>
    <g>
      <circle cx="92" cy="636" r="7" fill="#FF8FC7"/><circle cx="92" cy="636" r="3.5" fill="#FFD93D"/>
      <circle cx="906" cy="772" r="7" fill="#FF8FC7"/><circle cx="906" cy="772" r="3.5" fill="#FFD93D"/>
    </g>
    <!-- ★차이16(L3): 작은 꽃 꽃잎 색 (보라 → 분홍) -->
    <g data-diff="16" data-level="3" data-cx="630" data-cy="618" data-r="40">
      <circle cx="630" cy="618" r="7" fill="${D3 ? '#FF8FC7' : '#C9A0F0'}"/><circle cx="630" cy="618" r="3.5" fill="#FFD93D"/>
    </g>
  </g>
</svg>`;
  },

  hidden: [
    /* ── L1: 쉬움 (6) ── */
    {
      id: 'ball', label: '공',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="24" fill="#FF6B6B"/>
        <path d="M30 6 Q14 30 30 54 M30 6 Q46 30 30 54" stroke="#FFF3D6" stroke-width="5" fill="none"/>
        <circle cx="30" cy="30" r="24" fill="none" stroke="#D94F4F" stroke-width="3.5"/></svg>`
    },
    {
      id: 'teddy', label: '곰인형',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="9" fill="#A87844"/><circle cx="44" cy="16" r="9" fill="#A87844"/>
        <circle cx="16" cy="16" r="4.5" fill="#E8C79A"/><circle cx="44" cy="16" r="4.5" fill="#E8C79A"/>
        <circle cx="30" cy="32" r="21" fill="#C89562"/>
        <circle cx="23" cy="27" r="3.2" fill="#4A3521"/><circle cx="37" cy="27" r="3.2" fill="#4A3521"/>
        <ellipse cx="30" cy="39" rx="9" ry="7" fill="#E8C79A"/>
        <circle cx="30" cy="37" r="2.8" fill="#4A3521"/>
        <path d="M26 43 Q30 46 34 43" stroke="#4A3521" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'balloon', label: '풍선',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="22" rx="17" ry="20" fill="#FF8FC7"/>
        <ellipse cx="24" cy="15" rx="5" ry="7" fill="#FFB0D8"/>
        <polygon points="30,41 25,48 35,48" fill="#E86FA8"/>
        <path d="M30 48 Q24 54 32 58" stroke="#E86FA8" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'shovel', label: '모래삽',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <rect x="26" y="10" width="8" height="24" rx="4" fill="#4A90D9"/>
        <rect x="16" y="4" width="28" height="9" rx="4.5" fill="#4A90D9"/>
        <path d="M17 32 L43 32 L40 46 Q35 56 30 59 Q25 56 20 46 Z" fill="#FF6B6B"/>
        <path d="M17 32 L43 32" stroke="#D94F4F" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="30" y1="37" x2="30" y2="52" stroke="#D94F4F" stroke-width="2.5" stroke-linecap="round"/></svg>`
    },
    {
      id: 'cat', label: '고양이',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="34" r="18" fill="#9FA3C8"/>
        <polygon points="16,24 12,6 28,15" fill="#9FA3C8"/><polygon points="44,24 48,6 32,15" fill="#9FA3C8"/>
        <polygon points="17,20 15,10 24,15" fill="#F0B7C8"/><polygon points="43,20 45,10 36,15" fill="#F0B7C8"/>
        <circle cx="24" cy="32" r="3.2" fill="#3B3B3B"/><circle cx="36" cy="32" r="3.2" fill="#3B3B3B"/>
        <path d="M26 40 Q30 44 34 40" stroke="#3B3B3B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <g stroke="#787CA0" stroke-width="2" stroke-linecap="round">
          <line x1="12" y1="34" x2="3" y2="32"/><line x1="12" y1="39" x2="3" y2="41"/>
          <line x1="48" y1="34" x2="57" y2="32"/><line x1="48" y1="39" x2="57" y2="41"/></g></svg>`
    },
    {
      id: 'icecream', label: '아이스크림',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <polygon points="18,28 42,28 30,56" fill="#E8A25C"/>
        <path d="M22 35 L38 35 M25 43 L35 43" stroke="#C9823E" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="30" cy="19" r="13" fill="#FF9FBF"/>
        <path d="M19 15 Q30 5 41 15" stroke="#FFC6DA" stroke-width="5" fill="none" stroke-linecap="round"/>
        <circle cx="30" cy="5" r="4" fill="#E8574B"/></svg>`
    },
    /* ── L2: 보통 (7) ── */
    {
      id: 'bottle', label: '물병', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="18" width="24" height="38" rx="8" fill="#7FC8E8"/>
        <rect x="24" y="6" width="12" height="14" rx="3" fill="#4A90D9"/>
        <rect x="20" y="32" width="20" height="12" rx="3" fill="#FFFFFF" opacity="0.85"/></svg>`
    },
    {
      id: 'cap', label: '야구모자', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 40 Q12 16 30 16 Q48 16 48 40 Z" fill="#E8574B"/>
        <path d="M44 34 Q56 32 58 40 L44 43 Z" fill="#C74437"/>
        <path d="M12 37 L48 37" stroke="#C74437" stroke-width="3" stroke-linecap="round"/>
        <circle cx="30" cy="17" r="4" fill="#C74437"/></svg>`
    },
    {
      id: 'sparrow', label: '참새', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 36 L4 30" stroke="#8A5A2E" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="27" cy="34" rx="17" ry="13" fill="#A9743F"/>
        <ellipse cx="25" cy="31" rx="9" ry="6" fill="#8A5A2E"/>
        <circle cx="42" cy="24" r="9" fill="#A9743F"/>
        <circle cx="45" cy="22" r="2.5" fill="#3B2A18"/>
        <polygon points="50,25 59,27 50,29" fill="#F2A33C"/></svg>`
    },
    {
      id: 'paperplane', label: '종이비행기', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <polygon points="4,32 56,10 38,46" fill="#FFFFFF" stroke="#B8C6D4" stroke-width="2.5" stroke-linejoin="round"/>
        <polygon points="4,32 38,46 31,54" fill="#E8EEF4" stroke="#B8C6D4" stroke-width="2" stroke-linejoin="round"/>
        <line x1="4" y1="32" x2="56" y2="10" stroke="#B8C6D4" stroke-width="2.5" stroke-linecap="round"/></svg>`
    },
    {
      id: 'sneaker', label: '운동화', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 22 L28 22 L31 35 Q52 37 56 45 L56 50 L6 50 Z" fill="#E8C878" stroke="#C9A055" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="4" y="48" width="54" height="8" rx="4" fill="#FFFFFF" stroke="#D8CDB4" stroke-width="2"/>
        <path d="M12 28 L24 28 M14 36 L27 36" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/></svg>`
    },
    {
      id: 'pigeon', label: '비둘기', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="27" cy="32" rx="19" ry="14" fill="#B7BECD"/>
        <circle cx="43" cy="21" r="9" fill="#9AA5B1"/>
        <circle cx="46" cy="19" r="2.5" fill="#3B3B3B"/>
        <polygon points="51,22 59,24 51,26" fill="#F2A33C"/>
        <path d="M18 30 Q8 24 12 40 Z" fill="#9AA5B1"/>
        <line x1="24" y1="45" x2="24" y2="53" stroke="#C97B4A" stroke-width="3" stroke-linecap="round"/>
        <line x1="32" y1="45" x2="32" y2="53" stroke="#C97B4A" stroke-width="3" stroke-linecap="round"/></svg>`
    },
    {
      id: 'pot', label: '클로버 화분', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="18" r="7" fill="#4DA644"/><circle cx="38" cy="18" r="7" fill="#4DA644"/>
        <circle cx="30" cy="10" r="7" fill="#4DA644"/>
        <path d="M14 30 L46 30 L41 54 L19 54 Z" fill="#C9764A"/>
        <rect x="12" y="25" width="36" height="8" rx="4" fill="#B25E38"/></svg>`
    },
    /* ── L3: 어려움 (8) ── */
    {
      id: 'coin', label: '동전', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="22" fill="#E8C05A" stroke="#C99B3A" stroke-width="4"/>
        <circle cx="30" cy="30" r="10" fill="none" stroke="#C99B3A" stroke-width="3"/></svg>`
    },
    {
      id: 'candy', label: '사탕', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 30 L6 22 L6 38 Z" fill="#EFCF8E"/>
        <path d="M42 30 L54 22 L54 38 Z" fill="#EFCF8E"/>
        <circle cx="30" cy="30" r="12" fill="#EFCF8E"/>
        <path d="M23 24 Q30 29 37 24 M23 36 Q30 31 37 36" stroke="#D9A94F" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'marble', label: '구슬', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="20" fill="#8FD0C8"/>
        <path d="M20 22 Q30 14 40 22" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M18 38 Q30 46 42 38" stroke="#5FA89F" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'cicada', label: '매미', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="18" cy="34" rx="7" ry="16" transform="rotate(14 18 34)" fill="#D8CDB4" opacity="0.85"/>
        <ellipse cx="42" cy="34" rx="7" ry="16" transform="rotate(-14 42 34)" fill="#D8CDB4" opacity="0.85"/>
        <ellipse cx="30" cy="34" rx="12" ry="18" fill="#7A4A2B"/>
        <circle cx="30" cy="16" r="8" fill="#6E4224"/>
        <circle cx="25" cy="14" r="2.5" fill="#3B2A18"/><circle cx="35" cy="14" r="2.5" fill="#3B2A18"/>
        <path d="M26 28 L26 46 M30 28 L30 48 M34 28 L34 46" stroke="#4A3521" stroke-width="2"/></svg>`
    },
    {
      id: 'hairpin', label: '머리핀', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 44 L46 28" stroke="#E8C05A" stroke-width="6" stroke-linecap="round"/>
        <path d="M8 44 Q3 34 13 28 L46 28" stroke="#E8C05A" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="47" cy="28" r="7" fill="#FF8FC7"/></svg>`
    },
    {
      id: 'pebbles', label: '조약돌 탑', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="46" rx="22" ry="11" fill="#C9BFA8"/>
        <ellipse cx="30" cy="30" rx="16" ry="9" fill="#B8AE96"/>
        <ellipse cx="30" cy="17" rx="10" ry="7" fill="#C9BFA8"/></svg>`
    },
    {
      id: 'mapleleaf', label: '단풍잎', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 4 L36 18 L50 12 L42 27 L54 35 L38 37 L36 52 L30 39 L18 49 L22 33 L8 27 L24 25 Z" fill="#E8A25C"/>
        <line x1="31" y1="40" x2="29" y2="56" stroke="#C9823E" stroke-width="3" stroke-linecap="round"/></svg>`
    },
    {
      id: 'ant', label: '개미', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="36" r="8" fill="#B5854A"/><circle cx="28" cy="33" r="7" fill="#B5854A"/>
        <circle cx="42" cy="29" r="9" fill="#B5854A"/>
        <circle cx="46" cy="26" r="2.2" fill="#5E3820"/>
        <path d="M16 43 L10 54 M28 40 L26 53 M40 38 L44 51" stroke="#8A5A2E" stroke-width="3" stroke-linecap="round"/>
        <path d="M46 21 Q50 13 56 13 M39 21 Q38 13 32 9" stroke="#8A5A2E" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    }
  ],

  sticker: {
    name: '곰인형 스티커',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#FFF0F5" stroke="#FF8FC7" stroke-width="7"/>
      <circle cx="38" cy="34" r="13" fill="#A87844"/><circle cx="82" cy="34" r="13" fill="#A87844"/>
      <circle cx="38" cy="34" r="6.5" fill="#E8C79A"/><circle cx="82" cy="34" r="6.5" fill="#E8C79A"/>
      <circle cx="60" cy="60" r="30" fill="#C89562"/>
      <circle cx="50" cy="53" r="4.5" fill="#4A3521"/><circle cx="70" cy="53" r="4.5" fill="#4A3521"/>
      <ellipse cx="60" cy="70" rx="13" ry="10" fill="#E8C79A"/>
      <circle cx="60" cy="66" r="4" fill="#4A3521"/>
      <path d="M54 76 Q60 81 66 76" stroke="#4A3521" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M46 92 L60 100 L74 92 L60 88 Z" fill="#FF8FC7"/></svg>`
  }
});
