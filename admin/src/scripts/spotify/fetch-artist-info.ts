/**
 * Spotify API를 사용하여 아티스트 정보를 가져와서 SpotifyArtist 테이블에 저장하는 스크립트
 *
 * 기능:
 * - Artist ID로 아티스트 조회 (기본값: 44)
 * - 해당 아티스트의 spotifyId를 사용하여 Spotify API 호출
 * - Spotify 아티스트 정보(name, followers, genres, popularity, thumbnails 등)를 가져와서 SpotifyArtist 테이블에 upsert
 * - --dry-run 옵션으로 실제 저장 없이 확인 가능
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/fetch-artist-info.ts
 * pnpm ts-node src/scripts/spotify/fetch-artist-info.ts --dry-run
 * pnpm ts-node src/scripts/spotify/fetch-artist-info.ts 44
 * pnpm ts-node src/scripts/spotify/fetch-artist-info.ts 44 --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { SpotifyService } from "./spotify.service.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const spotifyService = new SpotifyService();

async function main() {
  const args = process.argv.slice(2);
  const artistIdStr = args.find((arg) => !arg.startsWith("--"));
  const isDryRun = args.includes("--dry-run");

  const artistId = artistIdStr ? Number.parseInt(artistIdStr, 10) : 44;

  if (Number.isNaN(artistId)) {
    console.error("❌ Error: artistId must be a number");
    process.exit(1);
  }

  if (isDryRun) {
    console.log("🔍 [DRY RUN MODE] 실제 DB 업데이트는 수행하지 않습니다.\n");
  }

  console.log(`🎤 아티스트 ID ${artistId} 조회 중...\n`);

  // 1. Artist 조회
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

  console.log(`✅ 아티스트: ${artist.name} (${artist.nameKo})`);

  if (!artist.spotifyId) {
    console.error(`❌ Artist has no spotifyId: ${artist.name}`);
    process.exit(1);
  }

  console.log(`🎵 Spotify ID: ${artist.spotifyId}\n`);

  // 2. Spotify API 호출
  console.log("📡 Spotify API 호출 중...\n");

  const spotifyArtistData = await spotifyService.getArtistById(
    artist.spotifyId,
  );

  console.log("✅ Spotify 아티스트 정보 조회 성공!");
  console.log(`   이름: ${spotifyArtistData.name}`);
  console.log(
    `   팔로워: ${spotifyArtistData.followers.total.toLocaleString()}`,
  );
  console.log(`   인기도: ${spotifyArtistData.popularity}`);
  console.log(`   장르: ${spotifyArtistData.genres.join(", ") || "(없음)"}`);
  console.log(
    `   이미지: ${spotifyArtistData.images.length}개 (${spotifyArtistData.images.map((img) => `${img.width}x${img.height}`).join(", ")})\n`,
  );

  // 3. SpotifyArtist 테이블에 upsert
  if (isDryRun) {
    console.log("🔍 [DRY RUN] DB 업데이트를 수행하지 않습니다.");
    console.log("\n저장될 데이터:");
    console.log({
      spotifyId: spotifyArtistData.id,
      spotifyUrl: spotifyArtistData.external_urls.spotify,
      name: spotifyArtistData.name,
      popularity: spotifyArtistData.popularity,
      followers: spotifyArtistData.followers.total,
      genres: spotifyArtistData.genres,
      thumbnails: spotifyArtistData.images.map((img) => img.url),
    });
  } else {
    console.log("💾 SpotifyArtist 테이블에 저장 중...\n");

    const spotifyArtist = await prisma.spotifyArtist.upsert({
      where: { spotifyId: spotifyArtistData.id },
      create: {
        spotifyId: spotifyArtistData.id,
        spotifyUrl: spotifyArtistData.external_urls.spotify,
        name: spotifyArtistData.name,
        popularity: spotifyArtistData.popularity,
        followers: spotifyArtistData.followers.total,
        genres: spotifyArtistData.genres,
        thumbnails: spotifyArtistData.images.map((img) => img.url),
      },
      update: {
        spotifyUrl: spotifyArtistData.external_urls.spotify,
        name: spotifyArtistData.name,
        popularity: spotifyArtistData.popularity,
        followers: spotifyArtistData.followers.total,
        genres: spotifyArtistData.genres,
        thumbnails: spotifyArtistData.images.map((img) => img.url),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ SpotifyArtist 저장 완료! (ID: ${spotifyArtist.id})`);
  }

  console.log("\n🎉 완료!");
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
