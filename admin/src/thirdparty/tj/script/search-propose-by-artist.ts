/**
 * TJ 미디어 신청곡 검색 스크립트
 *
 * 기능:
 * - 특정 가수의 TJ 신청곡 목록을 조회
 * - 신청곡 제목, 가수명, 신청일, 조회수 등 정보 출력
 *
 * 사용법:
 * npx tsx src/thirdparty/tj/script/search-propose-by-artist.ts
 */

import { searchTJPropose } from "../searchPropose";

// ============================================
// 여기에 가수 이름을 입력하세요
const ARTIST_NAME = "Vaundy";
// ============================================

async function main() {
  console.log(`\n=== TJ 신청곡 검색 ===`);
  console.log(`가수: ${ARTIST_NAME}\n`);

  const songs = await searchTJPropose(ARTIST_NAME);

  console.log(`총 ${songs.length}개의 신청곡을 찾았습니다.\n`);

  if (songs.length === 0) {
    console.log("신청곡이 없습니다.");
    return;
  }

  console.log("=== 신청곡 목록 ===\n");

  songs.forEach((song, idx) => {
    console.log(`${idx + 1}. ${song.po_song_title}`);
    console.log(`   가수: ${song.po_song_singer}`);
    console.log(`   신청자: ${song.po_name}`);
    console.log(`   신청일: ${song.po_regdate_view}`);
    console.log(`   조회수: ${song.po_hit}`);
    if (song.po_content) {
      const content = song.po_content.replace(/<[^>]*>/g, "").trim();
      if (content) {
        console.log(
          `   내용: ${content.slice(0, 50)}${content.length > 50 ? "..." : ""}`,
        );
      }
    }
    console.log("");
  });

  // 통계
  console.log("=== 통계 ===");
  console.log(`총 신청곡 수: ${songs.length}`);
  console.log(`총 페이지 수: ${songs[songs.length - 1].fetchedPageNo}`);
}

main().catch((error) => {
  console.error("\n❌ 오류 발생:", error);
  process.exit(1);
});
