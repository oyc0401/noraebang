/**
 * Artist의 Song과 YoutubeVideo(TOPIC 채널) 매칭
 *
 * 매칭 로직:
 * - 아티스트의 Song들과 TOPIC 채널의 YoutubeVideo들을 비교
 * - Song의 여러 제목들(title, titleKo, spotifyTrack.name, spotifyTrack.musicBrainzTitle)과
 *   YoutubeVideo.title을 findBestMatch로 비교
 * - O(nm) 복잡도 (n: Song 수, m: YoutubeVideo 수)
 *
 * 사용법:
 * pnpm ts-node src/scripts/youtube/map-song-youtube-video.ts <artistId>
 * pnpm ts-node src/scripts/youtube/map-song-youtube-video.ts <artistId> --dry-run
 * pnpm ts-node src/scripts/youtube/map-song-youtube-video.ts 3
 * pnpm ts-node src/scripts/youtube/map-song-youtube-video.ts 3 --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { findBestMatch } from "../../lib/song-spotify-matcher.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface SongWithTitles {
  id: number;
  title: string;
  titleKo: string | null;
  spotifyTitles: string[]; // SpotifyTrack.name들
  musicBrainzTitles: string[]; // SpotifyTrack.musicBrainzTitle들
}

interface YoutubeVideoInfo {
  videoId: string;
  title: string;
}

interface MappingResult {
  song: {
    id: number;
    title: string;
  };
  matchedVideos: Array<{
    videoId: string;
    title: string;
    matchedBy: string; // 어떤 필드로 매칭됐는지
  }>;
  candidateVideos: Array<{
    videoId: string;
    title: string;
  }>;
}

async function fetchArtistData(artistId: number) {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
  });

  if (!artist) {
    throw new Error(`Artist with ID ${artistId} not found`);
  }

  // 아티스트의 Song들 (SpotifyTrackGroup → SpotifyTrack 포함)
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

  // 아티스트의 TOPIC 채널의 YoutubeVideo들
  const topicChannels = await prisma.youtubeChannel.findMany({
    where: {
      artistId,
      type: "TOPIC",
    },
    select: {
      id: true,
      title: true,
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

  // Song 데이터 가공
  const songsWithTitles: SongWithTitles[] = songs.map((song) => {
    const spotifyTitles: string[] = [];
    const musicBrainzTitles: string[] = [];

    if (song.spotifyTrackGroup) {
      for (const track of song.spotifyTrackGroup.tracks) {
        if (track.name) spotifyTitles.push(track.name);
        if (track.musicBrainzTitle) musicBrainzTitles.push(track.musicBrainzTitle);
      }
    }

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      spotifyTitles: [...new Set(spotifyTitles)], // 중복 제거
      musicBrainzTitles: [...new Set(musicBrainzTitles)],
    };
  });

  // YoutubeVideo 데이터 가공 (중복 제거)
  const videoMap = new Map<string, YoutubeVideoInfo>();
  for (const channel of topicChannels) {
    for (const cv of channel.videos) {
      if (cv.youtubeVideo.title) {
        videoMap.set(cv.youtubeVideo.videoId, {
          videoId: cv.youtubeVideo.videoId,
          title: cv.youtubeVideo.title,
        });
      }
    }
  }
  const videos = Array.from(videoMap.values());

  return { artist, songs: songsWithTitles, videos };
}

function generateMapping(
  songs: SongWithTitles[],
  videos: YoutubeVideoInfo[],
): MappingResult[] {
  const results: MappingResult[] = [];
  const videoTitles = videos.map((v) => v.title);

  for (const song of songs) {
    const matchedVideos: MappingResult["matchedVideos"] = [];
    const candidateSet = new Set<string>(); // videoId로 중복 방지

    // 매칭 우선순위: musicBrainzTitle > spotifyTitle > title > titleKo
    const titleSources: Array<{ titles: string[]; source: string }> = [
      { titles: song.musicBrainzTitles, source: "musicBrainzTitle" },
      { titles: song.spotifyTitles, source: "spotifyTitle" },
      { titles: [song.title], source: "title" },
      { titles: song.titleKo ? [song.titleKo] : [], source: "titleKo" },
    ];

    for (const { titles, source } of titleSources) {
      for (const queryTitle of titles) {
        if (!queryTitle) continue;

        const result = findBestMatch(queryTitle, videoTitles);

        // answer가 있으면 매칭 추가
        if (result.answer) {
          const video = videos.find((v) => v.title === result.answer);
          if (video && !matchedVideos.find((m) => m.videoId === video.videoId)) {
            matchedVideos.push({
              videoId: video.videoId,
              title: video.title,
              matchedBy: `${source}: "${queryTitle}"`,
            });
          }
        }

        // candidate 수집
        for (const candidateTitle of result.candidate) {
          const video = videos.find((v) => v.title === candidateTitle);
          if (video) {
            candidateSet.add(video.videoId);
          }
        }
      }
    }

    // candidate에서 이미 매칭된 것 제외
    const matchedVideoIds = new Set(matchedVideos.map((m) => m.videoId));
    const candidateVideos = Array.from(candidateSet)
      .filter((videoId) => !matchedVideoIds.has(videoId))
      .map((videoId) => {
        const video = videos.find((v) => v.videoId === videoId)!;
        return { videoId: video.videoId, title: video.title };
      });

    results.push({
      song: { id: song.id, title: song.title },
      matchedVideos,
      candidateVideos,
    });
  }

  return results;
}

async function applyMapping(mappings: MappingResult[], dryRun: boolean) {
  const toInsert: Array<{ songId: number; youtubeVideoId: string }> = [];

  for (const mapping of mappings) {
    for (const video of mapping.matchedVideos) {
      toInsert.push({
        songId: mapping.song.id,
        youtubeVideoId: video.videoId,
      });
    }
  }

  if (dryRun) {
    console.log(`\n🔍 [DRY-RUN] Would insert ${toInsert.length} mappings`);
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
      inserted++;
    } catch (error) {
      skipped++;
    }
  }

  return { inserted, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const artistIdStr = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");

  if (!artistIdStr) {
    console.error("❌ Usage: pnpm ts-node src/scripts/youtube/map-song-youtube-video.ts <artistId> [--dry-run]");
    process.exit(1);
  }

  const artistId = Number.parseInt(artistIdStr, 10);
  if (Number.isNaN(artistId)) {
    console.error(`❌ Invalid artistId: ${artistIdStr}`);
    process.exit(1);
  }

  console.log(`\n📂 Fetching data for Artist ID ${artistId}...`);
  if (dryRun) console.log("🔍 DRY-RUN MODE\n");

  const { artist, songs, videos } = await fetchArtistData(artistId);

  console.log(`🎤 Artist: ${artist.name} (${artist.nameKo})`);
  console.log(`🎵 Songs: ${songs.length}`);
  console.log(`📺 TOPIC Videos: ${videos.length}\n`);

  if (videos.length === 0) {
    console.log("⚠️ No TOPIC channel videos found for this artist.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  // 매칭 생성
  console.log("🔍 Generating mappings...\n");
  const mappings = generateMapping(songs, videos);

  // 통계
  const withMatches = mappings.filter((m) => m.matchedVideos.length > 0);
  const withCandidates = mappings.filter((m) => m.candidateVideos.length > 0);
  const noMatches = mappings.filter(
    (m) => m.matchedVideos.length === 0 && m.candidateVideos.length === 0,
  );

  console.log("=".repeat(70));
  console.log("📊 Statistics:");
  console.log(`  ✅ Songs with matches: ${withMatches.length}`);
  console.log(`  🤔 Songs with candidates only: ${withCandidates.filter((m) => m.matchedVideos.length === 0).length}`);
  console.log(`  ❌ Songs without any matches: ${noMatches.length}`);
  console.log(`  📌 Total mappings to create: ${withMatches.reduce((sum, m) => sum + m.matchedVideos.length, 0)}`);
  console.log("=".repeat(70));

  // 샘플 출력
  console.log("\n✅ Sample mappings with matches (first 10):");
  withMatches.slice(0, 10).forEach((m, i) => {
    console.log(`\n${i + 1}. Song: "${m.song.title}" (ID: ${m.song.id})`);
    m.matchedVideos.forEach((v, j) => {
      console.log(`   ${j + 1}. Video: "${v.title}"`);
      console.log(`      Matched by: ${v.matchedBy}`);
    });
  });

  // 후보만 있는 것 샘플
  const candidatesOnly = withCandidates.filter((m) => m.matchedVideos.length === 0);
  if (candidatesOnly.length > 0) {
    console.log("\n\n🤔 Sample with candidates only (first 5):");
    candidatesOnly.slice(0, 5).forEach((m, i) => {
      console.log(`${i + 1}. Song: "${m.song.title}" (ID: ${m.song.id})`);
      console.log(`   Candidates: ${m.candidateVideos.slice(0, 3).map((v) => `"${v.title}"`).join(", ")}`);
    });
  }

  // DB에 적용
  console.log("\n");
  const { inserted, skipped } = await applyMapping(mappings, dryRun);

  if (!dryRun) {
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`⏭️ Skipped (already exists): ${skipped}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  prisma.$disconnect();
  pool.end();
  process.exit(1);
});
