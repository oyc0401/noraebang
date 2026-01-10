// pnpm ts-node src/typesense/scripts/seed-aliases-youtube-topic.ts
// pnpm ts-node src/typesense/scripts/seed-aliases-youtube-topic.ts --dry-run
//
// 이 스크립트는 YouTube Topic 채널명을 ArtistAlias에 저장합니다.
//
// 처리 내용:
// 1. artistId < 272인 아티스트만 처리
// 2. TOPIC 타입의 YouTube 채널 찾기
// 3. 채널명에서 " - Topic" 제거
// 4. ArtistAlias에 저장 (locale=LATIN, kind=YOUTUBE, source=SYSTEM)
//
// 주의:
// - 기존에 동일한 별칭이 있으면 스킵
// - --dry-run 없이 실행하면 실제로 DB에 저장됨

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isDryRun = process.argv.includes("--dry-run");

/**
 * " - Topic" 제거
 */
function removeTopicSuffix(title: string): string {
  return title.replace(/ - Topic$/i, "").trim();
}

async function main() {
  console.log("======================================");
  console.log("YouTube Topic → ArtistAlias");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log("======================================\n");

  // 1. artistId < 272인 아티스트 조회
  const artists = await prisma.artist.findMany({
    where: {
      id: {
        lt: 272,
      },
    },
    include: {
      youtubeChannels: {
        where: {
          type: "TOPIC",
        },
      },
      aliases: {
        where: {
          kind: "YOUTUBE",
        },
      },
    },
  });

  console.log(`Found ${artists.length} artists (id < 272)\n`);

  let processedCount = 0;
  let skippedCount = 0;
  let createdCount = 0;

  for (const artist of artists) {
    const topicChannels = artist.youtubeChannels.filter(
      (ch) => ch.type === "TOPIC" && ch.title,
    );

    if (topicChannels.length === 0) {
      console.log(
        `[SKIP] Artist ${artist.id} (${artist.name}): No TOPIC channel`,
      );
      skippedCount++;
      continue;
    }

    for (const channel of topicChannels) {
      if (!channel.title) continue;

      const alias = removeTopicSuffix(channel.title);

      // 원본과 같으면 스킵
      if (alias === artist.name) {
        console.log(
          `[SKIP] Artist ${artist.id} (${artist.name}): Topic name same as artist name`,
        );
        skippedCount++;
        continue;
      }

      // 기존 별칭 체크
      const existingAlias = artist.aliases.find(
        (a) =>
          a.alias === alias && a.locale === "LATIN" && a.kind === "YOUTUBE",
      );

      if (existingAlias) {
        console.log(
          `[SKIP] Artist ${artist.id} (${artist.name}): Alias "${alias}" already exists`,
        );
        skippedCount++;
        continue;
      }

      // 생성
      console.log(
        `[${isDryRun ? "DRY" : "CREATE"}] Artist ${artist.id} (${artist.name}): "${channel.title}" → "${alias}"`,
      );

      if (!isDryRun) {
        await prisma.artistAlias.create({
          data: {
            artistId: artist.id,
            alias,
            locale: "LATIN",
            kind: "YOUTUBE",
            source: "SYSTEM",
          },
        });
      }

      createdCount++;
      processedCount++;
    }
  }

  console.log("\n======================================");
  console.log("Summary");
  console.log("======================================");
  console.log(`Total artists: ${artists.length}`);
  console.log(`Processed: ${processedCount}`);
  console.log(`Created: ${createdCount} ${isDryRun ? "(dry run)" : ""}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log("======================================");
}

main()
  .catch((error) => {
    console.error("\n✗ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
