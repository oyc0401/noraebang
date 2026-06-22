/**
 * ArtistCreationQueue push manual test.
 *
 * This script writes to artist_creation_queue.
 *
 * Usage:
 * cd admin
 * pnpm tsx src/api/artist-creation-queue/test-push-artist-creation-queue.ts
 *
 * Test target:
 * 28397 / 天ノ弱 / 164(Feat.GUMI)GUMI
 */
import "dotenv/config";
import { PrismaService } from "../../../prisma/prisma.service";
import { ArtistCreationQueueManager } from "./artist-creation-queue.manager";

const tjsongNumber = "28397";

const prisma = new PrismaService();
const manager = new ArtistCreationQueueManager(prisma);

async function main() {
  const result = await manager.pushArtistCreationQueueFromTj(tjsongNumber);

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
