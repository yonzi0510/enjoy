#!/usr/bin/env node
/* 홈(루트) 아이콘 — node tools/make-icons.mjs
 *
 * 예전에는 이 파일이 루트 icon-192/512 를 '무지개만 그린' 옛 그림으로 덮어썼다.
 * tools/make-mascot-icons.mjs 가 같은 파일을 '무지개 + 토끼'로 덮어썼으므로,
 * 어느 쪽을 나중에 돌렸는지에 따라 홈 아이콘이 갈렸다.
 * 이제 그림은 tools/make-app-icons.mjs 한 곳에만 있고 이 파일은 그것을 부른다.
 */
import { buildIcons } from './make-app-icons.mjs';
await buildIcons(['.']);
