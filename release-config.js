/* 배포 설정 (CFG-01 / STAT-01):
 * - 정식 배포(RELEASE) 빌드에서는 releaseMode: true 로 고정되어 DEV 버튼·강제 해금·디버그 패널을 차단합니다.
 * - QA 검수 빌드(DEV_FULL_QA)에서는 releaseMode: false 로 설정되어 개발자 연습 바를 사용할 수 있습니다.
 * - 통계(analyticsEnabled)는 사용자 동의 UI 및 공개 프로젝트 토큰이 준비되기 전까지 false(비활성)를 기본값으로 유지합니다.
 */
window.DUDU_RELEASE = Object.freeze({
  version: 'TEST31.5-release',
  releaseMode: true,
  qaBuild: false,
  posthogProjectToken: '',
  posthogHost: 'https://us.i.posthog.com',
  analyticsEnabled: false
});
window.DUDU_RELEASE_CONFIG = window.DUDU_RELEASE;
try {
  document.documentElement.setAttribute('data-release-mode', window.DUDU_RELEASE.releaseMode ? 'true' : 'false');
} catch (e) {}
