# 곡 업데이트 큐 파이프라인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) 문법으로 진행 상황을 추적한다.

**Goal:** 이미 저장된 Song을 수동 선택해 큐에 올리고, 미디어 재매칭·제목 변형 재생성 결과를 검토 UI에서 기존 값과 비교한 뒤 Song에 반영(제목·썸네일 덮어쓰기, 미디어는 추가만)하는 파이프라인.

**Architecture:** 기존 곡생성큐(`song-creation-queue`)와 동일한 push → 스테이징 → 검토 UI → 반영 패턴. `SongUpdateQueue` 테이블(songId unique)을 신설하고, NestJS 모듈 `admin/src/api/collection/song-update-queue/`와 React 페이지 `admin/web/src/song-update-queue/SongUpdateQueuePage.tsx`를 추가한다. 미디어 매칭(`searchSongMedia`)·제목 생성(`getTitleKo`)·미디어 표시정보 조회(`media-lookup`)는 기존 모듈에서 import 재사용한다.

**Tech Stack:** NestJS 11 + Prisma 7 (admin 서버), React + Tailwind (admin/web), PostgreSQL.

**스펙 문서:** `docs/superpowers/specs/2026-07-03-song-update-queue-design.md`

## Global Constraints

- 과도한 추상화 절대 금지, SOLID 원칙 (CLAUDE.md)
- `pnpm install`, `pnpm run dev` 절대 실행하지 않기 — DB 적용/prisma generate/빌드는 **사용자에게 요청**하는 체크포인트로 처리 (CLAUDE.md)
- 스키마는 `server/prisma/schema.prisma`와 `admin/prisma/schema.prisma` **양쪽**을 동일하게 수정 (두 파일은 복사본으로 항상 동기화되어 있음 — diff로 확인됨)
- 코드 스타일: 기존 `song-creation-queue` 모듈과 동일 (module-private 헬퍼 함수는 파일 하단, 과도한 공용화 금지 — 기존 코드도 normalize 헬퍼를 파일마다 복사해 둠)
- 미디어 조인 반영은 **추가만** (`skipDuplicates`), 기존 연결 삭제 없음
- 테스트: 이 프로젝트는 순수 함수만 vitest spec으로 테스트하고 DB 의존 서비스는 수동 검증하는 관례 (spec.ts는 `lib/`, `artist-creation-queue/ja` 등에만 존재). 이 계획도 그 관례를 따라 각 태스크 끝에 수동 검증 체크포인트를 둔다.
- 어드민 서버는 `http://localhost:3002`, API prefix는 `/api`, Swagger는 `/api/docs/collection`

---

### Task 1: 스키마 — SongUpdateQueue 모델 추가

**Files:**
- Modify: `server/prisma/schema.prisma` (파일 끝 `User` 모델 앞, `SongCreationQueue` 모델 뒤)
- Modify: `admin/prisma/schema.prisma` (동일 위치, 동일 내용)

**Interfaces:**
- Produces: Prisma 모델 `SongUpdateQueue` (client 접근자 `prisma.songUpdateQueue`), 테이블 `song_update_queue`. 이후 모든 백엔드 태스크가 이 모델을 사용한다.

- [ ] **Step 1: 두 schema.prisma에 모델 추가**

`SongCreationQueue` 모델 정의 바로 아래에 다음 블록을 추가한다 (양쪽 파일 모두 동일하게):

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

  // 미디어 후보 스냅샷 (곡생성큐와 동일하게 JSON 스테이징, UI 표시용 필드 포함)
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

- [ ] **Step 2: 두 파일이 동일한지 확인**

Run: `diff server/prisma/schema.prisma admin/prisma/schema.prisma && echo IDENTICAL`
Expected: `IDENTICAL`

- [ ] **Step 3: 사용자 체크포인트 — DB 적용 + client 생성**

pnpm 실행 금지 규칙 때문에 아래 명령을 **사용자에게 직접 실행 요청**한다 (`!` prefix 안내):

```bash
pnpm -C server exec prisma db push
pnpm -C admin exec prisma generate
```

Expected: `song_update_queue` 테이블 생성, admin Prisma client에 `songUpdateQueue` 접근자 생성. 사용자가 완료를 확인해줄 때까지 다음 태스크로 진행하지 않는다.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma admin/prisma/schema.prisma
git commit -m "song_update_queue 테이블 추가"
```

---

### Task 2: 백엔드 — SongUpdateQueueManager (push 보강 로직)

**Files:**
- Create: `admin/src/api/collection/song-update-queue/song-update-queue.manager.ts`

**Interfaces:**
- Consumes:
  - `searchSongMedia(title: string, artistId: number): Promise<SearchSongMediaResult>` — `../song-creation-queue/index`
  - `getTitleKo(songTitle: string, artistName: string | null): Promise<string>` — `../song-creation-queue/title-generater`
  - `toHiragana(text: string): Promise<string>` — `../artist-creation-queue/ja`
  - `getJaPron(kana: string): Promise<string>`, `getLatinPron(latin: string): string` — `../artist-creation-queue/pron`
  - `YoutubeVideoMatch` 타입 — `../song-creation-queue/youtube`
- Produces:
  - `SongUpdateQueueManager.pushSongUpdateQueueFromSong(songId: number): Promise<SongUpdateQueue | null>` — 성공 시 생성된 큐 row, skip 시 null
  - `SongUpdateQueueManager.getMediaCandidates(songId: number): Promise<SearchSongMediaResult | null>` — 곡 없음/가수 미연결 시 null

- [ ] **Step 1: manager 파일 작성**

기존 `song-creation-queue.manager.ts`와 동일한 구조. 차이점: 원본이 TjSong이 아니라 Song이고, 가수는 `artist_song`에서 찾고, 이미 큐에 있으면 skip(null)한다.

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { toHiragana } from "../artist-creation-queue/ja";
import { getJaPron, getLatinPron } from "../artist-creation-queue/pron";
import {
  searchSongMedia,
  type SearchSongMediaResult,
} from "../song-creation-queue/index";
import { getTitleKo } from "../song-creation-queue/title-generater";
import type { YoutubeVideoMatch } from "../song-creation-queue/youtube";

@Injectable()
export class SongUpdateQueueManager {
  constructor(private readonly prisma: PrismaService) {}

  // 저장된 Song을 미디어 재매칭 + 제목 변형 재생성으로 보강해 업데이트 큐에 넣는다.
  async pushSongUpdateQueueFromSong(songId: number) {
    // 이미 큐에 있는 곡은 다시 보강하지 않는다 (검토 중인 스냅샷 보존).
    const existing = await this.prisma.songUpdateQueue.findUnique({
      where: { songId },
      select: { id: true },
    });

    if (existing) {
      return null;
    }

    const song = await this.prisma.song.findUnique({
      where: { id: songId },
      select: { id: true, title: true },
    });

    if (!song) {
      return null;
    }

    const title = normalizeRequired(song.title);

    if (!title) {
      return null;
    }

    // 가수 미연결 곡은 미디어 검색이 불가능하므로 큐에 넣지 않는다.
    const artistId = await this.findLinkedArtistId(songId);

    if (artistId === null) {
      return null;
    }

    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { name: true },
    });

    const media = await searchSongMedia(title, artistId);
    const titleJa = media.titleJa;
    const titleLatin = media.titleLatin;
    const titleJaKana = titleJa
      ? normalizeNullable(await toHiragana(titleJa))
      : null;
    const topYoutubeVideo = pickTopYoutubeVideo(media.youtubeVideos);

    return this.prisma.songUpdateQueue.create({
      data: {
        songId,
        title,
        titleKo: normalizeNullable(
          await getTitleKo(titleJa ?? title, artist?.name ?? null),
        ),
        titleJa,
        titleJaKana,
        titleJaPronu: titleJaKana ? await getJaPron(titleJaKana) : null,
        titleJaKanji: titleJa && hasKanji(titleJa) ? titleJa : null,
        titleLatin,
        titleLatinPronu: titleLatin ? getLatinPron(titleLatin) : null,
        // UI에서 제목을 바로 보여줄 수 있게 표시용 필드까지 JSON으로 저장한다.
        youtubeVideos: media.youtubeVideos.map((video) => ({
          id: video.id,
          title: video.title,
          thumbnailMedium: video.thumbnailMedium,
          viewCount: video.viewCount,
        })),
        spotifyTracks: media.spotifyTracks.map((track) => ({
          id: track.id,
          name: track.name,
          releaseDate: track.releaseDate,
          albumImage: track.albumImages[0] ?? null,
        })),
        thumbnailDefault: topYoutubeVideo?.thumbnailDefault ?? null,
        thumbnailMedium: topYoutubeVideo?.thumbnailMedium ?? null,
        thumbnailHigh: topYoutubeVideo?.thumbnailHigh ?? null,
      },
    });
  }

  // 검토 UI가 후보 목록(제목/썸네일/조회수 등)을 실시간으로 다시 조회할 때 쓴다.
  async getMediaCandidates(
    songId: number,
  ): Promise<SearchSongMediaResult | null> {
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
      select: { title: true },
    });

    if (!song) {
      return null;
    }

    const artistId = await this.findLinkedArtistId(songId);

    if (artistId === null) {
      return null;
    }

    return searchSongMedia(song.title, artistId);
  }

  private async findLinkedArtistId(songId: number): Promise<number | null> {
    const artistSong = await this.prisma.artistSong.findFirst({
      where: { songId },
      select: { artistId: true },
      orderBy: { id: "asc" },
    });

    return artistSong?.artistId ?? null;
  }
}

function pickTopYoutubeVideo(
  videos: YoutubeVideoMatch[],
): YoutubeVideoMatch | null {
  let top: YoutubeVideoMatch | null = null;
  let topViewCount = -1;

  for (const video of videos) {
    const viewCount = Number(video.viewCount ?? 0);

    if (viewCount > topViewCount) {
      top = video;
      topViewCount = viewCount;
    }
  }

  return top;
}

function hasKanji(value: string): boolean {
  return /[一-龯]/.test(value);
}

function normalizeRequired(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized || null;
}

function normalizeNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized || null;
}
```

주의: `../song-creation-queue/index`의 `searchSongMedia`는 media DB(`MEDIA_DATABASE_URL`)와 메인 DB(`DATABASE_URL`)에 직접 접속하므로 환경변수는 어드민 서버 실행 환경에 이미 설정되어 있다 (곡생성큐가 같은 함수를 사용 중).

- [ ] **Step 2: Commit**

```bash
git add admin/src/api/collection/song-update-queue/song-update-queue.manager.ts
git commit -m "곡 업데이트 큐 manager: 미디어 재매칭 + 제목 변형 재생성 push"
```

---

### Task 3: 백엔드 — DTO 정의

**Files:**
- Create: `admin/src/api/collection/song-update-queue/dto/push-song-update-queue-request.dto.ts`
- Create: `admin/src/api/collection/song-update-queue/dto/push-song-update-queue-response.dto.ts`
- Create: `admin/src/api/collection/song-update-queue/dto/song-update-queue-item.dto.ts`
- Create: `admin/src/api/collection/song-update-queue/dto/song-update-queue-list-response.dto.ts`
- Create: `admin/src/api/collection/song-update-queue/dto/apply-song-update-request.dto.ts`
- Create: `admin/src/api/collection/song-update-queue/dto/apply-song-update-response.dto.ts`
- Create: `admin/src/api/collection/song-update-queue/dto/delete-song-update-queue-response.dto.ts`

**Interfaces:**
- Consumes: `QueueYoutubeVideoDto`, `QueueSpotifyTrackDto` — `../../song-creation-queue/dto/song-creation-queue-item.dto` (import 재사용, 복사 금지)
- Produces: 아래 DTO 클래스들. Task 4의 service/controller가 사용한다.
  - `SongUpdateQueueItemDto` — 큐 스냅샷 + `currentSong`(기존 Song 값 비교용)
  - `CurrentSongDto`, `CurrentSongMediaDto` — 기존 Song 상태 표현
  - `ApplySongUpdateRequestDto` — 반영 요청 (제목 변형 + catalog + 썸네일 + 추가할 미디어 ID 배열)

- [ ] **Step 1: push request DTO**

`dto/push-song-update-queue-request.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";

export class PushSongUpdateQueueRequestDto {
  @ApiProperty({
    description: "song.id 목록: 업데이트 큐에 넣을 곡 ID 목록",
    type: [Number],
    example: [1],
  })
  songIds: number[];
}
```

- [ ] **Step 2: push response DTO**

`dto/push-song-update-queue-response.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";

export class PushSongUpdateQueueResponseDto {
  @ApiProperty({ example: 3 })
  requested: number;

  @ApiProperty({ example: 2 })
  pushed: number;

  @ApiProperty({
    description: "곡이 없거나 가수 미연결이거나 이미 큐에 있어 건너뛴 수",
    example: 1,
  })
  skipped: number;
}
```

- [ ] **Step 3: 큐 아이템 DTO (현재 Song 값 포함)**

`dto/song-update-queue-item.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";
import {
  QueueSpotifyTrackDto,
  QueueYoutubeVideoDto,
} from "../../song-creation-queue/dto/song-creation-queue-item.dto";

export class CurrentSongMediaDto {
  @ApiProperty({ description: "media id", example: "0xSiBpUdW4E" })
  id: string;

  @ApiProperty({
    description: "media db에서 조회한 표시용 제목 (없으면 id 그대로)",
    example: "あいみょん - マリーゴールド【OFFICIAL MUSIC VIDEO】",
  })
  label: string;
}

export class CurrentSongDto {
  @ApiProperty({ example: "マリーゴールド" })
  title: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleKo?: string;

  @ApiProperty({ required: false, example: "マリーゴールド" })
  titleJa?: string;

  @ApiProperty({ required: false, example: "마리-고-루도" })
  titleJaPronu?: string;

  @ApiProperty({ required: false, example: "まりーごーるど" })
  titleJaKana?: string;

  @ApiProperty({ required: false, example: "金盞花" })
  titleJaKanji?: string;

  @ApiProperty({ required: false, example: "Marigold" })
  titleLatin?: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleLatinPronu?: string;

  @ApiProperty({ required: false, example: "JPOP" })
  catalog?: string;

  @ApiProperty({ example: true })
  visible: boolean;

  @ApiProperty({ required: false, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string;

  @ApiProperty({ required: false, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string;

  @ApiProperty({ required: false, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string;

  @ApiProperty({
    description: "현재 연결된 유튜브 영상 (해제 불가, 표시용)",
    type: [CurrentSongMediaDto],
  })
  youtubeVideos: CurrentSongMediaDto[];

  @ApiProperty({
    description: "현재 연결된 스포티파이 트랙 (해제 불가, 표시용)",
    type: [CurrentSongMediaDto],
  })
  spotifyTracks: CurrentSongMediaDto[];
}

export class SongUpdateQueueItemDto {
  @ApiProperty({ description: "song_update_queue.id", example: 1 })
  id: number;

  @ApiProperty({ description: "song.id: 업데이트 대상 곡 ID", example: 1 })
  songId: number;

  @ApiProperty({ description: "push 시점에 재생성한 제목", example: "マリーゴールド" })
  title: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleKo?: string;

  @ApiProperty({ required: false, example: "マリーゴールド" })
  titleJa?: string;

  @ApiProperty({ required: false, example: "마리-고-루도" })
  titleJaPronu?: string;

  @ApiProperty({ required: false, example: "まりーごーるど" })
  titleJaKana?: string;

  @ApiProperty({ required: false, example: "金盞花" })
  titleJaKanji?: string;

  @ApiProperty({ required: false, example: "Marigold" })
  titleLatin?: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleLatinPronu?: string;

  @ApiProperty({
    description: "push 시점에 재검색한 유튜브 후보 (표시용 제목 포함)",
    type: [QueueYoutubeVideoDto],
  })
  youtubeVideos: QueueYoutubeVideoDto[];

  @ApiProperty({
    description: "push 시점에 재검색한 스포티파이 후보 (표시용 이름 포함)",
    type: [QueueSpotifyTrackDto],
  })
  spotifyTracks: QueueSpotifyTrackDto[];

  @ApiProperty({ required: false, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string;

  @ApiProperty({ required: false, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string;

  @ApiProperty({ required: false, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string;

  @ApiProperty({ description: "연결된 아티스트 ID", required: false, example: 140 })
  artistId?: number;

  @ApiProperty({ description: "연결된 아티스트 이름", required: false, example: "あいみょん" })
  artistName?: string;

  @ApiProperty({
    description: "업데이트 대상 곡의 현재 값 (비교 표시용). 곡이 삭제됐으면 없음",
    required: false,
    type: CurrentSongDto,
  })
  currentSong?: CurrentSongDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
```

- [ ] **Step 4: 리스트 response DTO**

`dto/song-update-queue-list-response.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { SongUpdateQueueItemDto } from "./song-update-queue-item.dto";

export class SongUpdateQueueListResponseDto {
  @ApiProperty({ type: [SongUpdateQueueItemDto] })
  data: SongUpdateQueueItemDto[];
}
```

- [ ] **Step 5: apply request/response DTO**

`dto/apply-song-update-request.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";

export class ApplySongUpdateRequestDto {
  @ApiProperty({ required: false, example: "JPOP" })
  catalog?: string | null;

  @ApiProperty({ example: "マリーゴールド" })
  title: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleKo?: string | null;

  @ApiProperty({ required: false, example: "マリーゴールド" })
  titleJa?: string | null;

  @ApiProperty({ required: false, example: "마리-고-루도" })
  titleJaPronu?: string | null;

  @ApiProperty({ required: false, example: "まりーごーるど" })
  titleJaKana?: string | null;

  @ApiProperty({ required: false, example: "金盞花" })
  titleJaKanji?: string | null;

  @ApiProperty({ required: false, example: "Marigold" })
  titleLatin?: string | null;

  @ApiProperty({ required: false, example: "마리골드" })
  titleLatinPronu?: string | null;

  @ApiProperty({
    description: "곡에 추가할 유튜브 영상 ID 목록 (기존 연결은 유지, 추가만)",
    required: false,
    type: [String],
    example: ["0xSiBpUdW4E"],
  })
  youtubeVideoIds?: string[];

  @ApiProperty({
    description: "곡에 추가할 스포티파이 트랙 ID 목록 (기존 연결은 유지, 추가만)",
    required: false,
    type: [String],
    example: ["7yq4Qj7cqayVTp3FF9CWbm"],
  })
  spotifyTrackIds?: string[];

  @ApiProperty({ required: false, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string | null;

  @ApiProperty({ required: false, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string | null;

  @ApiProperty({ required: false, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string | null;
}
```

`dto/apply-song-update-response.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";

export class ApplySongUpdateResponseDto {
  @ApiProperty({ description: "업데이트된 곡 ID", example: 1 })
  songId: number;
}
```

- [ ] **Step 6: delete response DTO**

`dto/delete-song-update-queue-response.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";

export class DeleteSongUpdateQueueResponseDto {
  @ApiProperty({ description: "삭제된 큐 항목 ID", example: 1 })
  deletedId: number;
}
```

- [ ] **Step 7: Commit**

```bash
git add admin/src/api/collection/song-update-queue/dto
git commit -m "곡 업데이트 큐 DTO 추가"
```

---

### Task 4: 백엔드 — Service / Controller / Module + 등록

**Files:**
- Create: `admin/src/api/collection/song-update-queue/song-update-queue.service.ts`
- Create: `admin/src/api/collection/song-update-queue/song-update-queue.controller.ts`
- Create: `admin/src/api/collection/song-update-queue/song-update-queue.module.ts`
- Modify: `admin/src/app.module.ts` (import 목록과 `imports` 배열에 `SongUpdateQueueModule` 추가)

**Interfaces:**
- Consumes:
  - `SongUpdateQueueManager` (Task 2): `pushSongUpdateQueueFromSong(songId)`, `getMediaCandidates(songId)`
  - Task 3의 DTO 전부
  - `parseQueueYoutubeVideos(value: Prisma.JsonValue): QueueYoutubeVideo[]`, `parseQueueSpotifyTracks(...)` — `../song-creation-queue/queue-media`
  - `findYoutubeVideoInfos(ids: string[]): Promise<Map<string, YoutubeVideoInfo>>`, `findSpotifyTrackInfos(ids: string[]): Promise<Map<string, SpotifyTrackInfo>>` — `../../song/media-lookup`
  - `SongMediaCandidatesResponseDto` — `../song-creation-queue/dto/song-media-candidates-response.dto`
- Produces: REST API
  - `GET /api/song-update-queue` → `SongUpdateQueueListResponseDto`
  - `POST /api/song-update-queue/push` body `{songIds:number[]}` → `PushSongUpdateQueueResponseDto`
  - `GET /api/song-update-queue/:queueId/media-candidates` → `SongMediaCandidatesResponseDto`
  - `POST /api/song-update-queue/:queueId/apply` body `ApplySongUpdateRequestDto` → `ApplySongUpdateResponseDto`
  - `DELETE /api/song-update-queue/:queueId` → `DeleteSongUpdateQueueResponseDto`

- [ ] **Step 1: service 작성**

`song-update-queue.service.ts`:

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  findSpotifyTrackInfos,
  findYoutubeVideoInfos,
} from "../../song/media-lookup";
import { SongMediaCandidatesResponseDto } from "../song-creation-queue/dto/song-media-candidates-response.dto";
import {
  parseQueueSpotifyTracks,
  parseQueueYoutubeVideos,
} from "../song-creation-queue/queue-media";
import { ApplySongUpdateRequestDto } from "./dto/apply-song-update-request.dto";
import { ApplySongUpdateResponseDto } from "./dto/apply-song-update-response.dto";
import { DeleteSongUpdateQueueResponseDto } from "./dto/delete-song-update-queue-response.dto";
import { PushSongUpdateQueueResponseDto } from "./dto/push-song-update-queue-response.dto";
import { SongUpdateQueueListResponseDto } from "./dto/song-update-queue-list-response.dto";
import { CurrentSongDto } from "./dto/song-update-queue-item.dto";
import { SongUpdateQueueManager } from "./song-update-queue.manager";

@Injectable()
export class SongUpdateQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly songUpdateQueueManager: SongUpdateQueueManager,
  ) {}

  async findAll(): Promise<SongUpdateQueueListResponseDto> {
    const items = await this.prisma.songUpdateQueue.findMany({
      orderBy: { createdAt: "desc" },
    });

    const songIds = items.map((item) => item.songId);
    const songs = await this.prisma.song.findMany({
      where: { id: { in: songIds } },
      include: {
        youtubeVideos: { select: { youtubeVideoId: true } },
        spotifyTracks: { select: { spotifyTrackId: true } },
        artistSongs: {
          orderBy: { id: "asc" },
          take: 1,
          select: { artist: { select: { id: true, name: true } } },
        },
      },
    });
    const songById = new Map(songs.map((song) => [song.id, song]));

    // 조인 테이블에는 ID만 있으므로 표시용 제목은 media db에서 배치 조회한다.
    const youtubeVideoIds = songs.flatMap((song) =>
      song.youtubeVideos.map((video) => video.youtubeVideoId),
    );
    const spotifyTrackIds = songs.flatMap((song) =>
      song.spotifyTracks.map((track) => track.spotifyTrackId),
    );
    const [youtubeInfoById, spotifyInfoById] = await Promise.all([
      findYoutubeVideoInfos(Array.from(new Set(youtubeVideoIds))),
      findSpotifyTrackInfos(Array.from(new Set(spotifyTrackIds))),
    ]);

    return {
      data: items.map((item) => {
        const song = songById.get(item.songId);
        const artist = song?.artistSongs[0]?.artist;

        const currentSong: CurrentSongDto | undefined = song
          ? {
              title: song.title,
              titleKo: song.titleKo ?? undefined,
              titleJa: song.titleJa ?? undefined,
              titleJaPronu: song.titleJaPronu ?? undefined,
              titleJaKana: song.titleJaKana ?? undefined,
              titleJaKanji: song.titleJaKanji ?? undefined,
              titleLatin: song.titleLatin ?? undefined,
              titleLatinPronu: song.titleLatinPronu ?? undefined,
              catalog: song.catalog ?? undefined,
              visible: song.visible,
              thumbnailDefault: song.thumbnailDefault ?? undefined,
              thumbnailMedium: song.thumbnailMedium ?? undefined,
              thumbnailHigh: song.thumbnailHigh ?? undefined,
              youtubeVideos: song.youtubeVideos.map((video) => ({
                id: video.youtubeVideoId,
                label:
                  youtubeInfoById.get(video.youtubeVideoId)?.title ??
                  video.youtubeVideoId,
              })),
              spotifyTracks: song.spotifyTracks.map((track) => ({
                id: track.spotifyTrackId,
                label:
                  spotifyInfoById.get(track.spotifyTrackId)?.name ??
                  track.spotifyTrackId,
              })),
            }
          : undefined;

        return {
          id: item.id,
          songId: item.songId,
          title: item.title,
          titleKo: item.titleKo ?? undefined,
          titleJa: item.titleJa ?? undefined,
          titleJaPronu: item.titleJaPronu ?? undefined,
          titleJaKana: item.titleJaKana ?? undefined,
          titleJaKanji: item.titleJaKanji ?? undefined,
          titleLatin: item.titleLatin ?? undefined,
          titleLatinPronu: item.titleLatinPronu ?? undefined,
          youtubeVideos: parseQueueYoutubeVideos(item.youtubeVideos),
          spotifyTracks: parseQueueSpotifyTracks(item.spotifyTracks),
          thumbnailDefault: item.thumbnailDefault ?? undefined,
          thumbnailMedium: item.thumbnailMedium ?? undefined,
          thumbnailHigh: item.thumbnailHigh ?? undefined,
          artistId: artist?.id,
          artistName: artist?.name,
          currentSong,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    };
  }

  async pushSongIds(
    songIds: unknown,
  ): Promise<PushSongUpdateQueueResponseDto> {
    const pushSongIds = parseSongIds(songIds);
    let pushed = 0;

    for (const songId of pushSongIds) {
      const item =
        await this.songUpdateQueueManager.pushSongUpdateQueueFromSong(songId);

      if (item) {
        pushed += 1;
      }
    }

    return {
      requested: pushSongIds.length,
      pushed,
      skipped: pushSongIds.length - pushed,
    };
  }

  async getMediaCandidates(
    queueId: number,
  ): Promise<SongMediaCandidatesResponseDto> {
    const queueItem = await this.prisma.songUpdateQueue.findUnique({
      where: { id: queueId },
      select: { songId: true },
    });

    if (!queueItem) {
      throw new NotFoundException("song update queue item not found.");
    }

    const candidates = await this.songUpdateQueueManager.getMediaCandidates(
      queueItem.songId,
    );

    if (!candidates) {
      throw new BadRequestException(
        "song is missing or not linked to an artist.",
      );
    }

    return candidates;
  }

  async applyUpdate(
    queueId: number,
    body: ApplySongUpdateRequestDto | undefined,
  ): Promise<ApplySongUpdateResponseDto> {
    const queueItem = await this.prisma.songUpdateQueue.findUnique({
      where: { id: queueId },
      select: { id: true, songId: true },
    });

    if (!queueItem) {
      throw new NotFoundException("song update queue item not found.");
    }

    const song = await this.prisma.song.findUnique({
      where: { id: queueItem.songId },
      select: { id: true },
    });

    if (!song) {
      throw new NotFoundException("target song not found.");
    }

    const title = normalizeRequired(body?.title, "title");

    await this.prisma.$transaction(async (tx) => {
      await tx.song.update({
        where: { id: song.id },
        data: {
          title,
          titleKo: normalizeNullable(body?.titleKo),
          titleJa: normalizeNullable(body?.titleJa),
          titleJaPronu: normalizeNullable(body?.titleJaPronu),
          titleJaKana: normalizeNullable(body?.titleJaKana),
          titleJaKanji: normalizeNullable(body?.titleJaKanji),
          titleLatin: normalizeNullable(body?.titleLatin),
          titleLatinPronu: normalizeNullable(body?.titleLatinPronu),
          catalog: normalizeNullable(body?.catalog),
          thumbnailDefault: normalizeNullable(body?.thumbnailDefault),
          thumbnailMedium: normalizeNullable(body?.thumbnailMedium),
          thumbnailHigh: normalizeNullable(body?.thumbnailHigh),
        },
      });

      // 미디어 연결은 추가만 한다. 기존 연결은 건드리지 않는다 (스펙 확정 사항).
      await tx.songYoutubeVideo.createMany({
        data: parseIdArray(body?.youtubeVideoIds).map((youtubeVideoId) => ({
          songId: song.id,
          youtubeVideoId,
        })),
        skipDuplicates: true,
      });
      await tx.songSpotifyTrack.createMany({
        data: parseIdArray(body?.spotifyTrackIds).map((spotifyTrackId) => ({
          songId: song.id,
          spotifyTrackId,
        })),
        skipDuplicates: true,
      });

      // 이 곡의 검토가 끝났으므로 큐에서 제거한다.
      await tx.songUpdateQueue.delete({ where: { id: queueItem.id } });
    });

    return { songId: song.id };
  }

  async deleteItem(
    queueId: number,
  ): Promise<DeleteSongUpdateQueueResponseDto> {
    const item = await this.prisma.songUpdateQueue.findUnique({
      where: { id: queueId },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException("song update queue item not found.");
    }

    await this.prisma.songUpdateQueue.delete({
      where: { id: queueId },
    });

    return { deletedId: queueId };
  }
}

function parseSongIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException("songIds must be an array.");
  }

  const songIds = Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );

  if (songIds.length === 0) {
    throw new BadRequestException("songIds is empty.");
  }

  return songIds;
}

function parseIdArray(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.map((item) => String(item).trim()).filter((item) => item.length > 0),
    ),
  );
}

function normalizeRequired(
  value: string | null | undefined,
  fieldName: string,
): string {
  const normalized = normalizeNullable(value);

  if (!normalized) {
    throw new BadRequestException(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized || null;
}
```

- [ ] **Step 2: controller 작성**

`song-update-queue.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { SongMediaCandidatesResponseDto } from "../song-creation-queue/dto/song-media-candidates-response.dto";
import { ApplySongUpdateRequestDto } from "./dto/apply-song-update-request.dto";
import { ApplySongUpdateResponseDto } from "./dto/apply-song-update-response.dto";
import { DeleteSongUpdateQueueResponseDto } from "./dto/delete-song-update-queue-response.dto";
import { PushSongUpdateQueueRequestDto } from "./dto/push-song-update-queue-request.dto";
import { PushSongUpdateQueueResponseDto } from "./dto/push-song-update-queue-response.dto";
import { SongUpdateQueueListResponseDto } from "./dto/song-update-queue-list-response.dto";
import { SongUpdateQueueService } from "./song-update-queue.service";

@ApiTags("song-update-queue")
@Controller("api/song-update-queue")
export class SongUpdateQueueController {
  constructor(
    private readonly songUpdateQueueService: SongUpdateQueueService,
  ) {}

  @Get()
  @ApiOkResponse({
    description:
      "곡 업데이트 큐 항목과 대상 곡의 현재 값(비교용)을 함께 얻는다.",
    type: SongUpdateQueueListResponseDto,
  })
  findAll(): Promise<SongUpdateQueueListResponseDto> {
    return this.songUpdateQueueService.findAll();
  }

  @Post("push")
  @ApiBody({ type: PushSongUpdateQueueRequestDto })
  @ApiOkResponse({
    description:
      "저장된 곡을 업데이트 큐에 넣는다. 곡 없음/가수 미연결/이미 큐에 있음은 건너뛴다.",
    type: PushSongUpdateQueueResponseDto,
  })
  push(
    @Body() body: PushSongUpdateQueueRequestDto | undefined,
  ): Promise<PushSongUpdateQueueResponseDto> {
    return this.songUpdateQueueService.pushSongIds(body?.songIds);
  }

  @Get(":queueId/media-candidates")
  @ApiParam({
    name: "queueId",
    description: "song_update_queue.id: 곡 업데이트 큐 항목 ID",
    example: 1,
  })
  @ApiOkResponse({
    description: "media db에서 유튜브/스포티파이 후보 목록을 다시 조회한다.",
    type: SongMediaCandidatesResponseDto,
  })
  getMediaCandidates(
    @Param("queueId", ParseIntPipe) queueId: number,
  ): Promise<SongMediaCandidatesResponseDto> {
    return this.songUpdateQueueService.getMediaCandidates(queueId);
  }

  @Post(":queueId/apply")
  @ApiParam({
    name: "queueId",
    description: "song_update_queue.id: 곡 업데이트 큐 항목 ID",
    example: 1,
  })
  @ApiBody({ type: ApplySongUpdateRequestDto })
  @ApiOkResponse({
    description:
      "검토한 값으로 곡을 업데이트한다. 제목/썸네일은 덮어쓰고 미디어 연결은 추가만 한다.",
    type: ApplySongUpdateResponseDto,
  })
  applyUpdate(
    @Param("queueId", ParseIntPipe) queueId: number,
    @Body() body: ApplySongUpdateRequestDto | undefined,
  ): Promise<ApplySongUpdateResponseDto> {
    return this.songUpdateQueueService.applyUpdate(queueId, body);
  }

  @Delete(":queueId")
  @ApiParam({
    name: "queueId",
    description: "song_update_queue.id: 삭제할 곡 업데이트 큐 항목 ID",
    example: 1,
  })
  @ApiOkResponse({
    description: "곡 업데이트 큐 항목 제거",
    type: DeleteSongUpdateQueueResponseDto,
  })
  deleteItem(
    @Param("queueId", ParseIntPipe) queueId: number,
  ): Promise<DeleteSongUpdateQueueResponseDto> {
    return this.songUpdateQueueService.deleteItem(queueId);
  }
}
```

- [ ] **Step 3: module 작성 + app.module 등록**

`song-update-queue.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/prisma.module";
import { SongUpdateQueueController } from "./song-update-queue.controller";
import { SongUpdateQueueManager } from "./song-update-queue.manager";
import { SongUpdateQueueService } from "./song-update-queue.service";

@Module({
  imports: [PrismaModule],
  controllers: [SongUpdateQueueController],
  providers: [SongUpdateQueueManager, SongUpdateQueueService],
})
export class SongUpdateQueueModule {}
```

`admin/src/app.module.ts` — import 추가 (`SongCreationQueueModule` import 줄 아래):

```typescript
import { SongUpdateQueueModule } from "./api/collection/song-update-queue/song-update-queue.module";
```

`imports` 배열의 `SongCreationQueueModule,` 뒤에 `SongUpdateQueueModule,` 추가.

- [ ] **Step 4: 사용자 체크포인트 — 백엔드 수동 검증**

사용자에게 어드민 서버 실행 상태에서 아래 확인을 요청한다:

1. `http://localhost:3002/api/docs/collection`에 `song-update-queue` 태그 5개 엔드포인트 노출
2. 존재하는 곡 ID로 push (Swagger 또는 `!` prefix):
   `curl -X POST http://localhost:3002/api/song-update-queue/push -H "Content-Type: application/json" -d '{"songIds":[<존재하는 곡 ID>]}'`
   Expected: `{"requested":1,"pushed":1,"skipped":0}` (가수 연결된 곡 기준)
3. 같은 곡 재-push → Expected: `{"requested":1,"pushed":0,"skipped":1}` (이미 큐에 있음)
4. `curl http://localhost:3002/api/song-update-queue` → `data[0].currentSong`에 기존 곡 값 포함 확인

- [ ] **Step 5: Commit**

```bash
git add admin/src/api/collection/song-update-queue admin/src/app.module.ts
git commit -m "곡 업데이트 큐 API: push/조회/후보/apply/삭제"
```

---

### Task 5: 프런트 — SongUpdateQueuePage 검토 UI

**Files:**
- Create: `admin/web/src/song-update-queue/SongUpdateQueuePage.tsx`

**Interfaces:**
- Consumes: Task 4의 REST API 5종 (`/api/song-update-queue...`)
- Produces: `export function SongUpdateQueuePage()` — Task 6에서 라우팅에 연결

- [ ] **Step 1: 페이지 작성**

`SongCreationQueuePage.tsx`와 같은 레이아웃(좌: 큐 리스트, 우: 폼 + 미디어 후보). 차이점:
- 폼 각 필드 아래에 **현재 Song 값**을 회색으로 표시해 비교 가능하게 한다
- 현재 연결된 미디어는 별도 목록으로 **표시만** 하고 해제 불가 (추가만 정책)
- 후보 카드 중 이미 연결된 것은 "연결됨" 배지 + 토글 비활성
- 제출 버튼은 "곡 업데이트" → `POST :queueId/apply`

전체 코드:

```tsx
import { type ReactNode, useEffect, useState } from "react";

type QueueYoutubeVideo = {
  id: string;
  title: string;
  thumbnailMedium: string | null;
  viewCount: string | null;
};

type QueueSpotifyTrack = {
  id: string;
  name: string;
  releaseDate: string | null;
  albumImage: string | null;
};

type CurrentSongMedia = {
  id: string;
  label: string;
};

type CurrentSong = {
  title: string;
  titleKo?: string;
  titleJa?: string;
  titleJaPronu?: string;
  titleJaKana?: string;
  titleJaKanji?: string;
  titleLatin?: string;
  titleLatinPronu?: string;
  catalog?: string;
  visible: boolean;
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  youtubeVideos: CurrentSongMedia[];
  spotifyTracks: CurrentSongMedia[];
};

type SongUpdateQueueItem = {
  id: number;
  songId: number;
  title: string;
  titleKo?: string;
  titleJa?: string;
  titleJaPronu?: string;
  titleJaKana?: string;
  titleJaKanji?: string;
  titleLatin?: string;
  titleLatinPronu?: string;
  youtubeVideos: QueueYoutubeVideo[];
  spotifyTracks: QueueSpotifyTrack[];
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  artistId?: number;
  artistName?: string;
  currentSong?: CurrentSong;
  createdAt: string;
  updatedAt: string;
};

type SongUpdateQueueListResponse = {
  data: SongUpdateQueueItem[];
};

type ApplySongUpdateResponse = {
  songId: number;
};

type SpotifyTrackCandidate = {
  id: string;
  name: string;
  isrc: string | null;
  durationMs: number | null;
  releaseDate: string | null;
  albumImages: string[];
};

type YoutubeVideoCandidate = {
  id: string;
  channelId: string | null;
  title: string;
  publishedAt: string | null;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
  viewCount: string | null;
  likeCount: string | null;
};

type SongMediaCandidatesResponse = {
  titleJa: string | null;
  titleLatin: string | null;
  spotifyTracks: SpotifyTrackCandidate[];
  youtubeVideos: YoutubeVideoCandidate[];
};

type SongForm = {
  catalog: string;
  title: string;
  titleKo: string;
  titleJa: string;
  titleJaKana: string;
  titleJaPronu: string;
  titleJaKanji: string;
  titleLatin: string;
  titleLatinPronu: string;
  youtubeVideos: QueueYoutubeVideo[];
  spotifyTracks: QueueSpotifyTrack[];
  thumbnailDefault: string;
  thumbnailMedium: string;
  thumbnailHigh: string;
};

export function SongUpdateQueuePage() {
  const [items, setItems] = useState<SongUpdateQueueItem[]>();
  const [selectedId, setSelectedId] = useState<number>();
  const [form, setForm] = useState<SongForm>();
  const [candidates, setCandidates] = useState<SongMediaCandidatesResponse>();
  const [isCandidatesLoading, setIsCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadItems() {
      try {
        const result = await fetchSongUpdateQueue();
        setItems(result);
        setError(undefined);

        if (result.length > 0) {
          selectItem(result[0]);
        }
      } catch (fetchError) {
        setItems(undefined);
        setSelectedId(undefined);
        setForm(undefined);
        setError(String(fetchError));
      }
    }

    void loadItems();
  }, []);

  const selectedItem = items?.find((item) => item.id === selectedId);

  function selectItem(item: SongUpdateQueueItem) {
    setSelectedId(item.id);
    setForm(createFormFromItem(item));
    setMessage(undefined);
    setError(undefined);
    void loadCandidates(item.id);
  }

  async function loadCandidates(queueId: number) {
    setCandidates(undefined);
    setCandidatesError(undefined);
    setIsCandidatesLoading(true);

    try {
      const result = await fetchMediaCandidates(queueId);
      setCandidates(result);
    } catch (candidatesFetchError) {
      setCandidatesError(String(candidatesFetchError));
    } finally {
      setIsCandidatesLoading(false);
    }
  }

  function updateForm<K extends keyof SongForm>(key: K, value: SongForm[K]) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  function toggleYoutubeVideo(video: QueueYoutubeVideo) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        youtubeVideos: toggleById(current.youtubeVideos, video),
      };
    });
  }

  function toggleSpotifyTrack(track: QueueSpotifyTrack) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        spotifyTracks: toggleById(current.spotifyTracks, track),
      };
    });
  }

  function applyThumbnails(video: YoutubeVideoCandidate) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        thumbnailDefault: video.thumbnailDefault ?? "",
        thumbnailMedium: video.thumbnailMedium ?? "",
        thumbnailHigh: video.thumbnailHigh ?? "",
      };
    });
  }

  async function deleteSelectedItem(item: SongUpdateQueueItem) {
    const confirmed = window.confirm(
      `${item.title} 큐 항목을 삭제할까요? 이 동작은 song_update_queue에서만 삭제하고 곡은 그대로 둡니다.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteSongUpdateQueueItem(item.id);
      removeItemFromPage(item.id);
      setMessage("큐 항목을 삭제했습니다.");
      setError(undefined);
    } catch (deleteError) {
      setError(String(deleteError));
      setMessage(undefined);
    }
  }

  async function applyUpdate() {
    if (!selectedItem || !form) {
      return;
    }

    const confirmed = window.confirm(
      `songId=${selectedItem.songId} 곡을 폼 값으로 업데이트할까요? 미디어 연결은 추가만 되고 기존 연결은 유지됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await applySongUpdate(selectedItem.id, form);
      removeItemFromPage(selectedItem.id);
      setMessage(`곡을 업데이트했습니다. songId=${result.songId}`);
      setError(undefined);
    } catch (applyError) {
      setError(String(applyError));
      setMessage(undefined);
    } finally {
      setIsSubmitting(false);
    }
  }

  function removeItemFromPage(itemId: number) {
    setItems((current) => {
      if (!current) {
        return current;
      }

      const nextItems = current.filter((item) => item.id !== itemId);

      if (selectedId === itemId) {
        const nextSelectedItem = nextItems[0];

        if (nextSelectedItem) {
          setSelectedId(nextSelectedItem.id);
          setForm(createFormFromItem(nextSelectedItem));
          void loadCandidates(nextSelectedItem.id);
        } else {
          setSelectedId(undefined);
          setForm(undefined);
          setCandidates(undefined);
        }
      }

      return nextItems;
    });
  }

  const currentSong = selectedItem?.currentSong;
  const linkedYoutubeIds = new Set(
    currentSong?.youtubeVideos.map((video) => video.id) ?? [],
  );
  const linkedSpotifyIds = new Set(
    currentSong?.spotifyTracks.map((track) => track.id) ?? [],
  );

  return (
    <main className="max-w-7xl p-6 text-gray-950">
      <a
        className="cursor-pointer text-sm text-gray-600 underline"
        href="/admin"
      >
        Admin
      </a>
      <h1 className="mt-3 text-2xl font-semibold">곡 업데이트 큐 상태</h1>
      <p className="mt-2 text-gray-600">
        song_update_queue 항목을 보고, 기존 곡 값과 비교해 업데이트합니다.
        미디어 연결은 추가만 됩니다.
      </p>

      {error && <p className="mt-4 text-red-700">{error}</p>}
      {message && <p className="mt-4 text-green-700">{message}</p>}

      {!error && !items && <p className="mt-4 text-gray-600">불러오는 중</p>}

      {!error && items && items.length === 0 && (
        <p className="mt-4 text-gray-600">큐 항목이 없습니다.</p>
      )}

      {items && items.length > 0 && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[420px_1fr]">
          <section aria-labelledby="song-update-queue-list-heading">
            <h2
              id="song-update-queue-list-heading"
              className="text-lg font-semibold"
            >
              큐 리스트
            </h2>
            <div className="mt-3 border border-gray-300">
              {items.map((item) => {
                const isSelected = item.id === selectedId;

                return (
                  <div
                    className={`border-b border-gray-200 p-3 last:border-b-0 ${
                      isSelected ? "bg-yellow-50" : ""
                    }`}
                    key={item.id}
                  >
                    <button
                      type="button"
                      className="block w-full cursor-pointer text-left"
                      onClick={() => selectItem(item)}
                    >
                      <span className="block font-medium">
                        {item.currentSong?.title ?? item.title}
                      </span>
                      <span className="mt-1 block text-sm text-gray-700">
                        {item.artistName ?? "-"} / song {item.songId}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        후보 유튜브 {item.youtubeVideos.length}개 · 스포티파이{" "}
                        {item.spotifyTracks.length}개 ·{" "}
                        {formatCreatedAt(item.createdAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="mt-2 cursor-pointer border border-red-700 px-2 py-1 text-sm text-red-700"
                      onClick={() => deleteSelectedItem(item)}
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="song-update-form-heading">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2
                  id="song-update-form-heading"
                  className="text-lg font-semibold"
                >
                  곡 업데이트 폼
                </h2>
                {selectedItem && (
                  <p className="mt-1 text-sm text-gray-600">
                    가수: {selectedItem.artistName ?? "미연결"} · songId:{" "}
                    {selectedItem.songId} · 현재 제목:{" "}
                    {currentSong?.title ?? "(곡 삭제됨)"}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="cursor-pointer border border-gray-900 px-3 py-1.5 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                disabled={
                  !selectedItem || !form || !currentSong || isSubmitting
                }
                onClick={applyUpdate}
              >
                {isSubmitting ? "업데이트 중" : "곡 업데이트"}
              </button>
            </div>

            {selectedItem && form && (
              <form
                className="mt-3 grid gap-4"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <TextInput
                    label="catalog"
                    currentValue={currentSong?.catalog}
                    value={form.catalog}
                    onChange={(value) => updateForm("catalog", value)}
                  />
                  <TextInput
                    label="title"
                    required
                    currentValue={currentSong?.title}
                    value={form.title}
                    onChange={(value) => updateForm("title", value)}
                  />
                  <TextInput
                    label="titleKo"
                    currentValue={currentSong?.titleKo}
                    value={form.titleKo}
                    onChange={(value) => updateForm("titleKo", value)}
                  />
                  <TextInput
                    label="titleJa"
                    currentValue={currentSong?.titleJa}
                    value={form.titleJa}
                    onChange={(value) => updateForm("titleJa", value)}
                  />
                  <TextInput
                    label="titleJaKana"
                    currentValue={currentSong?.titleJaKana}
                    value={form.titleJaKana}
                    onChange={(value) => updateForm("titleJaKana", value)}
                  />
                  <TextInput
                    label="titleJaPronu"
                    currentValue={currentSong?.titleJaPronu}
                    value={form.titleJaPronu}
                    onChange={(value) => updateForm("titleJaPronu", value)}
                  />
                  <TextInput
                    label="titleJaKanji"
                    currentValue={currentSong?.titleJaKanji}
                    value={form.titleJaKanji}
                    onChange={(value) => updateForm("titleJaKanji", value)}
                  />
                  <TextInput
                    label="titleLatin"
                    currentValue={currentSong?.titleLatin}
                    value={form.titleLatin}
                    onChange={(value) => updateForm("titleLatin", value)}
                  />
                  <TextInput
                    label="titleLatinPronu"
                    currentValue={currentSong?.titleLatinPronu}
                    value={form.titleLatinPronu}
                    onChange={(value) => updateForm("titleLatinPronu", value)}
                  />
                </div>

                {currentSong && (
                  <div className="grid gap-3">
                    <LinkedMediaList
                      label="현재 연결된 유튜브 (유지됨)"
                      items={currentSong.youtubeVideos.map((video) => ({
                        id: video.id,
                        label: video.label,
                        url: `https://www.youtube.com/watch?v=${video.id}`,
                      }))}
                    />
                    <LinkedMediaList
                      label="현재 연결된 스포티파이 (유지됨)"
                      items={currentSong.spotifyTracks.map((track) => ({
                        id: track.id,
                        label: track.label,
                        url: `https://open.spotify.com/track/${track.id}`,
                      }))}
                    />
                  </div>
                )}

                <SelectedMediaList
                  label="추가할 유튜브 영상"
                  items={form.youtubeVideos.map((video) => ({
                    id: video.id,
                    label: video.title || video.id,
                    url: `https://www.youtube.com/watch?v=${video.id}`,
                  }))}
                  onRemove={(id) => {
                    const video = form.youtubeVideos.find(
                      (current) => current.id === id,
                    );
                    if (video) {
                      toggleYoutubeVideo(video);
                    }
                  }}
                />
                <SelectedMediaList
                  label="추가할 스포티파이 트랙"
                  items={form.spotifyTracks.map((track) => ({
                    id: track.id,
                    label: track.name || track.id,
                    url: `https://open.spotify.com/track/${track.id}`,
                  }))}
                  onRemove={(id) => {
                    const track = form.spotifyTracks.find(
                      (current) => current.id === id,
                    );
                    if (track) {
                      toggleSpotifyTrack(track);
                    }
                  }}
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <ThumbnailInput
                    label="thumbnailDefault"
                    value={form.thumbnailDefault}
                    onChange={(value) => updateForm("thumbnailDefault", value)}
                  />
                  <ThumbnailInput
                    label="thumbnailMedium"
                    value={form.thumbnailMedium}
                    onChange={(value) => updateForm("thumbnailMedium", value)}
                  />
                  <ThumbnailInput
                    label="thumbnailHigh"
                    value={form.thumbnailHigh}
                    onChange={(value) => updateForm("thumbnailHigh", value)}
                  />
                </div>
              </form>
            )}

            <div className="mt-6">
              <h3 className="text-base font-semibold">미디어 후보</h3>
              <p className="mt-1 text-sm text-gray-600">
                media db에서 다시 검색한 후보입니다. 카드를 눌러 추가 목록에
                넣거나 뺄 수 있습니다. 이미 연결된 미디어는 선택할 수 없습니다.
              </p>

              {isCandidatesLoading && (
                <p className="mt-3 text-gray-600">후보 불러오는 중</p>
              )}
              {candidatesError && (
                <p className="mt-3 text-red-700">{candidatesError}</p>
              )}

              {candidates && form && (
                <div className="mt-3 grid gap-5">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700">
                      유튜브 ({candidates.youtubeVideos.length})
                    </h4>
                    {candidates.youtubeVideos.length === 0 && (
                      <p className="mt-2 text-sm text-gray-600">
                        후보가 없습니다.
                      </p>
                    )}
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      {candidates.youtubeVideos.map((video) => {
                        const isLinked = linkedYoutubeIds.has(video.id);
                        const isSelected = form.youtubeVideos.some(
                          (current) => current.id === video.id,
                        );

                        return (
                          <div
                            className={`border p-3 ${
                              isLinked
                                ? "border-gray-200 bg-gray-100"
                                : isSelected
                                  ? "border-gray-900 bg-yellow-50"
                                  : "border-gray-300"
                            }`}
                            key={video.id}
                          >
                            <button
                              type="button"
                              className="flex w-full cursor-pointer gap-3 text-left disabled:cursor-not-allowed"
                              disabled={isLinked}
                              onClick={() =>
                                toggleYoutubeVideo({
                                  id: video.id,
                                  title: video.title,
                                  thumbnailMedium: video.thumbnailMedium,
                                  viewCount: video.viewCount,
                                })
                              }
                            >
                              {video.thumbnailMedium && (
                                <img
                                  alt=""
                                  className="h-16 w-28 shrink-0 border border-gray-200 object-cover"
                                  src={video.thumbnailMedium}
                                />
                              )}
                              <span>
                                <span className="block text-sm font-medium">
                                  {video.title}
                                  {isLinked && (
                                    <span className="ml-1.5 border border-gray-400 px-1 text-xs text-gray-600">
                                      연결됨
                                    </span>
                                  )}
                                </span>
                                <span className="mt-1 block text-xs text-gray-500">
                                  조회수 {formatCount(video.viewCount)} ·{" "}
                                  {formatDate(video.publishedAt)}
                                </span>
                              </span>
                            </button>
                            <div className="mt-2 flex gap-2">
                              <MediaOpenButton
                                label="유튜브"
                                url={`https://www.youtube.com/watch?v=${video.id}`}
                              />
                              <button
                                type="button"
                                className="cursor-pointer border border-gray-300 px-1.5 py-0.5 text-xs text-gray-700"
                                onClick={() => applyThumbnails(video)}
                              >
                                썸네일로 사용
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700">
                      스포티파이 ({candidates.spotifyTracks.length})
                    </h4>
                    {candidates.spotifyTracks.length === 0 && (
                      <p className="mt-2 text-sm text-gray-600">
                        후보가 없습니다.
                      </p>
                    )}
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      {candidates.spotifyTracks.map((track) => {
                        const isLinked = linkedSpotifyIds.has(track.id);
                        const isSelected = form.spotifyTracks.some(
                          (current) => current.id === track.id,
                        );

                        return (
                          <div
                            className={`border p-3 ${
                              isLinked
                                ? "border-gray-200 bg-gray-100"
                                : isSelected
                                  ? "border-gray-900 bg-yellow-50"
                                  : "border-gray-300"
                            }`}
                            key={track.id}
                          >
                            <button
                              type="button"
                              className="flex w-full cursor-pointer gap-3 text-left disabled:cursor-not-allowed"
                              disabled={isLinked}
                              onClick={() =>
                                toggleSpotifyTrack({
                                  id: track.id,
                                  name: track.name,
                                  releaseDate: track.releaseDate,
                                  albumImage: track.albumImages[0] ?? null,
                                })
                              }
                            >
                              {track.albumImages[0] && (
                                <img
                                  alt=""
                                  className="h-16 w-16 shrink-0 border border-gray-200 object-cover"
                                  src={track.albumImages[0]}
                                />
                              )}
                              <span>
                                <span className="block text-sm font-medium">
                                  {track.name}
                                  {isLinked && (
                                    <span className="ml-1.5 border border-gray-400 px-1 text-xs text-gray-600">
                                      연결됨
                                    </span>
                                  )}
                                </span>
                                <span className="mt-1 block text-xs text-gray-500">
                                  {track.releaseDate ?? "-"} ·{" "}
                                  {formatDuration(track.durationMs)} · ISRC{" "}
                                  {track.isrc ?? "-"}
                                </span>
                              </span>
                            </button>
                            <div className="mt-2">
                              <MediaOpenButton
                                label="스포티파이"
                                url={`https://open.spotify.com/track/${track.id}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {form.spotifyTracks[0] && (
                    <iframe
                      title="Spotify track preview"
                      className="h-[152px] w-full border border-gray-300"
                      src={`https://open.spotify.com/embed/track/${form.spotifyTracks[0].id}`}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function TextInput({
  label,
  currentValue,
  required,
  value,
  onChange,
}: {
  label: string;
  currentValue?: string;
  required?: boolean;
  value: string;
  onChange(value: string): void;
}) {
  const isChanged = (currentValue ?? "") !== value.trim();

  return (
    <div>
      <label className="text-sm text-gray-700">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        className={`mt-1 w-full border px-2 py-1.5 ${
          isChanged ? "border-amber-600" : "border-gray-300"
        }`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="mt-0.5 truncate text-xs text-gray-500" title={currentValue}>
        현재: {currentValue ?? "-"}
      </p>
    </div>
  );
}

function LinkedMediaList({
  label,
  items,
}: {
  label: string;
  items: Array<{ id: string; label: string; url: string }>;
}) {
  return (
    <div>
      <span className="text-sm text-gray-700">
        {label} ({items.length})
      </span>
      {items.length === 0 && (
        <p className="mt-1 text-sm text-gray-500">연결된 항목이 없습니다.</p>
      )}
      {items.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {items.map((item) => (
            <a
              className="inline-block max-w-full cursor-pointer truncate border border-gray-200 bg-gray-100 px-2 py-1 text-sm text-gray-700 underline"
              href={item.url}
              key={item.id}
              rel="noopener noreferrer"
              target="_blank"
              title={item.label}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectedMediaList({
  label,
  items,
  onRemove,
}: {
  label: string;
  items: Array<{ id: string; label: string; url: string }>;
  onRemove(id: string): void;
}) {
  return (
    <div>
      <span className="text-sm text-gray-700">
        {label} ({items.length})
      </span>
      {items.length === 0 && (
        <p className="mt-1 text-sm text-gray-500">선택된 항목이 없습니다.</p>
      )}
      {items.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              className="inline-flex max-w-full items-center gap-1.5 border border-gray-300 px-2 py-1 text-sm"
              key={item.id}
            >
              <a
                className="cursor-pointer truncate underline"
                href={item.url}
                rel="noopener noreferrer"
                target="_blank"
                title={item.label}
              >
                {item.label}
              </a>
              <button
                type="button"
                aria-label={`${item.label} 제거`}
                className="cursor-pointer text-red-700"
                onClick={() => onRemove(item.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaOpenButton({ label, url }: { label: string; url: string }) {
  return (
    <button
      type="button"
      className="cursor-pointer border border-gray-300 px-1.5 py-0.5 text-xs text-gray-700"
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
    >
      {label}
    </button>
  );
}

function ThumbnailInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const trimmedValue = value.trim();
  const imageFailed = failedSrc === trimmedValue;

  return (
    <div>
      <label className="text-sm text-gray-700">{label}</label>
      <input
        className="mt-1 w-full border border-gray-300 px-2 py-1.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {trimmedValue && !imageFailed && (
        <img
          alt={`${label} preview`}
          className="mt-2 h-32 w-full border border-gray-300 object-contain"
          src={trimmedValue}
          onError={() => setFailedSrc(trimmedValue)}
        />
      )}
      {trimmedValue && imageFailed && (
        <p className="mt-2 text-sm text-red-700">이미지 로드 실패</p>
      )}
    </div>
  );
}

async function fetchSongUpdateQueue(): Promise<SongUpdateQueueItem[]> {
  const response = await fetch("/api/song-update-queue");

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const body = (await response.json()) as SongUpdateQueueListResponse;
  return body.data;
}

async function fetchMediaCandidates(
  queueId: number,
): Promise<SongMediaCandidatesResponse> {
  const response = await fetch(
    `/api/song-update-queue/${queueId}/media-candidates`,
  );

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as SongMediaCandidatesResponse;
}

async function applySongUpdate(
  queueId: number,
  form: SongForm,
): Promise<ApplySongUpdateResponse> {
  const response = await fetch(`/api/song-update-queue/${queueId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // apply는 미디어를 ID 배열로만 받는다 (Song 쪽은 조인 테이블 추가).
    body: JSON.stringify({
      ...form,
      youtubeVideos: undefined,
      spotifyTracks: undefined,
      youtubeVideoIds: form.youtubeVideos.map((video) => video.id),
      spotifyTrackIds: form.spotifyTracks.map((track) => track.id),
    }),
  });

  if (!response.ok) {
    throw new Error(`Apply failed: ${response.status}`);
  }

  return (await response.json()) as ApplySongUpdateResponse;
}

async function deleteSongUpdateQueueItem(queueId: number): Promise<void> {
  const response = await fetch(`/api/song-update-queue/${queueId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }
}

function createFormFromItem(item: SongUpdateQueueItem): SongForm {
  return {
    catalog: item.currentSong?.catalog ?? "",
    title: item.title,
    titleKo: item.titleKo ?? "",
    titleJa: item.titleJa ?? "",
    titleJaKana: item.titleJaKana ?? "",
    titleJaPronu: item.titleJaPronu ?? "",
    titleJaKanji: item.titleJaKanji ?? "",
    titleLatin: item.titleLatin ?? "",
    titleLatinPronu: item.titleLatinPronu ?? "",
    // 추가할 미디어는 빈 상태로 시작한다. 후보 카드에서 골라 담는다.
    youtubeVideos: [],
    spotifyTracks: [],
    thumbnailDefault: item.thumbnailDefault ?? "",
    thumbnailMedium: item.thumbnailMedium ?? "",
    thumbnailHigh: item.thumbnailHigh ?? "",
  };
}

function toggleById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((current) => current.id === item.id)
    ? items.filter((current) => current.id !== item.id)
    : [...items, item];
}

function formatCreatedAt(createdAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatCount(value: string | null): string {
  const count = Number(value);

  if (!value || !Number.isFinite(count)) {
    return "-";
  }

  return count.toLocaleString("ko-KR");
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return "-";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
```

설계 노트 (구현자가 알아야 할 의도):
- `createFormFromItem`에서 **추가할 미디어를 빈 배열로 시작**한다. 곡생성큐는 push 스냅샷을 선택 상태로 시작하지만, 업데이트 큐는 "추가만" 정책이므로 리뷰어가 명시적으로 고른 것만 추가되는 게 안전하다.
- 폼의 title 초기값은 큐의 재생성 값이고, 각 입력 아래 "현재: ..." 줄로 기존 값이 보인다. 값이 다르면 테두리를 앰버색으로 표시한다.
- `currentSong`이 없으면(곡이 그 사이 삭제됨) 업데이트 버튼이 비활성화된다. 삭제 버튼으로 큐만 정리한다.

- [ ] **Step 2: Commit**

```bash
git add admin/web/src/song-update-queue/SongUpdateQueuePage.tsx
git commit -m "곡 업데이트 큐 검토 UI: 기존 값 비교, 미디어 추가 선택"
```

---

### Task 6: 프런트 — 라우팅 및 홈 링크 등록

**Files:**
- Modify: `admin/web/src/App.tsx`

**Interfaces:**
- Consumes: `SongUpdateQueuePage` (Task 5)
- Produces: `/admin/song-update-queue` 경로

- [ ] **Step 1: App.tsx에 라우트 추가**

`App.tsx`에 4곳 수정 (기존 `song-creation-queue` 항목 바로 아래에 각각 추가):

1. import:
```typescript
import { SongUpdateQueuePage } from "./song-update-queue/SongUpdateQueuePage";
```

2. `AdminRoute` 타입에 `| "song-update-queue"` 추가

3. `App()` 분기:
```typescript
  if (route === "song-update-queue") {
    return <SongUpdateQueuePage />;
  }
```

4. `getDocumentTitle()` 분기:
```typescript
  if (route === "song-update-queue") {
    return "Admin - 곡 업데이트 큐";
  }
```

5. `getAdminRoute()` 분기:
```typescript
  if (pathname === "/admin/song-update-queue") {
    return "song-update-queue";
  }
```

6. `AdminHomePage`의 Collection 섹션에 링크 추가 (`곡 생성 큐` 링크 아래):
```tsx
<AdminLink href="/admin/song-update-queue">곡 업데이트 큐</AdminLink>
```

- [ ] **Step 2: Commit**

```bash
git add admin/web/src/App.tsx
git commit -m "곡 업데이트 큐 어드민 라우팅 등록"
```

---

### Task 7: 프런트 — SongPage(가수별 곡 관리)에서 업데이트 큐 push

**Files:**
- Modify: `admin/web/src/song/SongPage.tsx`

**Interfaces:**
- Consumes: `POST /api/song-update-queue/push` body `{songIds:number[]}` → `{requested,pushed,skipped}`
- Produces: 곡 카드마다 "업데이트 큐" 버튼

- [ ] **Step 1: push API 호출 함수 추가**

`SongPage.tsx` 하단의 fetch 헬퍼들(`patchSong` 근처)에 추가:

```typescript
async function pushSongToUpdateQueue(
  songId: number,
): Promise<{ requested: number; pushed: number; skipped: number }> {
  const response = await fetch("/api/song-update-queue/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songIds: [songId] }),
  });

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status}`);
  }

  return (await response.json()) as {
    requested: number;
    pushed: number;
    skipped: number;
  };
}
```

- [ ] **Step 2: SongPage 컴포넌트에 핸들러 추가**

`deleteSong` 함수 근처에 추가한다. (이 파일의 상태 관리 패턴을 먼저 읽고 — 메시지/에러 표시에 쓰는 기존 state를 그대로 사용한다. 별도 state를 새로 만들지 않는다.)

```typescript
async function pushToUpdateQueue(song: SongItem) {
  const confirmed = window.confirm(
    `${song.title} 곡을 업데이트 큐에 올릴까요? 미디어 재검색과 제목 재생성이 실행됩니다.`,
  );

  if (!confirmed) {
    return;
  }

  try {
    const result = await pushSongToUpdateQueue(song.id);

    if (result.pushed > 0) {
      // 기존 메시지 표시 state 사용 (예: setMessage / setError — 파일의 실제 이름 확인)
      window.alert("업데이트 큐에 올렸습니다. /admin/song-update-queue에서 검토하세요.");
    } else {
      window.alert("건너뛰었습니다. 이미 큐에 있거나 가수 미연결 곡입니다.");
    }
  } catch (pushError) {
    window.alert(String(pushError));
  }
}
```

주의: push는 미디어 검색 + AI 호출로 수 초 걸릴 수 있다. 버튼에 로딩 표시가 필요하면 `useState<number>()`로 진행 중인 songId 하나만 추적한다.

- [ ] **Step 3: 곡 카드에 버튼 추가**

곡 카드의 기존 액션 버튼 영역(수정/삭제 버튼 옆, `deleteSong(song)` 호출 버튼 근처)에 추가:

```tsx
<button
  type="button"
  className="cursor-pointer border border-gray-900 px-2 py-1 text-sm"
  onClick={() => pushToUpdateQueue(song)}
>
  업데이트 큐
</button>
```

(SongPage.tsx는 1471줄이므로 구현 시 파일을 읽고 기존 버튼의 정확한 className과 배치를 따라간다. 위 코드는 기본형이고, 주변 버튼 스타일과 통일하는 것이 우선.)

- [ ] **Step 4: Commit**

```bash
git add admin/web/src/song/SongPage.tsx
git commit -m "가수별 곡 관리에서 업데이트 큐 push 버튼 추가"
```

---

### Task 8: 종단 수동 검증 (사용자 체크포인트)

**Files:** 없음 (검증만)

- [ ] **Step 1: 사용자에게 종단 시나리오 검증 요청**

어드민 서버(3002) + web 실행 상태에서:

1. `/admin/song`에서 가수 선택 → 곡 카드의 "업데이트 큐" 클릭 → 성공 알림 확인
2. `/admin/song-update-queue` 진입:
   - 큐 리스트에 곡 표시, 현재 제목/가수 표시
   - 폼 각 필드 아래 "현재: ..." 값 표시, 재생성 값과 다르면 앰버 테두리
   - "현재 연결된 유튜브/스포티파이 (유지됨)" 목록 표시
   - 미디어 후보 중 이미 연결된 것은 회색 + "연결됨" 배지 + 클릭 불가
   - 후보 카드 토글 → "추가할 ..." 칩 목록에 반영
3. "곡 업데이트" 클릭 → 성공 메시지, 큐에서 항목 사라짐
4. `/admin/song`에서 해당 곡 확인:
   - 제목 변형 필드가 폼 값으로 변경됨
   - 기존 미디어 연결 유지 + 새로 고른 것 추가됨
5. DB 확인 (adminer `http://localhost:8080`): `song_update_queue`에서 해당 row 삭제됨
6. 예외 경로: 큐에 있는 동안 곡을 삭제 → 큐 페이지에서 "(곡 삭제됨)" 표시 + 업데이트 버튼 비활성 → 삭제 버튼으로 큐 정리

- [ ] **Step 2: 검증 결과에 따라 수정 후 최종 커밋**

발견된 문제 수정 커밋 후 완료.

---

## 자체 리뷰 노트

- 스펙 대비 커버리지: 스키마(Task 1), push(Task 2·4), 조회+현재값(Task 3·4), 검토 UI(Task 5·6), apply 추가만 정책(Task 4·5), SongPage push 진입점(Task 7), 에러 처리(Task 4), 수동 검증(Task 8) — 스펙 §1~§5 모두 대응.
- 타입 일관성: `SongUpdateQueueManager.pushSongUpdateQueueFromSong(songId: number)` / `getMediaCandidates(songId: number)`를 Task 2에서 정의하고 Task 4가 동일 시그니처로 호출. DTO 이름은 Task 3 정의와 Task 4 import 일치. 프런트 API 경로 5종은 controller 라우트와 일치.
- pnpm 금지 제약 때문에 자동 테스트/빌드 스텝 대신 사용자 체크포인트 3곳(Task 1, 4, 8)을 둔다.
