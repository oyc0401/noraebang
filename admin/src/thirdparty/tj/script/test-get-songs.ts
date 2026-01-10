/**
 * TJ 미디어 API 테스트 스크립트
 *
 * 기능:
 * - getTJSongByArtist 함수를 테스트
 * - 가수명으로 TJ 곡 검색 결과를 콘솔에 출력
 * - 첫 5곡과 MR/MV 통계 표시
 *
 * 사용법:
 * npx tsx src/thirdparty/tj/script/test-get-songs.ts "아이유"
 * npx tsx src/thirdparty/tj/script/test-get-songs.ts "BTS"
 */

import { getTJSongByArtist } from "../getTJSongByArtist";

async function main() {
  const artistName = process.argv[2] || "아이유";

  console.log(`\n=== Testing getTJSongByArtist ===`);
  console.log(`Artist: ${artistName}\n`);

  try {
    const songs = await getTJSongByArtist(artistName);

    console.log(`\n=== Results ===`);
    console.log(`Total songs: ${songs.length}`);

    if (songs.length > 0) {
      console.log(`\n=== First 5 songs ===`);
      songs.slice(0, 5).forEach((song, idx) => {
        console.log(`\n${idx + 1}. ${song.title}`);
        console.log(`   곡번호: ${song.songNumber}`);
        console.log(`   가수: ${song.artist}`);
        console.log(
          `   MR: ${song.isMR ? "O" : "X"}, MV: ${song.isMV ? "O" : "X"}, 60이상: ${song.isOver60 ? "O" : "X"}`,
        );
        if (song.lyricist) console.log(`   작사가: ${song.lyricist}`);
        if (song.composer) console.log(`   작곡가: ${song.composer}`);
        if (song.youtubeLink) console.log(`   유튜브: ${song.youtubeLink}`);
      });

      // MR/MV 통계
      const mrCount = songs.filter((s) => s.isMR).length;
      const mvCount = songs.filter((s) => s.isMV).length;
      const over60Count = songs.filter((s) => s.isOver60).length;
      console.log(`\n=== Statistics ===`);
      console.log(
        `Songs with MR: ${mrCount} (${((mrCount / songs.length) * 100).toFixed(1)}%)`,
      );
      console.log(
        `Songs with MV: ${mvCount} (${((mvCount / songs.length) * 100).toFixed(1)}%)`,
      );
      console.log(
        `Songs over 60: ${over60Count} (${((over60Count / songs.length) * 100).toFixed(1)}%)`,
      );
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
