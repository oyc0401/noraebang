/**
 * YouTube Music API로 아티스트-곡 매핑 검증
 *
 * 사용법:
 * pnpm tsx src/scripts/youtube-music/verify-artist-songs.ts --artist-id=1
 * pnpm tsx src/scripts/youtube-music/verify-artist-songs.ts --artist-name="아이유"
 * pnpm tsx src/scripts/youtube-music/verify-artist-songs.ts --batch --limit=10
 *
 * 환경변수:
 * YOUTUBE_MUSIC_COOKIE - YouTube Music 쿠키 (필수)
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import YouTubeMusic from "youtube-music-ts-api";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

// CLI 인자 파싱
const artistIdArg = process.argv.find((arg) => arg.startsWith("--artist-id="));
const artistNameArg = process.argv.find((arg) =>
  arg.startsWith("--artist-name="),
);
const batchMode = process.argv.includes("--batch");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1]) : 10;

/**
 * 두 문자열의 유사도 계산 (Levenshtein Distance 기반)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;

  const matrix: number[][] = [];
  const len1 = s1.length;
  const len2 = s2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // 삭제
        matrix[i][j - 1] + 1, // 삽입
        matrix[i - 1][j - 1] + cost, // 교체
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);

  return maxLen === 0 ? 100 : ((maxLen - distance) / maxLen) * 100;
}

/**
 * 특수문자 제거 및 정규화
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\(\[\{].*?[\)\]\}]/g, "") // 괄호 제거
    .replace(/[^a-z0-9가-힣\s]/g, "") // 특수문자 제거
    .replace(/\s+/g, " ") // 공백 정규화
    .trim();
}

/**
 * YouTube Music API 인스턴스 (싱글톤)
 */
let ytmusicInstance: YouTubeMusic | null = null;

async function getYTMusicInstance(): Promise<YouTubeMusic> {
  if (!ytmusicInstance) {
    const cookie = process.env.YOUTUBE_MUSIC_COOKIE;
    if (!cookie) {
      throw new Error(
        "YOUTUBE_MUSIC_COOKIE 환경변수가 설정되지 않았습니다.\n" +
        "설정 방법:\n" +
        "1. YouTube Music (https://music.youtube.com) 접속\n" +
        "2. 개발자 도구 열기 (F12)\n" +
        "3. Network 탭에서 '/browse' 요청 찾기\n" +
        "4. Request Headers에서 'cookie' 값 복사\n" +
        "5. .env 파일에 YOUTUBE_MUSIC_COOKIE=<복사한값> 추가"
      );
    }

    ytmusicInstance = new YouTubeMusic();
    await ytmusicInstance.initialize({ cookies: cookie });
  }

  return ytmusicInstance;
}

/**
 * 단일 아티스트 검증
 */
async function verifyArtist(artistId: number) {
  console.log("\n" + "=".repeat(80));

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    include: {
      artistSongs: {
        include: {
          song: true,
        },
      },
    },
  });

  if (!artist) {
    console.log(`❌ 아티스트 ID ${artistId}를 찾을 수 없습니다.`);
    return null;
  }

  console.log(`\n🎤 아티스트: ${artist.name} (ID: ${artist.id})`);
  console.log(`   곡 개수: ${artist.artistSongs.length}개`);

  // 1. YouTube Music에서 아티스트 검색
  console.log(`\n🔍 YouTube Music 검색 중...`);

  const ytmusic = await getYTMusicInstance();
  const searchResults = await ytmusic.searchArtists(artist.name);

  if (!searchResults || searchResults.length === 0) {
    console.log(`⚠️  YouTube Music에서 아티스트를 찾을 수 없습니다.`);
    return { artist, verified: 0, total: artist.artistSongs.length };
  }

  const ytArtist = searchResults[0];
  console.log(`✅ YouTube Music 아티스트: ${ytArtist.name}`);

  // 2. 아티스트의 YouTube Music 곡 목록 가져오기
  console.log(`\n⏳ YouTube Music 곡 목록 가져오는 중...`);

  const artistData = await ytmusic.getArtist(ytArtist.id);

  if (!artistData) {
    console.log(`⚠️  아티스트 데이터를 가져올 수 없습니다.`);
    return { artist, verified: 0, total: artist.artistSongs.length };
  }

  // YouTube Music 곡 목록
  const ytSongs: any[] = [];

  if (artistData.topSongs) {
    ytSongs.push(...artistData.topSongs);
  }

  if (artistData.songs && artistData.songs.products) {
    ytSongs.push(...artistData.songs.products);
  }

  console.log(`✅ YouTube Music 곡 개수: ${ytSongs.length}개`);

  // 3. TJ 곡과 YouTube Music 곡 매칭
  console.log(`\n📊 곡 매칭 분석:\n`);

  let verifiedCount = 0;
  let highConfidenceCount = 0;
  let mediumConfidenceCount = 0;
  let lowConfidenceCount = 0;

  for (const artistSong of artist.artistSongs) {
    const tjTitle = artistSong.song.title;
    const normalizedTjTitle = normalizeTitle(tjTitle);

    // YouTube Music에서 가장 유사한 곡 찾기
    let bestMatch: any = null;
    let bestScore = 0;

    for (const ytSong of ytSongs) {
      const ytTitle = ytSong.name;
      const normalizedYtTitle = normalizeTitle(ytTitle);

      const score = calculateSimilarity(normalizedTjTitle, normalizedYtTitle);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = { ...ytSong, title: ytTitle };
      }
    }

    let status = "❌";
    let confidence = "없음";

    if (bestScore >= 90) {
      status = "✅";
      confidence = "높음";
      verifiedCount++;
      highConfidenceCount++;
    } else if (bestScore >= 70) {
      status = "⚠️";
      confidence = "중간";
      verifiedCount++;
      mediumConfidenceCount++;
    } else if (bestScore >= 50) {
      status = "⚠️";
      confidence = "낮음";
      lowConfidenceCount++;
    }

    console.log(
      `${status} [${confidence}] ${tjTitle} → ${bestMatch ? `${bestMatch.title} (${bestScore.toFixed(1)}%)` : "매칭 없음"}`,
    );
  }

  console.log(`\n📈 검증 결과:`);
  console.log(`   총 곡 수: ${artist.artistSongs.length}개`);
  console.log(`   검증됨 (≥70%): ${verifiedCount}개 (${((verifiedCount / artist.artistSongs.length) * 100).toFixed(1)}%)`);
  console.log(`   ├─ 높은 신뢰도 (≥90%): ${highConfidenceCount}개`);
  console.log(`   ├─ 중간 신뢰도 (70-90%): ${mediumConfidenceCount}개`);
  console.log(`   └─ 낮은 신뢰도 (50-70%): ${lowConfidenceCount}개`);

  return {
    artist,
    verified: verifiedCount,
    total: artist.artistSongs.length,
    ytSongsCount: ytSongs.length,
  };
}

/**
 * 배치 검증
 */
async function verifyBatch(limit: number) {
  console.log("🎵 배치 검증 모드");
  console.log(`처리 대상: 곡 개수 상위 ${limit}명의 아티스트\n`);

  const artists = await prisma.artist.findMany({
    include: {
      _count: {
        select: { artistSongs: true },
      },
    },
    orderBy: {
      artistSongs: {
        _count: "desc",
      },
    },
    take: limit,
  });

  console.log(`총 ${artists.length}명의 아티스트를 검증합니다.\n`);

  const results = [];

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    console.log(`\n[${i + 1}/${artists.length}] 처리 중...`);

    try {
      const result = await verifyArtist(artist.id);
      if (result) {
        results.push(result);
      }

      // Rate limiting (1초 대기)
      if (i < artists.length - 1) {
        console.log("\n⏳ 1초 대기 중...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`❌ 오류: ${error.message}`);
      continue;
    }
  }

  // 최종 요약
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 전체 요약:\n");

  const totalSongs = results.reduce((sum, r) => sum + r.total, 0);
  const totalVerified = results.reduce((sum, r) => sum + r.verified, 0);

  console.log(`총 아티스트: ${results.length}명`);
  console.log(`총 곡 수: ${totalSongs.toLocaleString()}개`);
  console.log(
    `검증된 곡: ${totalVerified.toLocaleString()}개 (${((totalVerified / totalSongs) * 100).toFixed(1)}%)`,
  );

  console.log("\n검증률 상위 아티스트:");
  results
    .sort((a, b) => b.verified / b.total - a.verified / a.total)
    .slice(0, 10)
    .forEach((r, index) => {
      const rate = ((r.verified / r.total) * 100).toFixed(1);
      console.log(
        `   ${index + 1}. ${r.artist.name} - ${rate}% (${r.verified}/${r.total})`,
      );
    });

  console.log("\n검증률 하위 아티스트:");
  results
    .sort((a, b) => a.verified / a.total - b.verified / b.total)
    .slice(0, 10)
    .forEach((r, index) => {
      const rate = ((r.verified / r.total) * 100).toFixed(1);
      console.log(
        `   ${index + 1}. ${r.artist.name} - ${rate}% (${r.verified}/${r.total})`,
      );
    });
}

async function main() {
  if (batchMode) {
    await verifyBatch(limit);
  } else if (artistIdArg) {
    const artistId = Number.parseInt(artistIdArg.split("=")[1]);
    await verifyArtist(artistId);
  } else if (artistNameArg) {
    const artistName = artistNameArg.split("=")[1].replace(/"/g, "");
    const artist = await prisma.artist.findFirst({
      where: {
        OR: [
          { name: { contains: artistName, mode: "insensitive" } },
          { nameKo: { contains: artistName, mode: "insensitive" } },
        ],
      },
    });

    if (!artist) {
      console.error(`❌ 아티스트 "${artistName}"를 찾을 수 없습니다.`);
      process.exit(1);
    }

    await verifyArtist(artist.id);
  } else {
    console.error("❌ 옵션을 지정하세요:");
    console.error("  --artist-id=<ID>      특정 아티스트 ID");
    console.error('  --artist-name="<이름>" 특정 아티스트 이름');
    console.error("  --batch --limit=<N>   배치 모드 (상위 N명)");
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("\n❌ 오류 발생:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
