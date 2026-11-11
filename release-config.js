/* 배포 설정: PostHog Project Token은 공개 가능한 프로젝트 토큰만 사용. 개인 API 키 사용 금지. */
window.DUDU_RELEASE = Object.freeze({
  version: 'v0.3.3-beta',
  releaseMode: true,
  posthogProjectToken: '',
  posthogHost: 'https://us.i.posthog.com',
  analyticsEnabled: false
});
