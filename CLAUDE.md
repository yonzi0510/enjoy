# CLAUDE.md — enjoy 작업 지침

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
| `color/` | (리다이렉트) | 픽셀 놀이터로 이동만 함 — 수정할 일 없음 |
| `shared/` | 공용 목소리 설정 | 모든 앱이 같은 한국어 목소리·빠르기를 쓰게 하는 모듈 |

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
- 사용 중인 키: `chatgi-playground-v1`·`chatgi-stickerboard-v1`·`chatgi-timelimit-v1`·`chatgi-muted`(play),
  `english-playground-v1`, `pixel-playground-v1`·`pixel-muted`, `hangul-playground-v1`,
  `japanese-playground-v1`, `practika-playground-v1`, `write-playground-v1`, `enjoy-voice-ko`·`enjoy-rate-factor`(공용).
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

# 2) e2e (저장소 루트에서 정적 서버를 띄운 뒤 실행)
python3 -m http.server 8777 &
node hangul/tools/e2e.mjs                 # japanese·write도 같은 포트
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
