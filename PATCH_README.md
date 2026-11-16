# v1.2 업데이트 패치 적용 방법

TEST35(261116 배포판) 위에 덮어쓰는 누적 패치입니다. v1.1이나 v1.1.1을 이미 적용했다면 같은 방법으로 한 번 더 덮어쓰면 됩니다.

1. 이 zip을 풀고 `PATCH_README.md`를 뺀 나머지 파일을 저장소 최상단에 덮어씁니다. 폴더 구조는 그대로 맞춰져 있습니다.
2. 아래 파일은 이번 버전에서 지웠습니다. 덮어쓰기로는 지워지지 않으니 저장소에서 직접 삭제해 주세요.
   - CHANGELOG_UIUX_v1.md
   - CHANGELOG_UI_FIX2_261116.md
   - CHANGELOG_UI_FIX3_261116.md
   - CHANGELOG_UI_FIX4_LOBBY_261116.md
   - QA_CHECKLIST.md
   - TEST28_6_CANDY_135_GEOMETRY_AUDIT.csv
   - TEST28_6_MANIFEST_SHA256.txt
   - assets/fonts/README_FONT_PLACEMENT.txt
   - assets/fonts/여기에_폰트추가.txt
3. 커밋하고 Pages 배포가 끝나면 브라우저에서 Ctrl+Shift+R로 새로고침합니다. 캐시 버전이 바뀌었기 때문에 보통은 일반 새로고침으로도 반영됩니다.

삭제를 건너뛰어도 게임은 정상 동작합니다. 다만 저장소에 사실과 맞지 않는 옛 문서가 남습니다.
변경 내용은 CHANGELOG.md, 검증 결과는 QA_REPORT.md에 있습니다.
