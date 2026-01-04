import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import pg from "pg";

/**
 * 서로 다른 아티스트가 동일한 YouTube channelId를 가진 경우를 찾는 스크립트
 *
 * 이 스크립트는 YoutubeChannel 테이블에서 서로 다른 artistId를 가진 레코드들이
 * 같은 channelId를 공유하는 경우를 찾아냅니다.
 *
 * 주의: 같은 아티스트가 TOPIC과 MAIN 타입으로 같은 채널을 가지고 있는 경우는 정상이므로 제외됩니다.
 *
 * 최적화:
 * - GROUP BY + COUNT(DISTINCT artist_id)로 서로 다른 아티스트만 필터링
 * - 필요한 데이터만 SELECT하여 메모리 효율성 확보
 * - Artist 정보와 함께 조회하여 추가 쿼리 불필요
 *
 * 사용법:
 * pnpm ts-node src/scripts/youtube/find-duplicate-channels.ts
 * pnpm ts-node src/scripts/youtube/find-duplicate-channels.ts --dry-run
 * pnpm ts-node src/scripts/youtube/find-duplicate-channels.ts --min-count=3
 */

// pnpm ts-node src/scripts/youtube/find-duplicate-channels.ts
// pnpm ts-node src/scripts/youtube/find-duplicate-channels.ts --dry-run
// pnpm ts-node src/scripts/youtube/find-duplicate-channels.ts --min-count=3

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface DuplicateChannelGroup {
  channelId: string;
  count: number;
  channels: Array<{
    id: number;
    type: string;
    title: string | null;
    subscriberCount: number | null;
    artist: {
      id: number;
      name: string;
      nameKo: string;
    };
  }>;
}

async function findDuplicateChannels(
  minCount: number = 2,
  dryRun: boolean = false,
) {
  try {
    console.log("🔍 Searching for duplicate YouTube channels...\n");
    if (dryRun) {
      console.log("🏃 DRY RUN MODE - No changes will be made\n");
    }

    const startTime = Date.now();

    // 1단계: GROUP BY로 서로 다른 artistId를 가진 중복된 channelId 찾기
    const duplicateChannelIds = await prisma.$queryRaw<
      Array<{ channel_id: string; artist_count: bigint; total_count: bigint }>
    >`
      SELECT
        channel_id,
        COUNT(DISTINCT artist_id) as artist_count,
        COUNT(*) as total_count
      FROM youtube_channel
      GROUP BY channel_id
      HAVING COUNT(DISTINCT artist_id) >= ${minCount}
      ORDER BY artist_count DESC, channel_id
    `;

    console.log(`⏱️  Query time: ${Date.now() - startTime}ms`);
    console.log(
      `📊 Found ${duplicateChannelIds.length} channel IDs with multiple artists\n`,
    );

    if (duplicateChannelIds.length === 0) {
      console.log("✅ No duplicate channels found!");
      return;
    }

    // 2단계: 각 중복 channelId에 대해 상세 정보 조회
    const duplicateGroups: DuplicateChannelGroup[] = [];
    let totalDuplicates = 0;

    for (const {
      channel_id,
      artist_count,
      total_count,
    } of duplicateChannelIds) {
      const channels = await prisma.youtubeChannel.findMany({
        where: { channelId: channel_id },
        select: {
          id: true,
          type: true,
          title: true,
          subscriberCount: true,
          artist: {
            select: {
              id: true,
              name: true,
              nameKo: true,
            },
          },
        },
        orderBy: [
          {
            artist: {
              id: "asc",
            },
          },
          {
            subscriberCount: "desc",
          },
        ],
      });

      duplicateGroups.push({
        channelId: channel_id,
        count: Number(artist_count),
        channels,
      });

      totalDuplicates += Number(total_count);
    }

    // 3단계: 결과 출력
    console.log(
      "═══════════════════════════════════════════════════════════\n",
    );

    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      const uniqueArtists = new Set(group.channels.map((c) => c.artist.id))
        .size;

      console.log(
        `[${i + 1}/${duplicateGroups.length}] Channel ID: ${group.channelId} (${uniqueArtists} different artists)`,
      );
      console.log(
        `───────────────────────────────────────────────────────────`,
      );

      for (const channel of group.channels) {
        console.log(
          `  • [${channel.type}] ${channel.title || "No title"} (${channel.subscriberCount?.toLocaleString() || "N/A"} subscribers)`,
        );
        console.log(
          `    Artist: ${channel.artist.name} (${channel.artist.nameKo}) [ID: ${channel.artist.id}]`,
        );
        console.log(`    Channel DB ID: ${channel.id}`);
        console.log("");
      }

      console.log("");
    }

    // 4단계: 요약
    const totalUniqueArtists = duplicateGroups.reduce((sum, group) => {
      return sum + new Set(group.channels.map((c) => c.artist.id)).size;
    }, 0);

    console.log("═══════════════════════════════════════════════════════════");
    console.log("📊 Summary:");
    console.log(
      `   Channel IDs shared by multiple artists: ${duplicateGroups.length}`,
    );
    console.log(`   Total channel records: ${totalDuplicates}`);
    console.log(`   Total unique artists affected: ${totalUniqueArtists}`);
    console.log(
      `   Records to clean up: ${totalDuplicates - duplicateGroups.length}`,
    );
    console.log(`   Total execution time: ${Date.now() - startTime}ms`);

    // 5단계: 통계
    const stats = {
      maxDuplicates: Math.max(...duplicateGroups.map((g) => g.count)),
      avgDuplicates: totalDuplicates / duplicateGroups.length,
      typeCombinations: new Map<string, number>(),
    };

    for (const group of duplicateGroups) {
      const types = group.channels
        .map((c) => c.type)
        .sort()
        .join("+");
      stats.typeCombinations.set(
        types,
        (stats.typeCombinations.get(types) || 0) + 1,
      );
    }

    console.log("\n📈 Statistics:");
    console.log(`   Max duplicates for single channel: ${stats.maxDuplicates}`);
    console.log(
      `   Average duplicates per channel: ${stats.avgDuplicates.toFixed(2)}`,
    );
    console.log("\n   Type combinations:");
    for (const [types, count] of Array.from(
      stats.typeCombinations.entries(),
    ).sort((a, b) => b[1] - a[1])) {
      console.log(`     - ${types}: ${count} cases`);
    }

    if (!dryRun) {
      console.log("\n💡 To fix these duplicates, you may need to:");
      console.log("   1. Decide which artist should own each channel");
      console.log("   2. Delete or reassign duplicate channel records");
      console.log(
        "   3. Update the schema to add UNIQUE constraint on channelId if needed",
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// CLI 인자 파싱
function parseArgs() {
  const args = process.argv.slice(2);
  let minCount = 2;
  let dryRun = false;

  for (const arg of args) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--min-count=")) {
      minCount = Number.parseInt(arg.split("=")[1], 10);
      if (Number.isNaN(minCount) || minCount < 2) {
        console.error("❌ Invalid --min-count value. Must be >= 2");
        process.exit(1);
      }
    }
  }

  return { minCount, dryRun };
}

// 스크립트 실행
const isDirectExecution =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  const { minCount, dryRun } = parseArgs();
  findDuplicateChannels(minCount, dryRun)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
