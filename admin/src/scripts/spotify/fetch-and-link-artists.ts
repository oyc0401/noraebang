/**
 * Artist의 Spotify 정보를 가져와서 SpotifyArtist를 생성하고 매핑하는 스크립트
 *
 * 기능:
 * - artistId < 300인 Artist들의 Spotify 정보를 Spotify API에서 검색
 * - SpotifyArtist 테이블에 저장 (없으면 생성, 있으면 업데이트)
 * - Artist.spotifyId에 매핑
 *
 * 사용법:
 * npx tsx src/scripts/spotify/fetch-and-link-artists.ts --dry-run
 * npx tsx src/scripts/spotify/fetch-and-link-artists.ts
 *
 * 주의:
 * - SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET 환경변수 필요
 * - Artist 테이블에 spotify_id 컬럼이 있어야 함
 * - Rate limit 고려하여 천천히 실행 (딜레이 추가)
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

// Spotify에서 아티스트 검색
async function searchSpotifyArtist(
  artistName: string,
  accessToken: string,
): Promise<any | null> {
  const query = encodeURIComponent(artistName);
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${query}&type=artist&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    console.error(`  ⚠️  Spotify API error: ${response.statusText}`);
    return null;
  }

  const data = await response.json();
  const artist = data.artists?.items?.[0];

  return artist || null;
}

// 딜레이 함수 (Rate limit 방지)
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    `\n=== Spotify Artist 생성 및 매핑 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  // 1. Spotify Access Token 가져오기
  console.log("Step 1: Getting Spotify access token...");
  const accessToken = await getSpotifyAccessToken();
  console.log("✓ Access token acquired\n");

  // 2. artistId < 300인 Artist들 가져오기
  console.log("Step 2: Fetching artists (id < 300)...");
  const artists = await prisma.artist.findMany({
    where: {
      id: {
        lt: 300,
      },
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.log(`✓ Found ${artists.length} artists\n`);

  // 3. 각 아티스트에 대해 Spotify 검색 및 저장
  console.log("Step 3: Searching and linking Spotify artists...");

  let createdCount = 0;
  let updatedCount = 0;
  let alreadyLinkedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  const notFoundArtists: string[] = [];

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];

    // 이미 spotifyId가 설정되어 있으면 스킵
    if (artist.spotifyId) {
      alreadyLinkedCount++;
      console.log(
        `  [${i + 1}/${artists.length}] [${artist.id}] ${artist.name} - Already linked`,
      );
      continue;
    }

    try {
      // Spotify에서 검색
      const spotifyArtist = await searchSpotifyArtist(artist.name, accessToken);

      if (!spotifyArtist) {
        notFoundCount++;
        notFoundArtists.push(
          `[${artist.id}] ${artist.name} (${artist.nameKo})`,
        );
        console.log(
          `  [${i + 1}/${artists.length}] [${artist.id}] ${artist.name} - Not found`,
        );
        continue;
      }

      const thumbnails = (spotifyArtist.images || [])
        .map((img: any) => img.url)
        .filter((url: string) => url);

      const spotifyData = {
        spotifyId: spotifyArtist.id,
        spotifyUrl: spotifyArtist.external_urls?.spotify,
        name: spotifyArtist.name,
        popularity: spotifyArtist.popularity,
        followers: spotifyArtist.followers?.total,
        genres: spotifyArtist.genres || [],
        thumbnails,
      };

      if (!isDryRun) {
        // SpotifyArtist 생성 또는 업데이트
        await prisma.spotifyArtist.upsert({
          where: { spotifyId: spotifyData.spotifyId },
          create: spotifyData,
          update: spotifyData,
        });

        // Artist.spotifyId 업데이트
        await prisma.artist.update({
          where: { id: artist.id },
          data: { spotifyId: spotifyData.spotifyId },
        });

        createdCount++;
      } else {
        createdCount++;
      }

      console.log(
        `  [${i + 1}/${artists.length}] ✓ [${artist.id}] ${artist.name} → ${spotifyData.spotifyId} (${spotifyData.name})`,
      );

      // Rate limit 방지 (100ms 딜레이)
      await delay(100);
    } catch (error) {
      errorCount++;
      console.error(
        `  [${i + 1}/${artists.length}] ❌ [${artist.id}] ${artist.name} - Error: ${error}`,
      );
    }
  }

  // 결과 출력
  console.log(`\n=== 결과 ===`);
  console.log(`✅ 생성/업데이트 완료: ${createdCount}개`);
  console.log(`ℹ️  이미 연결됨: ${alreadyLinkedCount}개`);
  console.log(`⚠️  Spotify에서 찾지 못함: ${notFoundCount}개`);
  console.log(`❌ 오류 발생: ${errorCount}개`);

  if (notFoundArtists.length > 0) {
    console.log(`\n📋 Spotify에서 찾지 못한 아티스트 (최대 20개):`);
    notFoundArtists.slice(0, 20).forEach((artist) => {
      console.log(`  - ${artist}`);
    });
    if (notFoundArtists.length > 20) {
      console.log(`  ... 외 ${notFoundArtists.length - 20}개`);
    }
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
