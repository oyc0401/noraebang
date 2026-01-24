import type { Provider } from "@prisma/client";
import { prisma } from "../../prisma";
import { calculateSongScore } from "../../song-score";

// updateSongScore는 특정 아티스트의 곡 score 필드를 Spotify/TJ/YouTube 지표 기반으로 계산해 저장합니다.

export interface UpdateSongScoreOptions {
  dryRun?: boolean;
}

type SongWithMetrics = {
  id: number;
  title: string;
  score: number | null;
  tjSongId: string | null;
  songSpotifyTracks: Array<{
    spotifyTrack: {
      popularity: number | null;
    } | null;
  }>;
  youtubeVideos: Array<{
    youtubeVideo: {
      viewCount: bigint | null;
    } | null;
  }>;
  karaokeSongs: Array<{
    provider: Provider;
  }>;
};

const hasTjMapping = (song: SongWithMetrics) =>
  !!song.tjSongId ||
  song.karaokeSongs.some((karaoke) => karaoke.provider === "TJ");

export async function updateSongScore(
  artistId: number,
  options: UpdateSongScoreOptions = {},
): Promise<void> {
  const { dryRun = false } = options;
  console.log(
    `\n🎚️ updateSongScore → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true, name: true, nameKo: true },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  const songs = (await prisma.song.findMany({
    where: {
      artistSongs: {
        some: { artistId },
      },
    },
    select: {
      id: true,
      title: true,
      score: true,
      tjSongId: true,
      karaokeSongs: {
        select: {
          provider: true,
        },
      },
      songSpotifyTracks: {
        select: {
          spotifyTrack: {
            select: {
              popularity: true,
            },
          },
        },
      },
      youtubeVideos: {
        select: {
          youtubeVideo: {
            select: {
              viewCount: true,
            },
          },
        },
      },
    },
  })) as SongWithMetrics[];

  console.log(`  • Artist: ${artist.name} (${artist.nameKo ?? ""})`);
  console.log(`  • Songs: ${songs.length}`);

  if (songs.length === 0) {
    console.log("  ⏭️  No songs found, skipping");
    return;
  }

  const updates = songs
    .map((song) => {
      const nextScore = calculateSongScore({
        spotifyPopularities: song.songSpotifyTracks.map(
          (entry) => entry.spotifyTrack?.popularity,
        ),
        youtubeViewCounts: song.youtubeVideos.map(
          (entry) => entry.youtubeVideo?.viewCount ?? 0n,
        ),
        hasTjSong: hasTjMapping(song),
      });
      const previous = song.score ?? null;
      const changed =
        previous === null || Math.abs(previous - nextScore) > 0.01;
      return {
        songId: song.id,
        title: song.title,
        previous,
        nextScore,
        changed,
      };
    })
    .filter((entry) => entry.changed);

  console.log(`  • Pending updates: ${updates.length}`);

  if (updates.length === 0) {
    console.log("  ✅  All scores up to date.");
    return;
  }

  console.log("  • Examples:");
  updates.slice(0, 5).forEach((entry) => {
    console.log(
      `    - ${entry.title} (#${entry.songId}): ${entry.previous ?? "∅"} → ${
        entry.nextScore
      }`,
    );
  });

  if (dryRun) {
    console.log("  🔎 Dry run enabled, no DB updates performed.");
    return;
  }

  await prisma.$transaction(
    updates.map((entry) =>
      prisma.song.update({
        where: { id: entry.songId },
        data: { score: entry.nextScore },
      }),
    ),
  );

  console.log("  💾 Scores updated successfully.");
}
