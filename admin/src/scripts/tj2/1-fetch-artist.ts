/**
 * TJ 미디어 가수별 곡 정보 스크래핑 스크립트
 *
 * 기능:
 * - 가수명으로 TJ 미디어 웹사이트에서 모든 곡 정보를 스크래핑
 * - 곡번호, 제목, 가수, 작사가, 작곡가, MR/MV/60이상 여부, 유튜브 링크 추출
 * - 결과를 admin/src/scripts/tj2/{artistName}-{timestamp}.json에 저장
 *
 * 사용법:
 * npx tsx src/scripts/tj2/1-fetch-artist.ts "아이유"
 * npx tsx src/scripts/tj2/1-fetch-artist.ts "BTS"
 *
 * 출력:
 * - admin/src/scripts/tj2/{artistName}-{timestamp}.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { getTJSongByArtist } from "../../thirdparty/tj/getTJSongByArtist";

async function main() {
  const artistName = process.argv[2];

  if (!artistName) {
    console.error("❌ Usage: npx tsx src/scripts/tj2/1-fetch-artist.ts <artist-name>");
    console.error('   Example: npx tsx src/scripts/tj2/1-fetch-artist.ts "아이유"');
    process.exit(1);
  }

  console.log(`\n=== TJ 곡 정보 스크래핑 시작 ===`);
  console.log(`가수명: ${artistName}\n`);

  try {
    // TJ 미디어에서 곡 정보 스크래핑
    const songs = await getTJSongByArtist(artistName);

    if (songs.length === 0) {
      console.log(`\n⚠️  "${artistName}"에 대한 곡을 찾을 수 없습니다.`);
      process.exit(0);
    }

    console.log(`\n✅ ${songs.length}개의 곡을 가져왔습니다.`);

    // 출력 디렉토리 및 파일명 생성
    const scriptDir = path.dirname(new URL(import.meta.url).pathname);
    const outputDir = scriptDir; // admin/src/scripts/tj2

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `${artistName}-${timestamp}.json`;
    const outputPath = path.join(outputDir, filename);

    // JSON 파일 저장
    const output = {
      artistName,
      fetchedAt: new Date().toISOString(),
      totalSongs: songs.length,
      songs,
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n📄 저장 완료: ${outputPath}`);

    // 통계 출력
    const mrCount = songs.filter((s) => s.isMR).length;
    const mvCount = songs.filter((s) => s.isMV).length;
    const over60Count = songs.filter((s) => s.isOver60).length;

    console.log(`\n=== 통계 ===`);
    console.log(`총 곡 수: ${songs.length}`);
    console.log(`MR 있음: ${mrCount} (${((mrCount / songs.length) * 100).toFixed(1)}%)`);
    console.log(`MV 있음: ${mvCount} (${((mvCount / songs.length) * 100).toFixed(1)}%)`);
    console.log(`60이상 전용: ${over60Count} (${((over60Count / songs.length) * 100).toFixed(1)}%)`);

    console.log(`\n다음 명령으로 DB에 반영하세요:`);
    console.log(`npx tsx src/scripts/tj2/2-update-db.ts "${outputPath}"\n`);
  } catch (error) {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  }
}

main();
