# CLAUDE.md — enjoy 작업 지침

**규모 있는 작업은 에이전트 팀으로 진행한다 — 팀 구성·라운드 절차·프롬프트 요점은 `TEAM.md`를 따른다.**

> **개발 요청이 오면 바로 만들지 않는다.** 팀회의 → 기획안을 **목업(아티팩트)** 으로 부모님께 보고 →
> **승인** → 그때 제작팀 투입. 절차는 `TEAM.md`의 "0단계". 승인 전 코드 작성 금지.

5세 아이를 위한 놀이 앱 모음. GitHub Pages로 배포되는 **순수 정적 사이트**이며,
`main`에 푸시하면 자동 배포된다(`.github/workflows/pages.yml`). CI에 테스트가 없으므로
**커밋 전 로컬 검증이 유일한 안전망**이다.

## 구조

앱마다 독립 폴더 하나. 공통 뼈대: `index.html` + `css/style.css` + `js/` + `tools/`(검증·테스트) + `manifest.webmanifest` + 아이콘.

| 폴더 | 앱 | 비고 |
|---|---|---|
| `play/` | 🔍 찾기 놀이터 | 숨은그림·다른그림·글자찾기·스티커, 하루 30분 제한 |
| `english/` | 🗣️ 영어 놀이터 | 단어 사전은 `js/dict/*.js`로 분할 |
| `pixel/` | 🧩 픽셀 놀이터 | 도안은 `js/pictures/*.js`, 상세 문서 `pixel/README.md` |
| `hangul/` | 🌟 한글 놀이터 | 설계 배경은 `hangul/PLAN.md` |
| `japanese/` | 🌸 일본어 놀이터 | 한글 놀이터와 같은 구성, 획순은 KanjiVG 변환(`js/strokes.js`) |
| `practika/` | 🎙️ 프랙티카 놀이터 | 영·일·중 회화, 설계 배경은 `practika/PLAN.md` |
| `write/` | ✍️ 글씨 놀이터 | 패드+펜슬 줄노트 필사, 펜 전용 입력(`js/ink.js`) |
| `math/` | 🔢 산수 놀이터 | 숫자 따라쓰기 1~100 + 그림/숫자 덧셈·뺄셈 + 수 세기·숫자표·점 잇기·패턴 (`js/ink.js`는 write에서 복제) |
| `shape/` | 🔷 도형 놀이터 | 칠교(높은 단계만 탭 회전)·블록 퍼즐·도형 맞추기 — 드래그 스냅 퍼즐 |
| `market/` | 🛒 시장 놀이터 | 손님 주문 → 상품 담기 → 동전 지불 3단계 (돈 개념) |
| `lab/` | 🧪 색깔 실험실 | 물감 혼색 미션 12색 도감 + 자유 실험 (RYB 혼색 엔진 `js/mix.js`) |
| `bag/` | 💡 생각 놀이터 | 본보기 보고 맞추기 — 숟가락 방향(드래그+회전)·빨대 슬라이더 높이·네모 조각 회전·풍선 줄 따라 그리기 (URL은 `/bag/`) |
| `coloring/` | 🎨 색칠공부 | 밑그림 30장 — 흐린 점선 안내선을 따라 그린 뒤 색칠(물통 flood fill·크레용). 벽은 실선 마스크로 따로 계산해 점선 틈으로 색이 안 샘. 갤러리 보관 |
| `burger/` | 🍔 햄버거 가게 | 미션 카드 순서대로 재료 쌓기 — 재료 12종·미션 30개 (순서·기억) |
| `kkochi/` | 🍢 꼬치 가게 | 미션 순서대로 재료를 세로 스틱에 꿰기 — 재료 14종·미션 30개, 난이도=반복 패턴(단순→반복→긴 반복) |
| `pattern/` | 🔁 패턴 놀이터 | 반복 도형 타일 줄의 빈칸 채우기 — 타일 40종·퍼즐 30개 (1단계 끝빈칸→3단계 가운데·긴반복·2색분할). 패턴 인지 |
| `matrix/` | 🧭 방향·색 놀이터 | 색×방향 격자 맞추기 — 얼굴 삼각형 조각(색4×방향4), 퍼즐 30개(2×2→4×4). 두 속성 동시 매칭(좌표·분류) |
| `beads/` | 🔵 구슬 보드 | 카드 본보기대로 색 구슬을 격자 구멍에 채우기 — 색 6종·퍼즐 30개(3×3→5×5). 색·위치 맞추기(소근육) |
| `cups/` | 🥤 컵 쌓기 | 카드 본보기대로 색깔 컵을 피라미드로 쌓기 — 색 6종·퍼즐 30개(3→10컵), 완성 종🔔. 공간·색 패턴 |
| `tubes/` | ⚗️ 시험관 구슬 | 카드 순서대로 여러 시험관에 색 구슬을 아래→위로 담기 — 색 6종·퍼즐 30개(관 2/3/4·길이 3/4/5). 여러 줄 색 순서 |
| `connect/` | ✏️ 점 잇기 | 색 순서대로 점을 선으로 잇기 — 색 6종·퍼즐 30개(점 4/6/8), 다음 점 반짝 안내. 순서·시각추적·소근육 (math 숫자 점잇기와 별개) |
| `dice/` | 🎲 동물 주사위 | 카드 동물을 굴린 주사위들 중에서 찾아 탭 — 동물 8종·라운드 30개(주사위 6/8/9). 주의력·시각찾기 |
| `rings/` | 💍 손가락 고무줄 | 카드처럼 손 손가락에 색 고리 끼우기 — 색 6종·퍼즐 30개(단계3 겹쳐 끼우기). 색·위치 맞추기(소근육) |
| `slide/` | 🔴 네 색 슬라이드 | 색 조각을 4열로 옮겨(ball-sort) 카드처럼 색 정렬 — 색 4종·퍼즐 30개(solution 내장·풀 수 있음), 색마다 모양 다름. 분류·계획 |
| `donut/` | 🍩 도넛 짝맞추기 | 같은 무늬 도넛을 자리판 윤곽에 맞춰 놓기 — 도넛 9종·퍼즐 30개(2×2→3×3). 시각 매칭 |
| `twist/` | 🎡 돌림 블록 | 막대에 꽂힌 실린더 블록을 톡톡 돌려 본보기 카드처럼 얼굴 맞추기 — 동물·공룡·도형 테마, 퍼즐 30개(실린더 2→4개·얼굴 4~6개). 회전이 곧 유일한 조작이라 오조작 자체가 없음(원천 무벌점) |
| `tangram/` | 🌈 무지개 탱그램 | 곡선 링 조각(부채꼴)을 끌어다 그림 완성 — 지렁이·게·눈사람 등 도안 12종·퍼즐 30개(조각 2~4→4~6→6~9개, 단계3은 탭 회전 필요). 창작·도형 인지 |
| `geoboard/` | 📌 지오보드 | 못판(6×6 고정)에 색 고무줄을 걸어 카드처럼 도형 만들기 — 색 5종·퍼즐 30개(세그먼트 2~4→5~8→9~14개). 안 맞으면 안 걸릴 뿐이라 원천 무벌점 |
| `lines/` | ✏️ 선 따라 그리기 | 캐릭터에서 뻗는 점선 안내선(햇살·물결/지그재그·소용돌이)을 손가락/펜으로 따라 긋는 사전 쓰기 놀이. `write/js/ink.js` 트레이스 채점 방식을 곡선 안내선용으로 확장(경로 이탈·미완주는 무효, 실제로 따라가야 완성) |
| `color/` | (리다이렉트) | 픽셀 놀이터로 이동만 함 — 수정할 일 없음 |
| `parent/` | 🔑 부모님 페이지 | PIN 게이트 뒤에서 하루 제한·오늘 사용 시간 초기화(🔄)·앱 노출·마이크 허용을 설정하고 진행도 백업 |
| `shared/` | 공용 모듈 | 목소리 설정(`voice-settings.js`) · 부모 설정(`parent-settings.js`) · 하루 시간 제한(`time-limit.js`) · 학습 펫(`pet.js`, 다마고치식 공용 펫 — 펫 방에서 모은 펫들이 함께 지내고 간식을 조르며, 학습으로 얻는 장식 14종으로 방을 꾸민다) · 오프라인 SW 등록(`sw-register.js`, 루트 `sw.js`) |

## 기술 원칙 (절대 규칙)

- **바닐라 HTML/CSS/JS만.** 빌드 도구, npm 의존성, CDN 스크립트, 외부 API, 서버, 로그인 전부 금지.
- 그림은 **이모지·인라인 SVG·캔버스**, 소리는 **Web Speech TTS + Web Audio 합성 효과음**. 외부 이미지·오디오 파일을 받지 않는다.
- 저장은 **localStorage만** 쓴다.
- 한국어 TTS 발화 시 공용 목소리 설정을 따른다:
  `VoiceSettings.koVoice()` / `기본빠르기 * VoiceSettings.rateFactor()` (사용법은 `shared/voice-settings.js` 머리 주석 참고).

## 기존 진행도 보존 (필수)

아이가 모은 카드·완성한 도안·진행도가 코드 변경으로 날아가면 안 된다.

- localStorage **키 이름이나 데이터 형식을 바꿀 때는 반드시 이전 데이터를 읽어오는 마이그레이션 코드**를 넣는다
  (선례: `shared/voice-settings.js`가 옛 `pixel-voice` 키를 이어받는 방식).
- 사용 중인 키: `chatgi-playground-v1`·`chatgi-stickerboard-v1`·`chatgi-muted`(play),
  `english-playground-v1`, `pixel-playground-v1`·`pixel-muted`, `hangul-playground-v1`,
  `japanese-playground-v1`, `practika-playground-v1`, `write-playground-v1`, `math-playground-v1`,
  `shape-playground-v1`·`market-playground-v1`·`lab-playground-v1`·`bag-playground-v1`·`coloring-playground-v1`·`burger-playground-v1`,
  `enjoy-voice-ko`·`enjoy-rate-factor`·`enjoy-timelimit-v1`·`enjoy-parent-v1`·`enjoy-profile`(공용),
  `enjoy-pet-v1`(학습 펫 — `Profile.key()` 적용, 아이별로 각자 키움),
  `enjoy-recent-v1`(홈 "이어서 하기" — 최근 논 놀이 6개, `Profile.key()` 적용).
  (`chatgi-timelimit-v1`은 예전 play 전용 시간제한 키 — `shared/time-limit.js`가 이어받는다.)
- **아이 프로필(은아·서하)**: 진행도 키는 `shared/profile.js`의 `Profile.key()`를 거친다 —
  은아는 원래 키 그대로(예전 진행도 보존), 서하는 `p2:` 접두어(예: `p2:hangul-playground-v1`).
  음소거·목소리·시간제한·부모 설정은 기기 공용이라 접두어를 붙이지 않는다.
  새 진행도 키를 만들면 반드시 `Profile.key()`로 감싼다.
- 부모 설정(`enjoy-parent-v1`)이 콘텐츠 노출을 좌우한다: 프랙티카 홈 카드, 일본어 잠금(한글 카드 10장이면 자동 해제),
  픽셀 활동지(work*), 글씨 받아쓰기 6~7단계, 음성 인식(마이크) 허용. 새 기능도 이 원칙(기본은 5세 안전, 확장은 부모가 해제)을 따른다.
- e2e 테스트의 "새로고침 후 진행도 유지" 검사를 지우거나 약화하지 않는다.

## 5세 UX 원칙

- **폰·태블릿 우선.** 아이는 모바일로 쓴다. UI 변경 시 작은 화면(폰 세로) 기준으로 확인하고,
  기존 관행대로 `clamp()`로 크기를 반응형 처리한다.
- 터치 영역은 크게, 안내는 글자 대신 **이모지 + 소리**로. 아이는 글을 못 읽는다고 가정한다.
- 오답·실패에도 좌절시키지 않는다: 부드러운 피드백을 주고 다시 시도할 수 있게 한다.
- 상호작용에는 소리 피드백(TTS 또는 효과음)을 붙인다.

## 커밋 전 검증 (필수)

**고친 앱의 validate 스크립트와 e2e 테스트를 통과시킨 뒤에만 커밋한다.**

```sh
# 1) 데이터·계약 검증 (고친 앱만)
node english/tools/validate-dict.js
node pixel/tools/validate-picture.js      # [pictureId]로 도안 하나만도 가능
node play/tools/validate-scene.js <themeId>
node hangul/tools/validate-data.js
node japanese/tools/validate-data.js
node practika/tools/validate-data.js
node write/tools/validate-data.js
node math/tools/validate-data.js
node shape/tools/validate-data.js
node market/tools/validate-data.js
node lab/tools/validate-data.js
node bag/tools/validate-data.js
node coloring/tools/validate-data.js

# 2) e2e (저장소 루트에서 정적 서버를 띄운 뒤 실행)
python3 -m http.server 8777 &
node tools/e2e-home.mjs                   # 홈 화면 (폰·패드 × 가로·세로)
node hangul/tools/e2e.mjs                 # japanese·write·math·play·shape·market·lab도 같은 포트
BASE_URL=http://127.0.0.1:8777/practika/ node practika/tools/e2e.mjs   # 기본값은 8788 포트
PW_MODULE=/opt/node22/lib/node_modules/playwright node pixel/tools/e2e.js
```

- Playwright는 `/opt/node22/lib/node_modules/playwright`에 있다 (`playwright install` 하지 말 것).
- play 씬의 시각 검수는 `play/tools/render-scene.js`로 PNG를 뽑아 확인한다.
- 새 기능을 넣으면 해당 앱 e2e에 검사 항목을 추가한다. 콘솔 오류 0이 기본 기대치다.

## 작업 관행

- **주석·커밋 메시지·UI 문구는 모두 한국어.** 커밋 제목은 `요약 — 부연` 형태 (예: `공용 목소리 설정 — 모든 앱에서 같은 목소리·빠르기 사용`).
- 여러 앱에서 반복될 기능은 `shared/`로 뽑는다.
- 새 앱을 추가할 때: 기존 앱의 폴더 구조를 따르고, **알맞은 묶음에 등록**하고(아래 "홈 화면" 참고),
  `README.md`에 항목을 추가하며, 규모가 있으면 `PLAN.md`로 설계를 남긴다.
- 데이터(도안·사전·씬 등)를 추가·수정하면 해당 validate 스크립트가 그 계약을 검사하는지 확인하고, 필요하면 검증기도 함께 고친다.

## 홈 화면 (코드로 짜여 있다 — 새 놀이 추가 전에 읽을 것)

루트 `index.html`은 **그림 파일 없이 코드로만** 만든다. 손그림 느낌은 SVG가, 자리 배치는 CSS가 맡는다.
(2026-08 이전에는 손그림 시안 이미지 한 장을 깔았는데, 가로 화면을 못 쓰고 새 놀이를 넣으려면
그림을 다시 그려야 해서 걷어냈다.)

**묶음 6종**: 📚 배우기 · ✏️ 그리기와 쓰기 · 🔷 모양 만들기 · 🌈 색 맞추기 · 🔁 순서와 규칙 · 👀 찾기와 짝맞추기
막대를 누르면 그 자리에서 펼쳐진다(아코디언). 처음에는 배우기만 펼쳐져 있다.

**놀이를 새로 넣으려면** `index.html`의 `GROUPS` 배열에 `['이름','폴더id']` 한 줄을 더하고,
같은 파일 위쪽 `<defs>`에 `#i-<폴더id>` 아이콘을 그려 넣으면 끝이다. 여섯 묶음 어디든 똑같다.

| 무엇 | 어디에 | 만드는 법 |
|---|---|---|
| 제목 글씨 | `assets/title.svg` | `node tools/make-title.mjs` — 은아 손글씨를 보고 자모 획으로 그린다 |
| 묶음 토끼 6마리 | `assets/cat-*.svg` | `node tools/make-category-icons.mjs` |
| 낙서(무지개·해·구름·별) | `assets/doodle-*.svg` | `node tools/make-doodles.mjs` |
| 놀이 아이콘 29종 + 묶음 아이콘 6종 | `index.html` 안 `<symbol id="i-…">` | 파일에 직접 그린다 |
| 크레용 테두리 | `index.html` 안 `#crayon-frame` / `#crayon-pill` | 아래 주의사항 참고 |

- **크레용 테두리는 CSS `border`로 못 만든다.** 늘어나는 `<symbol>`에 `preserveAspectRatio="none"`,
  선에 `vector-effect="non-scaling-stroke"`를 줘서 늘여도 굵기가 그대로이게 한다.
  `border-image` 9분할은 필터 걸린 SVG의 모서리를 뭉갠다 — 쓰지 말 것.
- **테두리·칠은 `position:absolute`라 글자를 덮는다.** 안쪽 내용에 `position:relative;z-index:1`을 줘야
  글자가 위로 올라온다(`.bar>:not(.fr):not(.fill)` 규칙).
- **가로 화면**: `orientation:landscape`에서 묶음을 두 줄(폰처럼 세로가 짧으면 세 줄)로 벌려 화면을 다 쓴다.
  터치 하한 44px은 네 경우(폰·패드 × 가로·세로) 모두 지킨다.
- **한글 글꼴 파일은 못 쓴다**(2~6MB). 대신 **정해진 문구는 자모 획으로 그리면 된다** — 제목 2.6KB가 그 예다.
- 고치면 반드시 `node tools/e2e-home.mjs`를 돌린다(정적 서버 필요). 네 화면 × 각 검사 항목을 전부 잰다.
- 프랙티카는 배우기 안에 있으나 부모님이 켜야 보인다(`ParentSettings.get('showPractika')`, 기본 꺼짐).
- **놀이 이름은 한 줄로.** 칸 수를 못 박지 말고 `repeat(auto-fill,minmax(min(100%,12.6em),1fr))` 로
  글자 크기에 맞춰 칸을 나눈다. 칸 수를 3·4로 고정하면 반쪽 폭 묶음에서 이름이 두 줄로 넘어간다.
- 맨 위 "이어서 하기" 줄은 최근 논 놀이 3개를 보여준다. 논 적이 없으면 나오지 않는다.

## 놀이 화면 (낙서장 — 29개가 같은 결)

바탕은 **모눈 공책**, 카드는 **얇은 손그림 윤곽**, 아이콘은 **아이가 그린 SVG**다.
두툼한 색 단면 그림자·광택 그라데이션·이모지는 걷어냈다 (그게 화면을 옛날 것처럼 보이게 하던 것들이다).

| 어디에 | 무엇 |
|---|---|
| `shared/crayon.css` 끝 | 낙서장 층 — 모눈 바탕·카드 윤곽·단추 하한 46px·이름표 낮추기 |
| `shared/doodle-menu.css` | 첫 화면 `.menu` 자식을 nth-child 로 흩뿌림 |
| `shared/home-button.js` | 오른쪽 위 집 단추 (모든 화면·모든 앱, 폰 60·패드 80px) |
| `<앱>/css/doodle.css` 또는 앱 style.css | 그 앱만의 배치·크기 위계·아이콘 |

- **놀잇감에는 `transform` 을 주지 마라.** 조각·격자·캔버스·못판에 회전이나 확대를 걸면
  끌어 놓기 좌표와 채점이 틀어진다. 흩뿌리기는 **고르는 칸에만**.
  크기를 키워야 하면 `transform` 이 아니라 `max-width` 같은 **레이아웃**으로 한다 (지오보드 못이 그 예).
- **캔버스에 `border` 를 주지 마라** — `getBoundingClientRect` 가 밀려 색칠·획 채점 좌표가 어긋난다.
  테두리는 `box-shadow` 로 낸다 (색칠·선따라가 그렇게 한다).
- 등장 모션이 `transform` 을 쓰면 흩뿌림 기울기를 지운다. 모션은 **불투명도만** 쓰거나,
  `translate`/`rotate`/`scale` 낱개 속성으로 준다 (찾기 놀이터 방식).
- 빽빽한 격자에서는 흩뿌림의 **이동·확대를 빼고 기울기만** 남긴다 — 안 그러면 옆 칸을 파고든다.
- 각 앱 e2e 에 **「놀이판 무변형」 검사**가 들어 있다. 지우지 마라 — 누가 실수로 조각에 회전을 줘도 잡아낸다.

**앱 아이콘**(`<앱>/icon-192.png`·`icon-512.png`)은 생성기가 두 갈래다 —
옛 앱 13개는 `tools/make-mascot-icons.mjs`, 나머지는 `<앱>/tools/make-icon(s).mjs`.
바탕색은 `node tools/recolor-app-icons.mjs` 가 홈 묶음 색으로 한꺼번에 맞춘 뒤 생성기를 다시 돌린다
(48px 런처 크기에서 29개가 다 같은 분홍 토끼로 보이던 것을 색으로 가른다).
