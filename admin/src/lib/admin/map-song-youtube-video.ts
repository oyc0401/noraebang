import { prisma } from "../prisma";
import { findBestMatch } from "../song-spotify-matcher";
import { normalizeTitle } from "../track-title-normalizer";

// mapSongYoutubeVideo는 아티스트의 곡과 토픽 채널 영상을 매칭해 SongYoutubeVideo를 보완합니다.

type SongWithTitles = {
  id: number;
  title: string;
  titleKo: string | null;
  titleLatin: string | null;
  spotifyTitles: string[];
  musicBrainzTitles: string[];
};

type YoutubeVideoInfo = {
  videoId: string;
  title: string;
};

export type SongYoutubeVideoMatch = {
  songId: number;
  songTitle: string;
  matchedVideos: Array<{
    videoId: string;
    title: string;
    matchedBy: string;
  }>;
  candidateVideos: Array<{
    videoId: string;
    title: string;
  }>;
};

export interface MapSongYoutubeVideoOptions {
  dryRun?: boolean;
  verbose?: boolean;
  logger?: (line: string) => void;
}

export interface MapSongYoutubeVideoResult {
  artistId: number;
  artistName: string;
  artistNameKo: string;
  totalSongs: number;
  totalVideos: number;
  dryRun: boolean;
  mappings: SongYoutubeVideoMatch[];
  stats: {
    songsWithMatches: number;
    songsWithCandidatesOnly: number;
    songsWithoutMatches: number;
    totalMatchedLinks: number;
    inserted: number;
    skipped: number;
  };
}

const noop = () => {};

export async function mapSongYoutubeVideo(
  artistId: number,
  options: MapSongYoutubeVideoOptions = {},
): Promise<MapSongYoutubeVideoResult> {
  const { dryRun = false, verbose = false, logger } = options;
  const emit = (line: string) => {
    if (logger) logger(line);
    if (verbose) console.log(line);
  };

  emit(
    `\n🎬 mapSongYoutubeVideo → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  const songs = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: { artistId },
      },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      spotifyTrackGroup: {
        select: {
          tracks: {
            select: {
              name: true,
              musicBrainzTitle: true,
            },
          },
        },
      },
    },
  });

  const topicChannels = await prisma.youtubeChannel.findMany({
    where: { artistId, type: "TOPIC" },
    select: {
      videos: {
        select: {
          youtubeVideo: {
            select: {
              videoId: true,
              title: true,
            },
          },
        },
      },
    },
  });

  const songsWithTitles = songs.map<SongWithTitles>((song) => {
    const spotifyTitles = new Set<string>();
    const musicBrainzTitles = new Set<string>();

    song.spotifyTrackGroup?.tracks.forEach((track) => {
      if (track.name) spotifyTitles.add(track.name);
      if (track.musicBrainzTitle) musicBrainzTitles.add(track.musicBrainzTitle);
    });

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      titleLatin: song.titleLatin,
      spotifyTitles: Array.from(spotifyTitles),
      musicBrainzTitles: Array.from(musicBrainzTitles),
    };
  });

  const videos: YoutubeVideoInfo[] = [];
  const seenVideoId = new Set<string>();

  topicChannels.forEach((channel) => {
    channel.videos.forEach((cv) => {
      const video = cv.youtubeVideo;
      if (!video.title) return;
      if (seenVideoId.has(video.videoId)) return;
      seenVideoId.add(video.videoId);
      videos.push({ videoId: video.videoId, title: video.title });
    });
  });

  emit(`  • Songs: ${songsWithTitles.length}`);
  emit(`  • Topic videos: ${videos.length}`);

  const mappings = generateMapping(songsWithTitles, videos);
  const withMatches = mappings.filter((m) => m.matchedVideos.length > 0);
  const withCandidatesOnly = mappings.filter(
    (m) =>
      m.matchedVideos.length === 0 && m.candidateVideos.length > 0,
  );
  const withoutMatches = mappings.filter(
    (m) =>
      m.matchedVideos.length === 0 && m.candidateVideos.length === 0,
  );
  const totalMatchedLinks = withMatches.reduce(
    (sum, item) => sum + item.matchedVideos.length,
    0,
  );

  emit("  • Mapping stats");
  emit(`    - songs with matches: ${withMatches.length}`);
  emit(`    - songs with candidates only: ${withCandidatesOnly.length}`);
  emit(`    - songs without matches: ${withoutMatches.length}`);
  emit(`    - matched links: ${totalMatchedLinks}`);

  const { inserted, skipped } = await applyMappings(mappings, dryRun);

  return {
    artistId: artist.id,
    artistName: artist.name,
    artistNameKo: artist.nameKo,
    totalSongs: songsWithTitles.length,
    totalVideos: videos.length,
    dryRun,
    mappings,
    stats: {
      songsWithMatches: withMatches.length,
      songsWithCandidatesOnly: withCandidatesOnly.length,
      songsWithoutMatches: withoutMatches.length,
      totalMatchedLinks,
      inserted,
      skipped,
    },
  };
}

function generateMapping(
  songs: SongWithTitles[],
  videos: YoutubeVideoInfo[],
): SongYoutubeVideoMatch[] {
  const normalizedToVideos = new Map<string, YoutubeVideoInfo[]>();

  videos.forEach((video) => {
    const norm = normalizeTitle(video.title);
    if (!norm) return;
    const arr = normalizedToVideos.get(norm) ?? [];
    arr.push(video);
    normalizedToVideos.set(norm, arr);
  });

  const normalizedVideoTitles = Array.from(normalizedToVideos.keys());

  return songs.map((song) => {
    const matchedVideos: SongYoutubeVideoMatch["matchedVideos"] = [];
    const candidateSet = new Set<string>();

    const titleSources: Array<{ titles: string[]; source: string }> = [
      { titles: song.musicBrainzTitles, source: "musicBrainzTitle" },
      { titles: song.spotifyTitles, source: "spotifyTitle" },
      { titles: [song.title], source: "title" },
      { titles: song.titleLatin ? [song.titleLatin] : [], source: "titleLatin" },
      { titles: song.titleKo ? [song.titleKo] : [], source: "titleKo" },
    ];

    for (const { titles, source } of titleSources) {
      for (const rawTitle of titles) {
        if (!rawTitle) continue;
        const normalizedQuery = normalizeTitle(rawTitle);
        if (!normalizedQuery) continue;

        const result = findBestMatch(normalizedQuery, normalizedVideoTitles);

        if (result.answer) {
          const matches = normalizedToVideos.get(result.answer) ?? [];
          matches.forEach((video) => {
            if (!matchedVideos.find((item) => item.videoId === video.videoId)) {
              matchedVideos.push({
                videoId: video.videoId,
                title: video.title,
                matchedBy: `${source}: "${rawTitle}"`,
              });
            }
          });
        }

        result.candidate.forEach((candidateNorm) => {
          const vids = normalizedToVideos.get(candidateNorm) ?? [];
          vids.forEach((video) => candidateSet.add(video.videoId));
        });
      }
    }

    const matchedIds = new Set(matchedVideos.map((item) => item.videoId));
    const candidateVideos = Array.from(candidateSet)
      .filter((videoId) => !matchedIds.has(videoId))
      .map((videoId) => {
        const video = videos.find((v) => v.videoId === videoId)!;
        return { videoId: video.videoId, title: video.title };
      });

    return {
      songId: song.id,
      songTitle: song.title,
      matchedVideos,
      candidateVideos,
    };
  });
}

async function applyMappings(
  mappings: SongYoutubeVideoMatch[],
  dryRun: boolean,
) {
  const toInsert: Array<{ songId: number; youtubeVideoId: string }> = [];

  mappings.forEach((mapping) => {
    mapping.matchedVideos.forEach((video) => {
      toInsert.push({ songId: mapping.songId, youtubeVideoId: video.videoId });
    });
  });

  if (dryRun) {
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;

  for (const item of toInsert) {
    try {
      await prisma.songYoutubeVideo.upsert({
        where: {
          songId_youtubeVideoId: {
            songId: item.songId,
            youtubeVideoId: item.youtubeVideoId,
          },
        },
        update: {},
        create: item,
      });
      inserted += 1;
    } catch {
      skipped += 1;
    }
  }

  return { inserted, skipped };
}
