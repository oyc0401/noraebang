import 'dotenv/config';
import { PrismaClient, Provider } from '@prisma/client';
import { BlogScrapeService } from '../../blog-scrape/blog-scrape.service';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';


// pnpm ts-node src/scripts/blog/crawl-and-save-songs.ts

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\s\-_\.。]+/g, '')
    .replace(/[^\w]/g, '');
}

async function crawlAndSaveSongs() {
  const scrapeService = new BlogScrapeService();

  try {
    console.log('🎵 Starting to crawl and save songs...\n');

    // blogId가 있는 아티스트만 조회
    const artists = await prisma.artist.findMany({
      where: {
        blogId: {
          not: null,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`Found ${artists.length} artists with blogId\n`);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalKaraokeCreated = 0;
    let totalErrors = 0;

    for (const artist of artists) {
      console.log(`\n📌 Processing: ${artist.name} (${artist.nameKo})`);
      console.log(`   Blog URL: https://j-pop-playlist.tistory.com/${artist.blogId}`);

      try {
        const url = `https://j-pop-playlist.tistory.com/${artist.blogId}`;
        const scrapedSongs = await scrapeService.scrapeSongs(url);

        console.log(`   Found ${scrapedSongs.length} songs`);

        let created = 0;
        let updated = 0;
        let karaokeCreated = 0;

        for (const scrapedSong of scrapedSongs) {
          const titleNorm = scrapedSong.title; // title과 동일하게 설정

          try {
            // Upsert Song
            const song = await prisma.song.upsert({
              where: {
                artistId_titleNorm: {
                  artistId: artist.id,
                  titleNorm,
                },
              },
              update: {
                title: scrapedSong.title,
                titleKo: scrapedSong.titleKo || null,
              },
              create: {
                title: scrapedSong.title,
                titleKo: scrapedSong.titleKo || null,
                titleNorm,
                artistId: artist.id,
              },
            });

            const isNewSong = song.createdAt.getTime() === song.updatedAt.getTime();
            if (isNewSong) {
              created++;
            } else {
              updated++;
            }

            // Process karaoke numbers
            const karaokeData = [
              { provider: Provider.TJ, number: scrapedSong.tj },
              { provider: Provider.KY, number: scrapedSong.ky },
              { provider: Provider.JOYSOUND, number: scrapedSong.joysound },
            ];

            for (const { provider, number } of karaokeData) {
              if (!number) continue;

              await prisma.karaokeSong.upsert({
                where: {
                  provider_karaokeNo: {
                    provider,
                    karaokeNo: number,
                  },
                },
                update: {
                  songId: song.id,
                  lastSeenAt: new Date(),
                  ingestedAt: new Date(),
                  ingestedFrom: url,
                },
                create: {
                  songId: song.id,
                  provider,
                  karaokeNo: number,
                  lastSeenAt: new Date(),
                  ingestedAt: new Date(),
                  ingestedFrom: url,
                },
              });

              karaokeCreated++;
            }
          } catch (error: any) {
            console.error(`      ❌ Error saving song "${scrapedSong.title}":`, error.message);
            totalErrors++;
          }
        }

        console.log(`   ✅ Songs: ${created} created, ${updated} updated`);
        console.log(`   🎤 Karaoke numbers: ${karaokeCreated} processed`);

        totalCreated += created;
        totalUpdated += updated;
        totalKaraokeCreated += karaokeCreated;

      } catch (error: any) {
        console.log(`   ❌ Error crawling ${artist.name}:`, error.message);
        totalErrors++;
      }
    }

    console.log('\n📊 Overall Summary:');
    console.log(`   Artists processed: ${artists.length}`);
    console.log(`   Songs created: ${totalCreated}`);
    console.log(`   Songs updated: ${totalUpdated}`);
    console.log(`   Karaoke numbers: ${totalKaraokeCreated}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log('\n✅ Crawling and saving completed!');
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (require.main === module) {
  crawlAndSaveSongs()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default crawlAndSaveSongs;
