import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { blogArtist } from "../../data/artist";

// pnpm ts-node src/scripts/blog/seed-artists.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedArtists() {
  try {
    console.log("🎵 Starting to seed artists...\n");

    let created = 0;
    let updated = 0;

    for (const artist of blogArtist) {
      try {
        // Upsert: Create or Update
        const result = await prisma.artist.upsert({
          where: { alias: artist.alias },
          update: {
            name: artist.name,
            nameKo: artist.nameKo,
            blogId: String(artist.blogId),
          },
          create: {
            name: artist.name,
            nameKo: artist.nameKo,
            alias: artist.alias,
            blogId: String(artist.blogId),
          },
        });

        // Check if it was created or updated
        const isNew = result.createdAt.getTime() === result.updatedAt.getTime();

        if (isNew) {
          console.log(`   ✅ Created: ${artist.name} (${artist.nameKo})`);
          created++;
        } else {
          console.log(`   ✏️  Updated: ${artist.name} (${artist.nameKo})`);
          updated++;
        }
      } catch (error: any) {
        console.error(`   ❌ Error processing ${artist.name}:`, error.message);
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Total: ${blogArtist.length}`);
    console.log("\n✅ Seeding completed!");
  } catch (error: any) {
    console.error("❌ Fatal error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (require.main === module) {
  seedArtists()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedArtists;
