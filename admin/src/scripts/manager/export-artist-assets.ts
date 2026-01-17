/**
 * 아티스트 관리자 패널용 데이터를 JSON으로 내보내는 스크립트
 *
 * 포함 정보:
 * - 아티스트 기본 정보 및 연결된 채널
 * - 아티스트의 모든 Song + 연결된 스포티파이 그룹/트랙, 유튜브 비디오, 신청곡
 * - Song에 연결되지 않은(미배정) 스포티파이 그룹/트랙, 유튜브 비디오, 신청곡
 *
 * 사용 방법:
 * pnpm ts-node src/scripts/manager/export-artist-assets.ts <artistId> [--thumb]
 * pnpm ts-node src/scripts/manager/export-artist-assets.ts 123 --thumb
 * → admin/src/scripts/manager/artist-123.json 파일에 프리티 JSON 저장
 *   (--thumb를 붙이면 썸네일 필드 포함)
 */

import "dotenv/config";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
let includeThumbnails = false;

const spotifyTrackSummarySelect = {
  id: true,
  spotifyId: true,
  name: true,
  durationMs: true,
  releaseDate: true,
  popularity: true,
  musicBrainzTitle: true,
  thumbnails: true,
  groupId: true,
} satisfies Prisma.SpotifyTrackSelect;

const spotifyTrackWithGroupSelect: Prisma.SpotifyTrackSelect = {
  ...spotifyTrackSummarySelect,
  group: {
    select: {
      id: true,
      titleKo: true,
      titleLatin: true,
      titleJaKana: true,
      titleJaKanji: true,
      primaryTrack: {
        select: spotifyTrackSummarySelect,
      },
    },
  },
};

const youtubeVideoSelect = {
  videoId: true,
  title: true,
  publishedAt: true,
  thumbnailDefault: true,
  thumbnailMedium: true,
  thumbnailHigh: true,
  thumbnailStandard: true,
  thumbnailMaxres: true,
  viewCount: true,
  likeCount: true,
  commentCount: true,
  durationSeconds: true,
} satisfies Prisma.YoutubeVideoSelect;

type SpotifyTrackSummary = {
  id: number;
  spotifyId: string;
  name: string;
  durationMs?: number | null;
  releaseDate?: string | null;
  popularity?: number | null;
  musicBrainzTitle?: string | null;
  thumbnails?: string[];
  groupId?: number | null;
};

type YoutubeVideoSummary = {
  videoId: string;
  title: string | null;
  publishedAt: string | null;
  thumbnails?: {
    default: string | null;
    medium: string | null;
    high: string | null;
    standard: string | null;
    maxres: string | null;
  };
  viewCount: string | null;
  likeCount: number | null;
  commentCount: number | null;
  durationSeconds: number | null;
};

type SongProposeSummary = ReturnType<typeof mapSongProposeSummary>;

type SpotifyGroupSummary = {
  id: number;
  primaryTrack: SpotifyTrackSummary | null;
  tracks: string[];
};

type SongExport = {
  id: number;
  title: string;
  titleKo?: string | null;
  titleLatin?: string | null;
  titleJaKana?: string | null;
  titleJaKanji?: string | null;
  catalog?: string | null;
  youtubeVideoId?: string | null;
  thumbnails?: {
    default?: string | null;
    medium?: string | null;
    high?: string | null;
  };
  artistOrder: number;
  artistRole?: string | null;
  spotifyTrackGroup: SpotifyGroupSummary | null;
  youtubeVideos: string[];
  songProposes: string[];
  tjSong: { id: string; title: string; artist?: string | null } | null;
};

type ArtistExportPayload = {
  artist: {
    id: number;
    name: string;
    nameKo: string;
    nameLatin?: string | null;
    nameJaKana?: string | null;
    nameJaKanji?: string | null;
    tjName?: string | null;
    tjNameJa?: string | null;
    catalog?: string | null;
    slug?: string | null;
    spotifyId?: string | null;
    songCount: number;
    thumbnails?: {
      default?: string | null;
      medium?: string | null;
      high?: string | null;
    };
    spotifyProfile: {
      name?: string | null;
      spotifyId?: string | null;
      popularity?: number | null;
      followers?: number | null;
      genres: string[];
      thumbnails?: string[];
    } | null;
    youtubeChannels: Array<{
      id: number;
      type: string;
      channelId: string;
      title?: string | null;
      subscriberCount?: number | null;
      videoCount?: number | null;
      thumbnails?: {
        default?: string | null;
        medium?: string | null;
        high?: string | null;
      };
    }>;
    songs: SongExport[];
    unlinkedSpotifyGroups: SpotifyGroupSummary[];
    ungroupedSpotifyTracks: SpotifyTrackSummary[];
    unlinkedYoutubeVideos: YoutubeVideoSummary[];
    unlinkedSongProposes: SongProposeSummary[];
  };
};

function mapSpotifyTrackSummary(track: any): SpotifyTrackSummary {
  const summary: SpotifyTrackSummary = {
    id: track?.id ?? 0,
    spotifyId: track?.spotifyId ?? "",
    name: track?.name ?? "",
    durationMs: track?.durationMs ?? null,
    releaseDate: track?.releaseDate ?? null,
    popularity: track?.popularity ?? null,
    musicBrainzTitle: track?.musicBrainzTitle ?? null,
    groupId: track?.groupId ?? null,
  };

  if (includeThumbnails) {
    summary.thumbnails = track?.thumbnails ?? [];
  }

  return summary;
}

function mapYoutubeVideoSummary(video: any): YoutubeVideoSummary {
  return {
    videoId: video.videoId,
    title: video.title ?? null,
    publishedAt: video.publishedAt ? video.publishedAt.toISOString() : null,
    viewCount: toBigIntString(video.viewCount),
    likeCount: video.likeCount ?? null,
    commentCount: video.commentCount ?? null,
    durationSeconds: video.durationSeconds ?? null,
    thumbnails: includeThumbnails
      ? {
          default: video.thumbnailDefault ?? null,
          medium: video.thumbnailMedium ?? null,
          high: video.thumbnailHigh ?? null,
          standard: video.thumbnailStandard ?? null,
          maxres: video.thumbnailMaxres ?? null,
        }
      : undefined,
  };
}

function mapSongProposeSummary(propose: any): SongProposeSummary {
  return {
    id: propose.id,
    songTitle: propose.songTitle,
    songSinger: propose.songSinger,
    content: propose.content,
    requesterName: propose.name,
    otCode: propose.otCode,
    hit: propose.hit,
    regdateView: propose.regdateView,
  };
}

function mapSpotifyGroupRecord(group: any): SpotifyGroupSummary {
  return {
    id: group.id,
    primaryTrack: group.primaryTrack
      ? mapSpotifyTrackSummary(group.primaryTrack)
      : null,
    tracks: group.tracks?.map((track: any) => track.name).filter(Boolean) ?? [],
  };
}

function toBigIntString(value?: bigint | number | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === "bigint" ? value.toString() : String(value);
}

async function buildArtistExport(
  artistId: number,
): Promise<ArtistExportPayload> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      nameLatin: true,
      nameJaKana: true,
      nameJaKanji: true,
      tjName: true,
      tjNameJa: true,
      slug: true,
      homeCatalog: true,
      spotifyId: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      spotifyArtist: {
        select: {
          name: true,
          popularity: true,
          followers: true,
          genres: true,
          thumbnails: true,
        },
      },
      youtubeChannels: {
        orderBy: { type: "asc" },
        select: {
          id: true,
          type: true,
          channelId: true,
          title: true,
          subscriberCount: true,
          videoCount: true,
          thumbnailDefault: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
        },
      },
      artistSongs: {
        select: {
          role: true,
          song: {
            select: {
              id: true,
              title: true,
              titleKo: true,
              titleLatin: true,
              titleJaKana: true,
              titleJaKanji: true,
              catalog: true,
              youtubeVideoId: true,
              thumbnailDefault: true,
              thumbnailMedium: true,
              thumbnailHigh: true,
              tjSong: {
                select: {
                  id: true,
                  title: true,
                  artist: true,
                },
              },
              spotifyTrackGroup: {
                select: {
                  id: true,
                  primaryTrack: {
                    select: spotifyTrackSummarySelect,
                  },
                  tracks: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              youtubeVideos: {
                select: {
                  youtubeVideo: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
              songProposes: {
                orderBy: { hit: "desc" },
                select: {
                  songTitle: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  const linkedGroupIds = new Set<number>();
  const songs: SongExport[] = artist.artistSongs.map(
    ({ order, role, song }) => {
      if (song.spotifyTrackGroup?.id) {
        linkedGroupIds.add(song.spotifyTrackGroup.id);
      }
      const songExport: SongExport = {
        id: song.id,
        title: song.title,
        titleKo: song.titleKo,
        titleLatin: song.titleLatin,
        titleJaKana: song.titleJaKana,

        catalog: song.catalog,
        youtubeVideoId: song.youtubeVideoId,
        artistOrder: order,
        artistRole: role ?? null,
        spotifyTrackGroup: song.spotifyTrackGroup
          ? mapSpotifyGroupRecord(song.spotifyTrackGroup)
          : null,
        youtubeVideos:
          song.youtubeVideos
            ?.map((link) => link.youtubeVideo.title)
            .filter((title): title is string => Boolean(title?.trim())) ?? [],
        songProposes:
          song.songProposes
            ?.map((propose) => propose.songTitle)
            .filter((title): title is string => Boolean(title?.trim())) ?? [],
        tjSong: song.tjSong
          ? {
              id: song.tjSong.id,
              title: song.tjSong.title,
              artist: song.tjSong.artist,
            }
          : null,
      };

      if (includeThumbnails) {
        songExport.thumbnails = {
          default: song.thumbnailDefault,
          medium: song.thumbnailMedium,
          high: song.thumbnailHigh,
        };
      }

      return songExport;
    },
  );

  const { unlinkedSpotifyGroups, ungroupedSpotifyTracks } =
    await fetchUnlinkedSpotifyAssets({
      spotifyId: artist.spotifyId,
      linkedGroupIds,
    });

  const [unlinkedYoutubeVideos, unlinkedSongProposes] = await Promise.all([
    fetchUnlinkedYoutubeVideos(artistId),
    fetchUnlinkedSongProposes({
      tjName: artist.tjName,
      tjNameJa: artist.tjNameJa,
    }),
  ]);

  const artistPayload: ArtistExportPayload["artist"] = {
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    nameLatin: artist.nameLatin,
    nameJaKana: artist.nameJaKana,
    nameJaKanji: artist.nameJaKanji,
    tjName: artist.tjName,
    tjNameJa: artist.tjNameJa,
    catalog: artist.homeCatalog,
    slug: artist.slug,
    spotifyId: artist.spotifyId,
    songCount: songs.length,
    spotifyProfile: artist.spotifyArtist
      ? {
          name: artist.spotifyArtist.name,
          spotifyId: artist.spotifyId ?? null,
          popularity: artist.spotifyArtist.popularity ?? null,
          followers: artist.spotifyArtist.followers ?? null,
          genres: artist.spotifyArtist.genres ?? [],
        }
      : null,
    youtubeChannels: artist.youtubeChannels.map((channel) => ({
      id: channel.id,
      type: channel.type,
      channelId: channel.channelId,
      title: channel.title,
      subscriberCount: channel.subscriberCount ?? null,
      videoCount: channel.videoCount ?? null,
    })),
    songs,
    unlinkedSpotifyGroups,
    ungroupedSpotifyTracks,
    unlinkedYoutubeVideos,
    unlinkedSongProposes,
  };

  if (includeThumbnails) {
    artistPayload.thumbnails = {
      default: artist.thumbnailDefault,
      medium: artist.thumbnailMedium,
      high: artist.thumbnailHigh,
    };

    if (artistPayload.spotifyProfile) {
      artistPayload.spotifyProfile.thumbnails =
        artist.spotifyArtist?.thumbnails ?? [];
    }

    artistPayload.youtubeChannels = artistPayload.youtubeChannels.map(
      (channel, idx) => ({
        ...channel,
        thumbnails: {
          default: artist.youtubeChannels[idx]?.thumbnailDefault ?? null,
          medium: artist.youtubeChannels[idx]?.thumbnailMedium ?? null,
          high: artist.youtubeChannels[idx]?.thumbnailHigh ?? null,
        },
      }),
    );
  }

  const payload: ArtistExportPayload = { artist: artistPayload };

  return payload;
}

async function fetchUnlinkedSpotifyAssets({
  spotifyId,
  linkedGroupIds,
}: {
  spotifyId?: string | null;
  linkedGroupIds: Set<number>;
}): Promise<{
  unlinkedSpotifyGroups: SpotifyGroupSummary[];
  ungroupedSpotifyTracks: SpotifyTrackSummary[];
}> {
  if (!spotifyId) {
    return { unlinkedSpotifyGroups: [], ungroupedSpotifyTracks: [] };
  }

  const artistTracks = await prisma.spotifyArtistTrack.findMany({
    where: { spotifyArtist: { spotifyId } },
    select: {
      spotifyTrack: {
        select: spotifyTrackWithGroupSelect,
      },
    },
  });

  const orphanTrackMap = new Map<number, SpotifyTrackSummary>();
  const groupIdSet = new Set<number>();

  for (const record of artistTracks) {
    const track = record.spotifyTrack;
    if (!track) continue;
    if (track.groupId && track.group?.id) {
      groupIdSet.add(track.group.id);
    } else if (!track.groupId) {
      orphanTrackMap.set(track.id, mapSpotifyTrackSummary(track));
    }
  }

  const unlinkedGroupIds = Array.from(groupIdSet).filter((groupId) => {
    return !linkedGroupIds.has(groupId);
  });

  const unlinkedGroupRecords =
    unlinkedGroupIds.length > 0
      ? await prisma.spotifyTrackGroup.findMany({
          where: { id: { in: unlinkedGroupIds } },
          select: {
            id: true,
            primaryTrack: {
              select: spotifyTrackSummarySelect,
            },
            tracks: {
              select: {
                name: true,
              },
            },
          },
        })
      : [];

  const sortByPopularity = (
    a: SpotifyGroupSummary,
    b: SpotifyGroupSummary,
  ): number => {
    const popA = a.primaryTrack?.popularity ?? -1;
    const popB = b.primaryTrack?.popularity ?? -1;
    if (popA !== popB) {
      return popB - popA;
    }
    const dateA = a.primaryTrack?.releaseDate ?? "";
    const dateB = b.primaryTrack?.releaseDate ?? "";
    return dateB.localeCompare(dateA);
  };

  const unlinkedSpotifyGroups = unlinkedGroupRecords
    .map((group) => mapSpotifyGroupRecord(group))
    .sort(sortByPopularity);

  const ungroupedSpotifyTracks = Array.from(orphanTrackMap.values()).sort(
    (a, b) => {
      const popA = a.popularity ?? -1;
      const popB = b.popularity ?? -1;
      if (popA !== popB) {
        return popB - popA;
      }
      const dateA = a.releaseDate ?? "";
      const dateB = b.releaseDate ?? "";
      return dateB.localeCompare(dateA);
    },
  );

  return { unlinkedSpotifyGroups, ungroupedSpotifyTracks };
}

async function fetchUnlinkedYoutubeVideos(
  artistId: number,
): Promise<YoutubeVideoSummary[]> {
  const topicChannel = await prisma.youtubeChannel.findFirst({
    where: { artistId, type: "TOPIC" },
    select: { id: true },
  });

  if (!topicChannel) {
    return [];
  }

  const [channelVideos, linkedVideoIds] = await Promise.all([
    prisma.youtubeChannelVideo.findMany({
      where: { youtubeChannelId: topicChannel.id },
      select: {
        youtubeVideo: {
          select: youtubeVideoSelect,
        },
      },
    }),
    prisma.songYoutubeVideo.findMany({
      where: {
        song: { artistSongs: { some: { artistId } } },
      },
      select: { youtubeVideoId: true },
    }),
  ]);

  const linkedSet = new Set(linkedVideoIds.map((item) => item.youtubeVideoId));

  return channelVideos
    .filter((item) => !linkedSet.has(item.youtubeVideo.videoId))
    .map((item) => mapYoutubeVideoSummary(item.youtubeVideo))
    .sort(
      (a, b) =>
        Number(b.viewCount ?? "0") - Number(a.viewCount ?? "0") ||
        (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    );
}

async function fetchUnlinkedSongProposes({
  tjName,
  tjNameJa,
}: {
  tjName?: string | null;
  tjNameJa?: string | null;
}): Promise<SongProposeSummary[]> {
  const singerNames: string[] = [];
  if (tjName) singerNames.push(tjName);
  if (tjNameJa) singerNames.push(tjNameJa);

  if (singerNames.length === 0) {
    return [];
  }

  const proposes = await prisma.songPropose.findMany({
    where: {
      songSinger: { in: singerNames },
      songId: null,
    },
    select: {
      id: true,
      songTitle: true,
      songSinger: true,
      content: true,
      name: true,
      email1: true,
      email2: true,
      otCode: true,
      hit: true,
      regdateView: true,
      saveDate: true,
      updateDate: true,
    },
    orderBy: { hit: "desc" },
  });

  return proposes.map((propose) => mapSongProposeSummary(propose));
}

function printUsage() {
  console.log(
    "Usage: pnpm ts-node src/scripts/manager/export-artist-assets.ts <artistId> [--thumb]",
  );
  console.log(
    "Example: pnpm ts-node src/scripts/manager/export-artist-assets.ts 40 --thumb",
  );
}

async function main() {
  const args = process.argv.slice(2);
  let artistIdArg: string | undefined;

  for (const arg of args) {
    if (arg === "--thumb") {
      includeThumbnails = true;
    } else if (!artistIdArg) {
      artistIdArg = arg;
    }
  }

  if (!artistIdArg) {
    printUsage();
    process.exit(1);
  }

  const artistId = Number.parseInt(artistIdArg, 10);
  if (Number.isNaN(artistId)) {
    console.error("❌ artistId must be a number");
    process.exit(1);
  }

  const payload = await buildArtistExport(artistId);
  const json = JSON.stringify(payload, null, 2);
  const outputPath = path.join(scriptDir, `artist-${artistId}.json`);
  await writeFile(outputPath, `${json}\n`, "utf8");
  console.log(`✅ Exported artist data to ${outputPath}`);
}

main()
  .catch((err) => {
    console.error("❌ Failed to export artist assets:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
