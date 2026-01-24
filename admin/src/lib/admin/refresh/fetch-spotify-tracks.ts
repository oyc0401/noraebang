import { prisma } from "../../prisma";

/**
 * 특정 아티스트의 Spotify 트랙을 모두 가져와서 SpotifyTrack에 저장하는 함수
 *
 * - Artist의 spotifyId를 통해 Spotify API에서 앨범/트랙 정보 수집
 * - SpotifyTrack 테이블에 upsert
 * - SpotifyArtistTrack 매핑 생성
 * - 완료 후 Artist.spotifyTracksFetchedAt 업데이트
 */

export interface FetchSpotifyTracksForArtistOptions {
  dryRun?: boolean;
}

// Spotify Access Token 가져오기
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required",
    );
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
  let url:
    | string
    | undefined = `https://api.spotify.com/v1/artists/${spotifyArtistId}/albums?limit=50&include_groups=album,single`;

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
      console.log(`  ⚠️  Failed to get albums: ${response.statusText}`);
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
    console.log(`  ⚠️  Failed to get bulk albums: ${response.statusText}`);
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
    console.log(`  ⚠️  Failed to get several tracks: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return data.tracks || [];
}

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

export async function fetchSpotifyTracksForArtist(
  artistId: number,
  options: FetchSpotifyTracksForArtistOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  // 1. 아티스트 정보 조회
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  if (!artist.spotifyId) {
    throw new Error(`Artist #${artistId} has no spotifyId`);
  }

  console.log(
    `\n[Artist #${artist.id}] ${artist.name} (${artist.nameKo ?? ""})`,
  );
  console.log(`  Spotify ID: ${artist.spotifyId}`);
  if (dryRun) console.log(`  🔍 DRY-RUN MODE`);

  // 2. Access Token 획득
  console.log(`  → Spotify 토큰 획득 중...`);
  const accessToken = await getSpotifyAccessToken();

  // 3. SpotifyArtist 찾기
  const spotifyArtist = await prisma.spotifyArtist.findUnique({
    where: { spotifyId: artist.spotifyId },
  });

  if (!spotifyArtist) {
    throw new Error(`SpotifyArtist not found for spotifyId: ${artist.spotifyId}`);
  }

  // 4. 앨범 ID 목록 가져오기
  console.log(`  → 앨범 목록 조회 중...`);
  const albumIds = await getArtistAlbumIds(artist.spotifyId, accessToken);
  console.log(`  → ${albumIds.length}개 앨범 발견`);

  if (albumIds.length === 0) {
    console.log(`  → 앨범이 없습니다.`);
    return;
  }

  // 5. 앨범을 20개씩 묶어서 트랙 가져오기
  let totalTracks = 0;
  let createdTracks = 0;
  const processedTrackIds = new Set<string>();

  for (let j = 0; j < albumIds.length; j += 20) {
    const batchIds = albumIds.slice(j, j + 20);
    const albums = await getBulkAlbums(batchIds, accessToken);

    console.log(
      `  → 앨범 ${j + 1}-${Math.min(j + 20, albumIds.length)} 처리 중...`,
    );

    let trackIdsToProcess: string[] = [];

    for (const album of albums) {
      if (!album || !album.tracks || !album.tracks.items) continue;

      for (const track of album.tracks.items) {
        // 중복 방지
        if (processedTrackIds.has(track.id)) continue;
        processedTrackIds.add(track.id);

        totalTracks++;
        trackIdsToProcess.push(track.id);

        if (trackIdsToProcess.length === 50) {
          const processedInBatch = await processTrackBatch(
            trackIdsToProcess,
            accessToken,
            dryRun,
          );
          if (!dryRun) {
            createdTracks += processedInBatch;
          }
          trackIdsToProcess = [];
        }
      }
    }

    if (trackIdsToProcess.length > 0) {
      const processedInBatch = await processTrackBatch(
        trackIdsToProcess,
        accessToken,
        dryRun,
      );
      if (!dryRun) {
        createdTracks += processedInBatch;
      }
    }
  }

  console.log(`  → 총 ${totalTracks}개 트랙 발견`);

  if (dryRun) {
    console.log(`  • DRY-RUN: 작업 미적용`);
    return;
  }

  // 6. spotifyTracksFetchedAt 업데이트
  await prisma.artist.update({
    where: { id: artist.id },
    data: { spotifyTracksFetchedAt: new Date() },
  });

  console.log(
    `  • 완료: ${createdTracks}개 트랙 upsert, spotifyTracksFetchedAt 업데이트`,
  );
}
