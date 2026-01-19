import { prisma } from "../prisma";
import { findBestMatch as findMatch } from "../song-spotify-matcher";
import { normalizeTitle } from "../track-title-normalizer";
import {
  searchUnlinkedSongYoutube,
  type SearchUnlinkedSongYoutubeOptions,
} from "./search-unlinked-song-youtube";

type UnmappedYoutubeVideo = {
  videoId: string;
  title: string;
};

type SongTopVideo = {
  songId: number;
  songTitle: string;
  candidates: Array<{
    videoId: string;
    videoTitle: string;
    priority: number;
  }>;
};

type SongVideoMapping = {
  songId: number;
  songTitle: string;
  matchedVideoId: string;
  matchedVideoTitle: string;
  searchVideoId: string;
  searchVideoTitle: string;
};

type VideoPool = {
  buckets: Map<string, UnmappedYoutubeVideo[]>;
  normalized: Map<string, Set<string>>;
  titles: string[];
  normalizedTitles: string[];
};

export interface MapSongYoutubeVideoFromSearchOptions
  extends SearchUnlinkedSongYoutubeOptions {
  dryRun?: boolean;
}

export async function mapSongYoutubeVideoFromSearch(
  artistId: number,
  options: MapSongYoutubeVideoFromSearchOptions = {},
): Promise<void> {
  const { dryRun = false, ...searchOptions } = options;

  console.log(
    `\n🧭 mapSongYoutubeVideoFromSearch → artistId=${artistId} ${
      dryRun ? "(dry-run)" : ""
    }`,
  );

  const [searchResult, unmappedVideos] = await Promise.all([
    searchUnlinkedSongYoutube(artistId, searchOptions),
    fetchArtistUnmappedVideos(artistId),
  ]);

  const topVideos = collectTopCandidates(searchResult.songs);

  console.log(
    `  • Artist: ${searchResult.artistName} (${searchResult.artistNameKo ?? "ko N/A"})`,
  );
  console.log(
    `  • Songs with search candidates: ${topVideos.length}/${searchResult.songs.length}`,
  );
  console.log(`  • Artist unmatched videos: ${unmappedVideos.length}`);

  if (topVideos.length === 0) {
    console.log("  ⏭️ No search candidates to process");
    return;
  }

  if (unmappedVideos.length === 0) {
    console.log("  ⏭️ No unmatched artist videos");
    return;
  }

  const pool = buildVideoPool(unmappedVideos);
  const mappings = matchSongsWithVideos(topVideos, pool);

  console.log(`  • Generated mappings: ${mappings.length}`);

  if (mappings.length === 0) {
    console.log("  ⏭️ No confident matches found");
    return;
  }

  let applied = 0;
  let errors = 0;

  for (const mapping of mappings) {
    try {
      if (dryRun) {
        console.log(
          `[DRY-RUN] Song ${mapping.songId} "${mapping.songTitle}" ← Video ${mapping.matchedVideoId} "${mapping.matchedVideoTitle}" (query="${mapping.searchVideoTitle}")`,
        );
        applied += 1;
      } else {
        await prisma.songYoutubeVideo.upsert({
          where: {
            songId_youtubeVideoId: {
              songId: mapping.songId,
              youtubeVideoId: mapping.matchedVideoId,
            },
          },
          update: {},
          create: {
            songId: mapping.songId,
            youtubeVideoId: mapping.matchedVideoId,
          },
        });
        console.log(
          `✅ Song ${mapping.songId} "${mapping.songTitle}" ← Video ${mapping.matchedVideoId} "${mapping.matchedVideoTitle}" (query="${mapping.searchVideoTitle}")`,
        );
        applied += 1;
      }
    } catch (error) {
      console.error(
        `❌ Failed to map song ${mapping.songId} with video ${mapping.matchedVideoId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      errors += 1;
    }
  }

  console.log(`  • Result: applied=${applied}, errors=${errors}`);
}

function collectTopCandidates(
  songs: {
    songId: number;
    songTitle: string;
    videos: { videoId: string; videoName: string }[];
  }[],
  maxCandidates = 5,
): SongTopVideo[] {
  const results: SongTopVideo[] = [];
  for (const song of songs) {
    const candidates = song.videos
      .slice(0, maxCandidates)
      .map((video, index) => ({
        videoId: video.videoId,
        videoTitle: video.videoName?.trim() ?? "",
        priority: index + 1,
      }))
      .filter((candidate) => candidate.videoTitle.length > 0);

    if (candidates.length === 0) continue;

    results.push({
      songId: song.songId,
      songTitle: song.songTitle,
      candidates,
    });
  }
  return results;
}

async function fetchArtistUnmappedVideos(
  artistId: number,
): Promise<UnmappedYoutubeVideo[]> {
  const channels = await prisma.youtubeChannel.findMany({
    where: { artistId },
    select: {
      videos: {
        select: {
          youtubeVideo: {
            select: {
              videoId: true,
              title: true,
              songs: { select: { songId: true } },
            },
          },
        },
      },
    },
  });

  const seen = new Set<string>();
  const unmapped: UnmappedYoutubeVideo[] = [];

  for (const channel of channels) {
    for (const videoItem of channel.videos) {
      const video = videoItem.youtubeVideo;
      if (seen.has(video.videoId)) continue;
      seen.add(video.videoId);
      if (!video.title?.trim()) continue;
      if (video.songs.length > 0) continue;
      unmapped.push({
        videoId: video.videoId,
        title: video.title.trim(),
      });
    }
  }

  return unmapped;
}

function buildVideoPool(videos: UnmappedYoutubeVideo[]): VideoPool {
  const buckets = new Map<string, UnmappedYoutubeVideo[]>();
  const normalized = new Map<string, Set<string>>();
  const titles: string[] = [];
  const normalizedTitles: string[] = [];

  for (const video of videos) {
    if (!video.title) continue;
    const title = video.title.trim();
    if (!title) continue;

    if (!buckets.has(title)) {
      buckets.set(title, []);
      titles.push(title);
      normalizedTitles.push(normalizeTitle(title));
    }
    buckets.get(title)!.push(video);

    const normalizedTitle = normalizeTitle(title);
    const key = normalizedTitle ?? "";
    const set = normalized.get(key) ?? new Set<string>();
    set.add(title);
    normalized.set(key, set);
  }

  return { buckets, normalized, titles, normalizedTitles };
}

function matchSongsWithVideos(
  songs: SongTopVideo[],
  pool: VideoPool,
): SongVideoMapping[] {
  const mappings: SongVideoMapping[] = [];

  for (const song of songs) {
    if (pool.titles.length === 0) break;

    let matchedVideo: UnmappedYoutubeVideo | null = null;
    let usedCandidate: SongTopVideo["candidates"][number] | null = null;

    for (const candidate of song.candidates) {
      if (pool.titles.length === 0) break;
      matchedVideo = matchCandidateWithVideos(candidate.videoTitle, pool);
      if (matchedVideo) {
        usedCandidate = candidate;
        break;
      }
    }

    if (matchedVideo && usedCandidate) {
      mappings.push({
        songId: song.songId,
        songTitle: song.songTitle,
        matchedVideoId: matchedVideo.videoId,
        matchedVideoTitle: matchedVideo.title,
        searchVideoId: usedCandidate.videoId,
        searchVideoTitle: usedCandidate.videoTitle,
      });
    }
  }

  return mappings;
}

function matchCandidateWithVideos(
  candidateTitle: string,
  pool: VideoPool,
): UnmappedYoutubeVideo | null {
  const normalizedQuery = normalizeTitle(candidateTitle);
  let matchedVideo: UnmappedYoutubeVideo | null = null;

  if (normalizedQuery) {
    matchedVideo = matchByNormalizedTitle(normalizedQuery, pool);
  }

  if (!matchedVideo && normalizedQuery) {
    matchedVideo = matchByFuzzyNormalizedTitle(normalizedQuery, pool);
  }

  return matchedVideo;
}

function matchByNormalizedTitle(
  normalizedQuery: string,
  pool: VideoPool,
): UnmappedYoutubeVideo | null {
  const candidates = pool.normalized.get(normalizedQuery);
  if (!candidates || candidates.size === 0) return null;

  for (const title of Array.from(candidates)) {
    const matched = takeVideoFromPool(title, pool);
    if (matched) return matched;
  }

  return null;
}

function matchByFuzzyNormalizedTitle(
  normalizedQuery: string,
  pool: VideoPool,
): UnmappedYoutubeVideo | null {
  if (!normalizedQuery) return null;
  if (pool.normalizedTitles.length === 0) return null;

  const result = findMatch(normalizedQuery, pool.normalizedTitles);
  if (result.answer) {
    return takeVideoByNormalizedTitle(result.answer, pool);
  }

  // console.log(result.candidate);

  return null;
}

function takeVideoFromPool(
  title: string,
  pool: VideoPool,
): UnmappedYoutubeVideo | null {
  const bucket = pool.buckets.get(title);
  if (!bucket || bucket.length === 0) return null;

  const video = bucket.shift()!;

  if (bucket.length === 0) {
    pool.buckets.delete(title);
    const idx = pool.titles.indexOf(title);
    if (idx >= 0) {
      pool.titles.splice(idx, 1);
      pool.normalizedTitles.splice(idx, 1);
    }
  }

  const normalized = normalizeTitle(title);
  if (normalized) {
    const set = pool.normalized.get(normalized);
    if (set) {
      set.delete(title);
      if (set.size === 0) {
        pool.normalized.delete(normalized);
      }
    }
  }

  return video;
}

function takeVideoByNormalizedTitle(
  normalizedTitle: string,
  pool: VideoPool,
): UnmappedYoutubeVideo | null {
  const candidates = pool.normalized.get(normalizedTitle);
  if (!candidates || candidates.size === 0) return null;

  for (const title of Array.from(candidates)) {
    const matched = takeVideoFromPool(title, pool);
    if (matched) return matched;
  }

  return null;
}
