# TJ 곡 정보 스크래핑 및 DB 업데이트

TJ 미디어 웹사이트에서 가수별 곡 정보를 스크래핑하고 DB에 반영하는 스크립트 모음입니다.

## 사용 순서

### 1단계: 곡 정보 스크래핑

가수명으로 TJ 미디어에서 모든 곡 정보를 스크래핑하여 JSON 파일로 저장합니다.

```bash
cd admin
npx tsx src/scripts/tj2/1-fetch-artist.ts "아이유"
```

**출력:**
- `admin/src/scripts/tj2/{가수명}-{타임스탬프}.json`
- 예: `아이유-2026-01-09T12-30-45.json`

**스크래핑되는 정보:**
- 곡번호 (songNumber)
- 제목 (title)
- 가수명 (artist)
- 작사가 (lyricist)
- 작곡가 (composer)
- MR 여부 (isMR)
- MV 여부 (isMV)
- 60이상 전용곡 여부 (isOver60)
- 유튜브 링크 (youtubeLink)

### 2단계: DB 업데이트

1단계에서 생성된 JSON 파일을 읽어서 TjSong 테이블을 업데이트합니다.

**주의: 먼저 dry-run으로 확인하세요!**

```bash
# Dry-run (실제 업데이트 없이 미리보기)
npx tsx src/scripts/tj2/2-update-db.ts "./아이유-2026-01-09T12-30-45.json" --dry-run

# 실제 업데이트
npx tsx src/scripts/tj2/2-update-db.ts "./아이유-2026-01-09T12-30-45.json"
```

**업데이트되는 내용:**
- `realArtist` 배열에 가수명 추가 (중복 방지)
- `isMR`, `isMV`, `isOver60` 필드 업데이트
- 존재하지 않는 곡번호는 경고 출력

## 필수 요구사항

DB 스키마에 다음 필드가 있어야 합니다:

```prisma
model TjSong {
  // ... 기존 필드들 ...

  isMR        Boolean  @default(false) @map("is_mr")
  isMV        Boolean  @default(false) @map("is_mv")
  isOver60    Boolean  @default(false) @map("is_over_60")
  realArtist  String[] @map("real_artist")

  // ...
}
```

## 예시 워크플로우

```bash
# 1. 아이유 곡 스크래핑
npx tsx src/scripts/tj2/1-fetch-artist.ts "아이유"
# 출력: 아이유-2026-01-09T12-30-45.json

# 2. Dry-run으로 확인
npx tsx src/scripts/tj2/2-update-db.ts "./아이유-2026-01-09T12-30-45.json" --dry-run

# 3. 문제없으면 실제 업데이트
npx tsx src/scripts/tj2/2-update-db.ts "./아이유-2026-01-09T12-30-45.json"
```

## 주의사항

- TJ 미디어 웹사이트 구조가 변경되면 스크래핑이 실패할 수 있습니다
- 대량 스크래핑 시 서버 부하를 고려하세요
- DB 업데이트 전 반드시 백업하세요
- `realArtist` 배열은 중복을 허용하지 않으므로 같은 JSON을 여러 번 실행해도 안전합니다
