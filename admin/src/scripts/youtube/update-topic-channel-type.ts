import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// 사용법:
// pnpm ts-node src/scripts/youtube/update-topic-channel-type.ts
// pnpm ts-node src/scripts/youtube/update-topic-channel-type.ts --dry-run

// 설명:
// YouTube 채널 중 title에 "- Topic"이 포함된 채널을 TOPIC 타입으로 변경하는 스크립트
// - Topic 채널은 YouTube Music이 자동으로 생성하는 아티스트 채널입니다.
// - type 컬럼이 추가되면서 기존 MAIN 타입의 Topic 채널들을 TOPIC 타입으로 변경해야 합니다.

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function updateTopicChannelType(dryRun: boolean = false) {
  try {
    console.log("🎬 Starting to update topic channel types...\n");

    if (dryRun) {
      console.log("⚠️  DRY RUN MODE - No changes will be made\n");
    }

    // 1. title에 "- Topic"이 포함된 채널 조회 (MAIN 타입인 것만)
    const topicChannels = await prisma.youtubeChannel.findMany({
      where: {
        title: {
          contains: "- Topic",
        },
        type: "MAIN",
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
    });

    console.log(`Found ${topicChannels.length} topic channels to update\n`);

    if (topicChannels.length === 0) {
      console.log("✅ No topic channels to update!");
      return;
    }

    // 2. 채널 정보 출력
    console.log("📋 Channels to be updated:");
    topicChannels.forEach((channel, index) => {
      console.log(
        `${index + 1}. [${channel.artist.name} (${channel.artist.nameKo})] ${channel.title}`,
      );
      console.log(`   Channel ID: ${channel.channelId}`);
      console.log(`   DB ID: ${channel.id}\n`);
    });

    if (dryRun) {
      console.log("⚠️  DRY RUN - No changes were made");
      console.log(`Would have updated ${topicChannels.length} channels to TOPIC type`);
      return;
    }

    // 3. 실제 업데이트 수행
    console.log("💾 Updating channels...\n");

    let updated = 0;
    let errors = 0;

    for (const channel of topicChannels) {
      try {
        await prisma.youtubeChannel.update({
          where: { id: channel.id },
          data: { type: "TOPIC" },
        });

        console.log(`✅ Updated: ${channel.title}`);
        updated++;
      } catch (error: any) {
        console.error(`❌ Error updating channel ${channel.id}:`, error.message);
        errors++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Total found: ${topicChannels.length}`);
    console.log(`   Successfully updated: ${updated}`);
    console.log(`   Errors: ${errors}`);

    if (updated > 0) {
      console.log("\n✅ Successfully updated topic channel types!");
    }
  } catch (error) {
    console.error("❌ Fatal error:", error);
    throw error;
  }
}

// 스크립트 실행
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

updateTopicChannelType(dryRun)
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
