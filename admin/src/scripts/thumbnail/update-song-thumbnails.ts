import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

/**
 * 곡의 썸네일을 바꾸기
 * 1. 스포티파이
 * 2. 유튜브
 * 사용법:
 * pnpm ts-node src/scripts/thumbnail/update-song-thumbnails.ts --dry-run
 * pnpm ts-node src/scripts/thumbnail/update-song-thumbnails.ts
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ThumbTriple = {
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
};

function pickSpotifyThumbnails(urls: string[]): ThumbTriple | null {
  const cleaned = (urls ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
  if (cleaned.length === 0) return null;

  const high = cleaned[0] ?? null;
  const medium = cleaned[1] ?? cleaned[0] ?? null;
  const def = cleaned[2] ?? cleaned[1] ?? cleaned[0] ?? null;

  return {
    thumbnailDefault: def,
    thumbnailMedium: medium,
    thumbnailHigh: high,
  };
}

function pickYoutubeThumbs(v: {
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
}): ThumbTriple | null {
  const high = (v.thumbnailHigh ?? "").trim() || null;
  const medium = (v.thumbnailMedium ?? "").trim() || high || null;
  const def = (v.thumbnailDefault ?? "").trim() || medium || high || null;

  if (!def && !medium && !high) return null;

  return {
    thumbnailDefault: def,
    thumbnailMedium: medium,
    thumbnailHigh: high,
  };
}

function sameThumbs(a: ThumbTriple, b: ThumbTriple): boolean {
  return (
    (a.thumbnailDefault ?? null) === (b.thumbnailDefault ?? null) &&
    (a.thumbnailMedium ?? null) === (b.thumbnailMedium ?? null) &&
    (a.thumbnailHigh ?? null) === (b.thumbnailHigh ?? null)
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * releaseDate 비교용 키
 * - null/빈값은 "최신" 취급(오래된 걸 고르는 데 불리하게)
 * - "YYYY", "YYYY-MM", "YYYY-MM-DD" 모두 사전식 비교가 시간순과 일치
 */
function releaseKey(releaseDate: string | null): string {
  const s = (releaseDate ?? "").trim();
  if (!s) return "9999-99-99";
  // 혹시 "YYYY-MM-DD..." 같은 이상한 포맷이면 앞 10자리 정도만
  return s.slice(0, 10);
}

function pickOldestTrackWithThumbs(
  tracks: Array<{ releaseDate: string | null; thumbnails: string[] }>,
): { thumbnails: string[] } | null {
  if (!tracks?.length) return null;

  // 1) thumbnails가 있는 트랙만 후보
  const candidates = tracks
    .map((t) => ({
      key: releaseKey(t.releaseDate),
      thumbnails: t.thumbnails ?? [],
    }))
    .filter((t) => (t.thumbnails ?? []).some((x) => (x ?? "").trim()));

  if (candidates.length === 0) return null;

  // 2) releaseDate 가장 오래된(가장 작은 key) 선택
  candidates.sort((a, b) => a.key.localeCompare(b.key));

  return { thumbnails: candidates[0]!.thumbnails };
}

async function main() {
  const ARTIST_ID_MAX = 300;

  const songs = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: { artistId: { lte: ARTIST_ID_MAX } },
      },
    },
    select: {
      id: true,
      title: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,

      spotifyTrackGroup: {
        select: {
          tracks: {
            select: {
              releaseDate: true,
              thumbnails: true,
            },
          },
        },
      },

      youtubeVideos: {
        select: {
          youtubeVideo: {
            select: {
              videoId: true,
              viewCount: true,
              thumbnailDefault: true,
              thumbnailMedium: true,
              thumbnailHigh: true,
            },
          },
        },
      },
    },
  });

  console.log(
    `🎵 대상 Song 수: ${songs.length} (artistId <= ${ARTIST_ID_MAX})`,
  );

  let updated = 0;
  let updatedBySpotifyOldest = 0;
  let updatedByYoutube = 0;
  let unchanged = 0;
  let skippedNoSource = 0;

  const updates: Array<{
    songId: number;
    next: ThumbTriple;
    source: "spotifyOldest" | "youtube";
  }> = [];

  for (const song of songs) {
    const current: ThumbTriple = {
      thumbnailDefault: song.thumbnailDefault ?? null,
      thumbnailMedium: song.thumbnailMedium ?? null,
      thumbnailHigh: song.thumbnailHigh ?? null,
    };

    // 1) Spotify: 그룹 tracks 중 "가장 오래된 releaseDate" 트랙의 thumbnails
    const tracks = song.spotifyTrackGroup?.tracks ?? [];
    const oldest = pickOldestTrackWithThumbs(tracks);

    if (oldest) {
      const picked = pickSpotifyThumbnails(oldest.thumbnails);
      if (picked) {
        if (sameThumbs(current, picked)) {
          unchanged++;
        } else {
          updates.push({
            songId: song.id,
            next: picked,
            source: "spotifyOldest",
          });
        }
        continue;
      }
    }

    // 2) Youtube: viewCount 최대
    const ytCandidates =
      song.youtubeVideos?.map((x) => x.youtubeVideo).filter(Boolean) ?? [];

    if (ytCandidates.length === 0) {
      skippedNoSource++;
      continue;
    }

    let best = ytCandidates[0]!;
    let bestViews = (best.viewCount ?? 0n) as bigint;

    for (let i = 1; i < ytCandidates.length; i++) {
      const v = ytCandidates[i]!;
      const views = (v.viewCount ?? 0n) as bigint;
      if (views > bestViews) {
        best = v;
        bestViews = views;
      }
    }

    const ytPicked = pickYoutubeThumbs(best);
    if (!ytPicked) {
      skippedNoSource++;
      continue;
    }

    if (sameThumbs(current, ytPicked)) {
      unchanged++;
    } else {
      updates.push({ songId: song.id, next: ytPicked, source: "youtube" });
    }
  }

  console.log(`🧾 업데이트 예정: ${updates.length}`);
  console.log(`  - 동일(unchanged): ${unchanged}`);
  console.log(`  - 소스 없음(skip): ${skippedNoSource}`);

  const batches = chunk(updates, 50);

  for (const [idx, batch] of batches.entries()) {
    await prisma.$transaction(
      batch.map((u) => {
        if (u.source === "spotifyOldest") updatedBySpotifyOldest++;
        else updatedByYoutube++;
        updated++;

        return prisma.song.update({
          where: { id: u.songId },
          data: {
            thumbnailDefault: u.next.thumbnailDefault,
            thumbnailMedium: u.next.thumbnailMedium,
            thumbnailHigh: u.next.thumbnailHigh,
          },
          select: { id: true },
        });
      }),
    );

    console.log(
      `✅ 진행: ${Math.min((idx + 1) * 50, updates.length)}/${updates.length}`,
    );
  }

  console.log("\n==================== DONE ====================");
  console.log(`✅ updated: ${updated}`);
  console.log(`  - by spotify(oldest releaseDate): ${updatedBySpotifyOldest}`);
  console.log(`  - by youtube(best viewCount): ${updatedByYoutube}`);
  console.log(`↔️ unchanged: ${unchanged}`);
  console.log(`⏭️ skipped(no spotify+no youtube thumbs): ${skippedNoSource}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  console.error("Fatal error:", e);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
