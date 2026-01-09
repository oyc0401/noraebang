# YouTube Music API 스크립트

YouTube Music API를 활용하여 아티스트-곡 매핑을 검증하는 자동화 스크립트 모음입니다.

## 설정

### 1. 환경변수 설정

`.env` 파일에 YouTube Music 쿠키를 추가해야 합니다:

```bash
YOUTUBE_MUSIC_COOKIE=<쿠키 값>
```

### 2. 쿠키 획득 방법

1. [YouTube Music](https://music.youtube.com) 접속 후 로그인
2. 개발자 도구 열기 (F12 또는 Ctrl+Shift+I)
3. **Network** 탭 선택
4. YouTube Music에서 아티스트 페이지 접속 또는 검색 수행
5. Network 탭에서 `/browse` 요청 찾기 (필터에 "browse" 입력)
6. 요청 클릭 → **Headers** 탭 → **Request Headers** 섹션
7. `cookie:` 값 전체 복사 (매우 긴 문자열)
8. `.env` 파일에 붙여넣기

```env
YOUTUBE_MUSIC_COOKIE=VISITOR_INFO1_LIVE=...; PREF=...; YSC=...; (매우 긴 값)
```

## 스크립트

### 1. test-ytmusic.ts - API 테스트

YouTube Music API 연결 및 메서드 확인

```bash
pnpm tsx src/scripts/youtube-music/test-ytmusic.ts
```

**출력:**
- 사용 가능한 API 메서드 목록
- 간단한 검색 테스트 결과

---

### 2. search-artist-songs.ts - 아티스트 곡 조회

특정 아티스트의 모든 곡, 앨범, 싱글 정보를 조회합니다.

```bash
# 기본 사용 (상위 20곡)
pnpm tsx src/scripts/youtube-music/search-artist-songs.ts "아이유"

# 더 많은 곡 보기
pnpm tsx src/scripts/youtube-music/search-artist-songs.ts "BTS" --limit=50
```

**출력:**
- 검색된 아티스트 목록
- 아티스트의 곡 목록 (제목, Video ID, 앨범, 재생시간)
- 앨범 목록
- 싱글 목록

---

### 3. verify-artist-songs.ts - 아티스트-곡 검증 ⭐

TJ 데이터의 아티스트-곡 매핑을 YouTube Music 데이터와 비교하여 검증합니다.

#### 단일 아티스트 검증

```bash
# Artist ID로 검증
pnpm tsx src/scripts/youtube-music/verify-artist-songs.ts --artist-id=1

# 아티스트 이름으로 검증
pnpm tsx src/scripts/youtube-music/verify-artist-songs.ts --artist-name="아이유"
```

#### 배치 검증 (추천!)

곡 개수가 많은 상위 N명의 아티스트를 일괄 검증합니다.

```bash
# 상위 10명 검증
pnpm tsx src/scripts/youtube-music/verify-artist-songs.ts --batch --limit=10

# 상위 100명 검증 (전체 곡의 대부분 커버)
pnpm tsx src/scripts/youtube-music/verify-artist-songs.ts --batch --limit=100
```

**검증 로직:**

1. TJ 곡 제목과 YouTube Music 곡 제목 비교
2. Levenshtein Distance 기반 유사도 계산
3. 신뢰도 점수 부여:
   - ✅ **90%+ (높은 신뢰도)** - 자동 승인 가능
   - ⚠️ **70-90% (중간 신뢰도)** - 간단한 수동 검토
   - ⚠️ **50-70% (낮은 신뢰도)** - 상세 검토 필요
   - ❌ **50% 미만** - 검증 실패

**출력 예시:**

```
🎤 아티스트: 아이유 (ID: 1)
   곡 개수: 245개

🔍 YouTube Music 검색 중...
✅ YouTube Music 아티스트: IU
✅ YouTube Music 곡 개수: 312개

📊 곡 매칭 분석:

✅ [높음] 좋은날 → 좋은 날 (Good Day) (95.5%)
✅ [높음] 너의 의미 → 너의 의미 (The Meaning of You) (92.1%)
⚠️  [중간] BBIBBI → 삐삐 (BBIBBI) (78.3%)
⚠️  [낮음] Blueming → Blueming (블루밍) (65.2%)
❌ [없음] Unknown Song → 매칭 없음

📈 검증 결과:
   총 곡 수: 245개
   검증됨 (≥70%): 198개 (80.8%)
   ├─ 높은 신뢰도 (≥90%): 156개
   ├─ 중간 신뢰도 (70-90%): 42개
   └─ 낮은 신뢰도 (50-70%): 10개
```

## 사용 시나리오

### 1️⃣ 전체 데이터 검증

```bash
# 1단계: 상위 100명 아티스트 검증 (70,000곡의 대부분 커버)
pnpm tsx src/scripts/youtube-music/verify-artist-songs.ts --batch --limit=100

# 2단계: 출력된 "검증률 하위 아티스트" 목록 확인
# 3단계: 의심스러운 아티스트 개별 검증
pnpm tsx src/scripts/youtube-music/verify-artist-songs.ts --artist-name="의심되는 아티스트"
```

### 2️⃣ 특정 아티스트 상세 분석

```bash
# 1단계: 아티스트 정보 확인
pnpm tsx src/scripts/youtube-music/search-artist-songs.ts "김태우"

# 2단계: 검증 실행
pnpm tsx src/scripts/youtube-music/verify-artist-songs.ts --artist-name="김태우"

# 3단계: 검증률이 낮으면 수동 수정
```

### 3️⃣ 신뢰도 기반 자동화

검증 스크립트 결과를 바탕으로:

1. **높은 신뢰도 (90%+)** → 자동 승인
2. **중간 신뢰도 (70-90%)** → 간단한 수동 확인
3. **낮은 신뢰도 (50-70%)** → 상세 검토
4. **검증 실패 (50% 미만)** → 잘못된 매핑 가능성 높음

## Rate Limiting

YouTube Music API는 요청 제한이 있을 수 있습니다:

- 배치 검증 시 각 아티스트마다 **1초 대기**
- 너무 많은 요청 시 일시적으로 차단될 수 있음
- 차단 시 몇 분 후 재시도

## 문제 해결

### "YOUTUBE_MUSIC_COOKIE 환경변수가 설정되지 않았습니다"

→ `.env` 파일에 쿠키를 추가하세요.

### "Request failed with status code 403"

→ 쿠키가 만료되었습니다. 새로 발급받아야 합니다.

### "아티스트를 찾을 수 없습니다"

→ YouTube Music에 해당 아티스트가 없거나, 이름이 다를 수 있습니다.

### "곡 정보를 찾을 수 없습니다"

→ 해당 아티스트의 곡이 YouTube Music에 없거나, API 응답 구조가 변경되었을 수 있습니다.

## 다음 단계

이 스크립트들로 검증한 후:

1. **ArtistAlias / SongAlias 생성** - YouTube Music에서 가져온 공식 제목으로 alias 생성
2. **자동 수정 스크립트** - 검증률 95%+ 아티스트의 잘못된 매핑 자동 삭제
3. **CSV 내보내기** - 검증 결과를 CSV로 내보내서 스프레드시트에서 검토

## 라이브러리

- [youtube-music-ts-api](https://github.com/nickp10/youtube-music-ts-api) - TypeScript YouTube Music API
