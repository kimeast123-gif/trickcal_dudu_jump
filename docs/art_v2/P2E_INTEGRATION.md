# 아트 리뉴얼 2단계 P2-E 정식 통합 보고

- 날짜: 2026-11-22
- 브랜치: `art-unification-phase2` → 배포 버전 v1.8.0 준비 완료
- 상태: 통합과 검수는 끝났다. **`main` 병합과 GitHub 푸시(배포)는 사용자 승인 대기 중이다.**

## 1. 바뀐 것

| 전 (시험 레이어) | 후 (정식) |
| --- | --- |
| `art-prototype.js` (v1.1 후보 A: 숲 긴 발판, 동굴 긴 발판) + `art-v2-pilot.js` (나머지 전부). 두 겹으로 그리기 함수를 감쌌다 | `terrain-art.js` 한 파일. 동굴 긴 발판도 같은 방식의 부품(`cl`)으로 들어갔다. 접지 행 9는 메타데이터에 바로 넣었다 |
| 그림 위치 `assets/art_v2/pilot,batch1,batch2,batch3/`, `assets/art_prototype/` | `assets/terrain/<지역>/` 6개 폴더(83장): `forest_w1` 21, `forest_story` 22, `spirit_out` 6, `spirit_cave` 11, `spirit_lava` 11, `spirit_snow` 12. 후보 A 두 장은 `forest_w1_long.png`, `spirit_cave_long.png`로 이름을 바꿨다. 파일 내용은 그대로이고 `git mv`라 이력도 이어진다 |
| 생성 도구 `tools/art_v2_pilot_build.py` | `tools/terrain_art_build.py` (이름 변경, 경로와 동굴 긴 발판 추가) |
| 비교 토글 `?arttest=0`, `?artv2=0`. 그림을 꺼도 새 이미지를 받았다 | `?oldart=1` 하나만 남겼다. 이때는 새 이미지를 **받지 않는다**(실측 0장) |
| 이미지 캐시 키 `v2b3a` | `ta1`. 배포 키(`v…`)와 따로 두어 배포할 때마다 그림을 다시 받지 않게 했다. 그림을 바꾸면 `CACHE`를 바꾼다 |
| 실패 처리: 부품마다 오류가 나면 끄고 예전 그림으로 | 그대로 유지. 경고 문구는 `[terrain-art] … off, release art instead` |

이미지 경로는 모두 `index.html` 기준 상대 경로다. GitHub Pages의 하위 폴더에서도 그대로 동작한다(아래 검수에서 하위 폴더로 제공해 확인).

## 2. 정리한 도구

- **지웠다 (v1.1 시험 레이어 전용, 새 도구가 범위를 포함함):**
  - `tools/qa/art_prototype.py`
  - `tools/qa/art_physics_identity.py` (150곳) → `art_v2_physics_identity.py` (258곳)
  - `tools/qa/art_file_open.py` (4곳) → `art_v2_file_open.py` (10곳 × 4환경)
  - `tools/qa/art_inventory.py`, `tools/qa/art_v2_coverage.py`, `tools/qa/art_v2_report.py` (P2-A 조사용. 결과 문서는 `docs/art_v2/`에 남아 있음)
- **고쳤다:** `art_v2_*.py` QA 도구 5개는 새 파일, 토글, 경로를 보게 바꿨다. `tools/art_cave_cuts.py`는 새 경로를 본다.
- **기록 문서는 손대지 않았다:** `docs/ART_PROTOTYPE_REPORT.md`, `docs/art_v2/` 아래 검수 기록은 당시 경로를 그대로 둔다.

## 3. 통합 후 다시 확인한 것

| 검사 | 결과 |
| --- | --- |
| 물리 동일성 `art_v2_physics_identity.py` | 516/516 같음 (258곳, 좌우) |
| 지역별 적용률과 접지 `art_v2_pilot_qa.py` | 6개 지역 모두 100%. 접지는 232곳 중 231곳이 ±2px (P2-D와 같음) |
| 파일로 열기, 휴대폰 `art_v2_file_open.py` | 68/68 |
| 비율, 장면 `art_v2_scenes.py` | 새 그림 82종, 그리기 61,707회 중 한 방향 늘림 0. 페이지 오류 0 |
| 로딩 `art_v2_load_probe.py` (하위 폴더 제공) | 404 0, 중복 받기 0, 새 이미지 83장 모두 받음(`?oldart=1`이면 0장). 프레임 16.7ms, 메모리 4~7MB로 예전 그림과 같다 |
| `regression.py` | 25/27. 실패 2건은 배포본 v1.7.4에도 있는 낡은 테스트(P2-D 보고 3절). v1.8.0 키로 바꾼 뒤 문법, 부팅, 수집물 수, 모드 열기 4개 다시 통과 |

## 4. 지우지 않은 옛 그림 (사용자 확인 필요)

지시서대로 자동 삭제는 하지 않았다.

- **정령산 옛 타일 `assets/spirit/tiles/*.webp` (18장, 696KB):**
  - 새 그림에서는 정령산 발판을 하나씩 비춰 그려 봐도 한 번도 쓰이지 않는다(예전 그림 모드에서는 8장이 쓰인다).
  - 다만 새 그림 부품을 못 불러올 때의 대체 그림이고, 정령산에 들어가면 지금도 받는다.
  - 선택지: (가) 대체 그림으로 그대로 둔다(지금 상태). (나) 새 그림이 켜져 있으면 받지 않게 한다(696KB 절약, 코드 한 줄). (다) 지운다(대체 그림이 없어지고 `?oldart=1` 비교도 안 된다).
- **숲 옛 모듈 `assets/terrain/forest/*`:** 수인마을, 챌린지 모드 등 다른 곳이 계속 쓰므로 지우면 안 된다.

## 5. 배포 때 할 일 (승인 후)

1. `art-unification-phase2`를 `main`에 병합한다.
2. GitHub에 푸시한다. Pages가 자동으로 배포한다.
3. 배포 주소에서 버전(v1.8.0)과 새 그림 로딩을 확인한다.

`release-config.js`의 version, 캐시 키(`v1_8_0_261122`), `CHANGELOG.md`, `MANIFEST_SHA256.txt`(573개)는 이미 이 브랜치에 반영했다.
