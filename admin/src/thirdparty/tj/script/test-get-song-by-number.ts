/**
 * TJ 곡번호로 곡 정보를 조회하는 함수 테스트 스크립트
 *
 * getTJSongByNumber 함수를 테스트합니다.
 * 곡번호를 입력하면 해당 곡의 정보를 출력합니다.
 *
 * 사용법:
 * pnpm ts-node src/thirdparty/tj/script/test-get-song-by-number.ts 28680
 * pnpm ts-node src/thirdparty/tj/script/test-get-song-by-number.ts 28680
 */

import { getTJSongByNumber } from "../getTJSongByNumber.ts";

async function main() {
  const songNumber = process.argv[2];

  if (!songNumber) {
    console.error(
      "❌ 사용법: pnpm ts-node src/thirdparty/tj/script/test-getTJSongByNumber.ts <곡번호>",
    );
    console.error(
      "예시: pnpm ts-node src/thirdparty/tj/script/test-getTJSongByNumber.ts 28680",
    );
    process.exit(1);
  }

  try {
    const song = await getTJSongByNumber(songNumber);
    console.log("\n✅ 조회 성공!");
    console.log("=".repeat(50));
    console.log(`곡번호: ${song.songNumber}`);
    console.log(`제목: ${song.title}`);
    console.log(`가수: ${song.artist}`);
    console.log(`작사가: ${song.lyricist ?? "(정보 없음)"}`);
    console.log(`작곡가: ${song.composer ?? "(정보 없음)"}`);
    console.log(`MR: ${song.isMR ? "O" : "X"}`);
    console.log(`MV: ${song.isMV ? "O" : "X"}`);
    console.log(`60세이상: ${song.isOver60 ? "O" : "X"}`);
    console.log(`유튜브 링크: ${song.youtubeLink ?? "없음"}`);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

main();
