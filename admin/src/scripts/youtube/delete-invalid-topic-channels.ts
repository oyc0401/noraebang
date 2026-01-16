import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// 사용법:
// pnpm ts-node src/scripts/youtube/delete-invalid-topic-channels.ts
// pnpm ts-node src/scripts/youtube/delete-invalid-topic-channels.ts --dry-run
//
// 설명:
// TOPIC 타입인데 title이 "- Topic"으로 끝나지 않는 유튜브 채널을 삭제하는 스크립트
// - YouTube Music이 자동 생성한 Topic 채널은 일반적으로 채널명이 "- Topic" suffix를 가집니다.
// - DB에 TOPIC으로 저장되어 있으나 suffix가 없는 데이터는 잘못 분류된 것으로 보고 정리합니다.

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function isValidTopicTitle(title: string | null | undefined) {
  if (!title) return false;
  return title.trimEnd().endsWith("- Topic");
}

async function deleteInvalidTopicChannels(dryRun: boolean = false) {
  try {
    console.log("🧹 Starting to delete invalid TOPIC channels...\n");

    if (dryRun) {
      console.log("⚠️  DRY RUN MODE - No changes will be made\n");
    }

    // 1) TOPIC 타입 채널 전부 조회 후, suffix 검증으로 필터링
    //    (Prisma where로 'endsWith'를 바로 쓰지 않는 이유: 공백/널/케이스 등 엣지케이스를 코드로 확정 처리)
    const topicChannels = await prisma.youtubeChannel.findMany({
      where: {
        type: "TOPIC",
      },
      select: {
        id: true,
        title: true,
        channelId: true,
        artist: {
          select: {
            id: true,
            name: true,
            nameKo: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const invalidChannels = topicChannels.filter(
      (c) => !isValidTopicTitle(c.title),
    );

    console.log(
      `Found ${topicChannels.length} TOPIC channels, ${invalidChannels.length} invalid to delete\n`,
    );

    if (invalidChannels.length === 0) {
      console.log("✅ No invalid TOPIC channels to delete!");
      return;
    }

    // 2) 삭제 대상 출력
    console.log("📋 Channels to be deleted:");
    invalidChannels.forEach((channel, index) => {
      console.log(
        `${index + 1}. [${channel.artist.name} (${channel.artist.nameKo})] ${
          channel.title ?? "(null title)"
        }`,
      );
      console.log(`   Channel ID: ${channel.channelId}`);
      console.log(`   DB ID: ${channel.id}\n`);
    });

    if (dryRun) {
      console.log("⚠️  DRY RUN - No changes were made");
      console.log(`Would have deleted ${invalidChannels.length} channels`);
      return;
    }

    // 3) 실제 삭제 수행
    console.log("💥 Deleting channels...\n");

    let deleted = 0;
    let errors = 0;

    for (const channel of invalidChannels) {
      try {
        await prisma.youtubeChannel.delete({
          where: { id: channel.id },
        });

        console.log(
          `✅ Deleted: ${channel.title ?? "(null title)"} (id=${channel.id})`,
        );
        deleted++;
      } catch (error: any) {
        console.error(
          `❌ Error deleting channel ${channel.id}:`,
          error.message,
        );
        errors++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Total TOPIC channels: ${topicChannels.length}`);
    console.log(`   Invalid found: ${invalidChannels.length}`);
    console.log(`   Successfully deleted: ${deleted}`);
    console.log(`   Errors: ${errors}`);

    if (deleted > 0) {
      console.log("\n✅ Successfully deleted invalid TOPIC channels!");
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    throw error;
  }
}

// 스크립트 실행
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

deleteInvalidTopicChannels(dryRun)
  .then(async () => {
    console.log("\n🎉 Done!");
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n💥 Fatal error:", error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
