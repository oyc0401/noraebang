/**
 * 여러 Artist를 Spotify ID와 매핑하는 스크립트
 *
 * 기능:
 * - 여러 artistId와 spotifyId를 받아서 일괄 매핑
 * - Spotify API에서 아티스트 정보를 가져와서 SpotifyArtist 테이블에 저장
 * - Artist.spotifyId 업데이트
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/link-multiple-artists.ts --dry-run
 * pnpm ts-node src/scripts/spotify/link-multiple-artists.ts
 *
 * 주의:
 * - SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET 환경변수 필요
 * - ARTIST_MAPPINGS 배열에 { artistId, spotifyId } 형태로 입력
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

// ========================================
// 여기에 매핑할 아티스트 ID와 Spotify ID를 입력하세요
// ========================================
const ARTIST_MAPPINGS: Array<{ artistId: number; spotifyId: string }> = [
  { artistId: 60, spotifyId: "4WgGn0neagCUyjQExpUBX7" }, // 百足 (무카데)
  { artistId: 272, spotifyId: "5KUOSKYLz09CFEp79nLJW5" }, // 韻マン (인만)
];

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

// Spotify에서 아티스트 정보 가져오기
async function getSpotifyArtist(
  spotifyId: string,
  accessToken: string,
): Promise<any> {
  const response = await fetch(
    `https://api.spotify.com/v1/artists/${spotifyId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get artist from Spotify: ${response.statusText}`,
    );
  }

  return await response.json();
}

// 딜레이 함수
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`\n=== 여러 Artist 매핑 ${isDryRun ? "(DRY RUN)" : ""} ===\n`);

  if (ARTIST_MAPPINGS.length === 0) {
    console.log("⚠️  ARTIST_MAPPINGS 배열이 비어있습니다.");
    console.log(
      "스크립트 파일을 열어서 매핑할 아티스트 정보를 입력해주세요.\n",
    );
    return;
  }

  console.log(`총 ${ARTIST_MAPPINGS.length}개 아티스트 매핑 예정\n`);

  // 1. Spotify Access Token 가져오기
  console.log("Step 1: Getting Spotify access token...");
  const accessToken = await getSpotifyAccessToken();
  console.log("✓ Access token acquired\n");

  // 2. 각 아티스트 처리
  console.log("Step 2: Processing artists...\n");

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ artistId: number; error: string }> = [];

  for (let i = 0; i < ARTIST_MAPPINGS.length; i++) {
    const { artistId, spotifyId } = ARTIST_MAPPINGS[i];

    console.log(
      `\n[${i + 1}/${ARTIST_MAPPINGS.length}] Processing Artist ID ${artistId}...`,
    );

    try {
      // 2.1. Artist 확인
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

      console.log(`  Artist: [${artist.id}] ${artist.name} (${artist.nameKo})`);

      if (artist.spotifyId) {
        console.log(
          `  ⚠️  이미 Spotify ID가 설정되어 있습니다: ${artist.spotifyId}`,
        );
        console.log(`  → 새로운 ID로 덮어씁니다: ${spotifyId}`);
      }

      // 2.2. Spotify에서 아티스트 정보 가져오기
      console.log(`  Fetching Spotify data...`);
      const spotifyArtist = await getSpotifyArtist(spotifyId, accessToken);

      const spotifyData = {
        spotifyId: spotifyArtist.id,
        spotifyUrl: spotifyArtist.external_urls?.spotify,
        name: spotifyArtist.name,
        popularity: spotifyArtist.popularity,
        followers: spotifyArtist.followers?.total,
        genres: spotifyArtist.genres || [],
        thumbnailDefault: spotifyArtist.images?.[2]?.url,
        thumbnailMedium: spotifyArtist.images?.[1]?.url,
        thumbnailHigh: spotifyArtist.images?.[0]?.url,
      };

      console.log(`  Spotify Artist: ${spotifyData.name}`);
      console.log(
        `    Popularity: ${spotifyData.popularity}, Followers: ${spotifyData.followers?.toLocaleString()}`,
      );

      if (!isDryRun) {
        // 2.3. SpotifyArtist 생성 또는 업데이트
        await prisma.spotifyArtist.upsert({
          where: { spotifyId: spotifyData.spotifyId },
          create: spotifyData,
          update: spotifyData,
        });

        // 2.4. Artist.spotifyId 업데이트
        await prisma.artist.update({
          where: { id: artistId },
          data: { spotifyId: spotifyData.spotifyId },
        });

        console.log(`  ✓ 매핑 완료!`);
      } else {
        console.log(`  ✓ 확인 완료 (DRY RUN)`);
      }

      successCount++;

      // Rate limit 방지
      await delay(200);
    } catch (error: any) {
      errorCount++;
      const errorMessage = error.message || String(error);
      errors.push({ artistId, error: errorMessage });
      console.error(`  ❌ 오류 발생:`, errorMessage);
    }
  }

  // 3. 결과 출력
  console.log(`\n${"=".repeat(80)}`);
  console.log("=== 결과 ===");
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${errorCount}개`);

  if (errors.length > 0) {
    console.log(`\n실패한 아티스트:`);
    for (const { artistId, error } of errors) {
      console.log(`  - Artist ID ${artistId}: ${error}`);
    }
  }

  if (isDryRun) {
    console.log(
      `\n💡 DRY RUN 모드: 실제 업데이트를 수행하려면 --dry-run 없이 다시 실행하세요.`,
    );
  } else {
    console.log(`\n✅ 매핑 완료!`);
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
