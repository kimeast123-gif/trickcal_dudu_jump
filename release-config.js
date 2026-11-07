// GitHub Pages용 공개 설정. 비밀키나 개인정보를 이 파일에 입력하지 마세요.
// PostHog 설정을 하지 않으면 게임은 정상 배포되지만 통계는 외부로 전송되지 않습니다.
// PostHog Project token은 공개용 식별자이며 개인 API key를 넣으면 안 됩니다.
window.DUDU_RELEASE_CONFIG = Object.freeze({
  version: 'TEST12_RELEASE_1',
  posthogProjectToken: '', // 예: phc_...  (PostHog 프로젝트 설정의 Project token)
  posthogHost: 'https://us.i.posthog.com', // EU 프로젝트면 https://eu.i.posthog.com
  feedbackUrl: 'https://github.com/kimeast123-gif/trickcal_dudu_jump/issues/new'
});
