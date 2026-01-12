# Typesense 인덱싱 (새 구조)

## 📁 폴더 구조

```
admin/src/typesense/
├── README.md              # 이 파일
├── client.ts              # Typesense 클라이언트 초기화
├── schema.ts              # Collection 스키마 정의
├── transformer.ts         # DB → Typesense 문서 변환 로직
├── indexer.ts             # 인덱싱 유틸리티
└── scripts/
    └── index-songs.ts     # 곡 인덱싱 실행 스크립트
```

## 🚀 사용법

### 1. Typesense 서버 실행

```bash
cd backend
docker compose up -d typesense
```

### 2. 환경 변수 설정

`.env` 파일에 다음 설정 추가:

```bash
TYPESENSE_ENABLED=true
TYPESENSE_API_KEY=noraebang_search_secret_key
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
```

### 3. 인덱싱 실행

```bash
cd backend
pnpm ts-node src/typesense/scripts/index-songs.ts
```

## 📊 변환 로직

### SongAlias/ArtistAlias → q_* 필드 매핑

**locale 매핑:**
- `KO` → `q_*_ko_*`
- `JA_KANA` → `q_*_ja_kana_*`
- `JA_KANJI` → `q_*_ja_kanji_*`
- `LATIN` → `q_song_latin_*` / `q_artist_raw_*`

**kind → tier 매핑:**
- `SPOTIFY` → `_p` (Primary)
- `YOUTUBE`, `ROMANIZATION`, `TRANSLATION`, `TJ_NAME`, `NICKNAME` → `_a` (Alias)
- `source=AI`일 때 → `_a2` (AI Alias)

**예시:**

```typescript
// DB
{ songId: 1, alias: "밤을 달리다", locale: "KO", kind: "TRANSLATION", source: "OPERATOR" }
// → Typesense
q_song_ko_a = ["밤을 달리다"]

// DB
{ artistId: 123, alias: "YOASOBI", locale: "LATIN", kind: "SPOTIFY", source: "SYSTEM" }
// → Typesense
q_artist_raw_p = ["YOASOBI"]
```

### q_combo_a (조합 검색)

곡명 + 아티스트명 조합 (공백 제거):

```typescript
// 예시
titleKo = "밤을 달리다"
artistKo = "요아소비"
// → q_combo_a = ["밤을달리다요아소비"]
```

## 🔍 검색 쿼리 예시

### 기본 검색 (P + A만)

```typescript
{
  q: "밤을달리다",
  query_by: "q_song_ko_p,q_song_ko_a,q_artist_ko_p,q_artist_ko_a",
  sort_by: "_text_match:desc,popularity:desc,updatedAt:desc"
}
```

### AI 별칭 포함 (0 hit일 때만)

```typescript
{
  q: "밤을달리다",
  query_by: "q_song_ko_p,q_song_ko_a,q_song_ko_a2,q_artist_ko_p,q_artist_ko_a,q_artist_ko_a2",
  sort_by: "_text_match:desc,popularity:desc,updatedAt:desc"
}
```

## 📝 주의사항

- **TJ 곡 ID는 검색 안 함**: `tjSongId`는 `index: false`
- **표시용 제목은 검색 안 함**: `titleKo`, `titleJaKanji` 등은 `index: false`
- **아티스트 이름 공백 제거 버전**: `q_name_*_norm` 필드에 저장하고 infix 검색 전용으로 사용
- **q_combo_a는 1~2개만**: 조합 폭발 방지
- **F(Fuzzy)는 초기엔 비움**: 유저 로그 모인 후 추가

## 🆕 레거시 스크립트와 차이점

| 항목 | 레거시 | 새 구조 |
|------|--------|---------|
| 파일 구조 | 단일 파일 | 모듈 분리 |
| 별칭 지원 | ❌ | ✅ (SongAlias, ArtistAlias) |
| 티어 분리 | ❌ | ✅ (P/A/A2/F) |
| Spotify 인기도 | ❌ | ✅ |
| 조합 검색 | ❌ | ✅ (q_combo_a) |
| 타입 안정성 | 약함 | 강함 |

## 📚 참고

- `/backend/typesense/README.md` - 검색 설계 문서
- `/backend/typesense/example.json` - 문서 예시
