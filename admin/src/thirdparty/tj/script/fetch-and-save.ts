/**
 * TJ 미디어에서 가수별 곡 정보를 가져와 JSON 파일로 저장하는 스크립트
 *
 * 기능:
 * - TJ 미디어 웹사이트에서 가수명으로 검색하여 모든 곡 정보 스크래핑
 * - 곡번호, 제목, 가수, 작사가, 작곡가, MR/MV 여부, 유튜브 링크 추출
 * - 결과를 admin/output 폴더에 JSON 파일로 저장
 * - 전체 페이지를 병렬로 가져와 성능 최적화
 *
 * 사용법:
 * npx tsx src/thirdparty/tj/script/fetch-and-save.ts "아이유"
 * npx tsx src/thirdparty/tj/script/fetch-and-save.ts "BTS"
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { getTJSongByArtist } from "../getTJSongByArtist";

async function main() {
  const artistName = process.argv[2];

  if (!artistName) {
    console.error("Usage: npx tsx fetch-and-save.ts <artist-name>");
    console.error('Example: npx tsx fetch-and-save.ts "아이유"');
    process.exit(1);
  }

  console.log(`\n=== Fetching TJ songs for: ${artistName} ===\n`);

  try {
    const songs = await getTJSongByArtist(artistName);

    console.log(`\n✅ Success! Fetched ${songs.length} songs`);

    // Save to JSON file
    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `tj-${artistName}-${timestamp}.json`;
    const outputPath = path.join(outputDir, filename);

    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          artist: artistName,
          fetchedAt: new Date().toISOString(),
          totalSongs: songs.length,
          songs: songs,
        },
        null,
        2,
      ),
    );

    console.log(`\n📄 Saved to: ${outputPath}`);

    // Statistics
    const mrCount = songs.filter((s) => s.isMR).length;
    const mvCount = songs.filter((s) => s.isMV).length;
    const over60Count = songs.filter((s) => s.isOver60).length;
    console.log(`\n=== Statistics ===`);
    console.log(`Total songs: ${songs.length}`);
    console.log(`Songs with MR: ${mrCount} (${((mrCount / songs.length) * 100).toFixed(1)}%)`);
    console.log(`Songs with MV: ${mvCount} (${((mvCount / songs.length) * 100).toFixed(1)}%)`);
    console.log(`Songs over 60: ${over60Count} (${((over60Count / songs.length) * 100).toFixed(1)}%)`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
