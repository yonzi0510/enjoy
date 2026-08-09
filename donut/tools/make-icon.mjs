#!/usr/bin/env node
/* 도넛 짝맞추기 아이콘 — node donut/tools/make-icon.mjs
 *
 * 그림(소품)과 바탕색은 **tools/make-app-icons.mjs 한 곳**에 모여 있다.
 * 예전에는 앱마다 토끼를 복제해 두어 한쪽만 고치면 29개가 갈라졌다.
 * 이 파일은 그 공용 생성기를 이 앱 하나에만 돌려 주는 얇은 껍데기다 —
 * 여기에 그림을 그리지 마라. 고칠 곳은 tools/make-app-icons.mjs 다.
 */
import { buildIcons } from '../../tools/make-app-icons.mjs';
await buildIcons(['donut']);
