import { Injectable } from "@nestjs/common";
import { getCatalog } from "../../lib/getCatalog";
import { PrismaService } from "../../prisma/prisma.service";
import {
  fetchTjNewSongsByYearMonth,
  getTjSongByArtist,
  type TjSongData,
  type TjSongInfo,
} from "../../tj";

type RecentParserResult = {
  fetched: number;
  created: number;
  updated: number;
  queued: number;
};

type SearchParserResult = {
  searchedArtists: number;
  fetched: number;
  created: number;
  updated: number;
  queued: number;
};

type ParserJobResponse =
  | {
      status: "started";
      message: string;
    }
  | {
      status: "already_running";
      message: string;
    };

@Injectable()
export class ParserService {
  private recentJob: Promise<RecentParserResult> | null = null;
  private searchJob: Promise<SearchParserResult> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async runRecentParser(
    yearMonth = this.getCurrentYearMonth(),
  ): Promise<ParserJobResponse> {
    if (this.recentJob) {
      return {
        status: "already_running",
        message: "recent parser is already running.",
      };
    }

    const job = this.parseRecent(yearMonth);
    this.recentJob = job;

    void job
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(() => {
        if (this.recentJob === job) {
          this.recentJob = null;
        }
      });

    return {
      status: "started",
      message: "recent parser started.",
    };
  }

  async runSearchParser(): Promise<ParserJobResponse> {
    if (this.searchJob) {
      return {
        status: "already_running",
        message: "search parser is already running.",
      };
    }

    const job = this.parseSearch();
    this.searchJob = job;

    void job
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(() => {
        if (this.searchJob === job) {
          this.searchJob = null;
        }
      });

    return {
      status: "started",
      message: "search parser started.",
    };
  }

  async pushRecentSongQueue(tjNumber: string | number): Promise<void> {
    const song = await this.prisma.tjSong.findUnique({
      where: { id: String(tjNumber) },
      select: {
        id: true,
        title: true,
        artist: true,
        publishdate: true,
      },
    });

    if (!song) {
      throw new Error(`TjSong ${tjNumber} not found.`);
    }

    await this.prisma.songQueue.upsert({
      where: { tjNumber: song.id },
      create: {
        tjNumber: song.id,
        title: song.title,
        artist: song.artist,
        publishdate: song.publishdate,
        catalog: getCatalog(song.title, song.artist),
      },
      update: {
        title: song.title,
        artist: song.artist,
        publishdate: song.publishdate,
        catalog: getCatalog(song.title, song.artist),
      },
    });
  }

  async parseRecent(yearMonth: string | number): Promise<RecentParserResult> {
    const searchYm = yearMonth.toString();
    const songs = await fetchTjNewSongsByYearMonth(searchYm);
    const result: RecentParserResult = {
      fetched: songs.length,
      created: 0,
      updated: 0,
      queued: 0,
    };

    for (const song of songs) {
      const created = await this.upsertRecentTjSong(song);

      if (created) {
        result.created += 1;
        await this.pushRecentSongQueue(song.karaokeNo);
        result.queued += 1;
      } else {
        result.updated += 1;
      }
    }

    return result;
  }

  async parseSearch(): Promise<SearchParserResult> {
    const artistNames = await this.getArtistNames();
    const result: SearchParserResult = {
      searchedArtists: artistNames.length,
      fetched: 0,
      created: 0,
      updated: 0,
      queued: 0,
    };

    for (const artistName of artistNames) {
      const songs = await getTjSongByArtist(artistName);
      result.fetched += songs.length;

      for (const song of songs) {
        const created = await this.upsertSearchTjSong(song);

        if (created) {
          result.created += 1;
          await this.pushRecentSongQueue(song.songNumber);
          result.queued += 1;
        } else {
          result.updated += 1;
        }
      }
    }

    return result;
  }

  private async getArtistNames(): Promise<string[]> {
    const artists = await this.prisma.artist.findMany({
      select: { name: true },
      orderBy: { id: "asc" },
    });

    return Array.from(
      new Set(
        artists
          .map((artist) => artist.name.trim())
          .filter((artistName) => artistName.length > 0),
      ),
    );
  }

  private async upsertRecentTjSong(song: TjSongData): Promise<boolean> {
    const existing = await this.prisma.tjSong.findUnique({
      where: { id: song.karaokeNo },
      select: { id: true },
    });

    await this.prisma.tjSong.upsert({
      where: { id: song.karaokeNo },
      create: {
        id: song.karaokeNo,
        title: song.title,
        artist: song.artist,
        lyricist: song.lyricist || null,
        composer: song.composer || null,
        thumbnailImg: song.thumbnailImg || null,
        publishdate: song.publishdate,
        isMV: song.isMV,
      },
      update: {
        title: song.title,
        artist: song.artist,
        lyricist: song.lyricist || null,
        composer: song.composer || null,
        thumbnailImg: song.thumbnailImg || null,
        publishdate: song.publishdate,
        isMV: song.isMV,
      },
    });

    return !existing;
  }

  private async upsertSearchTjSong(song: TjSongInfo): Promise<boolean> {
    const existing = await this.prisma.tjSong.findUnique({
      where: { id: song.songNumber },
      select: { id: true },
    });

    await this.prisma.tjSong.upsert({
      where: { id: song.songNumber },
      create: {
        id: song.songNumber,
        title: song.title,
        artist: song.artist,
        lyricist: song.lyricist || null,
        composer: song.composer || null,
        isMR: song.isMR,
        isMV: song.isMV,
        isOver60: song.isOver60,
        youtubeLink: song.youtubeLink || null,
      },
      update: {
        title: song.title,
        artist: song.artist,
        lyricist: song.lyricist || null,
        composer: song.composer || null,
        isMR: song.isMR,
        isMV: song.isMV,
        isOver60: song.isOver60,
        youtubeLink: song.youtubeLink || null,
      },
    });

    return !existing;
  }

  private getCurrentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
}
