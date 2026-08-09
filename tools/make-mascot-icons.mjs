#!/usr/bin/env node
/* 홈(루트) 아이콘 — node tools/make-mascot-icons.mjs
 *
 * 예전에는 이 파일이 옛 앱 13개의 아이콘까지 함께 그렸다. 나머지 16개는 각자
 * <앱>/tools/make-icon(s).mjs 에서 같은 토끼를 복제해 그렸고, 그래서 한쪽만
 * 고치면 그림이 두 갈래로 갈렸다.
 *
 * 지금은 **앱 아이콘 29개가 전부 tools/make-app-icons.mjs 한 곳**에서 나온다.
 * 이 파일은 이름을 지키되 하는 일이 하나뿐이다 — 저장소 루트의 홈 아이콘
 * (무지개 위의 분홍 토끼. 이 사이트의 얼굴이라 마스코트를 지킨다) 한 벌만 뽑는다.
 * 토끼 그림도 make-app-icons.mjs 안에 있다.
 */
import { buildIcons } from './make-app-icons.mjs';
await buildIcons(['.']);
