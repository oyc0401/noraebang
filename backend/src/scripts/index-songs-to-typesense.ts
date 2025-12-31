import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Client } from 'typesense';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const typesenseClient = new Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || '',
  connectionTimeoutSeconds: 30,
});

const COLLECTION_NAME = 'songs';

async function main() {
  console.log('Starting Typesense indexing...');

  // 1. Collection 스키마 정의
  const schema = {
    name: COLLECTION_NAME,
    fields: [
      { name: 'id', type: 'int32' as const },
      { name: 'title', type: 'string' as const },
      { name: 'titleKo', type: 'string' as const, optional: true },
      { name: 'titleNorm', type: 'string' as const },
      { name: 'artistId', type: 'int32' as const },
      { name: 'artistName', type: 'string' as const },
      { name: 'artistNameKo', type: 'string' as const },
      { name: 'artistAlias', type: 'string' as const },
      { name: 'karaokeNo', type: 'string[]' as const, optional: true },
      { name: 'provider', type: 'string[]' as const, optional: true },
    ],
    default_sorting_field: 'id',
  };

  // 2. 기존 Collection 삭제 (있으면)
  try {
    await typesenseClient.collections(COLLECTION_NAME).delete();
    console.log('Deleted existing collection');
  } catch (error) {
    console.log('No existing collection to delete');
  }

  // 3. Collection 생성
  try {
    await typesenseClient.collections().create(schema);
    console.log('Created new collection');
  } catch (error) {
    console.error('Error creating collection:', error);
    process.exit(1);
  }

  // 4. DB에서 데이터 가져오기
  const songs = await prisma.song.findMany({
    include: {
      artist: true,
      karaokeSongs: true,
    },
  });

  console.log(`Found ${songs.length} songs to index`);

  // 5. Typesense에 데이터 인덱싱
  const documents = songs.map((song) => ({
    id: song.id,
    title: song.title,
    titleKo: song.titleKo || undefined,
    titleNorm: song.titleNorm,
    artistId: song.artistId,
    artistName: song.artist.name,
    artistNameKo: song.artist.nameKo,
    artistAlias: song.artist.alias,
    karaokeNo: song.karaokeSongs.map((ks) => ks.karaokeNo),
    provider: song.karaokeSongs.map((ks) => ks.provider),
  }));

  // 배치로 인덱싱 (100개씩)
  const batchSize = 100;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    try {
      await typesenseClient.collections(COLLECTION_NAME).documents().import(batch);
      console.log(`Indexed batch ${i / batchSize + 1} (${Math.min(i + batchSize, documents.length)}/${documents.length})`);
    } catch (error) {
      console.error(`Error indexing batch ${i / batchSize + 1}:`, error);
    }
  }

  console.log('Indexing completed!');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
