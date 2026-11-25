# 두두의 폴짝폴짝 대모험

에피드게임즈 〈트릭컬 리바이브〉 캐릭터로 만든 비공식 팬게임. 2D 플랫포머, 순수 HTML5 Canvas + 바닐라 JS, 빌드 도구 없음. GitHub Pages로 배포한다.
사용자와의 대화와 문서는 한국어, 코드 주석은 영어로 쓴다.

작업 이력, 남은 과제, 지금까지 고친 버그의 원인은 `docs/HANDOFF.md`에 있다. 큰 작업을 시작하기 전에 읽는다.

## 실행과 검증

```bash
python -m http.server 8000                    # http://localhost:8000/index.html  (file://로 열면 이미지가 막힌다)
pip install -r tools/qa/requirements.txt && python -m playwright install chromium   # 처음 한 번
python tools/qa/regression.py                 # 커밋 전에 반드시. 전부 PASS여야 한다
```

- 게임 코드를 바꾼 커밋은 `tools/qa/regression.py`가 전부 통과한 상태로만 올린다. 실패하면 고치거나, 의도한 변경이면 테스트를 함께 고치고 이유를 커밋 메시지에 쓴다.
- 레벨 배치를 바꿨다면 `tools/qa/layout_map.py`로 도면을 보고, 새로 생긴 간격마다 `tools/qa/hops.py`로 실제로 건너지는지 확인한다. 야간 맵은 `night_hops.py`, `night_checks.py`, `night_run.py`, 정령산은 `spirit_hops.py`, `spirit_checks.py`, `spirit_run.py`.
- 화면을 바꿨다면 `tools/qa/screens.py`로 전후 스크린샷을 비교한다.
- 왕사탕 위치를 바꿨다면 `tools/qa/candy_audit.py`(플레이 없이 배치만 검사)가 PASS여야 한다. 쉬는 사탕은 발판 윗면 38px 위.
- 이 저장소에는 단위 테스트 프레임워크가 없다. 위 스크립트가 실제 브라우저에서 게임을 돌려 확인하는 유일한 테스트다.

## 배포 규칙

- **캐시 버전**: `index.html`의 모든 `?v=` 값과 JS 안의 `?v=` 값을 같은 새 값으로 바꾼다(형식 `v1_4_1_YYMMDDX`). 안 바꾸면 사용자 브라우저가 옛 JS를 계속 쓴다. 실제로 이 문제로 버그가 고쳐지지 않은 것처럼 보인 적이 있다.
- `release-config.js`의 `version`, `CHANGELOG.md`(맨 위에 새 항목), 필요하면 `QA_REPORT.md`를 함께 갱신한다.
- `release-config.js`: 배포는 `releaseMode: true, qaBuild: false`. `analyticsEnabled`는 동의 화면이 생기기 전까지 `false`로 둔다.

## 구조

전부 전역 스크립트이고 `index.html`의 로드 순서에 의존한다(ES 모듈 아님).
`perf.js → release-config.js → mobile-controls.js → download-consent.js → game.js → world.js → npc-data.js → hazards.js → renderer.js → challenge-world.js → challenge-hazards.js → event.js → challenge-mode.js → worldmap-mode.js → night-monatium.js → spirit-mountain.js → ghost-swamp.js → dragon-cave.js → dragon-cave-pinball.js → terrain-art.js → uiux-redesign.js → title-lobby.js`

| 파일 | 내용 |
| --- | --- |
| `perf.js` | 4096px 넘는 이미지 자동 분할(`drawImage` 감쌈), 프레임 모니터, 저사양 모드, `?fps=1` 표시 |
| `mobile-controls.js` | 모든 입력의 입구 `pressInput/releaseInput`, PC 키 설정, 떠다니는 스틱, 두 번 누르기 대시, 확대 방지 |
| `download-consent.js` | 휴대폰·태블릿 첫 방문 때 내려받을 용량(약 39MB)을 알리고 확인을 받는다. 확인 전에는 그림을 받지 않는다(`window.duduDownloadGate`를 `game.js` 부팅, 로비, `terrain-art.js`가 기다림). 큰 그림을 바꾸면 `tools/qa/first_load_size.py`로 다시 재서 `FIRST_DOWNLOAD_MB`를 고친다. 자동 QA 브라우저는 묻지 않음(`?dlgate=1`이면 물음) |
| `game.js` | 물리(`update`, 120Hz 고정 스텝 `STEP=1/120`), 점프/대시, 카메라(`getCameraProfile`, `updateLookDown`), 메인 루프 `frame` |
| `world.js` | 스토리 6개 레벨 데이터와 배치 함수, 레벨 로드, 지역 전환, 수집물 |
| `hazards.js` | NPC와 적(경비, 마요 추격, 마리 보스), 연습 진입 |
| `renderer.js` | 캔버스 그리기 전부. 배경 파노라마, 지형 타일(`drawGroundVisual`), 발판, 문, 효과 |
| `challenge-*.js`, `worldmap-mode.js` | 챌린지 모드, 월드맵과 월드1 스테이지 |
| `night-monatium.js` | 월드2 「모나티엄의 야경」: 스테이지 데이터, 러너, 드론, 전기장, 진압반, 셔터, 광장 NPC, 야간 배경. `world1Stages` 뒤에 붙어 월드 스테이지 실행기를 같이 쓴다. 설계는 `docs/NIGHT_MONATIUM.md` |
| `spirit-mountain.js` | 월드3 「정령산의 아침」: 세로 맵, 동굴 시야 마스크, 용암, 위습, 강풍(`SM_WIND`), 정령 NPC, 별. 같은 방식으로 `world1Stages` 뒤에 붙는다. 설계는 `docs/SPIRIT_MOUNTAIN.md` |
| `ghost-swamp.js` | 월드4 「무시무시 유령늪」 유령늪 1~4(내부 ID `ghost_swamp_1`, `_1_2`, `_2`, `_3`): 침전 발판(두두가 잠김), 이동 발판, 가시, 림 착지 공격, 납치, 추격, 셰이디 구출과 동행, 곡 전환. 같은 방식으로 `world1Stages` 뒤에 붙는다. 발판 그림은 `tools/ghost_swamp_board_parts.py`, 림·셰이디 모션은 `tools/ghost_swamp_assets.py`가 만든다. 설계와 확인 기록은 `docs/world4/` |
| `dragon-cave.js` | 월드5 「용족동굴」 다섯 방(5-1~5-5, 내부 ID `dragon_cave_1`~`_5`). 지금은 5-1 「제이드의 금고」만: 오팔이 달리고 멈춰 책을 던지는 4구간, CP2, 파란 점선 뒤 오열 자리로 이동, 눈물 3구간과 울음 경직, 제이드 동행, 갈색 바닥 낙사(`killYAt`). 같은 방식으로 `world1Stages` 뒤에 붙는다. 배경·발판은 `tools/dragon_cave_assets.py`, 제이드·오팔 모션은 `tools/dragon_cave_motions.py`, 방별 상태와 필요한 자료는 `docs/world5/WORLD5_STAGE_STATUS.md` |
| `dragon-cave-pinball.js` | 월드5 5-2 「루드의 헬스짐」: 루드 대화(Idle_1, Happy_3, Happy_5와 사용자 대사), 파란 입장, 500kg 핀볼(발사대 충전, 좌우 핀, 20/10/3kg 원판, 샌드백, 무충돌 점수창, 두두 회전 프레임 공). 핀볼은 보드 좌표의 독립 물리. 핀볼 그림은 `tools/dragon_cave_pinball_parts.py`가 사용자 에셋 보드에서 자른다. 상태와 수치는 `docs/world5/` |
| `terrain-art.js` | 스토리 수인숲, 월드1 1-1~1-4, 정령산의 지형 그림(아트 리뉴얼 2단계, v1.8.0). 그리기 함수만 감싸고 물리는 건드리지 않는다. **`tools/terrain_art_build.py`가 `assets/terrain/`에서 생성하므로 손으로 고치지 않는다.** 그림을 바꾸면 다시 생성하고 `tools/qa/art_v2_physics_identity.py`(그림 켜고 끈 물리 비교)를 통과시킨다. `?oldart=1`로 열면 예전 그림 |
| `title-lobby.*`, `uiux-redesign.js`, `event.js` | 로비, HUD, 컷신과 결과 화면 |
| `style.css` | 게임 화면과 모바일 조작 UI |

스토리 레벨 순서: `forest`(수인숲) → `village`(수인마을) → `monatium_a` → `monatium_b` → `erpien_a` → `erpien_b`(마요 추격, 마리 보스) → 엄마의 방.
캔버스는 1280×720 고정. 좌표는 y가 아래로 커지고, 기본 지면은 y=580이다.

## 코드 규칙 (이 저장소에서 실제로 사고가 난 것들)

- **한 줄짜리 코드에 `//` 주석을 끼워 넣지 않는다.** `game.js` 등에는 여러 문장이 한 줄에 이어진 곳이 많다. v1.1.1에서 줄 중간에 `//`를 넣어 뒤의 대시 쿨타임 코드가 통째로 꺼졌다. 이런 줄에는 `/* */`를 쓴다.
- **입력은 반드시 `pressInput(code, sourceId)` / `releaseInput`을 거친다.** `keys`를 직접 고치지 않는다. 키보드는 sourceId가 `kb_`로 시작하고, 터치는 `touch_`, 스틱은 `vjoy`다. 두 번 누르기 대시는 `kb_` 입력에만 적용된다.
- 물리 단계(초당 120회) 안에서 DOM을 쓰거나 문자열을 만들지 않는다. HUD는 `update` 안의 `window.__hudFrame` 블록에서 프레임당 한 번만 갱신된다.
- 같은 값을 매 프레임 DOM에 다시 쓰지 않는다(값이 바뀔 때만 쓴다).
- 4096px보다 큰 새 이미지는 그대로 넣어도 `perf.js`가 자동 분할하지만, 처음부터 4096px 이하로 만드는 편이 낫다.
- 마요(`updateMayo`)의 위치를 바꾸는 코드(재시작, 따라잡기 보정)에서는 `vy`, `inAir`, `supportRef`, `supportHold`도 함께 초기화한다.
- 문구는 두두 시점의 짧은 말투. 영문 대문자 머리말, 장식 기호(✿ ✧), 버튼 끝 화살표(→), 중간점(·)으로 이어 붙인 나열은 쓰지 않는다. 조작 키 이름은 하드코딩하지 말고 `{MOVE} {JUMP} {DOWN} {DASH}` 토큰을 쓴다(`duduKeyText`가 실제 설정된 키로 바꾼다).

## 레벨 배치 원칙

- 모든 발판은 역할이 하나 있다: 길(다음 땅으로 이어짐), 구덩이 다리(낙사 방지), 보상 경로(왕사탕, 황금 크레파스). 땅 위에 이유 없이 떠 있는 발판은 두지 않는다.
- 매달린 벽(`noTopLand` 벽)은 경비가 순찰하는 다리 한가운데 위에만, 다리 바닥에서 85px 위에 건다. 걸어서는 지나가고 점프로는 경비를 넘지 못한다. 점프해야 하는 지점에는 절대 두지 않는다.
- 발판 사이를 막는 세로 벽은 쓰지 않는다.
- 점멸 발판은 단단한 발판 사이에 하나씩. 스토리 기준 켜짐 2.6초 이상(연속 배치면 3.0초, 진행 방향으로 0.35~0.45초씩 늦게 꺼지게).
- 보상 경로는 정상 경로보다 한 번 점프 높이(약 150px) 이상 떨어뜨린다. 정상 경로 위로 처마나 천장을 내리지 않는다.
- 스토리 모드는 편안한 귀갓길 탐험과 수집, 챌린지 모드는 정밀 컨트롤. 마을 안에는 낙사 구덩이를 두지 않는다.
- 참고 수치: 한 번 점프 최대 상승 약 148px, 2단 점프 약 279px, 이동 속도 320px/s. 수평 120px·상승 80px 이하면 한 번 점프로 건넌다.
- **발판을 옮길 때는 `world.js`의 `relayPlatform(level, id, x, y, w, extra)`를 쓴다.** 그 위의 왕사탕이 같이 움직이고 크레파스는 부모 발판을 따라간다. 수집물 개수(왕사탕 135, 크레파스 12)는 바뀌면 안 되고 `regression.py`가 확인한다.
- `floor(level, x, w, skin, y)`의 인자 순서는 x, **너비**, 스킨, y다. `surface(level, x, y, w, skin)`과 순서가 다르니 주의한다.

## 하지 말 것

- `MANIFEST_SHA256.txt`를 손으로 고치지 않는다. 배포 직전에 다시 생성한다(`docs/HANDOFF.md`의 명령).
- 저작권: 다른 작품의 캐릭터나 로고를 새로 그려 넣지 않는다. 폰트 `assets/fonts/ONE-Mobile-POP.ttf`는 재배포 조건을 확인하기 전까지 추가 배포처를 늘리지 않는다.
