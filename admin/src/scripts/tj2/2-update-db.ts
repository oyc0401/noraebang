/**
 * TJ 곡 정보 DB 업데이트 스크립트
 *
 * 기능:
 * - 1-fetch-artist.ts로 생성된 JSON 파일을 읽어서 TjSong 테이블 업데이트
 * - isMR, isMV, isOver60, youtubeLink 필드 업데이트
 * - artistId로 지정한 Artist의 Song들과 TJ 곡 자동 매핑 (SongTjSong 테이블)
 * - 존재하지 않는 곡번호는 경고 출력
 *
 * 사용법:
 * npx tsx src/scripts/tj2/2-update-db.ts "./아이유-2026-01-09T12-30-45.json" --artist-id=45 --dry-run
 * npx tsx src/scripts/tj2/2-update-db.ts "./아이유-2026-01-09T12-30-45.json" --artist-id=45
 *
 * 주의:
 * - DB 스키마에 isMR, isMV, isOver60, youtubeLink 필드가 있어야 합니다
 * - 실제 업데이트 전에 dry-run 모드로 먼저 확인하세요
 */

import * as fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import type { TJSongInfo } from "../../thirdparty/tj/getTJSongByArtist";

const prisma = new PrismaClient();

interface FetchedData {
  artistName: string;
  fetchedAt: string;
  totalSongs: number;
  songs: TJSongInfo[];
}

async function main() {
  const jsonPath = process.argv[2];
  const isDryRun = process.argv.includes("--dry-run");

  // --artist-id=45 형식 파싱
  const artistIdArg = process.argv.find((arg) =>
    arg.startsWith("--artist-id="),
  );
  const artistId = artistIdArg
    ? Number.parseInt(artistIdArg.split("=")[1], 10)
    : undefined;

  if (!jsonPath) {
    console.error(
      "❌ Usage: npx tsx src/scripts/tj2/2-update-db.ts <json-file-path> --artist-id=<id> [--dry-run]",
    );
    console.error(
      '   Example: npx tsx src/scripts/tj2/2-update-db.ts "./아이유-2026-01-09T12-30-45.json" --artist-id=45',
    );
    console.error("\n옵션:");
    console.error("  --artist-id=<id>  매핑할 Artist ID (필수)");
    console.error("  --dry-run         실제 업데이트 없이 미리보기만 수행");
    process.exit(1);
  }

  if (!artistId || Number.isNaN(artistId)) {
    console.error("❌ --artist-id 옵션이 필요합니다.");
    console.error("   Example: --artist-id=45");
    process.exit(1);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${jsonPath}`);
    process.exit(1);
  }

  try {
    // JSON 파일 읽기
    const fileContent = fs.readFileSync(jsonPath, "utf-8");
    const data: FetchedData = JSON.parse(fileContent);

    console.log(
      `\n=== TJ 곡 정보 DB 업데이트 ${isDryRun ? "(DRY RUN)" : ""} ===`,
    );
    console.log(`가수명: ${data.artistName}`);
    console.log(`곡 수: ${data.totalSongs}`);
    console.log(`스크래핑 시각: ${data.fetchedAt}`);
    console.log(`Artist ID: ${artistId}\n`);

    // Artist 확인
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: { id: true, name: true, nameKo: true },
    });

    if (!artist) {
      console.error(`❌ Artist ID ${artistId}를 찾을 수 없습니다.`);
      process.exit(1);
    }

    console.log(`Artist: ${artist.name} (${artist.nameKo})`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    let mappedCount = 0;
    let alreadyMappedCount = 0;
    const notFoundSongs: string[] = [];

    // 각 곡에 대해 업데이트
    for (const song of data.songs) {
      try {
        const tjSongId = song.songNumber;

        // TjSong 레코드 조회
        const existingSong = await prisma.tjSong.findUnique({
          where: { id: tjSongId },
        });

        if (!existingSong) {
          notFoundCount++;
          notFoundSongs.push(`${tjSongId} - ${song.title}`);
          continue;
        }

        if (!isDryRun) {
          // DB 업데이트 (메타데이터만)
          await prisma.tjSong.update({
            where: { id: tjSongId },
            data: {
              isMR: song.isMR,
              isMV: song.isMV,
              isOver60: song.isOver60,
              youtubeLink: song.youtubeLink,
            },
          });
        }

        updatedCount++;

        // Artist-TjSong 매핑 생성
        // 이미 매핑되어 있는지 확인
        const existingMapping = await prisma.artistTjSong.findUnique({
          where: {
            artistId_tjSongId: {
              artistId,
              tjSongId,
            },
          },
        });

        if (existingMapping) {
          alreadyMappedCount++;
        } else if (!isDryRun) {
          // 새 매핑 생성
          await prisma.artistTjSong.create({
            data: {
              artistId,
              tjSongId,
            },
          });
          mappedCount++;
        } else {
          mappedCount++;
        }

        // 진행상황 출력 (100개마다)
        if (updatedCount % 100 === 0) {
          console.log(`  진행중: ${updatedCount}/${data.totalSongs}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ⚠️  곡 업데이트 실패 [${song.songNumber}]: ${error}`);
      }
    }

    // 결과 출력
    console.log(`\n=== 결과 ===`);
    console.log(`✅ TjSong 업데이트: ${updatedCount}개`);
    console.log(`✅ Artist-TjSong 매핑 생성: ${mappedCount}개`);
    console.log(`ℹ️  이미 매핑됨: ${alreadyMappedCount}개`);
    console.log(`⚠️  DB에 없는 곡: ${notFoundCount}개`);
    console.log(`❌ 업데이트 실패: ${errorCount}개`);

    if (notFoundSongs.length > 0) {
      console.log(`\n📋 DB에 없는 곡 목록 (최대 10개):`);
      notFoundSongs.slice(0, 10).forEach((song) => {
        console.log(`  - ${song}`);
      });
      if (notFoundSongs.length > 10) {
        console.log(`  ... 외 ${notFoundSongs.length - 10}개`);
      }
    }

    if (isDryRun) {
      console.log(
        `\n💡 실제 업데이트를 수행하려면 --dry-run 없이 다시 실행하세요.`,
      );
    } else {
      console.log(`\n✅ DB 업데이트 완료!`);
    }
  } catch (error) {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
