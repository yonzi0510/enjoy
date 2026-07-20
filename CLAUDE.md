# CLAUDE.md — enjoy 작업 지침

**규모 있는 작업은 에이전트 팀으로 진행한다 — 팀 구성·라운드 절차·프롬프트 요점은 `TEAM.md`를 따른다.**

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
| `color/` | (리다이렉트) | 픽셀 놀이터로 이동만 함 — 수정할 일 없음 |
| `parent/` | 🔑 부모님 페이지 | PIN 게이트 뒤에서 하루 제한·앱 노출·마이크 허용을 설정하고 진행도 백업 |
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
  `enjoy-pet-v1`(학습 펫 — `Profile.key()` 적용, 아이별로 각자 키움).
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
- 새 앱을 추가할 때: 기존 앱의 폴더 구조를 따르고, 루트 `index.html`에 앱 카드, `README.md`에 항목을 추가하며, 규모가 있으면 `PLAN.md`로 설계를 남긴다.
- 데이터(도안·사전·씬 등)를 추가·수정하면 해당 validate 스크립트가 그 계약을 검사하는지 확인하고, 필요하면 검증기도 함께 고친다.
