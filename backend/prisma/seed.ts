import { PrismaClient, Provider } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

// Import all artists and songs from frontend data
import { allArtists, allSongs } from './seed-data';

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.karaokeSong.deleteMany();
  await prisma.song.deleteMany();
  await prisma.artist.deleteMany();

  console.log('Cleared existing data');

  // Seed artists
  for (const artist of allArtists) {
    await prisma.artist.create({
      data: {
        id: artist.id,
        name: artist.name,
        nameNorm: artist.nameNorm,
        youtubeChannelUrl: artist.youtubeChannelUrl,
        tjSongRequestUrl: artist.tjSongRequestUrl,
      },
    });
    console.log(`Created artist: ${artist.name}`);
  }

  // Seed songs and karaoke songs
  for (const song of allSongs) {
    await prisma.song.create({
      data: {
        id: song.id,
        title: song.title,
        titleKo: song.titleKo,
        titleNorm: song.titleNorm,
        youtubeVideoId: song.youtubeVideoId,
        youtubeFetchedAt: song.youtubeFetchedAt,
        primaryArtistId: song.primaryArtistId,
        karaokeSongs: {
          create: song.karaokeSongs.map((ks) => ({
            id: ks.id,
            provider: ks.provider,
            karaokeNo: ks.karaokeNo,
            providerSongUrl: ks.providerSongUrl,
            lastSeenAt: ks.lastSeenAt,
            ingestedAt: ks.ingestedAt,
            ingestedFrom: ks.ingestedFrom,
          })),
        },
      },
    });
    console.log(`Created song: ${song.title}`);
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
