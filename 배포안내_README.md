# 두두의 폴짝폴짝 대모험 — TEST12_RELEASE

## 바로 배포하기 (Windows / GitHub Pages)

1. 이 ZIP을 **모두 압축 풀기**로 풉니다.
2. 압축을 푼 **`Dudu_Adventure_TEST12_RELEASE` 폴더 안**의 `index.html`, JS, CSS, `assets` 폴더, `release-config.js`, `analytics.js`, `.nojekyll`을 함께 선택합니다.
3. https://github.com/kimeast123-gif/trickcal_dudu_jump → **Add file → Upload files** 로 업로드합니다. `index.html`이 저장소 맨 위에 놓이게 하세요. (폴더째 중첩 업로드하지 않음)
4. **Commit changes** → Settings → Pages → Source: Deploy from a branch → Branch: main → /(root) → Save
5. https://kimeast123-gif.github.io/trickcal_dudu_jump/ 에서 실행을 확인합니다.

업로드할 파일만 들어 있습니다. 개발 테스트 리포트·검수 이미지·연습용 UI는 공개 화면에 노출되지 않습니다.

## 통계 수집을 실제로 켜려면 (선택 사항)

게임은 **분석 계정 없이 바로 배포 및 플레이 가능합니다.** 단, 통계 수집은 자동 시작되지 않습니다.

- https://posthog.com 에서 프로젝트를 만들고 **Project token (`phc_...`)**과 리전(US/EU)을 확인합니다.
- `release-config.js`에서 `posthogProjectToken`에 **Project token만** 입력하고, 프로젝트가 EU 리전이라면 `posthogHost`를 `https://eu.i.posthog.com`으로 바꾸세요.
- **개인 API key, 비밀번호, 비공개 토큰은 절대 입력하지 마세요.** GitHub의 공개 저장소에 노출됩니다.
- 파일을 다시 업로드하면, 게임 페이지 하단에 **플레이 통계 설정**이 생깁니다. 플레이어가 직접 동의한 경우에만 통계가 전송됩니다. 거부해도 게임은 동일합니다.
- 수집 이벤트: `game_started`, `stage_entered`, `stage_completed`, `special_item_secured`, `checkpoint_retried`, `player_fell`, `game_ended`.
- 데이터 항목: 게임 버전, 익명 임의 ID, 구간/누적 시간, 낙사·재시도·피격 수, 왕사탕·황금 크레파스 확보 수. **실명·이메일·키 입력/마우스 좌표는 수집하지 않습니다.** 서비스에는 네트워크 접속 IP 등 기술 정보가 전달될 수 있습니다.
- PostHog UI에서 Insights → 새 Insight의 이벤트/속성으로 그래프를 만들 수 있습니다. 최초 배포 전 분석 동작은 토큰 부재로 외부 수집을 테스트하지 못했습니다.
- 광고·쿠키 및 개인정보보호 관련 고지는 실제 운영 환경에 맞게 확인하세요. 이 구현은 자체 쿠키를 사용하지 않고, 동의 선택과 익명 ID에 localStorage를 이용합니다.

## 피드백 수집

- 공개 화면의 **의견·버그 제보**는 기본값으로 GitHub Issues의 새 글 작성 페이지를 엽니다. GitHub 계정 로그인이 필요할 수 있고, Issues 기능이 꺼져 있으면 동작하지 않습니다.
- GitHub 저장소 Settings → General → Features에서 **Issues**를 활성화하세요.
- 또는 Google Forms 설문을 만든 뒤 `release-config.js`의 `feedbackUrl`을 설문 링크로 변경하면 됩니다. 설문이 따로 없으면 기본 GitHub Issues를 사용할 수 있습니다.

## 보존 사항

- 수인숲→모나티엄→에르피엔 3지역, 15분 타이머, 왕사탕 96개, 황금 크레파스 9개, 2단 점프·공중 대시, NPC, 음악, 전환 영상, 3가지 엔딩 판정 모두 원본 유지.
- 특수 엔딩은 **TEST12의 원래 임시 보상 분기**를 유지합니다. 새로운 전용 일러스트를 만든 것은 아닙니다.
- 개발·연습 UI, F3 디버그 접근, 세부 점프 계기판을 비공개 처리했습니다.
- 게임 내 R 체크포인트 재시도는 플레이어 기능으로 유지했습니다.

## 주의

브라우저 보안 정책상 단순 `file://` 열기에서 일부 기능에 차이가 생길 수 있으므로 **실제 GitHub Pages 주소에서 최종 테스트**하세요. ZIP 파일을 통째로 업로드하는 것이 아니라 *압축을 푼 안쪽 파일*을 올려야 합니다.

## 글꼴

배포 파일에는 별도의 폰트 파일을 포함하지 않으며, 시스템 기본 한글 글꼴로 표시됩니다.
