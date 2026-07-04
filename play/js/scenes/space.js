/* 테마: 우주 — 찾기 놀이터 (난이도 3레벨)
 * 계약:
 *  - buildScene('A'|'B', 1|2|3) → viewBox="0 0 1200 800" SVG 문자열
 *  - 숨은그림: L1 6개·L2 7개·L3 8개 = 총 21개. 모든 레벨 대상을 항상 그린다(하위 레벨에선 장식)
 *    <g data-find="id" data-label="이름" data-level="2">  (data-level 없으면 1)
 *  - 다른그림: L1 5개(id 1~5)·L2 6개(id 6~11)·L3 7개(id 12~18). 마커 그룹은 항상 출력하되
 *    내용 차이는 해당 레벨의 B에서만 적용 (D1/D2/D3)
 *  - defs/그라디언트/url(#…) 참조 금지 — 단색 fill만 사용
 */
window.SCENES = window.SCENES || [];

SCENES.push({
  id: 'space',
  name: '우주',
  emoji: '🚀',
  bg: '#E6E0FF',

  buildScene(v, level) {
    const A = v === 'A';
    const L = +level || 1;
    const D1 = !A && L === 1, D2 = !A && L === 2, D3 = !A && L === 3;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
  <!-- 우주 하늘 (단색 레이어) -->
  <rect x="0" y="0" width="1200" height="800" fill="#514B95"/>
  <rect x="0" y="0" width="1200" height="240" fill="#5D57A6" opacity="0.6"/>
  <rect x="0" y="430" width="1200" height="220" fill="#433E7A" opacity="0.35"/>

  <!-- 반짝이 별들 -->
  <g fill="#FFFFFF" opacity="0.95">
    ${[[95, 62], [320, 64], [435, 118], [560, 62], [760, 215], [1005, 296], [70, 305], [598, 170], [1140, 235], [250, 280]].map(([x, y]) => `
    <path d="M${x} ${y - 9} L${x + 3} ${y - 3} L${x + 9} ${y} L${x + 3} ${y + 3} L${x} ${y + 9} L${x - 3} ${y + 3} L${x - 9} ${y} L${x - 3} ${y - 3} Z"/>`).join('')}
  </g>
  <g fill="#FFFFFF" opacity="0.75">
    ${[[130, 220], [520, 180], [705, 150], [1010, 330], [420, 300], [615, 320], [40, 130], [1170, 120], [830, 340]].map(([x, y]) => `
    <circle cx="${x}" cy="${y}" r="4"/>`).join('')}
  </g>

  <!-- ★차이13(L2→L3): 반짝별 색 (하양 → 금빛) -->
  <g data-diff="13" data-level="3" data-cx="345" data-cy="236" data-r="40">
    <path d="M345 227 L348 233 L354 236 L348 239 L345 245 L342 239 L336 236 L342 233 Z" fill="${D3 ? '#FFD07A' : '#FFFFFF'}" opacity="0.95"/>
  </g>
  <!-- ★차이18(L3): 반짝별 하나 — B에서는 사라짐 -->
  <g data-diff="18" data-level="3" data-cx="875" data-cy="66" data-r="40">${D3 ? '' : '<path d="M875 57 L878 63 L884 66 L878 69 L875 75 L872 69 L866 66 L872 63 Z" fill="#FFFFFF" opacity="0.95"/>'}
  </g>

  <!-- 숨은그림 L3: 별자리 (별 셋을 가는 선으로 이음 — 다른 별들 사이 위장) -->
  <g data-find="constellation" data-label="별자리" data-level="3">
    <line x1="162" y1="253" x2="180" y2="238" stroke="#A8A2DC" stroke-width="2"/>
    <line x1="180" y1="238" x2="191" y2="262" stroke="#A8A2DC" stroke-width="2"/>
    <path d="M162 247 L164 251 L168 253 L164 255 L162 259 L160 255 L156 253 L160 251 Z" fill="#FFFFFF"/>
    <path d="M180 232 L182 236 L186 238 L182 240 L180 244 L178 240 L174 238 L178 236 Z" fill="#FFFFFF"/>
    <path d="M191 256 L193 260 L197 262 L193 264 L191 268 L189 264 L185 262 L189 260 Z" fill="#FFFFFF"/>
  </g>

  <!-- 숨은그림 L3: 작은 운석 (보랏빛 하늘 보호색) -->
  <g data-find="meteor" data-label="작은 운석" data-level="3">
    <line x1="556" y1="234" x2="545" y2="227" stroke="#8E86C8" stroke-width="3" stroke-linecap="round"/>
    <path d="M560 244 Q556 231 569 229 Q583 228 584 241 Q584 254 570 256 Q559 255 560 244 Z" fill="#736CB2"/>
    <circle cx="567" cy="239" r="3" fill="#5A5399"/><circle cx="576" cy="248" r="2.4" fill="#5A5399"/>
  </g>

  <!-- 숨은그림 L2: 미니 UFO (보랏빛 몸통 보호색, 불빛으로 발견) -->
  <g data-find="ufo" data-label="미니 UFO" data-level="2">
    <path d="M464 147 Q480 130 496 147 Z" fill="#9A93D4"/>
    <ellipse cx="480" cy="152" rx="26" ry="9" fill="#7B74BE"/>
    <circle cx="466" cy="152" r="2.5" fill="#FFD93D"/><circle cx="480" cy="155" r="2.5" fill="#FF8FC7"/><circle cx="494" cy="152" r="2.5" fill="#FFD93D"/>
  </g>

  <!-- 숨은그림 L2: 은하 (소용돌이, 하늘 보호색) -->
  <g data-find="galaxy" data-label="은하" data-level="2">
    <path d="M100 410 Q122 414 121 432 Q119 450 100 450 Q82 450 80 434 Q80 420 95 420 Q107 420 106 431 Q106 440 98 440" fill="none" stroke="#847DC2" stroke-width="6" stroke-linecap="round"/>
    <circle cx="99" cy="430" r="5" fill="#C9C4EE"/>
  </g>

  <!-- 웃는 지구 -->
  <g>
    <circle cx="1060" cy="125" r="62" fill="#7BC8E8"/>
    <path d="M1020 90 Q1035 76 1052 86 Q1062 98 1046 108 Q1024 112 1020 90 Z" fill="#8BCF6B"/>
    <path d="M1076 132 Q1100 122 1110 142 Q1106 162 1084 158 Q1068 148 1076 132 Z" fill="#8BCF6B"/>
    <!-- ★차이6(L2): 작은 대륙 — B에서는 사라짐 -->
    <g data-diff="6" data-level="2" data-cx="1036" data-cy="158" data-r="42">${D2 ? '' : '<path d="M1028 152 Q1040 146 1046 158 Q1040 168 1028 164 Z" fill="#8BCF6B"/>'}
    </g>
    <circle cx="1042" cy="120" r="6" fill="#2E6E8E"/><circle cx="1080" cy="120" r="6" fill="#2E6E8E"/>
    <!-- ★차이16(L3): 지구 입 모양 (웃는 입 → 동그란 입) -->
    <g data-diff="16" data-level="3" data-cx="1061" data-cy="145" data-r="45">${D3
      ? '<circle cx="1061" cy="144" r="8" fill="#2E6E8E"/>'
      : '<path d="M1042 142 Q1061 154 1080 142" stroke="#2E6E8E" stroke-width="5" fill="none" stroke-linecap="round"/>'}
    </g>
  </g>

  <!-- 숨은그림 L3: 얼음 조각 (혜성이 흘린 조각, 어두운 하늘에 흐릿한 얼음빛) -->
  <g data-find="iceshard" data-label="얼음 조각" data-level="3">
    <path d="M990 247 L1011 231 L1002 250 Z" fill="#8FB8D8"/>
    <circle cx="992" cy="246" r="4" fill="#BFDCEE"/>
  </g>

  <!-- 고리 행성 1 (복숭아색) -->
  <g>
    <circle cx="170" cy="150" r="54" fill="#FFC58F"/>
    <circle cx="146" cy="132" r="10" fill="#F2A96B"/><circle cx="192" cy="168" r="8" fill="#F2A96B"/>
    <circle cx="152" cy="152" r="6" fill="#C97B3E"/><circle cx="184" cy="150" r="6" fill="#C97B3E"/>
    <path d="M154 166 Q169 176 184 164" stroke="#C97B3E" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>
  <!-- ★차이1(L1): 행성 고리 색 (분홍 → 민트) -->
  <g data-diff="1" data-cx="170" data-cy="150" data-r="95">
    <ellipse cx="170" cy="150" rx="98" ry="24" transform="rotate(-14 170 150)" fill="none" stroke="${D1 ? '#7BE0C8' : '#FF9ED2'}" stroke-width="13"/>
    <ellipse cx="170" cy="150" rx="98" ry="24" transform="rotate(-14 170 150)" fill="none" stroke="${D1 ? '#B5EEDD' : '#FFC7E5'}" stroke-width="4"/>
  </g>

  <!-- 숨은그림: 외계인 (행성 위로 빼꼼) -->
  <g data-find="alien" data-label="외계인">
    <line x1="198" y1="80" x2="191" y2="62" stroke="#7CC940" stroke-width="4" stroke-linecap="round"/>
    <line x1="214" y1="80" x2="221" y2="62" stroke="#7CC940" stroke-width="4" stroke-linecap="round"/>
    <circle cx="190" cy="59" r="5" fill="#FF8FC7"/><circle cx="222" cy="59" r="5" fill="#FFD93D"/>
    <ellipse cx="206" cy="96" rx="20" ry="21" fill="#A8E86B"/>
    <circle cx="199" cy="93" r="4" fill="#2E5E1E"/><circle cx="213" cy="93" r="4" fill="#2E5E1E"/>
    <path d="M199 103 Q206 109 213 103" stroke="#2E5E1E" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 고리 행성 2 (민트) -->
  <g>
    <circle cx="300" cy="352" r="32" fill="#7BE0C8"/>
    <circle cx="288" cy="342" r="6" fill="#57C4A8"/><circle cx="312" cy="362" r="5" fill="#57C4A8"/>
    <circle cx="291" cy="350" r="4" fill="#2E7A64"/><circle cx="309" cy="350" r="4" fill="#2E7A64"/>
    <path d="M292 360 Q300 366 308 360" stroke="#2E7A64" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- ★차이7(L2): 민트 행성 고리 색 (노랑 → 분홍) -->
    <g data-diff="7" data-level="2" data-cx="300" data-cy="352" data-r="68">
      <ellipse cx="300" cy="352" rx="56" ry="14" transform="rotate(12 300 352)" fill="none" stroke="${D2 ? '#FF8FC7' : '#FFD93D'}" stroke-width="8"/>
    </g>
  </g>

  <!-- ★차이3(L1): 별똥별 — B에서는 사라짐 -->
  <g data-diff="3" data-cx="645" data-cy="90" data-r="60">${D1 ? '' : `
    <line x1="652" y1="86" x2="592" y2="68" stroke="#FFB0D8" stroke-width="7" stroke-linecap="round"/>
    <line x1="650" y1="100" x2="600" y2="104" stroke="#FFB0D8" stroke-width="6" stroke-linecap="round"/>
    <path d="M668 74 L673 87 L686 92 L673 97 L668 110 L663 97 L650 92 L663 87 Z" fill="#FFFFFF"/>`}
  </g>

  <!-- 숨은그림: 인공위성 (별들 사이) -->
  <g data-find="satellite" data-label="인공위성">
    <rect x="746" y="108" width="26" height="18" rx="4" fill="#FFB84D"/>
    <line x1="754" y1="108" x2="754" y2="126" stroke="#E8933C" stroke-width="3"/>
    <line x1="763" y1="108" x2="763" y2="126" stroke="#E8933C" stroke-width="3"/>
    <rect x="818" y="108" width="26" height="18" rx="4" fill="#FFB84D"/>
    <line x1="826" y1="108" x2="826" y2="126" stroke="#E8933C" stroke-width="3"/>
    <line x1="835" y1="108" x2="835" y2="126" stroke="#E8933C" stroke-width="3"/>
    <rect x="777" y="99" width="36" height="36" rx="8" fill="#E3E8F5"/>
    <circle cx="795" cy="117" r="9" fill="#7BC8E8"/>
    <line x1="795" y1="99" x2="795" y2="82" stroke="#B9B3D9" stroke-width="4"/>
    <circle cx="795" cy="79" r="5" fill="#FF8A7A"/>
  </g>

  <!-- 숨은그림: 혜성 (지구 옆으로 슝) -->
  <g data-find="comet" data-label="혜성">
    <path d="M886 258 L956 208 L906 274 Z" fill="#9BDCF8" opacity="0.85"/>
    <line x1="892" y1="278" x2="936" y2="250" stroke="#C6ECFB" stroke-width="7" stroke-linecap="round"/>
    <circle cx="880" cy="272" r="20" fill="#C6ECFB"/>
    <circle cx="876" cy="270" r="12" fill="#FFFFFF"/>
  </g>

  <!-- 숨은그림 L2: 우주 정거장 (하늘 보호색 태양전지판) -->
  <g data-find="station" data-label="우주 정거장" data-level="2">
    <line x1="940" y1="306" x2="940" y2="296" stroke="#8B85BC" stroke-width="3" stroke-linecap="round"/>
    <circle cx="940" cy="294" r="3" fill="#FF8A7A"/>
    <rect x="913" y="311" width="15" height="13" rx="2" fill="#6E67AC"/>
    <line x1="918" y1="311" x2="918" y2="324" stroke="#5A5494" stroke-width="2"/>
    <line x1="923" y1="311" x2="923" y2="324" stroke="#5A5494" stroke-width="2"/>
    <rect x="952" y="311" width="15" height="13" rx="2" fill="#6E67AC"/>
    <line x1="957" y1="311" x2="957" y2="324" stroke="#5A5494" stroke-width="2"/>
    <line x1="962" y1="311" x2="962" y2="324" stroke="#5A5494" stroke-width="2"/>
    <rect x="929" y="307" width="22" height="21" rx="6" fill="#A9A4CE"/>
    <circle cx="940" cy="317" r="5" fill="#7BC8E8"/>
  </g>

  <!-- 숨은그림: 노란별 (하얀 별들 사이) -->
  <g data-find="star" data-label="노란별">
    <polygon points="700,309 707,326 725,327 711,338 715,356 700,346 685,356 690,338 675,327 694,326" fill="#FFD93D" stroke="#E8A800" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="694" cy="333" r="2.5" fill="#B07A00"/><circle cx="706" cy="333" r="2.5" fill="#B07A00"/>
    <path d="M694 340 Q700 344 706 340" stroke="#B07A00" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>
  <g fill="#FFFFFF" opacity="0.9">
    <circle cx="660" cy="300" r="4"/><circle cx="742" cy="316" r="4"/><circle cx="675" cy="378" r="4"/><circle cx="730" cy="368" r="3"/>
  </g>

  <!-- ★차이4(L1): 작은 행성 색 (주황 → 초록) -->
  <g data-diff="4" data-cx="935" data-cy="415" data-r="48">
    <circle cx="935" cy="415" r="27" fill="${D1 ? '#8BCF6B' : '#FFB067'}"/>
    <circle cx="925" cy="406" r="6" fill="${D1 ? '#6FAE54' : '#E8945A'}"/>
    <circle cx="944" cy="424" r="5" fill="${D1 ? '#6FAE54' : '#E8945A'}"/>
    <path d="M912 424 Q935 436 958 422" stroke="${D1 ? '#6FAE54' : '#E8945A'}" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 달 표면 -->
  <path d="M0 640 Q150 600 320 628 Q500 656 660 620 Q840 588 1000 622 Q1100 642 1200 618 L1200 800 L0 800 Z" fill="#DCDCEE"/>
  <path d="M0 706 Q300 674 600 706 Q900 738 1200 698 L1200 800 L0 800 Z" fill="#CFCFE6"/>

  <!-- 크레이터 (고정) -->
  <g>
    ${[[452, 758, 34, 14], [642, 744, 40, 16], [92, 752, 30, 13], [1118, 748, 36, 15], [790, 736, 30, 12], [985, 700, 24, 10]].map(([x, y, rx, ry]) => `
    <g><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#BFBFDC"/><ellipse cx="${x}" cy="${y - 3}" rx="${rx - 7}" ry="${ry - 4}" fill="#ADADCF"/></g>`).join('')}
  </g>

  <!-- ★차이15(L3): 크레이터 안쪽 색 (회보라 → 연보라) -->
  <g data-diff="15" data-level="3" data-cx="340" data-cy="668" data-r="40">
    <ellipse cx="340" cy="668" rx="26" ry="11" fill="#BFBFDC"/>
    <ellipse cx="340" cy="665" rx="19" ry="7" fill="${D3 ? '#C3A8D8' : '#ADADCF'}"/>
  </g>

  <!-- ★차이5(L1): 크레이터 하나 — B에서는 사라짐 -->
  <g data-diff="5" data-cx="255" data-cy="695" data-r="50">${D1 ? '' : `
    <ellipse cx="255" cy="695" rx="38" ry="18" fill="#BFBFDC"/>
    <ellipse cx="255" cy="691" rx="30" ry="12" fill="#ADADCF"/>`}
  </g>

  <!-- 달 돌멩이 -->
  <!-- ★차이10(L2): 달 돌멩이 — B에서는 사라짐 -->
  <g data-diff="10" data-level="2" data-cx="390" data-cy="720" data-r="40">${D2 ? '' : '<ellipse cx="390" cy="720" rx="22" ry="13" fill="#C3C3DE"/>'}
  </g>
  <!-- ★차이14(L3): 달 돌멩이 — B에서는 사라짐 -->
  <g data-diff="14" data-level="3" data-cx="700" data-cy="704" data-r="40">${D3 ? '' : '<ellipse cx="700" cy="704" rx="18" ry="11" fill="#C3C3DE"/>'}
  </g>

  <!-- 숨은그림: 망원경 (달 표면 왼쪽) -->
  <g data-find="telescope" data-label="망원경">
    <line x1="150" y1="666" x2="126" y2="742" stroke="#7A6FB8" stroke-width="7" stroke-linecap="round"/>
    <line x1="150" y1="666" x2="174" y2="742" stroke="#7A6FB8" stroke-width="7" stroke-linecap="round"/>
    <line x1="150" y1="666" x2="150" y2="746" stroke="#7A6FB8" stroke-width="7" stroke-linecap="round"/>
    <line x1="152" y1="664" x2="152" y2="636" stroke="#7A6FB8" stroke-width="8" stroke-linecap="round"/>
    <line x1="116" y1="656" x2="192" y2="606" stroke="#F2A33C" stroke-width="22" stroke-linecap="round"/>
    <line x1="128" y1="649" x2="180" y2="614" stroke="#FFD07A" stroke-width="9" stroke-linecap="round"/>
    <circle cx="194" cy="604" r="9" fill="#9BDCF8"/>
  </g>

  <!-- 숨은그림 L2: 우주 강아지 (달 표면 왼쪽 아래, 달색 보호색) -->
  <g data-find="spacedog" data-label="우주 강아지" data-level="2">
    <path d="M56 730 Q50 716 62 719 L67 728 Z" fill="#A8A5C8"/>
    <path d="M94 730 Q100 716 88 719 L83 728 Z" fill="#A8A5C8"/>
    <circle cx="75" cy="742" r="14" fill="#C0BEDC"/>
    <circle cx="70" cy="739" r="2.6" fill="#4A4668"/><circle cx="80" cy="739" r="2.6" fill="#4A4668"/>
    <ellipse cx="75" cy="746" rx="4" ry="3" fill="#4A4668"/>
    <circle cx="75" cy="742" r="18" fill="none" stroke="#EAE7F8" stroke-width="3"/>
    <ellipse cx="76" cy="764" rx="15" ry="8" fill="#C0BEDC"/>
    <path d="M90 761 Q99 755 97 747" stroke="#A8A5C8" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 발자국 (달 먼지색 보호색) -->
  <g data-find="footprint" data-label="발자국" data-level="3">
    <ellipse cx="290" cy="751" rx="7" ry="11" transform="rotate(-14 290 751)" fill="#B2B0D0"/>
    <ellipse cx="310" cy="762" rx="7" ry="11" transform="rotate(-14 310 762)" fill="#B2B0D0"/>
    <line x1="286" y1="747" x2="293" y2="749" stroke="#9E9CC2" stroke-width="2"/>
    <line x1="285" y1="752" x2="292" y2="754" stroke="#9E9CC2" stroke-width="2"/>
    <line x1="306" y1="758" x2="313" y2="760" stroke="#9E9CC2" stroke-width="2"/>
  </g>

  <!-- 숨은그림 L3: 나사못 (로켓 옆에 떨어진 은색 나사, 달색 보호색) -->
  <g data-find="screw" data-label="나사못" data-level="3">
    <circle cx="400" cy="657" r="7" fill="#B9B6D8" stroke="#9D9AC4" stroke-width="2"/>
    <line x1="396" y1="654" x2="404" y2="660" stroke="#8B88B4" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M407 655 L424 661 L422 668 L406 662 Z" fill="#B9B6D8"/>
    <line x1="411" y1="656" x2="410" y2="663" stroke="#9D9AC4" stroke-width="2"/>
    <line x1="416" y1="658" x2="415" y2="665" stroke="#9D9AC4" stroke-width="2"/>
  </g>

  <!-- 숨은그림 L2: 달토끼 (하얀 토끼, 달색 보호색) -->
  <g data-find="moonrabbit" data-label="달토끼" data-level="2">
    <ellipse cx="594" cy="668" rx="4" ry="11" transform="rotate(-10 594 668)" fill="#EFEDF9"/>
    <ellipse cx="606" cy="668" rx="4" ry="11" transform="rotate(10 606 668)" fill="#EFEDF9"/>
    <ellipse cx="594" cy="668" rx="1.8" ry="7" transform="rotate(-10 594 668)" fill="#E3B8CC"/>
    <ellipse cx="606" cy="668" rx="1.8" ry="7" transform="rotate(10 606 668)" fill="#E3B8CC"/>
    <circle cx="600" cy="688" r="11" fill="#EFEDF9"/>
    <circle cx="596" cy="686" r="2.2" fill="#6B6690"/><circle cx="604" cy="686" r="2.2" fill="#6B6690"/>
    <ellipse cx="600" cy="691" rx="2.2" ry="1.6" fill="#E3A8C0"/>
    <ellipse cx="600" cy="703" rx="13" ry="8" fill="#EFEDF9"/>
  </g>

  <!-- 숨은그림 L3: 꼬마 안테나 (크레이터 옆 작은 접시, 달색 보호색) -->
  <g data-find="antenna" data-label="꼬마 안테나" data-level="3">
    <line x1="663" y1="758" x2="663" y2="772" stroke="#8E8CB8" stroke-width="3" stroke-linecap="round"/>
    <path d="M650 752 Q662 741 675 750 Q671 762 656 760 Z" fill="#B5B3D6"/>
    <line x1="663" y1="751" x2="671" y2="741" stroke="#8E8CB8" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="672" cy="740" r="2.5" fill="#FF8A7A"/>
  </g>

  <!-- 숨은그림 L3: 보석 (크레이터 속, 크레이터색과 비슷한 연보라) -->
  <g data-find="gem" data-label="보석" data-level="3">
    <path d="M782 727 L790 719 L798 727 L790 739 Z" fill="#C9A0DE"/>
    <path d="M786 726 L790 722 L794 726" stroke="#E6CFF4" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 무전기 (달 표면, 어스름한 보라 보호색) -->
  <g data-find="radio" data-label="무전기" data-level="2">
    <line x1="776" y1="648" x2="782" y2="632" stroke="#6E6898" stroke-width="3" stroke-linecap="round"/>
    <rect x="758" y="646" width="22" height="30" rx="5" fill="#8E88B8"/>
    <rect x="762" y="652" width="14" height="8" rx="2" fill="#6E6898"/>
    <circle cx="765" cy="668" r="2.5" fill="#FFD93D"/><circle cx="773" cy="668" r="2.5" fill="#FF8A7A"/>
  </g>

  <!-- 숨은그림 L2: 크리스탈 (크레이터 위에서 솟은 얼음빛 수정) -->
  <g data-find="crystal" data-label="크리스탈" data-level="2">
    <path d="M976 702 L971 684 L980 672 L985 690 Z" fill="#B9C8EE"/>
    <path d="M986 702 L991 678 L1000 692 L996 702 Z" fill="#9FB0E0"/>
    <line x1="978" y1="692" x2="981" y2="682" stroke="#E2E9FB" stroke-width="2" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 치즈 조각 (달 크레이터 옆, 연한 달색과 비슷한 치즈색) -->
  <g data-find="cheese" data-label="치즈 조각" data-level="3">
    <path d="M1108 724 L1127 700 L1142 724 Z" fill="#E6DEAE"/>
    <circle cx="1121" cy="716" r="3" fill="#C9C08E"/><circle cx="1131" cy="719" r="2.2" fill="#C9C08E"/>
  </g>

  <!-- 큰 로켓 (달에 착륙) -->
  <g>
    <path d="M424 495 Q376 535 386 598 L424 572 Z" fill="#FF8A7A"/>
    <path d="M536 495 Q584 535 574 598 L536 572 Z" fill="#FF8A7A"/>
    <polygon points="456,580 504,580 518,612 442,612" fill="#B9B3D9"/>
    <path d="M424 350 Q424 255 480 238 Q536 255 536 350 L536 558 Q536 580 514 580 L446 580 Q424 580 424 558 Z" fill="#FFF6EE"/>
    <path d="M424 350 Q424 255 480 238 Q536 255 536 350 Z" fill="#FF8A7A"/>
    <rect x="424" y="506" width="112" height="24" fill="#FF8A7A"/>
    <circle cx="480" cy="425" r="36" fill="#FF8A7A"/>
    <!-- ★차이2(L1): 로켓 창문 색 (하늘색 → 노랑) -->
    <g data-diff="2" data-cx="480" data-cy="425" data-r="58">
      <circle cx="480" cy="425" r="26" fill="${D1 ? '#FFD93D' : '#9BDCF8'}"/>
      <path d="M466 414 Q472 406 482 407" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>
    <circle cx="436" cy="622" r="18" fill="#FFFFFF" opacity="0.9"/>
    <circle cx="464" cy="634" r="22" fill="#FFFFFF" opacity="0.9"/>
    <circle cx="500" cy="632" r="20" fill="#FFFFFF" opacity="0.9"/>
    <!-- ★차이9(L2): 연기 구름 하나 — B에서는 사라짐 -->
    <g data-diff="9" data-level="2" data-cx="526" data-cy="620" data-r="40">${D2 ? '' : '<circle cx="526" cy="620" r="15" fill="#FFFFFF" opacity="0.9"/>'}
    </g>
  </g>

  <!-- 우주인 -->
  <g>
    <rect x="824" y="562" width="24" height="52" rx="10" fill="#C9C4E8"/>
    <path d="M842 600 Q818 616 826 638" stroke="#FFFFFF" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M894 600 Q918 616 910 638" stroke="#FFFFFF" stroke-width="14" fill="none" stroke-linecap="round"/>
    <ellipse cx="868" cy="618" rx="32" ry="38" fill="#FFFFFF" stroke="#CFC9E6" stroke-width="5"/>
    <rect x="848" y="646" width="16" height="40" rx="8" fill="#FFFFFF" stroke="#CFC9E6" stroke-width="4"/>
    <rect x="872" y="646" width="16" height="40" rx="8" fill="#FFFFFF" stroke="#CFC9E6" stroke-width="4"/>
    <!-- ★차이17(L3): 왼쪽 신발 색 (민트 → 살구) -->
    <g data-diff="17" data-level="3" data-cx="855" data-cy="689" data-r="40">
      <rect x="842" y="682" width="26" height="14" rx="7" fill="${D3 ? '#FF8A7A' : '#7BE0C8'}"/>
    </g>
    <rect x="870" y="682" width="26" height="14" rx="7" fill="#7BE0C8"/>
    <!-- ★차이11(L2): 가슴 패널 색 (민트 → 노랑) -->
    <g data-diff="11" data-level="2" data-cx="868" data-cy="615" data-r="40">
      <rect x="856" y="606" width="24" height="18" rx="5" fill="${D2 ? '#FFB84D' : '#7BE0C8'}"/>
    </g>
    <circle cx="862" cy="615" r="3" fill="#FF8A7A"/><circle cx="874" cy="615" r="3" fill="#FFD93D"/>
    <circle cx="868" cy="552" r="30" fill="#FFFFFF" stroke="#CFC9E6" stroke-width="5"/>
    <ellipse cx="870" cy="554" rx="20" ry="17" fill="#9BDCF8"/>
    <circle cx="863" cy="551" r="3.5" fill="#2E4E6E"/><circle cx="877" cy="551" r="3.5" fill="#2E4E6E"/>
    <path d="M863 561 Q870 566 877 561" stroke="#2E4E6E" stroke-width="3" fill="none" stroke-linecap="round"/>
    <line x1="848" y1="530" x2="840" y2="514" stroke="#CFC9E6" stroke-width="4" stroke-linecap="round"/>
    <!-- ★차이12(L3): 안테나 공 색 (살구 → 노랑) -->
    <g data-diff="12" data-level="3" data-cx="839" data-cy="511" data-r="40">
      <circle cx="839" cy="511" r="5" fill="${D3 ? '#FFD93D' : '#FF8A7A'}"/>
    </g>
  </g>

  <!-- 깃발 -->
  <g>
    <line x1="944" y1="692" x2="944" y2="558" stroke="#E8E4F5" stroke-width="6" stroke-linecap="round"/>
    <path d="M947 560 L1004 560 Q1013 573 1004 586 L947 586 Z" fill="#FF8A7A"/>
    <!-- ★차이8(L2): 깃발 동그라미 색 (크림 → 노랑) -->
    <g data-diff="8" data-level="2" data-cx="974" data-cy="573" data-r="42">
      <circle cx="974" cy="573" r="8" fill="${D2 ? '#FFD93D' : '#FFF6EE'}"/>
    </g>
  </g>

  <!-- 숨은그림: 로봇 (달 표면 오른쪽) -->
  <g data-find="robot" data-label="로봇">
    <line x1="1080" y1="592" x2="1080" y2="578" stroke="#5F8FB0" stroke-width="4" stroke-linecap="round"/>
    <circle cx="1080" cy="574" r="6" fill="#FF8A7A"/>
    <rect x="1056" y="592" width="48" height="36" rx="8" fill="#9BDCF8"/>
    <circle cx="1071" cy="608" r="4.5" fill="#2E4E6E"/><circle cx="1089" cy="608" r="4.5" fill="#2E4E6E"/>
    <path d="M1071 618 Q1080 623 1089 618" stroke="#2E4E6E" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="1050" y="632" width="60" height="46" rx="10" fill="#7BC8E8"/>
    <circle cx="1080" cy="655" r="12" fill="#FFD93D"/>
    <line x1="1050" y1="644" x2="1032" y2="662" stroke="#7BC8E8" stroke-width="10" stroke-linecap="round"/>
    <line x1="1110" y1="644" x2="1128" y2="662" stroke="#7BC8E8" stroke-width="10" stroke-linecap="round"/>
    <rect x="1058" y="678" width="14" height="20" rx="6" fill="#5F8FB0"/>
    <rect x="1088" y="678" width="14" height="20" rx="6" fill="#5F8FB0"/>
  </g>
</svg>`;
  },

  hidden: [
    /* ── L1: 쉬움 (6) ── */
    {
      id: 'alien', label: '외계인',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="22" y1="18" x2="16" y2="7" stroke="#7CC940" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="38" y1="18" x2="44" y2="7" stroke="#7CC940" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="15" cy="6" r="4" fill="#FF8FC7"/><circle cx="45" cy="6" r="4" fill="#FFD93D"/>
        <ellipse cx="30" cy="35" rx="19" ry="20" fill="#A8E86B"/>
        <circle cx="23" cy="33" r="4" fill="#2E5E1E"/><circle cx="37" cy="33" r="4" fill="#2E5E1E"/>
        <path d="M23 43 Q30 49 37 43" stroke="#2E5E1E" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'satellite', label: '인공위성',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="24" width="14" height="12" rx="3" fill="#FFB84D"/>
        <line x1="7" y1="24" x2="7" y2="36" stroke="#E8933C" stroke-width="2"/><line x1="11" y1="24" x2="11" y2="36" stroke="#E8933C" stroke-width="2"/>
        <rect x="44" y="24" width="14" height="12" rx="3" fill="#FFB84D"/>
        <line x1="49" y1="24" x2="49" y2="36" stroke="#E8933C" stroke-width="2"/><line x1="53" y1="24" x2="53" y2="36" stroke="#E8933C" stroke-width="2"/>
        <rect x="19" y="18" width="22" height="24" rx="5" fill="#E3E8F5"/>
        <circle cx="30" cy="30" r="6" fill="#7BC8E8"/>
        <line x1="30" y1="18" x2="30" y2="8" stroke="#B9B3D9" stroke-width="3"/>
        <circle cx="30" cy="6" r="3.5" fill="#FF8A7A"/></svg>`
    },
    {
      id: 'robot', label: '로봇',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="30" y1="9" x2="30" y2="4" stroke="#5F8FB0" stroke-width="3" stroke-linecap="round"/>
        <circle cx="30" cy="4" r="3" fill="#FF8A7A"/>
        <rect x="17" y="9" width="26" height="18" rx="5" fill="#9BDCF8"/>
        <circle cx="25" cy="17" r="3" fill="#2E4E6E"/><circle cx="35" cy="17" r="3" fill="#2E4E6E"/>
        <path d="M25 22 Q30 25 35 22" stroke="#2E4E6E" stroke-width="2" fill="none" stroke-linecap="round"/>
        <rect x="14" y="29" width="32" height="22" rx="6" fill="#7BC8E8"/>
        <circle cx="30" cy="40" r="6" fill="#FFD93D"/>
        <line x1="14" y1="34" x2="6" y2="42" stroke="#7BC8E8" stroke-width="5" stroke-linecap="round"/>
        <line x1="46" y1="34" x2="54" y2="42" stroke="#7BC8E8" stroke-width="5" stroke-linecap="round"/>
        <rect x="19" y="51" width="8" height="8" rx="3" fill="#5F8FB0"/>
        <rect x="33" y="51" width="8" height="8" rx="3" fill="#5F8FB0"/></svg>`
    },
    {
      id: 'comet', label: '혜성',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M28 30 L56 6 L36 40 Z" fill="#9BDCF8" opacity="0.85"/>
        <line x1="30" y1="44" x2="48" y2="30" stroke="#C6ECFB" stroke-width="4" stroke-linecap="round"/>
        <circle cx="22" cy="38" r="13" fill="#C6ECFB"/>
        <circle cx="20" cy="36" r="8" fill="#FFFFFF"/></svg>`
    },
    {
      id: 'telescope', label: '망원경',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="28" y1="30" x2="28" y2="40" stroke="#7A6FB8" stroke-width="4" stroke-linecap="round"/>
        <line x1="28" y1="40" x2="17" y2="56" stroke="#7A6FB8" stroke-width="4" stroke-linecap="round"/>
        <line x1="28" y1="40" x2="39" y2="56" stroke="#7A6FB8" stroke-width="4" stroke-linecap="round"/>
        <line x1="12" y1="36" x2="46" y2="12" stroke="#F2A33C" stroke-width="12" stroke-linecap="round"/>
        <line x1="18" y1="33" x2="40" y2="17" stroke="#FFD07A" stroke-width="5" stroke-linecap="round"/>
        <circle cx="47" cy="11" r="5" fill="#9BDCF8"/></svg>`
    },
    {
      id: 'star', label: '노란별',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <polygon points="30,6 37,23 55,24 41,35 45,53 30,43 15,53 19,35 5,24 23,23" fill="#FFD93D" stroke="#E8A800" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="25" cy="30" r="2.5" fill="#B07A00"/><circle cx="35" cy="30" r="2.5" fill="#B07A00"/>
        <path d="M25 37 Q30 41 35 37" stroke="#B07A00" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`
    },
    /* ── L2: 보통 (7) ── */
    {
      id: 'spacedog', label: '우주 강아지', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 22 Q4 8 16 11 L21 20 Z" fill="#A8A5C8"/>
        <path d="M50 22 Q56 8 44 11 L39 20 Z" fill="#A8A5C8"/>
        <circle cx="30" cy="32" r="14" fill="#C0BEDC"/>
        <circle cx="25" cy="29" r="2.6" fill="#4A4668"/><circle cx="35" cy="29" r="2.6" fill="#4A4668"/>
        <ellipse cx="30" cy="36" rx="4" ry="3" fill="#4A4668"/>
        <circle cx="30" cy="32" r="18" fill="none" stroke="#8F88C0" stroke-width="3"/>
        <ellipse cx="31" cy="54" rx="15" ry="6" fill="#C0BEDC"/></svg>`
    },
    {
      id: 'ufo', label: '미니 UFO', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 30 Q30 8 48 30 Z" fill="#9A93D4"/>
        <ellipse cx="30" cy="36" rx="27" ry="10" fill="#7B74BE"/>
        <circle cx="15" cy="36" r="3" fill="#FFD93D"/><circle cx="30" cy="39" r="3" fill="#FF8FC7"/><circle cx="45" cy="36" r="3" fill="#FFD93D"/></svg>`
    },
    {
      id: 'station', label: '우주 정거장', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="30" y1="20" x2="30" y2="10" stroke="#8B85BC" stroke-width="3" stroke-linecap="round"/>
        <circle cx="30" cy="8" r="3" fill="#FF8A7A"/>
        <rect x="2" y="26" width="16" height="14" rx="2" fill="#6E67AC"/>
        <line x1="7" y1="26" x2="7" y2="40" stroke="#5A5494" stroke-width="2"/><line x1="12" y1="26" x2="12" y2="40" stroke="#5A5494" stroke-width="2"/>
        <rect x="42" y="26" width="16" height="14" rx="2" fill="#6E67AC"/>
        <line x1="47" y1="26" x2="47" y2="40" stroke="#5A5494" stroke-width="2"/><line x1="52" y1="26" x2="52" y2="40" stroke="#5A5494" stroke-width="2"/>
        <rect x="18" y="21" width="24" height="24" rx="6" fill="#A9A4CE"/>
        <circle cx="30" cy="33" r="6" fill="#7BC8E8"/></svg>`
    },
    {
      id: 'moonrabbit', label: '달토끼', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="14" rx="5" ry="12" transform="rotate(-10 24 14)" fill="#EFEDF9"/>
        <ellipse cx="36" cy="14" rx="5" ry="12" transform="rotate(10 36 14)" fill="#EFEDF9"/>
        <ellipse cx="24" cy="14" rx="2.2" ry="8" transform="rotate(-10 24 14)" fill="#E3B8CC"/>
        <ellipse cx="36" cy="14" rx="2.2" ry="8" transform="rotate(10 36 14)" fill="#E3B8CC"/>
        <circle cx="30" cy="34" r="13" fill="#EFEDF9"/>
        <circle cx="25" cy="32" r="2.5" fill="#6B6690"/><circle cx="35" cy="32" r="2.5" fill="#6B6690"/>
        <ellipse cx="30" cy="37" rx="2.5" ry="2" fill="#E3A8C0"/>
        <ellipse cx="30" cy="51" rx="15" ry="8" fill="#EFEDF9"/></svg>`
    },
    {
      id: 'radio', label: '무전기', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="40" y1="14" x2="47" y2="3" stroke="#6E6898" stroke-width="4" stroke-linecap="round"/>
        <rect x="17" y="12" width="26" height="40" rx="6" fill="#8E88B8"/>
        <rect x="22" y="19" width="16" height="10" rx="2" fill="#6E6898"/>
        <circle cx="25" cy="40" r="3.5" fill="#FFD93D"/><circle cx="35" cy="40" r="3.5" fill="#FF8A7A"/></svg>`
    },
    {
      id: 'crystal', label: '크리스탈', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 54 L8 26 L22 8 L28 36 Z" fill="#B9C8EE"/>
        <path d="M30 54 L38 16 L52 38 L46 54 Z" fill="#9FB0E0"/>
        <line x1="17" y1="40" x2="21" y2="24" stroke="#E2E9FB" stroke-width="3" stroke-linecap="round"/></svg>`
    },
    {
      id: 'galaxy', label: '은하', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 6 Q56 12 55 32 Q53 54 30 54 Q9 54 7 34 Q7 17 25 17 Q40 17 39 31 Q39 42 29 42" fill="none" stroke="#847DC2" stroke-width="7" stroke-linecap="round"/>
        <circle cx="29" cy="30" r="6" fill="#C9C4EE"/></svg>`
    },
    /* ── L3: 어려움 (8) ── */
    {
      id: 'meteor', label: '작은 운석', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="14" y1="18" x2="3" y2="10" stroke="#8E86C8" stroke-width="4" stroke-linecap="round"/>
        <path d="M18 34 Q14 14 34 12 Q54 10 55 30 Q55 50 34 52 Q17 51 18 34 Z" fill="#736CB2"/>
        <circle cx="30" cy="27" r="5" fill="#5A5399"/><circle cx="43" cy="40" r="4" fill="#5A5399"/></svg>`
    },
    {
      id: 'constellation', label: '별자리', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="12" y1="40" x2="34" y2="14" stroke="#8F88C0" stroke-width="3"/>
        <line x1="34" y1="14" x2="48" y2="46" stroke="#8F88C0" stroke-width="3"/>
        <path d="M12 32 L15 37 L20 40 L15 43 L12 48 L9 43 L4 40 L9 37 Z" fill="#FFFFFF" stroke="#8F88C0" stroke-width="2" stroke-linejoin="round"/>
        <path d="M34 6 L37 11 L42 14 L37 17 L34 22 L31 17 L26 14 L31 11 Z" fill="#FFFFFF" stroke="#8F88C0" stroke-width="2" stroke-linejoin="round"/>
        <path d="M48 38 L51 43 L56 46 L51 49 L48 54 L45 49 L40 46 L45 43 Z" fill="#FFFFFF" stroke="#8F88C0" stroke-width="2" stroke-linejoin="round"/></svg>`
    },
    {
      id: 'screw', label: '나사못', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="24" r="12" fill="#B9B6D8" stroke="#9D9AC4" stroke-width="3"/>
        <line x1="9" y1="19" x2="23" y2="29" stroke="#8B88B4" stroke-width="4" stroke-linecap="round"/>
        <path d="M27 21 L56 32 L52 44 L25 33 Z" fill="#B9B6D8"/>
        <line x1="35" y1="24" x2="33" y2="36" stroke="#9D9AC4" stroke-width="3"/>
        <line x1="44" y1="27" x2="42" y2="39" stroke="#9D9AC4" stroke-width="3"/></svg>`
    },
    {
      id: 'footprint', label: '발자국', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="20" cy="22" rx="10" ry="16" transform="rotate(-14 20 22)" fill="#B2B0D0"/>
        <ellipse cx="42" cy="40" rx="10" ry="16" transform="rotate(-14 42 40)" fill="#B2B0D0"/>
        <line x1="14" y1="16" x2="25" y2="19" stroke="#9E9CC2" stroke-width="3"/>
        <line x1="13" y1="23" x2="24" y2="26" stroke="#9E9CC2" stroke-width="3"/>
        <line x1="36" y1="35" x2="47" y2="38" stroke="#9E9CC2" stroke-width="3"/></svg>`
    },
    {
      id: 'cheese', label: '치즈 조각', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 48 L32 12 L54 48 Z" fill="#E6DEAE"/>
        <circle cx="26" cy="38" r="4.5" fill="#C9C08E"/><circle cx="40" cy="42" r="3.5" fill="#C9C08E"/>
        <circle cx="33" cy="27" r="3" fill="#C9C08E"/></svg>`
    },
    {
      id: 'antenna', label: '꼬마 안테나', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <line x1="28" y1="38" x2="28" y2="56" stroke="#8E8CB8" stroke-width="4" stroke-linecap="round"/>
        <path d="M10 30 Q28 14 48 27 Q42 45 20 42 Z" fill="#B5B3D6"/>
        <line x1="29" y1="28" x2="41" y2="13" stroke="#8E8CB8" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="43" cy="11" r="4" fill="#FF8A7A"/></svg>`
    },
    {
      id: 'iceshard', label: '얼음 조각', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 46 L54 12 L34 52 Z" fill="#8FB8D8"/>
        <circle cx="14" cy="43" r="8" fill="#BFDCEE"/></svg>`
    },
    {
      id: 'gem', label: '보석', level: 3,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 26 L30 6 L50 26 L30 54 Z" fill="#C9A0DE"/>
        <path d="M20 24 L30 14 L40 24" stroke="#E6CFF4" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`
    }
  ],

  sticker: {
    name: '로켓 스티커',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="#EFEAFF" stroke="#8F7BE8" stroke-width="7"/>
      <path d="M45 68 Q32 78 34 94 L45 86 Z" fill="#FF8A7A"/>
      <path d="M75 68 Q88 78 86 94 L75 86 Z" fill="#FF8A7A"/>
      <path d="M45 46 Q45 24 60 18 Q75 24 75 46 L75 80 Q75 86 69 86 L51 86 Q45 86 45 80 Z" fill="#FFF6EE"/>
      <path d="M45 46 Q45 24 60 18 Q75 24 75 46 Z" fill="#FF8A7A"/>
      <circle cx="60" cy="56" r="12" fill="#FF8A7A"/>
      <circle cx="60" cy="56" r="8" fill="#9BDCF8"/>
      <path d="M53 88 Q60 106 67 88 Z" fill="#FFD93D"/>
      <path d="M23 40 L26 46 L32 48 L26 50 L23 56 L20 50 L14 48 L20 46 Z" fill="#FFD93D"/>
      <path d="M96 62 L99 68 L105 70 L99 72 L96 78 L93 72 L87 70 L93 68 Z" fill="#FFD93D"/>
      <circle cx="30" cy="76" r="3" fill="#8F7BE8"/><circle cx="92" cy="36" r="3" fill="#8F7BE8"/></svg>`
  }
});
