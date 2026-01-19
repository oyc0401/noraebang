import { prisma } from "../prisma";
import { findBestMatch } from "../song-spotify-matcher";
import { normalizeTitle } from "../track-title-normalizer";

// createSongFromUnmappedTracks는 아티스트의 미연결 SpotifyTrack들 중에서
// 해당 아티스트의 YoutubeVideo와 매칭되지만 Song이 없는 경우, Song을 생성하고
// 해당 SpotifyTrack과 YoutubeVideo를 연결합니다.
// 추가로 생성된 Song에 대해 inst, remix 등 관련 버전도 연결합니다.

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

type UnmappedVideo = {
  videoId: string;
  title: string;
};

type SongData = {
  id: number;
  title: string;
  titleKo: string | null;
  titleLatin: string | null;
  titleJa: string | null;
};

export interface CreateSongFromUnmappedTracksOptions {
  dryRun?: boolean;
}

export async function createSongFromUnmappedTracks(
  artistId: number,
  options: CreateSongFromUnmappedTracksOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  console.log(
    `\n🎵 createSongFromUnmappedTracks → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
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

  // 2. 아티스트의 기존 Song들 조회 (중복 생성 방지용)
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

  // 3. 미연결 SpotifyTrack들 조회 (인기도 50 이상, 내림차순)
  const unmappedTracks = await prisma.spotifyTrack.findMany({
    where: {
      disabled: false,
      songId: null,
      popularity: { gte: 40 },
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

  // 4. 아티스트의 토픽 채널 YoutubeVideo 조회 (Song에 연결되지 않은 것)
  const topicChannels = await prisma.youtubeChannel.findMany({
    where: { artistId, type: "TOPIC" },
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

  const unmappedVideos: UnmappedVideo[] = [];
  const allVideos: UnmappedVideo[] = []; // Song 연결용 전체 비디오
  const seenVideoId = new Set<string>();

  for (const channel of topicChannels) {
    for (const cv of channel.videos) {
      const video = cv.youtubeVideo;
      if (!video.title) continue;
      if (seenVideoId.has(video.videoId)) continue;
      seenVideoId.add(video.videoId);
      allVideos.push({ videoId: video.videoId, title: video.title });
      if (video.songs.length === 0) {
        unmappedVideos.push({ videoId: video.videoId, title: video.title });
      }
    }
  }

  console.log(`  • Artist: ${artist.name} (${artist.nameKo})`);
  console.log(`  • Existing Songs: ${existingSongs.length}`);
  console.log(`  • Unmapped Tracks: ${unmappedTracks.length}`);
  // console.log(`  • Unmapped Tracks:`, unmappedTracks);
  console.log(`  • Unmapped Videos: ${unmappedVideos.length}`);

  if (unmappedTracks.length === 0 || unmappedVideos.length === 0) {
    console.log(`  ⏭️ No data to process`);
    return;
  }

  // 5. 비디오 제목으로 매핑 준비
  const videoTitleToVideo = new Map<string, UnmappedVideo>();
  const normalizedVideoToVideo = new Map<string, UnmappedVideo>();
  for (const video of unmappedVideos) {
    videoTitleToVideo.set(video.title, video);
    normalizedVideoToVideo.set(normalizeTitle(video.title), video);
  }
  const videoTitleCandidates = [...videoTitleToVideo.keys()];

  // 6. 각 미연결 트랙에 대해 매칭되는 비디오 찾기
  type TrackVideoMatch = {
    track: UnmappedTrack;
    video: UnmappedVideo;
  };

  const trackVideoMatches: TrackVideoMatch[] = [];
  const processedVideoIds = new Set<string>();
  const processedNormalizedTitles = new Set<string>();

  for (const track of unmappedTracks) {
    // musicBrainzTitle과 name 둘 다 시도
    const titlesToTry = [track.musicBrainzTitle, track.name].filter(
      (t): t is string => !!t,
    );

    let matchedVideo: UnmappedVideo | undefined;

    for (const trackTitle of titlesToTry) {
      const normalizedTrackTitle = normalizeTitle(trackTitle);

      // 이미 Song에 존재하는지 확인 (기존 Song)
      if (normalizedToSong.has(normalizedTrackTitle)) {
        matchedVideo = undefined;
        break; // 이미 존재하면 이 트랙 전체 스킵
      }

      // 이번 루프에서 이미 처리 예정인 제목인지 확인
      if (processedNormalizedTitles.has(normalizedTrackTitle)) {
        matchedVideo = undefined;
        break;
      }

      // O(1) 완전 일치 먼저 시도
      matchedVideo = normalizedVideoToVideo.get(normalizedTrackTitle);

      // 실패시 findBestMatch
      if (!matchedVideo) {
        const result = findBestMatch(trackTitle, videoTitleCandidates);
        if (result.answer) {
          matchedVideo = videoTitleToVideo.get(result.answer);
        }
      }

      if (matchedVideo) {
        break;
      }
    }

    if (matchedVideo && !processedVideoIds.has(matchedVideo.videoId)) {
      processedVideoIds.add(matchedVideo.videoId);
      // 모든 제목 변형을 처리됨으로 표시
      for (const t of titlesToTry) {
        processedNormalizedTitles.add(normalizeTitle(t));
      }
      trackVideoMatches.push({ track, video: matchedVideo });
    }
  }

  console.log(`  • Track-Video Matches: ${trackVideoMatches.length}`);

  if (trackVideoMatches.length === 0) {
    console.log(`  ⏭️ No new matches found`);
    return;
  }

  // 7. 매칭된 각 쌍에 대해 Song 생성 및 연결
  let songsCreated = 0;
  let tracksLinked = 0;
  let videosLinked = 0;
  let errors = 0;

  for (const { track, video } of trackVideoMatches) {
    try {
      const songTitle = track.musicBrainzTitle || track.name;
      const thumbnails = track.thumbnails ?? [];

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

      // 각 SpotifyArtist별로 곡이 가장 많은 Artist 선택
      const spotifyIdToArtists = new Map<string, typeof relatedArtists>();
      for (const a of relatedArtists) {
        if (!a.spotifyId) continue;
        const list = spotifyIdToArtists.get(a.spotifyId) ?? [];
        list.push(a);
        spotifyIdToArtists.set(a.spotifyId, list);
      }

      const artistIdsToLink = new Set<number>();
      artistIdsToLink.add(artistId); // 현재 아티스트는 항상 포함

      for (const [, artists] of spotifyIdToArtists) {
        // 곡 수 기준 내림차순 정렬 후 첫 번째 선택
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

      if (dryRun) {
        const artistNames = linkedArtists.map((a) => a.name).join(", ");
        console.log(
          `[DRY-RUN] ✅ Song 생성: "${songTitle}" <- Track ${track.id}, Video ${video.videoId}, Artists: [${artistNames}]`,
        );
        songsCreated++;
        continue;
      }

      // Song 생성 (선택된 아티스트들만 연결)
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

      console.log(`✅ Song ${newSong.id} 생성: "${songTitle}"`);
      songsCreated++;

      // 트랙을 Song에 연결 (songId 설정)
      await prisma.spotifyTrack.update({
        where: { id: track.id },
        data: { songId: newSong.id },
      });
      tracksLinked++;

      // 비디오를 Song에 연결
      await prisma.songYoutubeVideo.create({
        data: {
          songId: newSong.id,
          youtubeVideoId: video.videoId,
        },
      });
      videosLinked++;

      // 8. 관련 트랙들 찾아서 연결 (inst, remix 등)
      const linkedTracks = await linkRelatedTracks(
        newSong.id,
        songTitle,
        unmappedTracks,
        track.id,
        dryRun,
      );
      tracksLinked += linkedTracks;

      // 9. 관련 비디오들 찾아서 연결
      const linkedVideos = await linkRelatedVideos(
        newSong.id,
        songTitle,
        allVideos,
        video.videoId,
        dryRun,
      );
      videosLinked += linkedVideos;
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
  console.log(`    - 오류: ${errors}`);
}

/**
 * 생성된 Song에 관련 SpotifyTrack들을 연결 (inst, remix 등)
 */
async function linkRelatedTracks(
  songId: number,
  songTitle: string,
  unmappedTracks: UnmappedTrack[],
  excludeTrackId: number,
  dryRun: boolean,
): Promise<number> {
  const trackTitleToTrack = new Map<string, UnmappedTrack>();
  const normalizedToTrack = new Map<string, UnmappedTrack>();

  for (const track of unmappedTracks) {
    if (track.id === excludeTrackId) continue;
    const title = track.musicBrainzTitle || track.name;
    trackTitleToTrack.set(title, track);
    normalizedToTrack.set(normalizeTitle(title), track);
  }

  const trackTitleCandidates = [...trackTitleToTrack.keys()];
  const result = findBestMatch(songTitle, trackTitleCandidates);

  let linkedCount = 0;

  if (result.answer) {
    const matchedTrack = trackTitleToTrack.get(result.answer);
    if (matchedTrack) {
      if (dryRun) {
        console.log(`  [DRY-RUN] 관련 트랙 연결: "${matchedTrack.name}"`);
      } else {
        await prisma.spotifyTrack.update({
          where: { id: matchedTrack.id },
          data: { songId },
        });
        console.log(`  ✅ 관련 트랙 연결: "${matchedTrack.name}"`);
      }
      linkedCount++;
    }
  }

  for (const candidateTitle of result.candidate) {
    const matchedTrack = trackTitleToTrack.get(candidateTitle);
    if (matchedTrack) {
      if (dryRun) {
        console.log(`  [DRY-RUN] 관련 트랙(후보) 연결: "${matchedTrack.name}"`);
      } else {
        await prisma.spotifyTrack.update({
          where: { id: matchedTrack.id },
          data: { songId },
        });
        console.log(`  ✅ 관련 트랙(후보) 연결: "${matchedTrack.name}"`);
      }
      linkedCount++;
    }
  }

  return linkedCount;
}

/**
 * 생성된 Song에 관련 YoutubeVideo들을 연결
 */
async function linkRelatedVideos(
  songId: number,
  songTitle: string,
  allVideos: UnmappedVideo[],
  excludeVideoId: string,
  dryRun: boolean,
): Promise<number> {
  const videoTitleToVideo = new Map<string, UnmappedVideo>();

  for (const video of allVideos) {
    if (video.videoId === excludeVideoId) continue;
    videoTitleToVideo.set(video.title, video);
  }

  const videoTitleCandidates = [...videoTitleToVideo.keys()];
  const result = findBestMatch(songTitle, videoTitleCandidates);

  let linkedCount = 0;

  if (result.answer) {
    const matchedVideo = videoTitleToVideo.get(result.answer);
    if (matchedVideo) {
      if (dryRun) {
        console.log(`  [DRY-RUN] 관련 비디오 연결: "${matchedVideo.title}"`);
      } else {
        try {
          await prisma.songYoutubeVideo.upsert({
            where: {
              songId_youtubeVideoId: {
                songId,
                youtubeVideoId: matchedVideo.videoId,
              },
            },
            update: {},
            create: {
              songId,
              youtubeVideoId: matchedVideo.videoId,
            },
          });
          console.log(`  ✅ 관련 비디오 연결: "${matchedVideo.title}"`);
          linkedCount++;
        } catch {
          // 이미 연결된 경우 무시
        }
      }
    }
  }

  for (const candidateTitle of result.candidate) {
    const matchedVideo = videoTitleToVideo.get(candidateTitle);
    if (matchedVideo) {
      if (dryRun) {
        console.log(
          `  [DRY-RUN] 관련 비디오(후보) 연결: "${matchedVideo.title}"`,
        );
      } else {
        try {
          await prisma.songYoutubeVideo.upsert({
            where: {
              songId_youtubeVideoId: {
                songId,
                youtubeVideoId: matchedVideo.videoId,
              },
            },
            update: {},
            create: {
              songId,
              youtubeVideoId: matchedVideo.videoId,
            },
          });
          console.log(`  ✅ 관련 비디오(후보) 연결: "${matchedVideo.title}"`);
          linkedCount++;
        } catch {
          // 이미 연결된 경우 무시
        }
      }
    }
  }

  return linkedCount;
}
