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

### 기본 컬럼 → q_* 필드

- `_p` (primary) 필드는 DB 원본 + 괄호/구두점 제거 버전을 그대로 저장합니다.
- `_norm` 필드는 `cleanText(removeSpaces())`로 만든 토큰을 저장하며 infix 검색을 위해 사용합니다.
- 일본어 필드는 히라가나/가타카나 변환을 자동으로 추가합니다.
- 더 이상 별칭(SongAlias/ArtistAlias)을 Typesense에 넣지 않습니다. 운영 데이터를 정제된 기본 컬럼만 사용합니다.

### q_combo_a (조합 검색)

곡명 + 아티스트명 조합 (공백 제거):

```typescript
// 예시
titleKo = "밤을 달리다"
artistKo = "요아소비"
// → q_combo_a = ["밤을달리다요아소비"]
```

## 🔍 검색 쿼리 예시

```typescript
{
  q: "밤을달리다",
  query_by: [
    "q_song_ko_p",
    "q_song_ko_norm",
    "q_song_latin_p",
    "q_song_latin_norm",
    "q_artist_ko_p",
    "q_artist_ko_norm",
    "q_artist_latin_p",
    "q_artist_latin_norm",
    "q_combo_a"
  ].join(","),
  sort_by: "_text_match:desc,popularity:desc,updatedAt:desc"
}
```

## 📝 주의사항

- **TJ 곡 ID는 검색 안 함**: `tjSongId`는 `index: false`
- **곡 인기도(`songPopularity`)**: `artistPopularity + spotifyTrackPopularity + (hasTjSong ? 5 : 0)` 로 계산
- **표시용 제목은 검색 안 함**: `titleKo`, `titleJaKanji` 등은 `index: false`
- **아티스트 이름 공백 제거 버전**: `q_name_*_norm` 필드에 저장하고 infix 검색 전용으로 사용
- **q_combo_a는 1~2개만**: 조합 폭발 방지
- **F(Fuzzy)는 초기엔 비움**: 유저 로그 모인 후 추가

## 🆕 레거시 스크립트와 차이점

| 항목 | 레거시 | 새 구조 |
|------|--------|---------|
| 파일 구조 | 단일 파일 | 모듈 분리 |
| 별칭 의존 | ✅ | ❌ (기본 컬럼만 사용) |
| 정규화 필드 | 제한적 | KO/LATIN/JA 전체 지원 |
| Spotify 인기도 | ❌ | ✅ |
| 조합 검색 | ❌ | ✅ (q_combo_a) |
| 타입 안정성 | 약함 | 강함 |

## 📚 참고

- `/backend/typesense/README.md` - 검색 설계 문서
- `/backend/typesense/example.json` - 문서 예시
