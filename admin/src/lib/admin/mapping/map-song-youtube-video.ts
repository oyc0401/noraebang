import { prisma } from "../../prisma";
import { findBestMatch } from "../../song-spotify-matcher";
import { normalizeTitle } from "../../track-title-normalizer";

// mapSongYoutubeVideo는 아티스트의 토픽 채널 영상 중 SongYoutubeVideo에 연결되지 않은 영상을 Song과 매칭합니다.
// - 영상 제목과 Song의 title/titleKo/titleLatin/titleJa/spotifyTitle/musicBrainzTitle 비교
// - 정규화 후 완전 일치 O(1) 먼저 시도, 실패시만 findBestMatch 호출

type SongData = {
  id: number;
  title: string;
  titleKo: string | null;
  titleLatin: string | null;
  titleJa: string | null;
};

type VideoData = {
  videoId: string;
  title: string;
};

type Mapping = {
  videoId: string;
  videoTitle: string;
  songId: number;
  songTitle: string;
};

export interface MapSongYoutubeVideoOptions {
  dryRun?: boolean;
}

export async function mapSongYoutubeVideo(
  artistId: number,
  options: MapSongYoutubeVideoOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  console.log(
    `\n🎬 mapSongYoutubeVideo → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true, name: true, nameKo: true },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  // 아티스트의 곡 조회
  const songs = await prisma.song.findMany({
    where: { artistSongs: { some: { artistId } } },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJa: true,
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

  // 토픽 채널의 영상 조회
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

  // 이미 연결된 영상 제외하고 미연결 영상만 추출
  const unmappedVideos: VideoData[] = [];
  const seenVideoId = new Set<string>();

  for (const channel of topicChannels) {
    for (const cv of channel.videos) {
      const video = cv.youtubeVideo;
      if (!video.title) continue;
      if (seenVideoId.has(video.videoId)) continue;
      if (video.songs.length > 0) continue; // 이미 연결됨
      seenVideoId.add(video.videoId);
      unmappedVideos.push({ videoId: video.videoId, title: video.title });
    }
  }

  console.log(`  • Artist: ${artist.name} (${artist.nameKo})`);
  console.log(
    `  • Songs: ${songs.length}, Unmapped Videos: ${unmappedVideos.length}`,
  );

  if (songs.length === 0 || unmappedVideos.length === 0) {
    console.log(`  ⏭️ No data to process`);
    return;
  }

  // 원본 title → Song 맵 (findBestMatch 결과 조회용)
  const titleToSong = new Map<string, SongData>();
  // 정규화된 title → Song 맵 (O(1) 완전 일치용)
  const normalizedToSong = new Map<string, SongData>();

  for (const song of songs) {
    const titles = [song.title, song.titleKo, song.titleLatin, song.titleJa];

    // spotify/musicBrainz title도 추가
    song.spotifyTrackGroup?.tracks.forEach((track) => {
      if (track.name?.trim()) titles.push(track.name);
      if (track.musicBrainzTitle?.trim()) titles.push(track.musicBrainzTitle);
    });

    for (const title of titles) {
      if (title?.trim()) {
        titleToSong.set(title, song);
        normalizedToSong.set(normalizeTitle(title), song);
      }
    }
  }
  const songTitleCandidates = [...titleToSong.keys()];

  // 각 비디오에 대해 매칭할 Song 찾기
  const mappings: Mapping[] = [];

  for (const video of unmappedVideos) {
    // O(1) 완전 일치 먼저 시도
    let matchedSong = normalizedToSong.get(normalizeTitle(video.title));

    // 실패시 findBestMatch (유사도 비교)
    if (!matchedSong) {
      const result = findBestMatch(video.title, songTitleCandidates);
      if (result.answer) {
        matchedSong = titleToSong.get(result.answer);
      }
    }

    if (matchedSong) {
      mappings.push({
        videoId: video.videoId,
        videoTitle: video.title,
        songId: matchedSong.id,
        songTitle:
          matchedSong.titleJa ||
          matchedSong.titleLatin ||
          matchedSong.titleKo ||
          matchedSong.title,
      });
    }
  }

  console.log(`  • Mappings: ${mappings.length}`);

  if (mappings.length === 0) {
    console.log(`  ⏭️ No mappings generated`);
    return;
  }

  // 매핑 적용
  let applied = 0;
  let errors = 0;

  for (const mapping of mappings) {
    try {
      if (dryRun) {
        console.log(
          `[DRY-RUN] Video "${mapping.videoTitle}" → Song ${mapping.songId} (${mapping.songTitle})`,
        );
        applied += 1;
      } else {
        await prisma.songYoutubeVideo.upsert({
          where: {
            songId_youtubeVideoId: {
              songId: mapping.songId,
              youtubeVideoId: mapping.videoId,
            },
          },
          update: {},
          create: {
            songId: mapping.songId,
            youtubeVideoId: mapping.videoId,
          },
        });
        console.log(
          `✅ Video "${mapping.videoTitle}" → Song ${mapping.songId}`,
        );
        applied += 1;
      }
    } catch (error) {
      console.error(
        `❌ Video ${mapping.videoId} 매핑 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      errors += 1;
    }
  }

  console.log(`  • 결과: applied=${applied}, errors=${errors}`);
}
