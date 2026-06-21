import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  type SongCatalogFilter,
  type SongListQueryDto,
  type SongSortBy,
  type SongStatusFilter,
  type SortOrder,
} from "./dto/song-list-query.dto";
import { SongListResponseDto } from "./dto/song-list-response.dto";

type SongRow = {
  tj_number: string;
  title: string;
  artist?: string;
  catalog?: string;
  publishdate?: string;
  is_created_as_song: boolean;
  is_in_queue: boolean;
};

type CountRow = {
  total: bigint;
};

@Injectable()
export class SongService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SongListQueryDto): Promise<SongListResponseDto> {
    const limit = parseBoundedInteger(query.limit, 50, 1, 100);
    const offset = parseBoundedInteger(query.offset, 0, 0, 1_000_000);
    const minNumber = parseBoundedInteger(query.minNumber, 0, 0, 99_999);
    const maxNumber = parseBoundedInteger(query.maxNumber, 99_999, 0, 99_999);
    const sortBy = parseSortBy(query.sortBy);
    const sortOrder = parseSortOrder(query.sortOrder);
    const catalog = parseCatalog(query.catalog);
    const status = parseStatus(query.status);
    const whereSql = buildWhereSql({
      title: query.title,
      artist: query.artist,
      minNumber,
      maxNumber,
      catalog,
      status,
    });
    const orderSql = buildOrderSql(sortBy, sortOrder);

    const rows = await this.prisma.$queryRaw<SongRow[]>`
      select
        t.id as tj_number,
        t.title,
        t.artist,
        s.catalog,
        t.publishdate,
        s.id is not null as is_created_as_song,
        q.id is not null as is_in_queue
      from tj_song t
      left join song s on s.tj_song_id = t.id
      left join song_queue q on q.tj_number = t.id
      where ${whereSql}
      ${orderSql}
      limit ${limit}
      offset ${offset}
    `;
    const countRows = await this.prisma.$queryRaw<CountRow[]>`
      select count(*)::bigint as total
      from tj_song t
      left join song s on s.tj_song_id = t.id
      left join song_queue q on q.tj_number = t.id
      where ${whereSql}
    `;
    const total = Number(countRows[0]?.total ?? 0);
    const nextOffset = offset + rows.length;

    return {
      data: rows.map((row) => ({
        tjNumber: row.tj_number,
        title: row.title,
        artist: row.artist ?? undefined,
        catalog: row.catalog ?? undefined,
        publishdate: row.publishdate ?? undefined,
        isCreatedAsSong: row.is_created_as_song,
        isInQueue: row.is_in_queue,
      })),
      nextOffset,
      hasMore: nextOffset < total,
      total,
    };
  }
}

function buildWhereSql({
  title,
  artist,
  minNumber,
  maxNumber,
  catalog,
  status,
}: {
  title?: string;
  artist?: string;
  minNumber: number;
  maxNumber: number;
  catalog?: SongCatalogFilter;
  status?: SongStatusFilter;
}) {
  const filters: Prisma.Sql[] = [
    Prisma.sql`t.id ~ '^[0-9]+$'`,
    Prisma.sql`t.id::int between ${minNumber} and ${maxNumber}`,
  ];
  const trimmedTitle = title?.trim();
  const trimmedArtist = artist?.trim();

  if (trimmedTitle) {
    const keyword = `%${trimmedTitle}%`;
    filters.push(Prisma.sql`
      (
        exists (
          select 1
          from song title_song
          where title_song.tj_song_id = t.id
            and (
              title_song.title ilike ${keyword}
              or title_song.title_ko ilike ${keyword}
              or title_song.title_ja ilike ${keyword}
              or title_song.title_ja_pronu ilike ${keyword}
              or title_song.title_ja_kana ilike ${keyword}
              or title_song.title_ja_kanji ilike ${keyword}
              or title_song.title_latin ilike ${keyword}
              or title_song.title_latin_pronu ilike ${keyword}
            )
          )
        )
        or t.title ilike ${keyword}
      )
    `);
  }

  if (trimmedArtist) {
    const keyword = `%${trimmedArtist}%`;
    filters.push(Prisma.sql`
      (
        t.artist ilike ${keyword}
        or exists (
          select 1
          from song artist_song_source
          join artist_song artist_song_link on artist_song_link.song_id = artist_song_source.id
          join artist artist on artist.id = artist_song_link.artist_id
          where artist_song_source.tj_song_id = t.id
            and (
              artist.name ilike ${keyword}
              or artist.name_ko ilike ${keyword}
              or artist.name_ja ilike ${keyword}
              or artist.name_ja_kana ilike ${keyword}
              or artist.name_ja_kanji ilike ${keyword}
              or artist.name_latin ilike ${keyword}
              or artist.name_ja_pronu ilike ${keyword}
              or artist.tj_name ilike ${keyword}
              or artist.tj_name_ja ilike ${keyword}
            )
        )
      )
    `);
  }

  if (catalog === "NONE") {
    filters.push(Prisma.sql`s.catalog is null`);
  } else if (catalog) {
    filters.push(Prisma.sql`s.catalog = ${catalog}`);
  }

  if (status === "song") {
    filters.push(Prisma.sql`s.id is not null`);
  }

  if (status === "queueOnly") {
    filters.push(Prisma.sql`s.id is null and q.id is not null`);
  }

  if (status === "none") {
    filters.push(Prisma.sql`s.id is null and q.id is null`);
  }

  return Prisma.join(filters, " and ");
}

function buildOrderSql(sortBy: SongSortBy, sortOrder: SortOrder) {
  const direction = sortOrder === "asc" ? Prisma.sql`asc` : Prisma.sql`desc`;

  if (sortBy === "title") {
    return Prisma.sql`order by lower(t.title) ${direction}, t.id::int asc`;
  }

  if (sortBy === "artist") {
    return Prisma.sql`order by lower(coalesce(t.artist, '')) ${direction}, t.id::int asc`;
  }

  return Prisma.sql`order by t.id::int ${direction}`;
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function parseSortBy(value: string | undefined): SongSortBy {
  if (value === "title" || value === "artist" || value === "tjNumber") {
    return value;
  }

  return "tjNumber";
}

function parseSortOrder(value: string | undefined): SortOrder {
  return value === "desc" ? "desc" : "asc";
}

function parseCatalog(value: string | undefined): SongCatalogFilter | undefined {
  if (value === "JPOP" || value === "KPOP" || value === "NONE") {
    return value;
  }

  return undefined;
}

function parseStatus(value: string | undefined): SongStatusFilter | undefined {
  if (value === "song" || value === "queueOnly" || value === "none") {
    return value;
  }

  return undefined;
}
