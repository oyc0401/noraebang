import "dotenv/config";
// Usage: cd admin && pnpm ts-node src/scripts/requeue-song-queue-catalog.ts
// Apply: cd admin && pnpm ts-node src/scripts/requeue-song-queue-catalog.ts --apply
// song_queue.catalog가 비어 있는 항목을 pushRecentSongQueue로 다시 넣어서
// 라이브 파이프라인(resolveCatalog)이 그대로 재계산하게 한다.

import { ParserService } from "../api/collection/parser/parser.service";
import { PrismaService } from "../prisma/prisma.service";

const shouldApply = process.argv.includes("--apply");
const prisma = new PrismaService();
const parserService = new ParserService(prisma);

async function main() {
  const queueItems = await prisma.songQueue.findMany({
    where: { catalog: null },
    select: { tjNumber: true, title: true, artist: true },
    orderBy: { id: "asc" },
  });

  let requeued = 0;

  if (shouldApply) {
    for (const item of queueItems) {
      await parserService.pushRecentSongQueue(item.tjNumber);
      requeued += 1;
    }
  }

  console.log(`모드: ${shouldApply ? "apply" : "dry-run"}`);
  console.log(`대상: ${queueItems.length}`);
  console.log(`재투입: ${requeued}`);

  if (queueItems.length > 0) {
    console.log("대상 샘플:");

    for (const item of queueItems.slice(0, 30)) {
      console.log(`- ${item.tjNumber}: ${item.title} / ${item.artist ?? ""}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
