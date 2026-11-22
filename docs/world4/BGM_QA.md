# 월드4 배경음악 적용 확인 (2026-11-23)

기준: `BGM_STAGE_MAPPING.md`. 코드는 `event.js`(트랙 6/7/8, 반복 구간)와 `ghost-swamp.js`(`GS_MUSIC`, `gsPlayCue`, 4-3 `musicTrack` getter).

## 파일 (원본과 바이트가 같음, 이름만 바꿈)

| 파일 | 원본 | sha256 |
| --- | --- | --- |
| `assets/event/ghost_dragon_cave.mp3` | 20. Dragon Cave (Crystal).mp3 | ae128de582365b97e4bed488cba4cde05efcb2fde92d8768762143987e79dc3d |
| `assets/event/ghost_deep_cave.mp3` | 22. Deep Cave.mp3 | a111600bb1b5b12267320443b354c66407767832e6a00bdcb44b34076c16ec1f |
| `assets/event/ghost_village.mp3` | 23. Ghost Village.mp3 | 362217372a55b6a303e693a819d64e83e2cf4c156a460465f35d4f1051fd568a |

반복 구간은 명세의 초기값 그대로다(46.30 / 52.19 / 49.05초, 시작 0.05초).

## 브라우저 확인 (선택된 트랙 이름, 자동 브라우저)

| 항목 | 결과 |
| --- | --- |
| 4-1 진입 | ghost_dragon_cave |
| 4-2 진입, 기둥 지난 뒤, 납치 장면 중 | ghost_village (계속) |
| 4-2 납치 뒤 4-3 자동 진입 | ghost_deep_cave |
| 4-3 구출 장면 0.6~3.2초(셰이디 등장, 림 Die) | ghost_deep_cave 유지 |
| 4-3 구출 3.6초(림 사라짐, bg4→bg5 시작) | ghost_dragon_cave로 **1회** 전환(곡 선택 기록에 1건) |
| 구출 뒤 녹색 선 왼쪽으로 되돌아감 | ghost_dragon_cave 유지(다시 Deep Cave로 안 바뀜) |
| 구출 뒤 체크포인트에서 다시 시작, R 재시작 | ghost_dragon_cave |
| 처음부터 다시 시작, 체력 0 재시작(구출 전) | ghost_deep_cave |
| 월드맵으로 나감 | 음악 없음(기존과 같음) |
| 정령산 3-1 진입 | day(기존과 같음). 재생 중인 트랙은 day 하나 |
| 네트워크 | 세 mp3 모두 200, 404 없음 |

곡 선택 기록은 `window.__gsBgmLog`에 남는다(stageCode, cue, musicSelected, rescueState, timestamp).

## 확인하지 못한 것

- 반복 경계를 귀로 2바퀴 이상 듣는 확인은 하지 못했다(자동 브라우저는 소리를 들을 수 없다). 반복될 때 끊김이나 박자 어긋남이 있으면 알려 주세요.
- 실제 휴대폰, 전체화면, 볼륨 슬라이더와 음소거는 기존 음악 경로(`playTrack`, `musicTick`)를 그대로 써서 바꾸지 않았지만, 기기에서 직접 확인하지는 않았다.
