# CHANGELOG — 두두의 폴짝폴짝 대모험 UI/UX 전면 리디자인 v1.0 (TEST31.5 기준)

> **빌드 상태:** `개발본 / 사용자 QA 대기` (실제 플레이 재미·시인성·조작감·최종 디자인 승인은 사용자 본인이 직접 판정합니다.)

## 1. 파일별 변경 요약 (`git diff` 범위)

| 파일명 | 상태 | 변경 요약 | 게임 물리·지형·로직 영향 |
| :--- | :---: | :--- | :---: |
| `assets/fonts/ONE-Mobile-POP.ttf` | **신규 추가** | 사용자 제공 원스토어 모바일 POP(`ONE Mobile POP`, Regular, `4,014,868 bytes`) 원본 폰트 배치 | 없음 (순수 폰트 자산) |
| `uiux-redesign.js` | **신규 추가** | • `document.fonts.load()` 완료 시 캔버스 말풍선 레이아웃 캐시 초기화 및 재렌더링<br>• `body[data-game-mode]`, `body[data-game-state]`, `body[data-world-stage]`, `body.npc-talking` 상태 동기화<br>• `#overlay[data-modal-kind="title"\|"pause"\|"result"]` 자동 분리<br>• `drawFriendlySpeechBubble()` 비차폐 소형 말풍선(상단 HUD 충돌 시 측면/하단 이동, 점프 착지 궤적 간섭 시 자동 반투명화)<br>• `renderWorldMap7CardsUI()` 탐험 지도 스타일 카드 렌더링(기존 7개 카드 ID·해금·액션 핸들러 100% 유지) | 없음 (표시 레이어만 제어) |
| `style.css` | **수정** | • 기존 가짜 `@font-face`(`local('Malgun Gothic')` 혼합) 제거 및 `./assets/fonts/ONE-Mobile-POP.ttf` 명시적 `@font-face` 선언<br>• 상단 HUD 비대칭 위계(좌상단 숲 리본 + 메달리온 타이머 + 수집물 캡슐 + 원형 아이콘 버튼 + 다크 리프 네온사우르스 체력 트레이)<br>• 타이틀 화면 대형 사각 보드 제거 → 수인숲 배경과 두두가 노출되는 우측 플로팅 어드벤처 도크<br>• 일시정지 화면(`data-modal-kind="pause"`)에서 불필요한 모드 전환 버튼 숨김 및 430px 컴팩트 카드화<br>• PC 창모드(`body:not(.is-mobile-device)`)에서 `#mobileControls` 강제 비노출 보장 | 없음 (순수 스타일시트) |
| `index.html` | **최소 수정 (2줄)** | • `<head>`에 `assets/fonts/ONE-Mobile-POP.ttf` preload 링크 추가<br>• `</body>` 직전에 `<script src="uiux-redesign.js?v=TEST31_5_UIUX_V1"></script>` 추가 (기존 모든 DOM ID 100% 보존) | 없음 |
| `renderer.js`, `world.js`, `game.js`, `hazards.js`, `event.js`, `npc-data.js`, `mobile-controls.js`, `challenge-world.js`, `challenge-hazards.js`, `challenge-mode.js`, `worldmap-mode.js` | **무수정 (100% 동결)** | **단 1바이트의 변경도 없음 (`TEST31.5` 원본과 SHA-256 해시 100% 일치)** | **변경 없음 (100% 보존)** |

## 2. 성능 및 메모리 영향 검토
- 캔버스 타일 루프, 파노라마 LRU 캐시(`24,000,000 pixels`), 지형·장식 컬링(`renderer.js` 및 `worldmap-mode.js`)은 원본 그대로 유지됩니다.
- NPC 말풍선 텍스트 측정은 `_uiBubbleCache`(`Map`)에 캐싱되어 매 프레임 `measureText` 재계산이 발생하지 않습니다.
