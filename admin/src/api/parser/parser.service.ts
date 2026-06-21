import { Injectable } from "@nestjs/common";
import { Catalog, getCatalog } from "../../lib/getCatalog";
import { JpopTjArtistIndex } from "../../lib/jpopTjArtistIndex";
import { PrismaService } from "../../prisma/prisma.service";
import {
  fetchTjNewSongsByYearMonth,
  getLastExecutedAt,
  getTjSongByArtist,
  recordExecution,
  type TjSongData,
  type TjSongInfo,
} from "../../tj";
import { ParserLogResponseDto } from "./dto/parser-log-response.dto";

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
  private jpopTjArtistIndex: Promise<JpopTjArtistIndex> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async runRecentParser(
    yearMonth = this.getPreviousYearMonth(),
  ): Promise<ParserJobResponse> {
    if (this.recentJob) {
      return {
        status: "already_running",
        message: "recent parser is already running.",
      };
    }

    await recordExecution("recentParser");

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

  async getRecentParserLog(): Promise<ParserLogResponseDto> {
    return {
      lastExecutedAt: await getLastExecutedAt("recentParser"),
    };
  }

  async getSearchParserLog(): Promise<ParserLogResponseDto> {
    return {
      lastExecutedAt: await getLastExecutedAt("searchByArtist"),
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

    const catalog = await this.resolveCatalog(
      song.title,
      song.artist,
      song.id,
    );

    await this.prisma.songQueue.upsert({
      where: { tjNumber: song.id },
      create: {
        tjNumber: song.id,
        title: song.title,
        artist: song.artist,
        publishdate: song.publishdate,
        catalog,
      },
      update: {
        title: song.title,
        artist: song.artist,
        publishdate: song.publishdate,
        catalog,
      },
    });
  }

  // 이미 생성된 JPOP Song의 TJ artist 문자열을 먼저 대조한다.
  private async resolveCatalog(
    title: string,
    artist: string | null,
    tjNumber: string,
  ): Promise<Catalog | null> {
    const jpopArtistId = (
      await this.getJpopTjArtistIndex()
    ).findJpopArtistId(artist);

    if (jpopArtistId !== null) {
      return "JPOP";
    }

    return getCatalog(title, artist, tjNumber);
  }

  private getJpopTjArtistIndex(): Promise<JpopTjArtistIndex> {
    if (!this.jpopTjArtistIndex) {
      this.jpopTjArtistIndex = JpopTjArtistIndex.create(this.prisma);
    }

    return this.jpopTjArtistIndex;
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

  private getPreviousYearMonth(): string {
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();

    return `${year}${String(month).padStart(2, "0")}`;
  }
}
