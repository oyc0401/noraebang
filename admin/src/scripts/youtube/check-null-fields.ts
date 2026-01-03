import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// pnpm ts-node src/scripts/youtube/check-null-fields.ts

/**
 * YoutubeChannel 테이블의 nullable 필드들 중 null인 항목의 개수를 집계하는 스크립트
 * 각 필드별로 null 값의 개수와 비율을 출력합니다.
 */

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkNullFields() {
  try {
    console.log("📊 Checking null fields in YoutubeChannel table...\n");

    const totalCount = await prisma.youtubeChannel.count();
    console.log(`Total YoutubeChannel records: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log("⚠️  No records found in YoutubeChannel table");
      return;
    }

    // 각 nullable 필드별로 null 개수 집계
    const fields = [
      "title",
      "description",
      "customUrl",
      "publishedAt",
      "country",
      "defaultLanguage",
      "thumbnailDefault",
      "thumbnailMedium",
      "thumbnailHigh",
      "subscriberCount",
      "videoCount",
      "viewCount",
      "hiddenSubscriberCount",
      "uploadsPlaylistId",
      "fetchedAt",
    ] as const;

    console.log("Null counts by field:");
    console.log("━".repeat(70));
    console.log(
      `${"Field".padEnd(25)} ${"Null Count".padStart(12)} ${"Percentage".padStart(12)}`,
    );
    console.log("━".repeat(70));

    for (const field of fields) {
      const nullCount = await prisma.youtubeChannel.count({
        where: {
          [field]: null,
        },
      });

      const percentage = ((nullCount / totalCount) * 100).toFixed(1);
      console.log(
        `${field.padEnd(25)} ${nullCount.toString().padStart(12)} ${`${percentage}%`.padStart(12)}`,
      );
    }

    console.log("━".repeat(70));

    // 타입별 통계
    console.log("\n📈 Statistics by channel type:");
    const typeStats = await prisma.youtubeChannel.groupBy({
      by: ["type"],
      _count: {
        _all: true,
      },
    });

    for (const stat of typeStats) {
      console.log(`   ${stat.type}: ${stat._count._all} channels`);
    }

    // 가장 많이 null인 필드 찾기
    console.log("\n⚠️  Fields with highest null rate:");
    const nullCounts = await Promise.all(
      fields.map(async (field) => ({
        field,
        count: await prisma.youtubeChannel.count({
          where: {
            [field]: null,
          },
        }),
      })),
    );

    nullCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .forEach((item, index) => {
        const percentage = ((item.count / totalCount) * 100).toFixed(1);
        console.log(
          `   ${index + 1}. ${item.field}: ${item.count} (${percentage}%)`,
        );
      });
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// 스크립트 실행
checkNullFields()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
