/**
 * Artist의 Spotify 트랙을 모두 가져와서 SpotifyTrack에 저장하는 스크립트
 *
 * 기능:
 * - Artist들의 Spotify 트랙을 Spotify API에서 가져오기
 * - 앨범을 20개씩 묶어서 한 번에 조회 (API 호출 최적화)
 * - SpotifyTrack 테이블에 저장 (songId는 null로 저장, 나중에 수동 매핑)
 * - SpotifyArtistTrack 매핑 생성 (트랙의 모든 아티스트)
 * - 아티스트 처리 완료 후 spotifyTracksFetchedAt 업데이트
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/fetch-artist-tracks.ts --dry-run
 * pnpm ts-node src/scripts/spotify/fetch-artist-tracks.ts              # spotifyTracksFetchedAt이 null인 아티스트 우선 처리
 * pnpm ts-node src/scripts/spotify/fetch-artist-tracks.ts 9            # 아티스트 ID 9부터 시작
 * pnpm ts-node src/scripts/spotify/fetch-artist-tracks.ts 9 --dry-run
 *
 * 주의:
 * - SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET 환경변수 필요
 * - Artist.spotifyId가 설정되어 있어야 함
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Spotify Access Token 가져오기
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Spotify에서 아티스트의 모든 앨범 ID 목록 가져오기
async function getArtistAlbumIds(
  spotifyArtistId: string,
  accessToken: string,
): Promise<string[]> {
  const albumIds: string[] = [];
  let url = `https://api.spotify.com/v1/artists/${spotifyArtistId}/albums?limit=50&include_groups=album,single`;

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
      console.error(`  ⚠️  Failed to get albums: ${response.statusText}`);
      break;
    }

    const data = await response.json();
    albumIds.push(...(data.items || []).map((item: any) => item.id));
    url = data.next;

    if (url) await delay(10);
  }

  return albumIds;
}

// 여러 앨범의 트랙을 한 번에 가져오기 (최대 20개)
async function getBulkAlbums(
  albumIds: string[],
  accessToken: string,
): Promise<any[]> {
  if (albumIds.length === 0) return [];

  const response = await fetch(
    `https://api.spotify.com/v1/albums?ids=${albumIds.join(",")}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    console.error(`  ⚠️  Failed to get bulk albums: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return data.albums || [];
}

// 여러 트랙을 한 번에 조회 (최대 50개)
async function getSeveralTracks(
  trackIds: string[],
  accessToken: string,
): Promise<any[]> {
  if (trackIds.length === 0) return [];

  const response = await fetch(
    `https://api.spotify.com/v1/tracks?ids=${trackIds.join(",")}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    console.error(`  ⚠️  Failed to get several tracks: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return data.tracks || [];
}

// 딜레이 함수
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processTrackBatch(
  trackIds: string[],
  accessToken: string,
  isDryRun: boolean,
): Promise<number> {
  if (trackIds.length === 0) {
    return 0;
  }

  const trackDetailsList = await getSeveralTracks(trackIds, accessToken);
  let processedCount = 0;

  for (const trackDetails of trackDetailsList) {
    if (!trackDetails) continue;

    if (!isDryRun) {
      const thumbnails = (trackDetails.album?.images || [])
        .map((img: any) => img.url)
        .filter((url: string) => url);

      const spotifyTrack = await prisma.spotifyTrack.upsert({
        where: { spotifyId: trackDetails.id },
        create: {
          spotifyId: trackDetails.id,
          spotifyUrl: trackDetails.external_urls?.spotify,
          name: trackDetails.name,
          popularity: trackDetails.popularity,
          previewUrl: trackDetails.preview_url,
          isrc: trackDetails.external_ids?.isrc,
          durationMs: trackDetails.duration_ms,
          releaseDate: trackDetails.album?.release_date,
          thumbnails,
        },
        update: {
          name: trackDetails.name,
          popularity: trackDetails.popularity,
          previewUrl: trackDetails.preview_url,
          releaseDate: trackDetails.album?.release_date,
          thumbnails,
        },
      });

      for (const trackArtist of trackDetails.artists || []) {
        const trackSpotifyArtist = await prisma.spotifyArtist.findUnique({
          where: { spotifyId: trackArtist.id },
        });

        if (trackSpotifyArtist) {
          await prisma.spotifyArtistTrack.upsert({
            where: {
              spotifyArtistId_spotifyTrackId: {
                spotifyArtistId: trackSpotifyArtist.id,
                spotifyTrackId: spotifyTrack.id,
              },
            },
            create: {
              spotifyArtistId: trackSpotifyArtist.id,
              spotifyTrackId: spotifyTrack.id,
            },
            update: {},
          });
        }
      }

      processedCount++;
    }
  }

  return processedCount;
}

async function getFallbackStartArtistId() {
  const latestTrack = await prisma.spotifyTrack.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      artists: {
        select: {
          spotifyArtist: {
            select: {
              id: true,
              artists: {
                select: {
                  id: true,
                  name: true,
                  nameKo: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!latestTrack) {
    return null;
  }

  const artistRecords =
    latestTrack.artists
      .flatMap((artistTrack) => artistTrack.spotifyArtist?.artists || [])
      .filter((artist) => typeof artist.id === "number") ?? [];

  if (artistRecords.length === 0) {
    return null;
  }

  const uniqueArtistIds = [
    ...new Set(artistRecords.map((artist) => artist.id)),
  ];
  const fallbackArtistId = Math.max(...uniqueArtistIds);

  return {
    artistId: fallbackArtistId,
    trackId: latestTrack.id,
    trackName: latestTrack.name,
    createdAt: latestTrack.createdAt,
    artistIds: uniqueArtistIds,
    artistSummaries: artistRecords.map(
      (artist) =>
        `Artist ID ${artist.id}: ${artist.name} (${artist.nameKo ?? "이름 없음"})`,
    ),
  };
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  // process.argv[2]가 숫자면 시작 아티스트 ID로 사용
  const startArtistIdArg = process.argv[2];
  const parsedStartArtistId =
    startArtistIdArg && !startArtistIdArg.includes("--")
      ? Number.parseInt(startArtistIdArg, 10)
      : undefined;

  let startArtistId = Number.isNaN(parsedStartArtistId)
    ? undefined
    : parsedStartArtistId;
  let startIdSource: "cli" | "latest" | "none" = "none";
  let fallbackInfo:
    | Awaited<ReturnType<typeof getFallbackStartArtistId>>
    | null = null;

  if (startArtistId) {
    startIdSource = "cli";
  } else {
    fallbackInfo = await getFallbackStartArtistId();
    if (fallbackInfo) {
      startArtistId = fallbackInfo.artistId;
      startIdSource = "latest";
    }
  }

  console.log(
    `\n=== Spotify Tracks 가져오기 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  if (startArtistId && startIdSource === "cli") {
    console.log(`Starting from Artist ID: ${startArtistId}\n`);
  } else if (startArtistId && startIdSource === "latest" && fallbackInfo) {
    console.log(
      `Starting from Artist ID: ${startArtistId} (latest SpotifyTrack ID ${fallbackInfo.trackId} "${fallbackInfo.trackName}" 기준)`,
    );
    console.log(
      `Latest track created at: ${fallbackInfo.createdAt.toISOString()}`,
    );
    console.log(
      `Latest track linked Artist IDs: ${fallbackInfo.artistIds.join(", ")}\n`,
    );
  } else {
    console.log("Starting from the first available artist.\n");
  }

  // 1. Access Token
  console.log("Step 1: Getting Spotify access token...");
  const accessToken = await getSpotifyAccessToken();
  console.log("✓ Access token acquired\n");

  // 2. Artist들 가져오기 (spotifyId가 있는 것만)
  console.log("Step 2: Fetching artists");

  let artists: { id: number; name: string; nameKo: string; spotifyId: string | null }[];

  if (startArtistId) {
    // 시작 ID가 지정된 경우: 해당 ID부터 순서대로
    artists = await prisma.artist.findMany({
      where: {
        id: { gte: startArtistId },
        spotifyId: { not: null },
      },
      select: {
        id: true,
        name: true,
        nameKo: true,
        spotifyId: true,
      },
      orderBy: { id: "asc" },
    });
    console.log(`✓ Found ${artists.length} artists with Spotify ID (starting from ID ${startArtistId})\n`);
  } else {
    // 시작 ID가 없는 경우: spotifyTracksFetchedAt이 null인 아티스트
    // 우선순위: JPOP → KPOP → POP → 나머지
    const baseWhere = {
      spotifyId: { not: null },
      spotifyTracksFetchedAt: null,
    };
    const selectFields = {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
      homeCatalog: true,
    };

    const [jpopArtists, kpopArtists, popArtists, otherArtists] = await Promise.all([
      prisma.artist.findMany({
        where: { ...baseWhere, homeCatalog: "JPOP" },
        select: selectFields,
        orderBy: { id: "asc" },
      }),
      prisma.artist.findMany({
        where: { ...baseWhere, homeCatalog: "KPOP" },
        select: selectFields,
        orderBy: { id: "asc" },
      }),
      prisma.artist.findMany({
        where: { ...baseWhere, homeCatalog: "POP" },
        select: selectFields,
        orderBy: { id: "asc" },
      }),
      prisma.artist.findMany({
        where: { ...baseWhere, homeCatalog: { notIn: ["JPOP", "KPOP", "POP"] } },
        select: selectFields,
        orderBy: { id: "asc" },
      }),
    ]);

    artists = [...jpopArtists, ...kpopArtists, ...popArtists, ...otherArtists];
    console.log(`✓ Found ${artists.length} artists (JPOP: ${jpopArtists.length}, KPOP: ${kpopArtists.length}, POP: ${popArtists.length}, 기타: ${otherArtists.length})\n`);
  }

  // 3. 각 아티스트의 트랙 가져오기
  console.log("Step 3: Fetching tracks for each artist...\n");

  let totalTracks = 0;
  let createdTracks = 0;
  let errorCount = 0;
  let lastProcessedArtist: { id: number; name: string } | null = null;

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    lastProcessedArtist = { id: artist.id, name: artist.name };

    console.log(
      `\n[${i + 1}/${artists.length}] Processing ${artist.name} (${artist.id})...`,
    );

    try {
      // SpotifyArtist 찾기
      const spotifyArtist = await prisma.spotifyArtist.findUnique({
        where: { spotifyId: artist.spotifyId! },
      });

      if (!spotifyArtist) {
        console.log(`  ⚠️  SpotifyArtist not found for ${artist.name}`);
        continue;
      }

      // 앨범 ID 목록 가져오기
      console.log(`  Fetching album IDs...`);
      const albumIds = await getArtistAlbumIds(artist.spotifyId!, accessToken);
      console.log(`  ✓ Found ${albumIds.length} albums`);

      // 앨범을 20개씩 묶어서 가져오기
      let artistTrackCount = 0;
      const processedTrackIds = new Set<string>();

      for (let j = 0; j < albumIds.length; j += 20) {
        const batchIds = albumIds.slice(j, j + 20);
        const albums = await getBulkAlbums(batchIds, accessToken);

        console.log(
          `  Processing albums ${j + 1}-${Math.min(j + 20, albumIds.length)}...`,
        );

        let trackIdsToProcess: string[] = [];

        for (const album of albums) {
          if (!album || !album.tracks || !album.tracks.items) continue;

          for (const track of album.tracks.items) {
            // 중복 방지
            if (processedTrackIds.has(track.id)) continue;
            processedTrackIds.add(track.id);

            totalTracks++;
            artistTrackCount++;

            trackIdsToProcess.push(track.id);

            if (trackIdsToProcess.length === 50) {
              const processedInBatch = await processTrackBatch(
                trackIdsToProcess,
                accessToken,
                isDryRun,
              );
              if (!isDryRun) {
                createdTracks += processedInBatch;
              }
              trackIdsToProcess = [];
            }

            // Rate limit 방지
            // await delay(10);
          }
        }

        if (trackIdsToProcess.length > 0) {
          const processedInBatch = await processTrackBatch(
            trackIdsToProcess,
            accessToken,
            isDryRun,
          );
          if (!isDryRun) {
            createdTracks += processedInBatch;
          }
        }

        // 배치 간 딜레이
        // await delay(20);
      }

      console.log(
        `  ✓ Processed ${artistTrackCount} tracks for ${artist.name}`,
      );

      // 모든 트랙 처리 완료 후 spotifyTracksFetchedAt 업데이트
      if (!isDryRun) {
        await prisma.artist.update({
          where: { id: artist.id },
          data: { spotifyTracksFetchedAt: new Date() },
        });
        console.log(`  ✓ spotifyTracksFetchedAt 업데이트 완료`);
      }

      // 아티스트 간 딜레이
      // await delay(20);
    } catch (error: any) {
      if (error.message === "RATE_LIMIT_EXCEEDED") {
        console.error(
          `\n❌ Rate limit exceeded. Stopping at ${artist.name} (${artist.id})`,
        );
        console.error(
          `   Please wait a few minutes and restart from: ${artist.id}\n`,
        );
        break;
      }
      errorCount++;
      console.error(`  ❌ Error processing ${artist.name}:`, error);
    }
  }

  // 결과 출력
  console.log(`\n=== 결과 ===`);
  console.log(`📊 총 트랙 수: ${totalTracks}개`);
  console.log(`✅ SpotifyTrack 생성: ${createdTracks}개`);
  console.log(`❌ 오류 발생: ${errorCount}개`);
  if (lastProcessedArtist) {
    console.log(
      `🎵 마지막 처리: ${lastProcessedArtist.name} (ID: ${lastProcessedArtist.id})`,
    );
  }

  if (isDryRun) {
    console.log(
      `\n💡 실제 업데이트를 수행하려면 --dry-run 없이 다시 실행하세요.`,
    );
  } else {
    console.log(`\n✅ 동기화 완료!`);
  }
}

main()
  .catch((error) => {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
