import { prisma } from "../prisma";

// updateSongThumbnails는 단일 아티스트의 곡 썸네일을 Spotify/YouTube 정보로 보완합니다.

type ThumbTriple = {
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
};

type SongRecord = {
  id: number;
  title: string;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
  spotifyTrackGroup: {
    tracks: Array<{
      releaseDate: string | null;
      thumbnails: string[];
    }>;
  } | null;
  youtubeVideos: Array<{
    youtubeVideo: {
      videoId: string;
      viewCount: bigint | null;
      thumbnailDefault: string | null;
      thumbnailMedium: string | null;
      thumbnailHigh: string | null;
    };
  }>;
};

export interface UpdateSongThumbnailsOptions {
  dryRun?: boolean;
}

const sameThumbs = (a: ThumbTriple, b: ThumbTriple) =>
  (a.thumbnailDefault ?? null) === (b.thumbnailDefault ?? null) &&
  (a.thumbnailMedium ?? null) === (b.thumbnailMedium ?? null) &&
  (a.thumbnailHigh ?? null) === (b.thumbnailHigh ?? null);

const pickSpotifyThumbnails = (urls: string[]): ThumbTriple | null => {
  const cleaned = (urls ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  const high = cleaned[0] ?? null;
  const medium = cleaned[1] ?? cleaned[0] ?? null;
  const def = cleaned[2] ?? cleaned[1] ?? cleaned[0] ?? null;
  return {
    thumbnailDefault: def,
    thumbnailMedium: medium,
    thumbnailHigh: high,
  };
};

const pickYoutubeThumbs = (input: ThumbTriple): ThumbTriple | null => {
  const high = (input.thumbnailHigh ?? "").trim() || null;
  const medium = (input.thumbnailMedium ?? "").trim() || high || null;
  const def = (input.thumbnailDefault ?? "").trim() || medium || high || null;
  if (!def && !medium && !high) return null;
  return {
    thumbnailDefault: def,
    thumbnailMedium: medium,
    thumbnailHigh: high,
  };
};

const releaseKey = (releaseDate: string | null) => {
  const s = (releaseDate ?? "").trim();
  if (!s) return "9999-99-99";
  return s.slice(0, 10);
};

const pickOldestTrackWithThumbs = (
  tracks: SongRecord["spotifyTrackGroup"]["tracks"],
): { thumbnails: string[] } | null => {
  if (!tracks?.length) return null;
  const candidates = tracks
    .map((track) => ({
      key: releaseKey(track.releaseDate),
      thumbnails: track.thumbnails ?? [],
    }))
    .filter((t) => t.thumbnails.some((x) => (x ?? "").trim()));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.key.localeCompare(b.key));
  return { thumbnails: candidates[0]!.thumbnails };
};

export async function updateSongThumbnails(
  artistId: number,
  options: UpdateSongThumbnailsOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  console.log(
    `\n🖼  updateSongThumbnails → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true, name: true, nameKo: true },
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
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      spotifyTrackGroup: {
        select: {
          tracks: {
            select: {
              releaseDate: true,
              thumbnails: true,
            },
          },
        },
      },
      youtubeVideos: {
        select: {
          youtubeVideo: {
            select: {
              videoId: true,
              viewCount: true,
              thumbnailDefault: true,
              thumbnailMedium: true,
              thumbnailHigh: true,
            },
          },
        },
      },
    },
  });

  console.log(`  • Artist: ${artist.name} (${artist.nameKo ?? ""})`);
  console.log(`  • Songs: ${songs.length}`);

  if (songs.length === 0) {
    console.log(`  ⏭️ No songs`);
    return;
  }

  let updated = 0;
  let updatedBySpotifyOldest = 0;
  let updatedByYoutube = 0;
  let unchanged = 0;
  let skippedNoSource = 0;

  const updates: Array<{
    songId: number;
    next: ThumbTriple;
    source: "spotifyOldest" | "youtube";
  }> = [];

  songs.forEach((song) => {
    const current: ThumbTriple = {
      thumbnailDefault: song.thumbnailDefault ?? null,
      thumbnailMedium: song.thumbnailMedium ?? null,
      thumbnailHigh: song.thumbnailHigh ?? null,
    };

    const tracks = song.spotifyTrackGroup?.tracks ?? [];
    const oldest = pickOldestTrackWithThumbs(tracks);

    if (oldest) {
      const picked = pickSpotifyThumbnails(oldest.thumbnails);
      if (picked) {
        if (sameThumbs(current, picked)) unchanged += 1;
        else {
          updates.push({
            songId: song.id,
            next: picked,
            source: "spotifyOldest",
          });
        }
        return;
      }
    }

    const youtubeCandidates =
      song.youtubeVideos
        ?.map((item) => item.youtubeVideo)
        .filter(Boolean)
        .sort(
          (a, b) => Number(b.viewCount ?? 0n) - Number(a.viewCount ?? 0n),
        ) ?? [];

    if (youtubeCandidates.length === 0) {
      skippedNoSource += 1;
      return;
    }

    const pickedYoutube = pickYoutubeThumbs({
      thumbnailDefault: youtubeCandidates[0]!.thumbnailDefault ?? null,
      thumbnailMedium: youtubeCandidates[0]!.thumbnailMedium ?? null,
      thumbnailHigh: youtubeCandidates[0]!.thumbnailHigh ?? null,
    });

    if (!pickedYoutube) {
      skippedNoSource += 1;
      return;
    }

    if (sameThumbs(current, pickedYoutube)) {
      unchanged += 1;
      return;
    }

    updates.push({
      songId: song.id,
      next: pickedYoutube,
      source: "youtube",
    });
  });

  if (!dryRun && updates.length > 0) {
    for (const update of updates) {
      await prisma.song.update({
        where: { id: update.songId },
        data: {
          thumbnailDefault: update.next.thumbnailDefault,
          thumbnailMedium: update.next.thumbnailMedium,
          thumbnailHigh: update.next.thumbnailHigh,
        },
      });
      updated += 1;
      if (update.source === "spotifyOldest") updatedBySpotifyOldest += 1;
      else updatedByYoutube += 1;
    }
  } else if (dryRun) {
    updated = updates.length;
    updatedBySpotifyOldest = updates.filter(
      (item) => item.source === "spotifyOldest",
    ).length;
    updatedByYoutube = updates.filter(
      (item) => item.source === "youtube",
    ).length;
  }

  console.log(
    `  • 결과: updated=${updated}, spotify=${updatedBySpotifyOldest}, youtube=${updatedByYoutube}, unchanged=${unchanged}, skipped=${skippedNoSource}`,
  );
}
