/**
 * Artist의 Spotify 트랙을 모두 가져와서 SpotifyTrack과 매핑하는 스크립트
 *
 * 기능:
 * - artistId < 272인 Artist들의 Spotify 트랙을 Spotify API에서 가져오기
 * - 각 Artist의 모든 앨범 → 모든 트랙 조회
 * - SpotifyTrack 테이블에 저장
 * - Song과 제목으로 매칭 시도
 * - SpotifyArtistTrack 매핑 생성 (트랙의 모든 아티스트)
 *
 * 사용법:
 * npx tsx src/scripts/spotify/fetch-artist-tracks.ts --dry-run
 * npx tsx src/scripts/spotify/fetch-artist-tracks.ts
 *
 * 주의:
 * - SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET 환경변수 필요
 * - Artist.spotifyId가 설정되어 있어야 함
 * - Rate limit 고려하여 딜레이 추가
 * - 시간이 오래 걸릴 수 있음
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

// Spotify에서 아티스트의 모든 앨범 가져오기
async function getArtistAlbums(spotifyArtistId: string, accessToken: string): Promise<any[]> {
  const albums: any[] = [];
  let url = `https://api.spotify.com/v1/artists/${spotifyArtistId}/albums?limit=50&include_groups=album,single`;

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error(`  ⚠️  Failed to get albums: ${response.statusText}`);
      break;
    }

    const data = await response.json();
    albums.push(...(data.items || []));
    url = data.next; // 다음 페이지

    // Rate limit 방지
    if (url) await delay(100);
  }

  return albums;
}

// 앨범의 모든 트랙 가져오기
async function getAlbumTracks(albumId: string, accessToken: string): Promise<any[]> {
  const tracks: any[] = [];
  let url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error(`  ⚠️  Failed to get album tracks: ${response.statusText}`);
      break;
    }

    const data = await response.json();
    tracks.push(...(data.items || []));
    url = data.next;

    if (url) await delay(100);
  }

  return tracks;
}

// 트랙 상세 정보 가져오기 (앨범 정보 포함)
async function getTrackDetails(trackId: string, accessToken: string): Promise<any> {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error(`  ⚠️  Failed to get track details: ${response.statusText}`);
    return null;
  }

  return await response.json();
}

// 딜레이 함수
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 제목으로 Song 찾기
async function findSongByTitle(trackName: string, artistId: number): Promise<any | null> {
  // 해당 아티스트의 곡 중에서 제목이 유사한 것 찾기
  const songs = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: { artistId },
      },
      OR: [
        { title: trackName },
        { titleKo: trackName },
        { title: { contains: trackName } },
        { titleKo: { contains: trackName } },
      ],
    },
    take: 1,
  });

  return songs[0] || null;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`\n=== Spotify Tracks 가져오기 ${isDryRun ? "(DRY RUN)" : ""} ===\n`);

  // 1. Access Token
  console.log("Step 1: Getting Spotify access token...");
  const accessToken = await getSpotifyAccessToken();
  console.log("✓ Access token acquired\n");

  // 2. Artist들 가져오기 (spotifyId가 있는 것만)
  console.log("Step 2: Fetching artists (id < 272)...");
  const artists = await prisma.artist.findMany({
    where: {
      id: { lt: 272 },
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

  console.log(`✓ Found ${artists.length} artists with Spotify ID\n`);

  // 3. 각 아티스트의 트랙 가져오기
  console.log("Step 3: Fetching tracks for each artist...\n");

  let totalTracks = 0;
  let createdTracks = 0;
  let matchedSongs = 0;
  let errorCount = 0;

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];

    console.log(`\n[${i + 1}/${artists.length}] Processing ${artist.name}...`);

    try {
      // SpotifyArtist 찾기
      const spotifyArtist = await prisma.spotifyArtist.findUnique({
        where: { spotifyId: artist.spotifyId! },
      });

      if (!spotifyArtist) {
        console.log(`  ⚠️  SpotifyArtist not found for ${artist.name}`);
        continue;
      }

      // 앨범들 가져오기
      console.log(`  Fetching albums...`);
      const albums = await getArtistAlbums(artist.spotifyId!, accessToken);
      console.log(`  ✓ Found ${albums.length} albums`);

      // 각 앨범의 트랙 가져오기
      let artistTrackCount = 0;
      const processedTrackIds = new Set<string>();

      for (const album of albums) {
        const albumTracks = await getAlbumTracks(album.id, accessToken);

        for (const track of albumTracks) {
          // 중복 방지
          if (processedTrackIds.has(track.id)) continue;
          processedTrackIds.add(track.id);

          totalTracks++;
          artistTrackCount++;

          // 트랙 상세 정보 가져오기
          const trackDetails = await getTrackDetails(track.id, accessToken);
          if (!trackDetails) continue;

          // Song 매칭 시도
          const matchedSong = await findSongByTitle(trackDetails.name, artist.id);

          if (!isDryRun) {
            // SpotifyTrack 생성/업데이트
            let spotifyTrack;
            if (matchedSong) {
              spotifyTrack = await prisma.spotifyTrack.upsert({
                where: { spotifyId: trackDetails.id },
                create: {
                  songId: matchedSong.id,
                  spotifyId: trackDetails.id,
                  spotifyUrl: trackDetails.external_urls?.spotify,
                  name: trackDetails.name,
                  popularity: trackDetails.popularity,
                  previewUrl: trackDetails.preview_url,
                  isrc: trackDetails.external_ids?.isrc,
                  durationMs: trackDetails.duration_ms,
                  releaseDate: trackDetails.album?.release_date,
                  thumbnailDefault: trackDetails.album?.images?.[2]?.url,
                  thumbnailMedium: trackDetails.album?.images?.[1]?.url,
                  thumbnailHigh: trackDetails.album?.images?.[0]?.url,
                },
                update: {
                  name: trackDetails.name,
                  popularity: trackDetails.popularity,
                  previewUrl: trackDetails.preview_url,
                  releaseDate: trackDetails.album?.release_date,
                },
              });
              matchedSongs++;
            } else {
              // Song이 없으면 SpotifyTrack만 저장 (songId 없이는 불가능하므로 스킵)
              // console.log(`    ⚠️  No matching song: ${trackDetails.name}`);
              continue;
            }

            // SpotifyArtistTrack 매핑 생성 (트랙의 모든 아티스트)
            for (const trackArtist of trackDetails.artists) {
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

            createdTracks++;
          }

          // Rate limit 방지
          await delay(50);
        }
      }

      console.log(`  ✓ Processed ${artistTrackCount} tracks for ${artist.name}`);

      // 아티스트 간 딜레이
      await delay(200);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error processing ${artist.name}:`, error);
    }
  }

  // 결과 출력
  console.log(`\n=== 결과 ===`);
  console.log(`📊 총 트랙 수: ${totalTracks}개`);
  console.log(`✅ SpotifyTrack 생성: ${createdTracks}개`);
  console.log(`🔗 Song 매칭 성공: ${matchedSongs}개`);
  console.log(`❌ 오류 발생: ${errorCount}개`);

  if (isDryRun) {
    console.log(`\n💡 실제 업데이트를 수행하려면 --dry-run 없이 다시 실행하세요.`);
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
