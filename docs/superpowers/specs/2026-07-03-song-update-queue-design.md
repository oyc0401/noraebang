# 곡 업데이트 큐 파이프라인 (SongUpdateQueue) 설계

날짜: 2026-07-03
상태: 승인됨

## 목적

이미 저장된 Song의 데이터를 수동 검수를 거쳐 갱신하는 파이프라인.
기존 곡생성큐(`SongCreationQueue`) 파이프라인과 동일한 패턴(push → 스테이징 → 검토 UI → 반영 → 큐 정리)을 따른다.

갱신 대상:
- 미디어 재매칭 (유튜브 영상 / 스포티파이 트랙 후보 재검색)
- 제목 변형 재생성 (titleKo 등 AI 생성 필드)
- 썸네일 갱신
- 전체 필드 수동 편집

## 확정된 결정 사항

- **큐 투입**: 어드민에서 곡 ID를 수동 선택해서 push (조건 일괄/가수 단위 투입은 이번 범위 아님)
- **구조**: `SongUpdateQueue` 스테이징 테이블 신설 (A안). push 시점에 미디어·제목 보강을 배치 실행하고 JSON 스냅샷으로 저장
- **미디어 반영**: 조인 테이블(`song_youtube_video`, `song_spotify_track`)에 **추가만** 한다. 기존 연결은 삭제하지 않는다
- **제목·썸네일 반영**: 검토 UI에서 확정한 값으로 Song 필드를 덮어쓴다

## 1. 스키마 (server/prisma/schema.prisma)

`SongUpdateQueue` 모델 신설 — `SongCreationQueue`와 같은 모양이되 `tjSongId` 대신 `songId`(unique)를 키로 가진다.

```prisma
model SongUpdateQueue {
  id     Int @id @default(autoincrement())
  songId Int @unique @map("song_id")

  // 제목 변형: push 시 AI 재생성 결과 (검토 UI에서 기존 Song 값과 나란히 비교)
  title           String
  titleKo         String? @map("title_ko")
  titleJa         String? @map("title_ja")
  titleJaPronu    String? @map("title_ja_pronu")
  titleJaKana     String? @map("title_ja_kana")
  titleJaKanji    String? @map("title_ja_kanji")
  titleLatin      String? @map("title_latin")
  titleLatinPronu String? @map("title_latin_pronu")

  // 미디어 후보 스냅샷 (기존 큐와 동일하게 JSON 스테이징)
  youtubeVideos Json @default("[]") @map("youtube_videos")
  spotifyTracks Json @default("[]") @map("spotify_tracks")

  thumbnailDefault String? @map("thumbnail_default")
  thumbnailHigh    String? @map("thumbnail_high")
  thumbnailMedium  String? @map("thumbnail_medium")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("song_update_queue")
}
```

Song과의 FK 관계는 걸지 않고 songId만 저장한다(기존 큐 테이블들과 동일한 무FK 스테이징 관례).

## 2. 파이프라인 흐름

### 2-1. push — `POST /song-update-queue/push`

body: `{ songIds: number[] }`

각 곡에 대해:
1. Song + 연결된 Artist(artist_song 경유) 조회
2. 미디어 DB에서 유튜브/스포티파이 후보 재검색 — 기존 `queue-media` 매칭 로직 재사용
3. 제목 변형 AI 재생성 — 기존 `title-generater` 재사용, 원본은 `Song.title`
4. 썸네일 후보를 미디어 DB에서 조회
5. `SongUpdateQueue`에 upsert가 아닌 create. 이미 큐에 있는 곡(songId unique 충돌)은 skip

응답: `{ requested, pushed, skipped }` (creation queue와 동일 패턴)

skip 사유: 곡 없음, 연결된 가수 없음, 이미 큐에 존재. 배치가 중간에 죽지 않도록 개별 곡 실패는 skip으로 집계한다.

### 2-2. 조회 — `GET /song-update-queue`

큐 아이템 전체 + 각 songId의 현재 Song 값(제목 변형 전체, 현재 연결된 미디어 ID 목록, 썸네일)과 가수 이름을 함께 내려서 검토 UI가 비교 표시할 수 있게 한다.

### 2-3. 검토 UI — `SongUpdateQueuePage`

`admin/web/src/song-update-queue/SongUpdateQueuePage.tsx` 신설. 기존 `SongCreationQueuePage` 패턴 재사용:
- 기존 Song 값(제목 변형, 현재 연결 미디어, 썸네일)과 큐의 새 후보를 나란히 표시
- 제목 칩 편집 (모든 제목 필드 수동 수정 가능 = 전체 필드 수동 편집 요구 충족)
- 미디어 후보 카드 토글. 이미 연결된 미디어는 "연결됨"으로 표시만 하고 해제 불가 (추가만 정책)
- 스포티파이 미리듣기
- 반영(apply) / 삭제(delete) 버튼

### 2-4. apply — `POST /song-update-queue/:id/apply`

body: 확정된 제목 변형 필드들 + catalog + 썸네일 + 추가할 `youtubeVideoIds`/`spotifyTrackIds`

트랜잭션으로:
1. Song의 title/titleKo/…/catalog/thumbnail* 필드를 요청 값으로 update (title 필수, 나머지는 null 허용)
2. `song_youtube_video`, `song_spotify_track`에 선택된 ID **추가만** — 이미 연결된 ID는 중복 무시(unique 제약 + skipDuplicates)
3. 큐 아이템 삭제

응답: `{ songId }`

### 2-5. delete — `DELETE /song-update-queue/:id`

검토 없이 큐에서 제거. 기존과 동일.

## 3. 코드 배치

- `admin/src/api/collection/song-update-queue/` 모듈 신설
  - `song-update-queue.controller.ts` / `song-update-queue.service.ts` / `song-update-queue.manager.ts` / `song-update-queue.module.ts` / `dto/`
  - 구성과 코드 스타일은 기존 `song-creation-queue` 모듈과 동일하게
  - 미디어 매칭·제목 생성 로직은 기존 모듈에서 import 재사용. 복사 금지, 과도한 추상화도 금지 — 필요하면 함수 시그니처만 songId 기준으로 받게 소폭 조정
- `admin/src/app.module.ts`에 모듈 등록
- 프런트: `admin/web/src/song-update-queue/SongUpdateQueuePage.tsx` + `App.tsx` 라우팅 등록
- 가수별 곡 관리 페이지에 곡 선택 → "업데이트 큐에 올리기" push 버튼 추가

## 4. 에러 처리

- push: 개별 곡 실패(곡 없음/가수 없음/중복)는 skip 집계, 배치 지속
- apply: 큐 아이템 없음 → 404, Song 없음(그 사이 삭제됨) → 404, title 빈값 → 400
- Prisma P2002(unique 충돌)는 기존 create-song과 동일하게 400으로 변환

## 5. 테스트

- service 단위: push skip 집계, apply 트랜잭션(필드 덮어쓰기 + 미디어 추가만 + 큐 삭제), 중복 미디어 무시
- 기존 프로젝트에 테스트 관례가 없으면 수동 검증 시나리오로 대체: push → 검토 UI 확인 → apply → Song/조인 테이블 확인
