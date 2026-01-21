import { prisma } from "../prisma";
import { searchYoutubeVideos } from "../../thirdparty/youtube";
import { normalizeTitle } from "../track-title-normalizer";

// createSongFromTracksWithYoutubeSearch는 특정 아티스트의 인기도 50 이상인 미연결 SpotifyTrack에 대해
// 아티스트의 토픽 채널 목록에서 유튜브 검색을 수행하고,
// 검색 결과가 있으면 Song을 생성하고 SpotifyTrack과 YoutubeVideo를 연결합니다.

const TARGET_POPULARITY = 50;

type UnmappedTrack = {
  id: number;
  name: string;
  musicBrainzTitle: string | null;
  popularity: number | null;
  thumbnails: string[];
  artists: {
    spotifyArtist: {
      spotifyId: string;
    };
  }[];
};

type SongData = {
  id: number;
  title: string;
  titleKo: string | null;
  titleLatin: string | null;
  titleJa: string | null;
};

export interface CreateSongFromTracksWithYoutubeSearchOptions {
  dryRun?: boolean;
  maxTracks?: number;
}

export async function createSongFromTracksWithYoutubeSearch(
  artistId: number,
  options: CreateSongFromTracksWithYoutubeSearchOptions = {},
): Promise<void> {
  const { dryRun = false, maxTracks } = options;

  console.log(
    `\n🎵 createSongFromTracksWithYoutubeSearch → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  // 1. 아티스트 정보 조회
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
      homeCatalog: true,
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  if (!artist.spotifyId) {
    console.log(`  ⏭️ Artist has no spotifyId`);
    return;
  }

  const spotifyArtist = await prisma.spotifyArtist.findUnique({
    where: { spotifyId: artist.spotifyId },
    select: { id: true },
  });

  if (!spotifyArtist) {
    console.log(
      `  ⏭️ SpotifyArtist not found for spotifyId: ${artist.spotifyId}`,
    );
    return;
  }

  // 2. 아티스트의 토픽 채널 목록 조회
  const topicChannels = await prisma.youtubeChannel.findMany({
    where: { artistId, type: "TOPIC" },
    select: { channelId: true },
  });

  const topicChannelIds = topicChannels
    .map((c) => c.channelId)
    .filter((id): id is string => !!id);

  if (topicChannelIds.length === 0) {
    console.log(`  ⏭️ No topic channels found for artist`);
    return;
  }

  // 3. 아티스트의 기존 Song들 조회 (중복 생성 방지용)
  const existingSongs = await prisma.song.findMany({
    where: { artistSongs: { some: { artistId } } },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJa: true,
      spotifyTracks: {
        select: {
          name: true,
          musicBrainzTitle: true,
        },
      },
    },
  });

  // Song 제목 → Song 매핑 (중복 체크용)
  const normalizedToSong = new Map<string, SongData>();
  for (const song of existingSongs) {
    const titles = [song.title, song.titleKo, song.titleLatin, song.titleJa];
    song.spotifyTracks?.forEach((t) => {
      if (t.name) titles.push(t.name);
      if (t.musicBrainzTitle) titles.push(t.musicBrainzTitle);
    });
    for (const title of titles) {
      if (title?.trim()) {
        normalizedToSong.set(normalizeTitle(title), song);
      }
    }
  }

  // 4. 미연결 SpotifyTrack들 조회 (인기도 50 이상, 내림차순)
  const unmappedTracks = await prisma.spotifyTrack.findMany({
    where: {
      disabled: false,
      songs: { none: {} },
      popularity: { gte: TARGET_POPULARITY },
      artists: {
        some: { spotifyArtistId: spotifyArtist.id },
      },
    },
    select: {
      id: true,
      name: true,
      musicBrainzTitle: true,
      popularity: true,
      thumbnails: true,
      artists: {
        select: {
          spotifyArtist: {
            select: {
              spotifyId: true,
            },
          },
        },
      },
    },
    orderBy: { popularity: "desc" },
  });

  const tracksToProcess =
    typeof maxTracks === "number" && maxTracks > 0
      ? unmappedTracks.slice(0, maxTracks)
      : unmappedTracks;

  console.log(`  • Artist: ${artist.name} (${artist.nameKo})`);
  console.log(`  • Topic Channels: ${topicChannelIds.length}`);
  console.log(`  • Existing Songs: ${existingSongs.length}`);
  console.log(
    `  • Unmapped Tracks (popularity >= ${TARGET_POPULARITY}): ${unmappedTracks.length}`,
  );
  if (tracksToProcess.length !== unmappedTracks.length) {
    console.log(`  • Processing first ${tracksToProcess.length} tracks`);
  }

  if (tracksToProcess.length === 0) {
    console.log(`  ⏭️ No tracks to process`);
    return;
  }

  // 5. 각 트랙에 대해 유튜브 검색 및 Song 생성
  let songsCreated = 0;
  let tracksLinked = 0;
  let videosLinked = 0;
  let skipped = 0;
  let noResults = 0;
  let errors = 0;

  const processedNormalizedTitles = new Set<string>();

  for (const track of tracksToProcess) {
    try {
      const trackTitle = track.name;
      const normalizedTrackTitle = normalizeTitle(trackTitle);

      // 이미 Song에 존재하는지 확인
      if (normalizedToSong.has(normalizedTrackTitle)) {
        console.log(`  ⏭️ Skip (already exists): "${trackTitle}"`);
        skipped++;
        continue;
      }

      // 이번 루프에서 이미 처리한 제목인지 확인
      if (processedNormalizedTitles.has(normalizedTrackTitle)) {
        console.log(`  ⏭️ Skip (already processed): "${trackTitle}"`);
        skipped++;
        continue;
      }

      // 토픽 채널들에서 유튜브 검색
      const searchResult = await searchYoutubeVideosInChannels(
        trackTitle,
        topicChannelIds,
      );

      if (!searchResult) {
        console.log(`  ❌ No results: "${trackTitle}"`);
        noResults++;
        continue;
      }

      processedNormalizedTitles.add(normalizedTrackTitle);

      const { videoId, videoTitle, channelId } = searchResult;

      // 트랙의 각 SpotifyArtist에 대해 가장 곡이 많은 Artist 찾기
      const spotifyIds = track.artists.map((a) => a.spotifyArtist.spotifyId);
      const relatedArtists = await prisma.artist.findMany({
        where: { spotifyId: { in: spotifyIds } },
        select: {
          id: true,
          name: true,
          spotifyId: true,
          _count: { select: { artistSongs: true } },
        },
      });

      const spotifyIdToArtists = new Map<string, typeof relatedArtists>();
      for (const a of relatedArtists) {
        if (!a.spotifyId) continue;
        const list = spotifyIdToArtists.get(a.spotifyId) ?? [];
        list.push(a);
        spotifyIdToArtists.set(a.spotifyId, list);
      }

      const artistIdsToLink = new Set<number>();
      artistIdsToLink.add(artistId);

      for (const [, artists] of spotifyIdToArtists) {
        const sorted = artists.sort(
          (a, b) => b._count.artistSongs - a._count.artistSongs,
        );
        if (sorted[0]) {
          artistIdsToLink.add(sorted[0].id);
        }
      }

      const linkedArtists = relatedArtists.filter((a) =>
        artistIdsToLink.has(a.id),
      );

      const songTitle = track.musicBrainzTitle || track.name;
      const thumbnails = track.thumbnails ?? [];

      if (dryRun) {
        const artistNames = linkedArtists.map((a) => a.name).join(", ");
        console.log(
          `[DRY-RUN] ✅ Song 생성: "${songTitle}" <- Track ${track.id}, Video ${videoId}, Artists: [${artistNames}]`,
        );
        songsCreated++;
        continue;
      }

      // YoutubeVideo upsert (없으면 생성)
      await prisma.youtubeVideo.upsert({
        where: { videoId },
        update: {},
        create: {
          videoId,
          title: videoTitle,
          ownerChannelId: channelId,
        },
      });

      // Song 생성
      const newSong = await prisma.song.create({
        data: {
          title: songTitle,
          catalog: artist.homeCatalog,
          thumbnailDefault:
            thumbnails[2] ?? thumbnails[1] ?? thumbnails[0] ?? null,
          thumbnailMedium: thumbnails[1] ?? thumbnails[0] ?? null,
          thumbnailHigh: thumbnails[0] ?? null,
          artistSongs: {
            create: [...artistIdsToLink].map((id) => ({ artistId: id })),
          },
        },
      });

      if (linkedArtists.length > 1) {
        const artistNames = linkedArtists.map((a) => a.name).join(", ");
        console.log(`  ℹ️ 다중 아티스트 연결: [${artistNames}]`);
      }

      console.log(
        `✅ Song ${newSong.id} 생성: "${songTitle}" <- Video: ${videoId}`,
      );
      songsCreated++;

      // 트랙을 Song에 연결 (다대다)
      await prisma.songSpotifyTrack.create({
        data: {
          songId: newSong.id,
          spotifyTrackId: track.id,
        },
      });
      tracksLinked++;

      // 비디오를 Song에 연결
      await prisma.songYoutubeVideo.create({
        data: {
          songId: newSong.id,
          youtubeVideoId: videoId,
        },
      });
      videosLinked++;
    } catch (error) {
      console.error(
        `❌ Track ${track.id} 처리 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      errors++;
    }
  }

  console.log(`\n  • 결과:`);
  console.log(`    - Songs 생성: ${songsCreated}`);
  console.log(`    - Tracks 연결: ${tracksLinked}`);
  console.log(`    - Videos 연결: ${videosLinked}`);
  console.log(`    - 스킵: ${skipped}`);
  console.log(`    - 검색 결과 없음: ${noResults}`);
  console.log(`    - 오류: ${errors}`);
}

/**
 * 토픽 채널들에서 유튜브 검색 (첫 번째 결과 반환)
 */
async function searchYoutubeVideosInChannels(
  query: string,
  channelIds: string[],
): Promise<{ videoId: string; videoTitle: string; channelId: string } | null> {
  for (const channelId of channelIds) {
    try {
      const response = await searchYoutubeVideos(query, {
        channelId,
        maxResults: 1,
        filterToMusicCategory: true,
      });

      if (response.items.length > 0) {
        const item = response.items[0];
        const videoId = item.id?.videoId;
        const videoTitle = item.snippet?.title;

        if (videoId) {
          return {
            videoId,
            videoTitle: videoTitle ?? "(제목 없음)",
            channelId,
          };
        }
      }
    } catch (error) {
      console.error(
        `  ⚠️ Channel ${channelId} 검색 실패:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return null;
}
