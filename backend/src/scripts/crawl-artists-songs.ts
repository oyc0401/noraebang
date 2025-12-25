import { PrismaClient } from '@prisma/client';
import { BlogScrapeService } from '../blog-scrape/blog-scrape.service';

const prisma = new PrismaClient();

async function crawlArtistsSongs() {
  const scrapeService = new BlogScrapeService();

  try {
    console.log('🎵 Starting crawl for artists...\n');

    // blogId가 있는 아티스트만 조회
    const artists = await prisma.artist.findMany({
      where: {
        blogId: {
          not: null,
        },
      },
    });

    console.log(`Found ${artists.length} artists with blogId\n`);

    for (const artist of artists) {
      console.log(`📌 Crawling: ${artist.name} (${artist.nameKo})`);
      console.log(`   Blog URL: https://j-pop-playlist.tistory.com/${artist.blogId}`);

      try {
        const url = `https://j-pop-playlist.tistory.com/${artist.blogId}`;
        const songs = await scrapeService.scrapeSongs(url);

        console.log(`   ✅ Found ${songs.length} songs`);
        console.log(`   Sample songs:`);
        songs.slice(0, 3).forEach(song => {
          console.log(`      - ${song.title}${song.titleKo ? ` (${song.titleKo})` : ''}`);
        });
        console.log('');

        // 전체 데이터 확인용
        // console.log(JSON.stringify(songs, null, 2));

      } catch (error: any) {
        console.log(`   ❌ Error crawling ${artist.name}:`, error.message);
        console.log('');
      }
    }

    console.log('✅ Crawling completed!');
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (require.main === module) {
  crawlArtistsSongs()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default crawlArtistsSongs;
