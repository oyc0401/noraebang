/**
 * Claude Code 기반 artist_creation_queue 생성 테스트.
 *
 * Usage:
 *   cd server
 *   pnpm exec tsx src/scripts/test-artist-creation-queue.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createArtistCreationQueueFromTjSong } from "./queue";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

async function main() {
  const result = await createArtistCreationQueueFromTjSong(
    prisma,
    {
      id: "28397",
      title: "天ノ弱",
      artist: "164(Feat.GUMI)GUMI",
    },
    {
      homeCatalog: "JPOP",
      timeoutMs: 120_000,
      maxBudgetUsd: 1.2,

      // 네 claude에서 실제 지원하는 모델명 아니면 빼도 됨.
      model: "claude-haiku-4-5-20251001",

      tools: ["WebSearch", "WebFetch", "Bash(curl *)"],
    },
  );

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
