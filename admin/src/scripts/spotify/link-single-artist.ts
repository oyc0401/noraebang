/**
 * 단일 Artist를 Spotify ID와 매핑하는 스크립트
 *
 * 기능:
 * - artistId와 spotifyId를 받아서 수동 매핑
 * - Spotify API에서 아티스트 정보를 가져와서 SpotifyArtist 테이블에 저장
 * - Artist.spotifyId 업데이트
 *
 * 사용법:
 * npx tsx src/scripts/spotify/link-single-artist.ts <artistId> <spotifyId> --dry-run
 * npx tsx src/scripts/spotify/link-single-artist.ts 187 46JcLfNgVQ8zNtSZU3vXB1
 * npx tsx src/scripts/spotify/link-single-artist.ts 255 7LCvObtg5MA10WBd4DiK1E
 *
 * 주의:
 * - SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET 환경변수 필요
 * - Artist 테이블에 spotify_id 컬럼이 있어야 함
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

// Spotify에서 아티스트 정보 가져오기
async function getSpotifyArtist(spotifyId: string, accessToken: string): Promise<any> {
  const response = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get artist from Spotify: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

async function main() {
  const artistIdArg = process.argv[2];
  const spotifyIdArg = process.argv[3];
  const isDryRun = process.argv.includes("--dry-run");

  if (!artistIdArg || !spotifyIdArg) {
    console.error("❌ Usage: npx tsx src/scripts/spotify/link-single-artist.ts <artistId> <spotifyId> [--dry-run]");
    console.error('   Example: npx tsx src/scripts/spotify/link-single-artist.ts 187 46JcLfNgVQ8zNtSZU3vXB1');
    process.exit(1);
  }

  const artistId = Number.parseInt(artistIdArg, 10);
  const spotifyId = spotifyIdArg;

  if (Number.isNaN(artistId)) {
    console.error("❌ artistId must be a number");
    process.exit(1);
  }

  console.log(`\n=== 단일 Artist 매핑 ${isDryRun ? "(DRY RUN)" : ""} ===`);
  console.log(`Artist ID: ${artistId}`);
  console.log(`Spotify ID: ${spotifyId}\n`);

  try {
    // 1. Artist 확인
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
      console.error(`❌ Artist not found: ${artistId}`);
      process.exit(1);
    }

    console.log(`Artist: [${artist.id}] ${artist.name} (${artist.nameKo})`);

    if (artist.spotifyId) {
      console.log(`⚠️  이미 Spotify ID가 설정되어 있습니다: ${artist.spotifyId}`);
      console.log(`   새로운 ID로 덮어쓰시겠습니까? (계속하려면 --force 옵션 추가)`);
      if (!process.argv.includes("--force")) {
        process.exit(0);
      }
    }

    // 2. Spotify Access Token 가져오기
    console.log("\nGetting Spotify access token...");
    const accessToken = await getSpotifyAccessToken();

    // 3. Spotify에서 아티스트 정보 가져오기
    console.log("Fetching artist info from Spotify...");
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

    console.log(`\nSpotify Artist: ${spotifyData.name}`);
    console.log(`  Popularity: ${spotifyData.popularity}`);
    console.log(`  Followers: ${spotifyData.followers?.toLocaleString()}`);
    console.log(`  Genres: ${spotifyData.genres.join(", ") || "N/A"}`);

    if (!isDryRun) {
      // 4. SpotifyArtist 생성 또는 업데이트
      console.log("\nUpdating SpotifyArtist table...");
      await prisma.spotifyArtist.upsert({
        where: { spotifyId: spotifyData.spotifyId },
        create: spotifyData,
        update: spotifyData,
      });

      // 5. Artist.spotifyId 업데이트
      console.log("Updating Artist.spotifyId...");
      await prisma.artist.update({
        where: { id: artistId },
        data: { spotifyId: spotifyData.spotifyId },
      });

      console.log("\n✅ 매핑 완료!");
    } else {
      console.log("\n💡 Dry-run 모드입니다. 실제 업데이트를 수행하려면 --dry-run 없이 실행하세요.");
    }
  } catch (error) {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
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
