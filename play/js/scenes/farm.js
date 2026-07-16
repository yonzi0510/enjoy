/* 테마: 농장 — 레퍼런스 씬 (난이도 3레벨) · 그림책풍 리뉴얼
 * 계약:
 *  - buildScene('A'|'B', 1|2|3) → viewBox="0 0 1200 800" SVG 문자열
 *  - 숨은그림: L1 6개·L2 7개·L3 8개 = 총 21개. 모든 레벨 대상을 항상 그린다(하위 레벨에선 장식)
 *    <g data-find="id" data-label="이름" data-level="2">  (data-level 없으면 1)
 *    크기: L1 40~90px, L2 28~55px(보호색·부분 가림), L3 20~40px(강한 보호색)
 *  - 다른그림: L1 5개(id 1~5)·L2 6개(id 6~11)·L3 7개(id 12~18). 마커 그룹은 항상 출력하되
 *    내용 차이는 해당 레벨의 B에서만 적용: const D1=!A&&L===1 … fill="${D1?'바뀐색':'원래색'}"
 *    <g data-diff="6" data-level="2" data-cx=".." data-cy=".." data-r=".."> (속성 순서 고정, L1은 data-level 생략)
 *  - defs/그라디언트/url(#…) 금지 — 단색 fill만. 백틱 금지(템플릿 리터럴 내부)
 *  - 명암·입체감은 검정/흰색 반투명 도형을 겹쳐 표현한다 (원경 언덕·풍차 → 중경 헛간·나무 → 근경 동물·텃밭)
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
  <!-- ═══ 하늘: 위는 짙고 아래로 갈수록 밝아지는 층층 하늘 ═══ -->
  <rect x="0" y="0" width="1200" height="580" fill="#8ED4F5"/>
  <rect x="0" y="150" width="1200" height="430" fill="#FFFFFF" opacity="0.12"/>
  <rect x="0" y="300" width="1200" height="280" fill="#FFFFFF" opacity="0.16"/>
  <rect x="0" y="430" width="1200" height="150" fill="#FFF3C9" opacity="0.4"/>

  <!-- 해: 빛무리 + 웃는 얼굴 + 볼터치 -->
  <g>
    <circle cx="1080" cy="100" r="84" fill="#FFEFAF" opacity="0.4"/>
    <circle cx="1080" cy="100" r="70" fill="#FFE47A" opacity="0.5"/>
    <g stroke="#FFD93D" stroke-width="10" stroke-linecap="round">
      <line x1="1080" y1="10" x2="1080" y2="30"/><line x1="1080" y1="170" x2="1080" y2="190"/>
      <line x1="990" y1="100" x2="1010" y2="100"/><line x1="1150" y1="100" x2="1170" y2="100"/>
      <line x1="1016" y1="36" x2="1030" y2="50"/><line x1="1130" y1="150" x2="1144" y2="164"/>
      <line x1="1144" y1="36" x2="1130" y2="50"/><line x1="1030" y1="150" x2="1016" y2="164"/>
    </g>
    <circle cx="1080" cy="100" r="58" fill="#FFD93D"/>
    <circle cx="1064" cy="84" r="28" fill="#FFFFFF" opacity="0.28"/>
    <circle cx="1062" cy="92" r="7" fill="#E8A800"/><circle cx="1098" cy="92" r="7" fill="#E8A800"/>
    <circle cx="1064.5" cy="89.5" r="2.4" fill="#FFFFFF"/><circle cx="1100.5" cy="89.5" r="2.4" fill="#FFFFFF"/>
    <ellipse cx="1046" cy="110" rx="9" ry="6" fill="#F9AE54" opacity="0.75"/>
    <ellipse cx="1114" cy="110" rx="9" ry="6" fill="#F9AE54" opacity="0.75"/>
    <!-- ★차이16(L3): 해 입 모양 (웃는 입 → 동그란 입) -->
    <g data-diff="16" data-level="3" data-cx="1080" data-cy="122" data-r="45">${D3
      ? '<circle cx="1080" cy="120" r="9" fill="#E8A800"/>'
      : '<path d="M1062 118 Q1080 132 1098 118" stroke="#E8A800" stroke-width="6" fill="none" stroke-linecap="round"/>'}
    </g>
  </g>

  <!-- 구름 1 (고정, 폭신한 두 톤) -->
  <g>
    <ellipse cx="255" cy="134" rx="60" ry="15" fill="#C6E5F6"/>
    <g fill="#FFFFFF" opacity="0.97">
      <circle cx="210" cy="115" r="34"/><circle cx="255" cy="98" r="44"/><circle cx="302" cy="118" r="32"/>
      <rect x="196" y="106" width="118" height="42" rx="21"/>
    </g>
    <circle cx="238" cy="90" r="15" fill="#FFFFFF"/>
  </g>

  <!-- 작은 구름들 + 저 멀리 나는 새들 (원경 장식) -->
  <g fill="#FFFFFF" opacity="0.9">
    <circle cx="420" cy="66" r="18"/><circle cx="446" cy="58" r="24"/><circle cx="472" cy="68" r="16"/>
    <rect x="414" y="60" width="64" height="22" rx="11"/>
  </g>
  <g fill="#FFFFFF" opacity="0.85">
    <circle cx="880" cy="56" r="14"/><circle cx="901" cy="50" r="18"/><circle cx="922" cy="58" r="12"/>
    <rect x="874" y="52" width="60" height="18" rx="9"/>
  </g>
  <g fill="#FFFFFF" opacity="0.8">
    <circle cx="90" cy="212" r="12"/><circle cx="108" cy="206" r="15"/><circle cx="126" cy="213" r="10"/>
    <rect x="84" y="208" width="52" height="15" rx="7.5"/>
  </g>
  <g stroke="#5B7E96" stroke-width="4" fill="none" stroke-linecap="round">
    <path d="M700 186 q9 -9 18 0 q9 -9 18 0"/>
    <path d="M756 206 q7 -7 14 0 q7 -7 14 0"/>
    <path d="M148 262 q7 -7 14 0 q7 -7 14 0"/>
  </g>

  <!-- ★차이3(L1): 구름 2 — B에서는 사라짐 -->
  <g data-diff="3" data-cx="620" data-cy="95" data-r="85">${D1 ? '' : `
    <g>
      <ellipse cx="622" cy="114" rx="50" ry="12" fill="#C6E5F6"/>
      <g fill="#FFFFFF" opacity="0.96">
        <circle cx="580" cy="98" r="30"/><circle cx="622" cy="82" r="38"/><circle cx="664" cy="100" r="28"/>
        <rect x="570" y="92" width="104" height="36" rx="18"/>
      </g>
      <circle cx="606" cy="76" r="13" fill="#FFFFFF"/>
    </g>`}
  </g>

  <!-- ═══ 원경: 옅은 언덕 + 꼬마 나무 + 풍차 ═══ -->
  <g>
    <path d="M-80 470 Q80 380 250 470 Z" fill="#CBE9B5"/>
    <path d="M330 470 Q520 376 715 470 Z" fill="#C3E5AC"/>
    <path d="M960 470 Q1120 396 1280 470 Z" fill="#CBE9B5"/>
    <rect x="74" y="410" width="8" height="26" rx="3" fill="#B08968"/>
    <circle cx="78" cy="402" r="14" fill="#A5D693"/>
    <rect x="448" y="412" width="8" height="26" rx="3" fill="#B08968"/>
    <circle cx="452" cy="402" r="16" fill="#98CF85"/>
    <g>
      <path d="M596 470 L613 370 L643 370 L660 470 Z" fill="#F7F0E1"/>
      <path d="M628 370 L643 370 L660 470 L628 470 Z" fill="#000000" opacity="0.06"/>
      <polygon points="604,374 652,374 628,340" fill="#E8574B"/>
      <circle cx="628" cy="402" r="7" fill="#7BC8E8" stroke="#C9BBA0" stroke-width="3"/>
      <g stroke="#C9BBA0" stroke-width="6" stroke-linecap="round">
        <line x1="628" y1="358" x2="600" y2="330"/><line x1="628" y1="358" x2="656" y2="330"/>
        <line x1="628" y1="358" x2="600" y2="386"/><line x1="628" y1="358" x2="656" y2="386"/>
      </g>
      <circle cx="628" cy="358" r="6" fill="#B08968"/>
    </g>
  </g>

  <!-- ═══ 중경·근경 언덕 (능선 하이라이트 + 근경 짙은 풀 띠) ═══ -->
  <path d="M0 470 Q250 340 520 450 Q820 340 1200 455 L1200 800 L0 800 Z" fill="#A9DC8C"/>
  <path d="M0 470 Q250 340 520 450 Q820 340 1200 455" stroke="#C8EAAC" stroke-width="9" fill="none"/>
  <path d="M0 560 Q400 500 800 565 Q1010 595 1200 555 L1200 800 L0 800 Z" fill="#8BCF6B"/>
  <path d="M0 560 Q400 500 800 565 Q1010 595 1200 555" stroke="#A6DE87" stroke-width="8" fill="none"/>
  <path d="M0 706 Q300 682 600 706 Q900 730 1200 700 L1200 800 L0 800 Z" fill="#7CC258" opacity="0.5"/>

  <!-- 들판 장식: 풀포기·돌멩이·데이지·튤립 -->
  <g>
    ${[[92, 606], [200, 628], [440, 596], [736, 596], [1064, 592], [1120, 630], [432, 782], [648, 788], [100, 795]].map(([x, y]) => `
    <path d="M${x} ${y} q-7 -18 -16 -22 M${x} ${y} q0 -20 2 -25 M${x} ${y} q7 -18 16 -22" stroke="#76BE55" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}
    ${[[418, 752, 13, 8], [724, 764, 11, 7], [176, 782, 10, 6], [1044, 624, 12, 7], [60, 616, 9, 6]].map(([x, y, rx, ry]) => `
    <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#B7BFAF"/>
    <ellipse cx="${x - 4}" cy="${y - 3}" rx="${Math.round(rx * 0.45)}" ry="${Math.round(ry * 0.45)}" fill="#FFFFFF" opacity="0.4"/>`).join('')}
    ${[[104, 778], [748, 742], [218, 608]].map(([x, y]) => `
    <g>
      <circle cx="${x - 7}" cy="${y}" r="5" fill="#FFFFFF"/><circle cx="${x + 7}" cy="${y}" r="5" fill="#FFFFFF"/>
      <circle cx="${x}" cy="${y - 7}" r="5" fill="#FFFFFF"/><circle cx="${x}" cy="${y + 7}" r="5" fill="#FFFFFF"/>
      <circle cx="${x}" cy="${y}" r="4.5" fill="#FFD93D"/>
    </g>`).join('')}
    <g>
      <line x1="80" y1="562" x2="80" y2="598" stroke="#4DA644" stroke-width="5" stroke-linecap="round"/>
      <path d="M80 588 Q66 584 62 570" stroke="#4DA644" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M68 550 Q68 536 76 542 L80 534 L84 542 Q92 536 92 550 Q92 564 80 564 Q68 564 68 550 Z" fill="#FF8A66"/>
    </g>
    <g>
      <line x1="782" y1="726" x2="782" y2="758" stroke="#4DA644" stroke-width="5" stroke-linecap="round"/>
      <path d="M782 750 Q794 746 798 734" stroke="#4DA644" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M771 716 Q771 703 778 709 L782 701 L786 709 Q793 703 793 716 Q793 728 782 728 Q771 728 771 716 Z" fill="#B98AE0"/>
    </g>
  </g>

  <!-- ═══ 헛간: 널판 무늬 + 명암 + 바람개비 풍향계 ═══ -->
  <g>
    <ellipse cx="252" cy="570" rx="165" ry="13" fill="#000000" opacity="0.08"/>
    <rect x="110" y="380" width="280" height="185" fill="#E8574B"/>
    <g stroke="#D14B3F" stroke-width="3" opacity="0.55">
      <line x1="145" y1="384" x2="145" y2="562"/><line x1="180" y1="384" x2="180" y2="562"/>
      <line x1="215" y1="384" x2="215" y2="562"/><line x1="285" y1="384" x2="285" y2="562"/>
      <line x1="320" y1="384" x2="320" y2="562"/><line x1="355" y1="384" x2="355" y2="562"/>
    </g>
    <g fill="#8E2F26" opacity="0.7">
      <circle cx="145" cy="392" r="2"/><circle cx="180" cy="392" r="2"/><circle cx="215" cy="392" r="2"/>
      <circle cx="285" cy="392" r="2"/><circle cx="320" cy="392" r="2"/><circle cx="355" cy="392" r="2"/>
    </g>
    <circle cx="135" cy="505" r="4" fill="#B03A2E" opacity="0.8"/>
    <circle cx="188" cy="438" r="4" fill="#B03A2E" opacity="0.8"/>
    <circle cx="338" cy="410" r="3.5" fill="#B03A2E" opacity="0.8"/>
    <rect x="110" y="380" width="280" height="16" fill="#000000" opacity="0.1"/>
    <rect x="110" y="380" width="280" height="185" fill="none" stroke="#C74437" stroke-width="6"/>
    <!-- ★차이1(L1): 지붕 색 (빨강 → 파랑) -->
    <g data-diff="1" data-cx="250" data-cy="335" data-r="95">
      <polygon points="85,380 250,275 415,380" fill="${D1 ? '#3F6FB5' : '#A93F35'}"/>
      <polygon points="85,380 250,275 415,380" fill="none" stroke="${D1 ? '#2F5590' : '#8E2F26'}" stroke-width="6" stroke-linejoin="round"/>
    </g>
    <path d="M128 366 L242 292" stroke="#FFFFFF" stroke-width="7" opacity="0.22" stroke-linecap="round"/>
    <path d="M258 292 L372 366" stroke="#000000" stroke-width="7" opacity="0.1" stroke-linecap="round"/>
    <g>
      <line x1="250" y1="250" x2="250" y2="274" stroke="#6E4522" stroke-width="5"/>
      <line x1="232" y1="256" x2="268" y2="256" stroke="#6E4522" stroke-width="4"/>
      <polygon points="268,250 280,256 268,262" fill="#6E4522"/>
      <circle cx="250" cy="246" r="5" fill="#E8574B"/>
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
    <rect x="222" y="451" width="56" height="9" rx="4" fill="#C74437"/>
    <rect x="208" y="472" width="84" height="93" rx="8" fill="#7A4A2B"/>
    <rect x="214" y="478" width="72" height="81" rx="6" fill="none" stroke="#5E3820" stroke-width="3" opacity="0.7"/>
    <!-- ★차이15(L3): 문 X자 → 대각선 하나 -->
    <g data-diff="15" data-level="3" data-cx="250" data-cy="518" data-r="50">
      <line x1="208" y1="472" x2="292" y2="565" stroke="#5E3820" stroke-width="5"/>
      ${D3 ? '' : '<line x1="292" y1="472" x2="208" y2="565" stroke="#5E3820" stroke-width="5"/>'}
    </g>
    <circle cx="284" cy="520" r="4.5" fill="#E8C05A"/>
    <rect x="198" y="563" width="104" height="10" rx="5" fill="#9C6B3F"/>
    <path d="M128 574 q-6 -16 -14 -20 M128 574 q0 -18 2 -22 M128 574 q6 -16 14 -20" stroke="#76BE55" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M368 572 q-6 -16 -14 -20 M368 572 q0 -18 2 -22 M368 572 q6 -16 14 -20" stroke="#76BE55" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L3: 단추 (헛간 벽, 빨강 보호색) -->
  <g data-find="button" data-label="단추" data-level="3">
    <circle cx="165" cy="470" r="12" fill="#C7362B" stroke="#A32A20" stroke-width="3"/>
    <circle cx="161" cy="466" r="2" fill="#7E1F17"/><circle cx="169" cy="466" r="2" fill="#7E1F17"/>
    <circle cx="161" cy="474" r="2" fill="#7E1F17"/><circle cx="169" cy="474" r="2" fill="#7E1F17"/>
  </g>

  <!-- 텃밭 하트 팻말 (헛간 옆) -->
  <g>
    <rect x="76" y="598" width="10" height="46" rx="4" fill="#A9743F"/>
    <rect x="54" y="584" width="54" height="28" rx="6" fill="#C68B4F" stroke="#8A5A2E" stroke-width="3"/>
    <path d="M81 594 C77 588 70 591 73 597 C75 601 81 606 81 606 C81 606 87 601 89 597 C92 591 85 588 81 594 Z" fill="#E8574B"/>
  </g>

  <!-- 숨은그림 L2: 생쥐 (헛간 아래 구석) -->
  <g data-find="mouse" data-label="생쥐" data-level="2">
    <ellipse cx="140" cy="592" rx="20" ry="14" fill="#B8B2C4"/>
    <circle cx="124" cy="584" r="8" fill="#B8B2C4"/>
    <circle cx="120" cy="580" r="4.5" fill="#D8CFE0"/>
    <circle cx="122" cy="586" r="1.8" fill="#3B3B3B"/>
    <path d="M158 594 Q174 590 172 578" stroke="#9C93AC" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 물뿌리개에서 떨어지는 물방울 (장식) -->
  <circle cx="396" cy="524" r="3" fill="#7BC8E8"/>
  <circle cx="390" cy="536" r="2.5" fill="#7BC8E8"/>

  <!-- 숨은그림 L1: 물뿌리개 (헛간 옆) -->
  <g data-find="can" data-label="물뿌리개">
    <path d="M432 522 Q430 508 444 508 L482 508 Q496 508 494 522 L490 560 Q489 570 478 570 L448 570 Q437 570 436 560 Z" fill="#4FA8A0"/>
    <path d="M436 518 L408 500 L404 512 L434 530 Z" fill="#4FA8A0"/>
    <circle cx="404" cy="506" r="9" fill="#3D8781"/>
    <path d="M492 520 Q512 528 508 550" stroke="#3D8781" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="463" cy="512" rx="22" ry="6" fill="#3D8781"/>
    <ellipse cx="450" cy="538" rx="5" ry="15" fill="#FFFFFF" opacity="0.3"/>
  </g>

  <!-- 울타리: 나뭇결 + 기둥 머리 + 덩굴 -->
  <g>
    <g fill="#C68B4F" stroke="#A96F35" stroke-width="4">
      <rect x="462" y="470" width="18" height="90" rx="6"/>
      <rect x="560" y="470" width="18" height="90" rx="6"/>
      <rect x="658" y="470" width="18" height="90" rx="6"/>
      <rect x="756" y="470" width="18" height="90" rx="6"/>
      <rect x="450" y="488" width="340" height="16" rx="8"/>
      <rect x="450" y="528" width="340" height="16" rx="8"/>
    </g>
    <g stroke="#B67A40" stroke-width="3" stroke-linecap="round" opacity="0.8">
      <line x1="492" y1="495" x2="530" y2="495"/><line x1="606" y1="496" x2="642" y2="496"/>
      <line x1="700" y1="535" x2="736" y2="535"/><line x1="500" y1="536" x2="532" y2="536"/>
    </g>
    <ellipse cx="471" cy="470" rx="10" ry="4" fill="#B67A40"/>
    <ellipse cx="569" cy="470" rx="10" ry="4" fill="#B67A40"/>
    <ellipse cx="765" cy="470" rx="10" ry="4" fill="#B67A40"/>
    <path d="M566 560 Q580 530 566 505 Q556 488 568 472" stroke="#5FA84E" stroke-width="4" fill="none"/>
    <ellipse cx="576" cy="524" rx="6" ry="4" transform="rotate(-30 576 524)" fill="#6DBF5A"/>
    <ellipse cx="560" cy="498" rx="6" ry="4" transform="rotate(30 560 498)" fill="#6DBF5A"/>
    <circle cx="570" cy="482" r="4" fill="#FFB0D8"/>
  </g>

  <!-- 숨은그림 L1: 밀짚모자 (울타리 기둥 위) -->
  <g data-find="hat" data-label="밀짚모자">
    <ellipse cx="667" cy="462" rx="42" ry="12" fill="#E8C05A"/>
    <path d="M645 462 Q645 434 667 434 Q689 434 689 462 Z" fill="#F2D178"/>
    <path d="M645 456 Q667 464 689 456" stroke="#C99B3A" stroke-width="6" fill="none"/>
    <path d="M651 446 Q659 438 669 437" stroke="#FFFFFF" stroke-width="4" fill="none" opacity="0.4" stroke-linecap="round"/>
  </g>

  <!-- 건초더미: 결·명암·삐죽 지푸라기 -->
  <g>
    <ellipse cx="830" cy="576" rx="76" ry="10" fill="#000000" opacity="0.1"/>
    <path d="M760 560 Q760 480 830 478 Q902 480 902 560 Q902 576 830 576 Q760 576 760 560 Z" fill="#E8C05A"/>
    <path d="M772 520 Q780 492 806 484" stroke="#FFFFFF" stroke-width="7" fill="none" opacity="0.3" stroke-linecap="round"/>
    <g stroke="#D9A93C" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9">
      <path d="M796 500 q10 -4 20 0"/><path d="M844 494 q10 -4 20 2"/>
      <path d="M786 566 q8 -5 16 -2"/><path d="M856 562 q8 -5 16 -2"/>
    </g>
    <g stroke="#C99B3A" stroke-width="3" stroke-linecap="round">
      <line x1="806" y1="480" x2="800" y2="466"/><line x1="826" y1="478" x2="828" y2="463"/>
      <line x1="848" y1="481" x2="856" y2="468"/>
    </g>
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
  <g stroke="#EFC97E" stroke-width="3" fill="none" stroke-linecap="round">
    <path d="M814 566 q14 4 30 6"/><path d="M822 574 q10 2 20 2"/>
  </g>

  <!-- 숨은그림 L2: 양동이 (건초더미 옆, 짚색 보호색) -->
  <g data-find="bucket" data-label="양동이" data-level="2">
    <path d="M906 540 L942 540 L936 574 L912 574 Z" fill="#D9A94F" stroke="#B8863A" stroke-width="3"/>
    <path d="M908 540 Q924 522 940 540" stroke="#B8863A" stroke-width="4" fill="none"/>
    <ellipse cx="924" cy="540" rx="18" ry="5" fill="#EFC97E"/>
    <line x1="914" y1="548" x2="912" y2="566" stroke="#EFC97E" stroke-width="3" opacity="0.8"/>
  </g>

  <!-- 숨은그림 L1: 강아지 (건초더미 뒤에서 빼꼼, 울타리에 앞발) -->
  <g data-find="dog" data-label="강아지">
    <path d="M726 470 Q718 440 736 444 L744 458 Z" fill="#8A5A2E"/>
    <path d="M772 468 Q784 440 766 442 L756 456 Z" fill="#8A5A2E"/>
    <circle cx="748" cy="482" r="30" fill="#A9743F"/>
    <circle cx="738" cy="476" r="5.5" fill="#3B2A18"/><circle cx="760" cy="476" r="5.5" fill="#3B2A18"/>
    <circle cx="736.5" cy="474.5" r="1.8" fill="#FFFFFF"/><circle cx="758.5" cy="474.5" r="1.8" fill="#FFFFFF"/>
    <ellipse cx="731" cy="490" rx="4.5" ry="3" fill="#C98850" opacity="0.8"/>
    <ellipse cx="765" cy="490" rx="4.5" ry="3" fill="#C98850" opacity="0.8"/>
    <ellipse cx="749" cy="492" rx="8" ry="6" fill="#3B2A18"/>
    <path d="M741 500 Q749 506 757 500" stroke="#3B2A18" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="734" cy="496" rx="7" ry="5" fill="#A9743F"/>
    <ellipse cx="762" cy="496" rx="7" ry="5" fill="#A9743F"/>
  </g>

  <!-- 숨은그림 L2: 개구리 (건초더미 아래 풀밭, 초록 보호색) -->
  <g data-find="frog" data-label="개구리" data-level="2">
    <ellipse cx="790" cy="622" rx="22" ry="15" fill="#6DBF5A"/>
    <circle cx="780" cy="608" r="7" fill="#6DBF5A"/><circle cx="800" cy="608" r="7" fill="#6DBF5A"/>
    <circle cx="780" cy="607" r="3" fill="#2F4F2A"/><circle cx="800" cy="607" r="3" fill="#2F4F2A"/>
    <circle cx="779" cy="606" r="1.2" fill="#FFFFFF"/><circle cx="799" cy="606" r="1.2" fill="#FFFFFF"/>
    <ellipse cx="774" cy="617" rx="2.5" ry="2" fill="#F9AE54" opacity="0.6"/>
    <ellipse cx="806" cy="617" rx="2.5" ry="2" fill="#F9AE54" opacity="0.6"/>
    <path d="M782 624 Q790 630 798 624" stroke="#2F4F2A" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <path d="M770 640 q-4 -14 -10 -18 M770 640 q2 -14 5 -18" stroke="#76BE55" stroke-width="4" fill="none" stroke-linecap="round"/>

  <!-- ═══ 젖소: 눈가 얼룩·뿔·볼터치·발굽·그림자 ═══ -->
  <ellipse cx="595" cy="716" rx="118" ry="14" fill="#000000" opacity="0.09"/>
  <g>
    <ellipse cx="595" cy="625" rx="108" ry="66" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="5"/>
    <ellipse cx="595" cy="668" rx="82" ry="17" fill="#000000" opacity="0.05"/>
    <!-- ★차이4(L1): 젖소 무늬 색 (검정 → 갈색) -->
    <g data-diff="4" data-cx="575" data-cy="615" data-r="80">
      <path d="M540 590 Q568 578 580 600 Q588 622 560 630 Q532 626 540 590 Z" fill="${D1 ? '#C4763B' : '#3B3B3B'}"/>
      <path d="M615 636 Q642 626 652 648 Q650 668 624 666 Q604 658 615 636 Z" fill="${D1 ? '#C4763B' : '#3B3B3B'}"/>
    </g>
    <rect x="522" y="668" width="22" height="52" rx="10" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="4"/>
    <rect x="572" y="676" width="22" height="48" rx="10" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="4"/>
    <rect x="626" y="676" width="22" height="48" rx="10" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="4"/>
    <rect x="524" y="708" width="18" height="10" rx="5" fill="#9C8F7E"/>
    <rect x="574" y="712" width="18" height="10" rx="5" fill="#9C8F7E"/>
    <rect x="628" y="712" width="18" height="10" rx="5" fill="#9C8F7E"/>
    <path d="M492 610 Q462 616 466 646" stroke="#D8D3C8" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="466" cy="650" r="10" fill="#3B3B3B"/>
    <path d="M676 534 Q672 518 682 514 Q686 526 684 534 Z" fill="#E8C989"/>
    <path d="M714 534 Q718 518 708 514 Q704 526 706 534 Z" fill="#E8C989"/>
    <circle cx="694" cy="574" r="44" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="5"/>
    <ellipse cx="710" cy="558" rx="14" ry="12" fill="#C9C2B2"/>
    <!-- ★차이12(L3): 왼쪽 귀 안 색 (크림 → 분홍) -->
    <g data-diff="12" data-level="3" data-cx="664" data-cy="540" data-r="40">
      <path d="M658 548 Q642 532 660 528 L672 542 Z" fill="${D3 ? '#F5B8C4' : '#E8DFD2'}"/>
    </g>
    <path d="M730 548 Q746 532 728 528 L716 542 Z" fill="#E8DFD2"/>
    <circle cx="682" cy="566" r="6" fill="#3B3B3B"/><circle cx="708" cy="566" r="6" fill="#3B3B3B"/>
    <circle cx="680" cy="564" r="2" fill="#FFFFFF"/><circle cx="706" cy="564" r="2" fill="#FFFFFF"/>
    <ellipse cx="664" cy="588" rx="7" ry="5" fill="#F5B8C4" opacity="0.85"/>
    <ellipse cx="724" cy="588" rx="7" ry="5" fill="#F5B8C4" opacity="0.85"/>
    <ellipse cx="695" cy="594" rx="24" ry="15" fill="#F5B8C4"/>
    <circle cx="687" cy="592" r="4" fill="#D98B9C"/><circle cx="703" cy="592" r="4" fill="#D98B9C"/>
    <path d="M685 611 Q695 617 705 611" stroke="#D98B9C" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- ═══ 사과나무: 잎 3톤 + 반짝임 + 뿌리·나무결 ═══ -->
  <g>
    <ellipse cx="961" cy="494" rx="64" ry="10" fill="#000000" opacity="0.08"/>
    <rect x="938" y="330" width="46" height="160" rx="16" fill="#8B5A2B"/>
    <path d="M932 490 Q924 470 936 462 L942 490 Z" fill="#8B5A2B"/>
    <path d="M990 490 Q998 470 986 462 L980 490 Z" fill="#8B5A2B"/>
    <g stroke="#6E4522" stroke-width="3" stroke-linecap="round" opacity="0.6">
      <line x1="952" y1="392" x2="950" y2="444"/><line x1="968" y1="368" x2="970" y2="420"/>
    </g>
    <circle cx="905" cy="300" r="62" fill="#4E9640"/>
    <circle cx="975" cy="262" r="72" fill="#4E9640"/>
    <circle cx="1030" cy="315" r="58" fill="#4E9640"/>
    <circle cx="960" cy="340" r="52" fill="#4E9640"/>
    <circle cx="905" cy="290" r="62" fill="#5FA84E"/>
    <circle cx="975" cy="250" r="72" fill="#6BB55A"/>
    <circle cx="1030" cy="305" r="58" fill="#5FA84E"/>
    <circle cx="960" cy="330" r="52" fill="#6BB55A"/>
    <circle cx="882" cy="264" r="24" fill="#7CC46A"/>
    <circle cx="956" cy="222" r="28" fill="#7CC46A"/>
    <circle cx="1005" cy="270" r="20" fill="#7CC46A"/>
    <circle cx="946" cy="308" r="18" fill="#7CC46A"/>
    <g fill="#FFFFFF" opacity="0.25">
      <circle cx="890" cy="246" r="6"/><circle cx="994" cy="210" r="7"/>
      <circle cx="1054" cy="330" r="6"/><circle cx="930" cy="290" r="5"/>
    </g>
    <!-- ★차이7(L2): 왼쪽 사과 색 (빨강 → 노랑) -->
    <g data-diff="7" data-level="2" data-cx="912" data-cy="268" data-r="50">
      <circle cx="912" cy="268" r="14" fill="${D2 ? '#FFD93D' : '#E8574B'}"/>
      <path d="M912 254 Q916 246 924 247" stroke="#5E3820" stroke-width="4" fill="none"/>
      <circle cx="907" cy="263" r="4" fill="#FFFFFF" opacity="0.55"/>
    </g>
    <circle cx="1022" cy="330" r="14" fill="#E8574B"/>
    <path d="M1022 316 Q1026 308 1034 309" stroke="#5E3820" stroke-width="4" fill="none"/>
    <circle cx="1017" cy="325" r="4" fill="#FFFFFF" opacity="0.55"/>
    <!-- ★차이2(L1): 사과 하나 — B에서는 사라짐 -->
    <g data-diff="2" data-cx="988" data-cy="248" data-r="60">${D1 ? '' : `
      <circle cx="988" cy="248" r="15" fill="#E8574B"/>
      <path d="M988 234 Q992 224 1000 226" stroke="#5E3820" stroke-width="4" fill="none"/>
      <circle cx="983" cy="243" r="4.5" fill="#FFFFFF" opacity="0.55"/>`}
    </g>
    <ellipse cx="1138" cy="522" rx="12" ry="4" fill="#000000" opacity="0.08"/>
    <circle cx="1138" cy="512" r="11" fill="#E8574B"/>
    <path d="M1138 501 Q1141 495 1147 496" stroke="#5E3820" stroke-width="3.5" fill="none"/>
    <circle cx="1134" cy="508" r="3" fill="#FFFFFF" opacity="0.55"/>
    <path d="M930 498 q-5 -14 -12 -18 M930 498 q1 -15 3 -18" stroke="#76BE55" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <path d="M994 500 q5 -14 12 -18 M994 500 q-1 -15 -3 -18" stroke="#76BE55" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 파랑새 (나뭇잎 사이) -->
  <g data-find="bird" data-label="파랑새" data-level="2">
    <ellipse cx="1035" cy="288" rx="17" ry="13" fill="#5FA8E8"/>
    <circle cx="1049" cy="278" r="9" fill="#5FA8E8"/>
    <circle cx="1052" cy="276" r="2.5" fill="#2A3B5E"/>
    <circle cx="1051.2" cy="275.2" r="0.9" fill="#FFFFFF"/>
    <polygon points="1057,279 1066,282 1057,285" fill="#F2A33C"/>
    <path d="M1026 286 Q1018 280 1022 292 Z" fill="#3F84C4"/>
  </g>

  <!-- 숨은그림 L1: 나비 (나무 옆) -->
  <g data-find="butterfly" data-label="나비">
    <ellipse cx="856" cy="212" rx="13" ry="20" transform="rotate(-28 856 212)" fill="#FF8FC7"/>
    <ellipse cx="884" cy="212" rx="13" ry="20" transform="rotate(28 884 212)" fill="#FFB0D8"/>
    <circle cx="853" cy="206" r="3" fill="#FFFFFF" opacity="0.6"/>
    <circle cx="887" cy="206" r="3" fill="#FFFFFF" opacity="0.6"/>
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
  <path d="M1090 556 q-5 -16 -12 -20 M1090 556 q1 -16 3 -20 M1090 556 q6 -15 13 -19" stroke="#76BE55" stroke-width="4.5" fill="none" stroke-linecap="round"/>

  <!-- ═══ 연못: 모래 물가 + 깊은 물 + 수련잎 + 부들 ═══ -->
  <g>
    <ellipse cx="1010" cy="728" rx="178" ry="58" fill="#DFCB9B"/>
    <ellipse cx="1010" cy="726" rx="168" ry="54" fill="#7BC8E8"/>
    <ellipse cx="1010" cy="730" rx="144" ry="42" fill="#5FB2D9"/>
    <ellipse cx="1010" cy="726" rx="168" ry="54" fill="none" stroke="#5FA8CC" stroke-width="5"/>
    <!-- ★차이14(L3): 물결 2개 → 1개 -->
    <g data-diff="14" data-level="3" data-cx="1060" data-cy="736" data-r="55">
      <path d="M930 726 Q960 716 990 726" stroke="#A8DFF2" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${D3 ? '' : '<path d="M1030 738 Q1060 728 1090 738" stroke="#A8DFF2" stroke-width="6" fill="none" stroke-linecap="round"/>'}
    </g>
    <g fill="#FFFFFF" opacity="0.5">
      <ellipse cx="960" cy="748" rx="8" ry="3"/><ellipse cx="1085" cy="718" rx="7" ry="2.5"/>
      <ellipse cx="1005" cy="762" rx="7" ry="2.5"/>
    </g>
    <ellipse cx="920" cy="752" rx="21" ry="11" fill="#5FB44A"/>
    <polygon points="920,752 941,746 941,758" fill="#5FB2D9"/>
    <path d="M906 748 Q918 742 932 746" stroke="#7CC46A" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g>
      <circle cx="916" cy="740" r="4.5" fill="#FFB0D8"/><circle cx="924" cy="740" r="4.5" fill="#FFB0D8"/>
      <circle cx="920" cy="735" r="4.5" fill="#FFB0D8"/><circle cx="920" cy="740" r="3" fill="#FFD93D"/>
    </g>
    <ellipse cx="1088" cy="704" rx="17" ry="9" fill="#5FB44A"/>
    <polygon points="1088,704 1105,699 1105,709" fill="#5FB2D9"/>
    <g>
      <line x1="1146" y1="738" x2="1152" y2="668" stroke="#4E8C40" stroke-width="4" stroke-linecap="round"/>
      <rect x="1146" y="650" width="12" height="30" rx="6" fill="#8A5A2E"/>
      <line x1="1152" y1="650" x2="1152" y2="638" stroke="#4E8C40" stroke-width="3" stroke-linecap="round"/>
      <line x1="1170" y1="742" x2="1166" y2="688" stroke="#4E8C40" stroke-width="4" stroke-linecap="round"/>
      <rect x="1160" y="666" width="11" height="26" rx="5.5" fill="#9C6B3F"/>
      <path d="M1136 742 Q1128 700 1132 676" stroke="#5FA84E" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
  </g>

  <!-- ═══ 돼지: 진흙 웅덩이 + 볼터치 + 등 하이라이트 ═══ -->
  <g>
    <ellipse cx="882" cy="698" rx="82" ry="15" fill="#C08A57"/>
    <ellipse cx="882" cy="700" rx="60" ry="10" fill="#A9744A" opacity="0.8"/>
    <circle cx="820" cy="694" r="4" fill="#A9744A"/><circle cx="948" cy="692" r="3.5" fill="#A9744A"/>
    <ellipse cx="880" cy="648" rx="66" ry="45" fill="#F7A8B8"/>
    <ellipse cx="862" cy="618" rx="30" ry="10" fill="#FFFFFF" opacity="0.3"/>
    <ellipse cx="918" cy="668" rx="11" ry="7" fill="#C08A57" opacity="0.7"/>
    <!-- ★차이13(L3): 왼쪽 귀 색 (진분홍 → 노랑) -->
    <g data-diff="13" data-level="3" data-cx="844" data-cy="608" data-r="40">
      <path d="M836 618 Q826 600 844 602 L852 614 Z" fill="${D3 ? '#F2C63C' : '#E88CA0'}"/>
    </g>
    <path d="M906 610 Q912 592 926 600 L918 614 Z" fill="#E88CA0"/>
    <circle cx="856" cy="632" r="6" fill="#5E3844"/><circle cx="892" cy="628" r="6" fill="#5E3844"/>
    <circle cx="854" cy="630" r="2" fill="#FFFFFF"/><circle cx="890" cy="626" r="2" fill="#FFFFFF"/>
    <ellipse cx="846" cy="648" rx="6" ry="4" fill="#EE7F9B" opacity="0.6"/>
    <ellipse cx="904" cy="644" rx="6" ry="4" fill="#EE7F9B" opacity="0.6"/>
    <ellipse cx="874" cy="650" rx="17" ry="12" fill="#E88CA0"/>
    <circle cx="868" cy="650" r="3.5" fill="#B85E74"/><circle cx="880" cy="650" r="3.5" fill="#B85E74"/>
    <path d="M862 668 Q874 676 886 668" stroke="#B85E74" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <rect x="842" y="680" width="16" height="22" rx="7" fill="#F7A8B8"/>
    <rect x="898" y="680" width="16" height="22" rx="7" fill="#F7A8B8"/>
    <path d="M944 640 Q960 632 954 648 Q948 660 958 656" stroke="#E88CA0" stroke-width="7" fill="none" stroke-linecap="round"/>
  </g>

  <!-- ═══ 텃밭: 흙 알갱이 + 새싹 + 상추 ═══ -->
  <g>
    <rect x="60" y="640" width="310" height="122" rx="20" fill="#9C6B3F"/>
    <rect x="60" y="640" width="310" height="122" rx="20" fill="none" stroke="#7E5430" stroke-width="6"/>
    <line x1="86" y1="682" x2="344" y2="682" stroke="#7E5430" stroke-width="6" stroke-linecap="round"/>
    <line x1="86" y1="722" x2="344" y2="722" stroke="#7E5430" stroke-width="6" stroke-linecap="round"/>
    <g fill="#6E4A28" opacity="0.55">
      <circle cx="100" cy="656" r="2.5"/><circle cx="160" cy="654" r="2.5"/><circle cx="250" cy="656" r="2.5"/>
      <circle cx="330" cy="654" r="2.5"/><circle cx="130" cy="696" r="2.5"/><circle cx="210" cy="694" r="2.5"/>
      <circle cx="290" cy="698" r="2.5"/><circle cx="350" cy="742" r="2.5"/><circle cx="120" cy="758" r="2.5"/>
    </g>
    <g fill="#5FA84E">
      <path d="M110 668 q6 -18 12 0 z"/><path d="M200 668 q6 -18 12 0 z"/><path d="M300 668 q6 -18 12 0 z"/>
      <path d="M96 708 q6 -18 12 0 z"/><path d="M180 708 q6 -18 12 0 z"/><path d="M340 668 q6 -18 12 0 z"/>
    </g>
    <!-- ★차이10(L2): 새싹 하나 — B에서는 사라짐 -->
    <g data-diff="10" data-level="2" data-cx="262" data-cy="700" data-r="45">${D2 ? '' : '<path d="M256 708 q6 -18 12 0 z" fill="#5FA84E"/>'}
    </g>
    <g>
      <circle cx="112" cy="742" r="13" fill="#7CC258"/>
      <path d="M101 736 Q112 728 123 736" stroke="#5FA84E" stroke-width="3" fill="none"/>
      <circle cx="112" cy="744" r="8" fill="#9BDB77"/>
      <circle cx="290" cy="752" r="11" fill="#7CC258"/>
      <path d="M281 747 Q290 740 299 747" stroke="#5FA84E" stroke-width="3" fill="none"/>
      <circle cx="290" cy="754" r="7" fill="#9BDB77"/>
    </g>
  </g>

  <!-- 숨은그림 L2: 호박 (텃밭 흙 위) -->
  <g data-find="pumpkin" data-label="호박" data-level="2">
    <ellipse cx="330" cy="702" rx="21" ry="16" fill="#E8853C"/>
    <path d="M322 688 Q322 716 322 716 M338 688 Q338 716 338 716" stroke="#C46A28" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M330 686 Q328 676 336 674" stroke="#5E8C3A" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="322" cy="695" rx="3" ry="5" fill="#FFFFFF" opacity="0.35"/>
  </g>

  <!-- 숨은그림 L3: 지렁이 (텃밭 흙, 흙색 보호색) -->
  <g data-find="worm" data-label="지렁이" data-level="3">
    <path d="M222 734 Q232 724 242 734 Q252 744 262 734" stroke="#C88A6A" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="220" cy="733" r="2" fill="#5E3820"/>
  </g>
  <circle cx="252" cy="742" r="4" fill="#B98455"/>
  <circle cx="216" cy="726" r="3" fill="#B98455"/>

  <!-- 숨은그림 L1: 당근 (텃밭 이랑 사이) -->
  <g data-find="carrot" data-label="당근">
    <path d="M158 700 L172 748 L186 700 Z" fill="#F28C28"/>
    <path d="M162 706 L182 706 M166 720 L178 720" stroke="#D9731A" stroke-width="4" stroke-linecap="round"/>
    <path d="M164 700 Q158 682 148 680 M172 700 Q172 680 172 676 M180 700 Q186 682 196 680" stroke="#4DA644" stroke-width="6" fill="none" stroke-linecap="round"/>
  </g>

  <!-- ═══ 닭: 날개·볼터치·턱볏 + 그림자 ═══ -->
  <g>
    <ellipse cx="420" cy="722" rx="50" ry="8" fill="#000000" opacity="0.09"/>
    <path d="M388 664 Q368 652 372 672 Q360 668 366 684 Q378 690 392 682 Z" fill="#F2EDE2"/>
    <path d="M374 668 Q370 676 376 680" stroke="#D8CDB4" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="420" cy="676" rx="42" ry="34" fill="#FFFFFF" stroke="#E4DCC8" stroke-width="4"/>
    <path d="M404 668 Q426 660 434 676 Q430 692 410 690 Q398 680 404 668 Z" fill="#F2EDE2"/>
    <circle cx="452" cy="646" r="22" fill="#FFFFFF" stroke="#E4DCC8" stroke-width="4"/>
    <!-- ★차이8(L2): 닭 볏 색 (빨강 → 주황) -->
    <g data-diff="8" data-level="2" data-cx="456" data-cy="620" data-r="45">
      <path d="M444 626 Q444 614 452 620 Q454 610 462 618 Q468 610 470 622 Q460 628 452 626 Z" fill="${D2 ? '#F2A33C' : '#E8574B'}"/>
    </g>
    <circle cx="470" cy="662" r="5" fill="#E8574B"/>
    <circle cx="458" cy="642" r="5" fill="#3B3B3B"/>
    <circle cx="456.5" cy="640.5" r="1.7" fill="#FFFFFF"/>
    <ellipse cx="446" cy="654" rx="4.5" ry="3" fill="#F9B7C0" opacity="0.8"/>
    <polygon points="472,646 490,652 472,658" fill="#F2A33C"/>
    <line x1="408" y1="708" x2="408" y2="726" stroke="#F2A33C" stroke-width="6" stroke-linecap="round"/>
    <line x1="432" y1="708" x2="432" y2="726" stroke="#F2A33C" stroke-width="6" stroke-linecap="round"/>
  </g>

  <!-- 숨은그림 L2: 달걀 (닭 아래 풀밭) -->
  <g data-find="egg" data-label="달걀" data-level="2">
    <ellipse cx="392" cy="726" rx="13" ry="17" fill="#FBF3E4" stroke="#E0D4BC" stroke-width="3"/>
    <ellipse cx="388" cy="719" rx="3.5" ry="5" fill="#FFFFFF" opacity="0.8"/>
  </g>
  <g stroke="#D9A94F" stroke-width="5" fill="none" stroke-linecap="round">
    <path d="M374 738 Q392 748 410 738"/>
    <path d="M378 731 Q392 739 406 731" stroke="#C99B3A" stroke-width="3.5"/>
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

  <!-- ═══ 꽃밭 ═══ -->
  <g>
    ${[[262, 758], [312, 774], [668, 762]].map(([x, y]) => `
    <g>
      <circle cx="${x - 12}" cy="${y}" r="9" fill="#FF8FC7"/><circle cx="${x + 12}" cy="${y}" r="9" fill="#FF8FC7"/>
      <circle cx="${x}" cy="${y - 12}" r="9" fill="#FF8FC7"/><circle cx="${x}" cy="${y + 12}" r="9" fill="#FF8FC7"/>
      <circle cx="${x - 9}" cy="${y - 9}" r="7" fill="#FFB0D8"/><circle cx="${x + 9}" cy="${y - 9}" r="7" fill="#FFB0D8"/>
      <circle cx="${x - 9}" cy="${y + 9}" r="7" fill="#FFB0D8"/><circle cx="${x + 9}" cy="${y + 9}" r="7" fill="#FFB0D8"/>
      <circle cx="${x}" cy="${y}" r="8" fill="#FFD93D"/>
      <circle cx="${x - 3}" cy="${y - 3}" r="2.5" fill="#FFFFFF" opacity="0.7"/>
    </g>`).join('')}
    <!-- ★차이17(L3): 작은 꽃 꽃잎 색 (진분홍 → 연분홍) -->
    <g data-diff="17" data-level="3" data-cx="566" data-cy="756" data-r="42">
      <circle cx="554" cy="756" r="9" fill="${D3 ? '#FFC9E2' : '#FF8FC7'}"/><circle cx="578" cy="756" r="9" fill="${D3 ? '#FFC9E2' : '#FF8FC7'}"/>
      <circle cx="566" cy="744" r="9" fill="${D3 ? '#FFC9E2' : '#FF8FC7'}"/><circle cx="566" cy="768" r="9" fill="${D3 ? '#FFC9E2' : '#FF8FC7'}"/>
      <circle cx="566" cy="756" r="8" fill="#FFD93D"/>
      <circle cx="563" cy="753" r="2.5" fill="#FFFFFF" opacity="0.7"/>
    </g>
    <!-- ★차이5(L1): 큰 꽃 색 (분홍 → 노랑) -->
    <g data-diff="5" data-cx="500" data-cy="738" data-r="60">
      <line x1="500" y1="742" x2="500" y2="782" stroke="#4DA644" stroke-width="7" stroke-linecap="round"/>
      <path d="M500 770 Q486 766 482 754" stroke="#4DA644" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="482" cy="738" r="13" fill="${D1 ? '#FFD93D' : '#FF8FC7'}"/><circle cx="518" cy="738" r="13" fill="${D1 ? '#FFD93D' : '#FF8FC7'}"/>
      <circle cx="500" cy="720" r="13" fill="${D1 ? '#FFD93D' : '#FF8FC7'}"/><circle cx="500" cy="756" r="13" fill="${D1 ? '#FFD93D' : '#FF8FC7'}"/>
      <circle cx="487" cy="725" r="11" fill="${D1 ? '#FFE68A' : '#FFB0D8'}"/><circle cx="513" cy="725" r="11" fill="${D1 ? '#FFE68A' : '#FFB0D8'}"/>
      <circle cx="487" cy="751" r="11" fill="${D1 ? '#FFE68A' : '#FFB0D8'}"/><circle cx="513" cy="751" r="11" fill="${D1 ? '#FFE68A' : '#FFB0D8'}"/>
      <circle cx="500" cy="738" r="11" fill="#F2A33C"/>
      <circle cx="496" cy="734" r="3" fill="#FFFFFF" opacity="0.7"/>
    </g>
  </g>

  <!-- 숨은그림 L3: 리본 (꽃밭 사이, 분홍 보호색) -->
  <g data-find="ribbon" data-label="리본" data-level="3">
    <path d="M296 748 L282 740 L282 756 Z" fill="#FF6FA8"/>
    <path d="M296 748 L310 740 L310 756 Z" fill="#FF6FA8"/>
    <circle cx="296" cy="748" r="5" fill="#E04D88"/>
  </g>

  <!-- 숨은그림 L3: 네잎클로버 (풀밭, 초록 보호색) -->
  <path d="M604 768 q-4 -14 -10 -18 M604 768 q2 -14 6 -18" stroke="#76BE55" stroke-width="4" fill="none" stroke-linecap="round"/>
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
    <circle cx="369" cy="721.8" r="1.2" fill="#FFFFFF"/>
    <ellipse cx="362" cy="731" rx="3" ry="2" fill="#F9AE54" opacity="0.8"/>
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
        <circle cx="22" cy="27" r="1.2" fill="#FFFFFF"/><circle cx="36" cy="27" r="1.2" fill="#FFFFFF"/>
        <ellipse cx="18" cy="37" rx="3.5" ry="2.5" fill="#C98850" opacity="0.8"/>
        <ellipse cx="42" cy="37" rx="3.5" ry="2.5" fill="#C98850" opacity="0.8"/>
        <ellipse cx="30" cy="38" rx="5.5" ry="4" fill="#3B2A18"/>
        <path d="M25 44 Q30 48 35 44" stroke="#3B2A18" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'chick', label: '병아리',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="27" cy="36" r="16" fill="#FFE04D"/><circle cx="38" cy="22" r="11" fill="#FFE04D"/>
        <circle cx="41" cy="20" r="2.8" fill="#3B3B3B"/><circle cx="40.2" cy="19" r="1" fill="#FFFFFF"/>
        <ellipse cx="35" cy="26" rx="2.5" ry="1.8" fill="#F9AE54" opacity="0.8"/>
        <polygon points="48,23 57,26 48,29" fill="#F2A33C"/>
        <path d="M18 36 Q11 31 14 41 Z" fill="#F2C63C"/>
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
        <path d="M16 34 Q30 40 44 34" stroke="#C99B3A" stroke-width="4" fill="none"/>
        <path d="M20 27 Q25 21 31 20" stroke="#FFFFFF" stroke-width="3" fill="none" opacity="0.45" stroke-linecap="round"/></svg>`
    },
    {
      id: 'butterfly', label: '나비',
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="19" cy="24" rx="11" ry="16" transform="rotate(-28 19 24)" fill="#FF8FC7"/>
        <ellipse cx="41" cy="24" rx="11" ry="16" transform="rotate(28 41 24)" fill="#FFB0D8"/>
        <circle cx="17" cy="19" r="2.5" fill="#FFFFFF" opacity="0.6"/><circle cx="43" cy="19" r="2.5" fill="#FFFFFF" opacity="0.6"/>
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
        <ellipse cx="34" cy="17" rx="13" ry="4" fill="#3D8781"/>
        <ellipse cx="28" cy="34" rx="3.5" ry="10" fill="#FFFFFF" opacity="0.3"/></svg>`
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
        <circle cx="19" cy="20" r="1.3" fill="#FFFFFF"/><circle cx="39" cy="20" r="1.3" fill="#FFFFFF"/>
        <ellipse cx="14" cy="34" rx="3" ry="2.2" fill="#F9AE54" opacity="0.6"/>
        <ellipse cx="46" cy="34" rx="3" ry="2.2" fill="#F9AE54" opacity="0.6"/>
        <path d="M22 42 Q30 48 38 42" stroke="#2F4F2A" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`
    },
    {
      id: 'bird', label: '파랑새', level: 2,
      icon: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="28" cy="36" rx="18" ry="14" fill="#5FA8E8"/>
        <circle cx="43" cy="24" r="10" fill="#5FA8E8"/><circle cx="46" cy="22" r="2.5" fill="#2A3B5E"/>
        <circle cx="45.2" cy="21.2" r="0.9" fill="#FFFFFF"/>
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
        <ellipse cx="30" cy="22" rx="16" ry="5" fill="#EFC97E"/>
        <line x1="22" y1="30" x2="21" y2="46" stroke="#EFC97E" stroke-width="3" opacity="0.8"/></svg>`
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
        <path d="M30 19 Q28 8 38 6" stroke="#5E8C3A" stroke-width="5" fill="none" stroke-linecap="round"/>
        <ellipse cx="21" cy="30" rx="3" ry="5" fill="#FFFFFF" opacity="0.35"/></svg>`
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
      <path d="M36 106 Q60 98 84 106" stroke="#A9DC8C" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M34 34 Q22 22 36 20 L46 30 Z" fill="#E8DFD2"/><path d="M86 34 Q98 22 84 20 L74 30 Z" fill="#E8DFD2"/>
      <path d="M48 24 Q46 14 53 13 Q55 21 54 25 Z" fill="#E8C989"/>
      <path d="M72 24 Q74 14 67 13 Q65 21 66 25 Z" fill="#E8C989"/>
      <circle cx="60" cy="58" r="32" fill="#FFFFFF" stroke="#D8D3C8" stroke-width="4"/>
      <path d="M40 42 Q52 36 54 48 Q52 58 42 54 Q36 48 40 42 Z" fill="#3B3B3B"/>
      <circle cx="50" cy="56" r="4.5" fill="#3B3B3B"/><circle cx="70" cy="56" r="4.5" fill="#3B3B3B"/>
      <circle cx="48.6" cy="54.6" r="1.6" fill="#FFFFFF"/><circle cx="68.6" cy="54.6" r="1.6" fill="#FFFFFF"/>
      <ellipse cx="38" cy="64" rx="5" ry="3.5" fill="#F5B8C4" opacity="0.9"/>
      <ellipse cx="82" cy="64" rx="5" ry="3.5" fill="#F5B8C4" opacity="0.9"/>
      <ellipse cx="60" cy="74" rx="18" ry="12" fill="#F5B8C4"/>
      <circle cx="54" cy="73" r="3" fill="#D98B9C"/><circle cx="66" cy="73" r="3" fill="#D98B9C"/>
      <path d="M54 81 Q60 85 66 81" stroke="#D98B9C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <g>
        <circle cx="22" cy="90" r="3.5" fill="#FF8FC7"/><circle cx="29" cy="90" r="3.5" fill="#FF8FC7"/>
        <circle cx="25.5" cy="85" r="3.5" fill="#FF8FC7"/><circle cx="25.5" cy="89" r="2.5" fill="#FFD93D"/>
        <circle cx="91" cy="90" r="3.5" fill="#FF8FC7"/><circle cx="98" cy="90" r="3.5" fill="#FF8FC7"/>
        <circle cx="94.5" cy="85" r="3.5" fill="#FF8FC7"/><circle cx="94.5" cy="89" r="2.5" fill="#FFD93D"/>
      </g>
      <circle cx="28" cy="32" r="3" fill="#FFFFFF" opacity="0.8"/>
      <circle cx="94" cy="40" r="2.5" fill="#FFFFFF" opacity="0.8"/></svg>`
  }
});
