import "dotenv/config";
import { SpotifyService } from "../src/spotify/spotify.service";

// Spotify에서 특정 아티스트 검색하여 raw 정보 출력
// pnpm ts-node scripts/spotify/search-artist.ts 아이유
// pnpm ts-node scripts/spotify/search-artist.ts "방탄소년단"
// pnpm ts-node scripts/spotify/search-artist.ts "영재(4MEN)"

const spotifyService = new SpotifyService();

/**
 * 메인 함수
 */
async function searchArtist(artistName: string) {
  console.log("🎵 Spotify Artist Search\n");
  console.log(`🔍 Searching for: "${artistName}"\n`);

  try {
    // 1. 아티스트 검색 (최대 5개 결과)
    console.log("📡 Fetching data from Spotify...\n");
    const results = await spotifyService.searchArtist(artistName, 5);

    if (results.length === 0) {
      console.log("❌ No results found");
      return;
    }

    console.log(`✅ Found ${results.length} artist(s)\n`);
    console.log("=".repeat(80));
    console.log("\n");

    // 2. 각 결과 출력
    results.forEach((artist, index) => {
      console.log(`[${index + 1}] ${artist.name}`);
      console.log(`    Spotify ID: ${artist.id}`);
      console.log(`    URL: ${artist.external_urls.spotify}`);
      console.log(`    Followers: ${artist.followers.total.toLocaleString()}`);
      console.log(`    Popularity: ${artist.popularity}/100`);
      console.log(
        `    Genres: ${artist.genres.length > 0 ? artist.genres.join(", ") : "N/A"}`,
      );
      if (artist.images.length > 0) {
        console.log(`    Image: ${artist.images[0].url}`);
      }
      console.log("");
    });

    console.log("=".repeat(80));
    console.log("\n");

    // 3. Best Match 찾기
    console.log("🎯 Best Match:\n");
    const bestMatch = await spotifyService.findBestMatch(artistName);

    if (bestMatch) {
      const isExactMatch =
        bestMatch.name.toLowerCase() === artistName.toLowerCase();
      console.log(`   Name: ${bestMatch.name}`);
      console.log(
        `   Match Type: ${isExactMatch ? "✅ Exact Match" : "⚠️  Similar Match"}`,
      );
      console.log(`   Confidence: ${isExactMatch ? "High" : "Low"}`);
    }

    console.log("\n");
    console.log("=".repeat(80));
    console.log("\n");

    // 4. Raw JSON 출력
    console.log("📄 Raw JSON Data:\n");
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("💥 Error:", error.message);
    throw error;
  }
}

// 커맨드 라인 인자에서 아티스트명 가져오기
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("❌ Error: Artist name is required");
  console.error("");
  console.error("Usage:");
  console.error(
    "  pnpm ts-node scripts/spotify/search-artist.ts <artist_name>",
  );
  console.error("");
  console.error("Examples:");
  console.error("  pnpm ts-node scripts/spotify/search-artist.ts 아이유");
  console.error('  pnpm ts-node scripts/spotify/search-artist.ts "방탄소년단"');
  console.error('  pnpm ts-node scripts/spotify/search-artist.ts "영재(4MEN)"');
  process.exit(1);
}

const artistName = args.join(" ");

// 스크립트 실행
searchArtist(artistName)
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
