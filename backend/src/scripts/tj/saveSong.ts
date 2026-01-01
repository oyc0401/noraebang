import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { TJSongData } from '../../tj/tj.service';
import { parseTJArtist, parseLyricist, parseComposer } from '../../lib/artist-parser';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * TjSong 테이블에 저장
 */
export async function saveSongToDatabase(
  song: TJSongData,
  force: boolean,
  releasedYearMonth: string,
): Promise<'created' | 'updated' | 'skipped'> {
  try {
    const parsed = parseTJArtist(song.artist);
    const lyricistList = parseLyricist(song.lyricist);
    const composerList = parseComposer(song.composer);

    const existing = await prisma.tjSong.findUnique({
      where: { id: song.karaokeNo },
    });

    if (existing && !force) {
      return 'skipped';
    }

    if (existing && force) {
      await prisma.tjSong.update({
        where: { id: song.karaokeNo },
        data: {
          title: song.title,
          artist: song.artist,
          artistList: parsed.artist,
          lyricist: song.lyricist,
          lyricistList,
          composer: song.composer,
          composerList,
          nationType: song.nationType,
          releasedYearMonth,
        },
      });
      return 'updated';
    }

    await prisma.tjSong.create({
      data: {
        id: song.karaokeNo,
        title: song.title,
        artist: song.artist,
        artistList: parsed.artist,
        lyricist: song.lyricist,
        lyricistList,
        composer: song.composer,
        composerList,
        nationType: song.nationType,
        releasedYearMonth,
      },
    });
    return 'created';
  } catch (error) {
    console.error(`  ❌ Error saving TjSong ${song.karaokeNo}:`, error);
    throw error;
  }
}
