import { prisma } from "../prisma";
import { findBestMatch } from "../song-spotify-matcher";

// autoFillSongTitles는 단일 아티스트의 곡에 대해 Spotify 트랙/유튜브 비디오/곡 제목 정보를 기반으로 미채워진 언어별 제목 필드를 자동 보완합니다.
// - 새 값이 기존 title들과 유사하면 (findBestMatch로 일치) 넣지 않음

type TitleField = "titleLatin" | "titleJa" | "titleKo";

type SongRecord = {
  id: number;
  title: string;
  titleLatin: string | null;
  titleJa: string | null;
  titleKo: string | null;
  spotifyTrackGroup: {
    tracks: Array<{
      name: string;
      musicBrainzTitle: string | null;
      popularity: number | null;
    }>;
  } | null;
  youtubeVideos: Array<{
    youtubeVideo: {
      title: string | null;
      viewCount: bigint | null;
    };
  }>;
};

export interface AutoFillSongTitlesOptions {
  dryRun?: boolean;
}

type TitleSource =
  | "spotifyTrackName"
  | "spotifyMusicBrainzTitle"
  | "youtubeVideoTitle"
  | "songTitle";

type SongTitleChange = {
  songId: number;
  songTitle: string;
  field: TitleField;
  value: string;
  source: TitleSource;
};

const hasJapanese = (text: string) =>
  /[\u3040-\u309f\u30a0-\u30ff]/.test(text); // 히라가나, 가타카나만 (한자 제외)

const hasKorean = (text: string) =>
  /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text); // 한글 음절, 자모

const detectLanguageField = (title: string): TitleField | null => {
  if (hasKorean(title)) return "titleKo";
  if (hasJapanese(title)) return "titleJa";
  return "titleLatin"; // 그 외는 모두 Latin
};

type SelectedTitle = {
  value: string;
  source: TitleSource;
};

/**
 * 모든 가능한 제목 소스를 수집 (중복 제거)
 */
const collectAllTitles = (song: SongRecord): SelectedTitle[] => {
  const results: SelectedTitle[] = [];
  const seen = new Set<string>();

  const add = (value: string | null | undefined, source: TitleSource) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    results.push({ value: trimmed, source });
  };

  // song title
  add(song.title, "songTitle");

  // musicBrainzTitle (가장 정확)
  for (const track of song.spotifyTrackGroup?.tracks ?? []) {
    add(track.musicBrainzTitle, "spotifyMusicBrainzTitle");
  }

  // spotify track name
  for (const track of song.spotifyTrackGroup?.tracks ?? []) {
    add(track.name, "spotifyTrackName");
  }

  // youtube video title
  for (const sv of song.youtubeVideos) {
    add(sv.youtubeVideo.title, "youtubeVideoTitle");
  }

  return results;
};

export async function autoFillSongTitles(
  artistId: number,
  options: AutoFillSongTitlesOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  console.log(
    `\n🎼 autoFillSongTitles → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
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
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      titleLatin: true,
      titleJa: true,
      titleKo: true,
      spotifyTrackGroup: {
        select: {
          tracks: {
            select: {
              name: true,
              musicBrainzTitle: true,
              popularity: true,
            },
            orderBy: { popularity: "desc" },
          },
        },
      },
      youtubeVideos: {
        select: {
          youtubeVideo: {
            select: {
              title: true,
              viewCount: true,
            },
          },
        },
        orderBy: { youtubeVideo: { viewCount: "desc" } },
      },
    },
  });

  console.log(`  • Artist: ${artist.name} (${artist.nameKo ?? ""})`);
  console.log(`  • Songs: ${songs.length}`);

  if (songs.length === 0) {
    console.log(`  ⏭️ No songs`);
    return;
  }

  const changes: SongTitleChange[] = [];
  const updatedSongIds = new Set<number>();

  for (const song of songs) {
    const allTitles = collectAllTitles(song as SongRecord);
    if (allTitles.length === 0) continue;

    // 각 필드별로 첫 번째로 매칭되는 소스를 사용 (우선순위 유지)
    const filledFields = new Set<TitleField>();

    for (const selected of allTitles) {
      const field = detectLanguageField(selected.value);
      if (!field) continue;

      // 이미 이 필드에 값이 있거나, 이번 루프에서 이미 채웠으면 스킵
      const currentValue = (song as Record<TitleField, string | null>)[field];
      if (currentValue) continue;
      if (filledFields.has(field)) continue;

      // 기존 title들과 비교해서 유사하면 넣지 않음
      const existingTitles = [song.title, song.titleKo, song.titleLatin, song.titleJa]
        .filter((t): t is string => Boolean(t?.trim()));

      if (existingTitles.length > 0) {
        const match = findBestMatch(selected.value, existingTitles);
        if (match.answer) {
          // 이미 유사한 제목이 있음 → skip
          continue;
        }
      }

      changes.push({
        songId: song.id,
        songTitle: song.title,
        field,
        value: selected.value,
        source: selected.source,
      });
      filledFields.add(field);
      updatedSongIds.add(song.id);
    }
  }

  if (changes.length === 0) {
    console.log(`  ⏭️ No updates needed`);
    return;
  }

  console.log(`  • Pending updates: ${changes.length}`);

  if (!dryRun) {
    for (const change of changes) {
      await prisma.song.update({
        where: { id: change.songId },
        data: { [change.field]: change.value },
      });
    }
  }

  for (const change of changes) {
    console.log(
      `    [Song #${change.songId}] ${change.field}="${change.value}" (${change.source})`,
    );
  }

  console.log(
    `  • 결과: updated=${updatedSongIds.size}`,
  );
}
