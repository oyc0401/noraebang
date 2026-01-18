import { prisma } from "../prisma";

// autoFillSongTitles는 Spotify/곡 제목 정보를 기반으로 미채워진 언어별 제목 필드를 자동 보완합니다.

type TitleField = "titleLatin" | "titleJaKanji" | "titleJaKana" | "titleKo";

type SongRecord = {
  id: number;
  title: string;
  titleLatin: string | null;
  titleJaKanji: string | null;
  titleJaKana: string | null;
  titleKo: string | null;
  spotifyTrackGroup: {
    primaryTrack: {
      name: string | null;
      musicBrainzTitle: string | null;
    } | null;
  } | null;
};

export interface AutoFillSongTitlesRange {
  minArtistId?: number;
  maxArtistId: number;
}

export interface AutoFillSongTitlesOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export type SongTitleChange = {
  songId: number;
  songTitle: string;
  field: TitleField;
  value: string;
  source: "spotifyTrackName" | "spotifyMusicBrainzTitle" | "songTitle";
};

export interface AutoFillSongTitlesResult {
  maxArtistId: number;
  totalSongs: number;
  updatedSongs: number;
  fieldUpdates: Record<TitleField, number>;
  dryRun: boolean;
  changes: SongTitleChange[];
}

const LANGUAGE_FIELDS: TitleField[] = [
  "titleLatin",
  "titleJaKanji",
  "titleJaKana",
  "titleKo",
];

const removeSpecialChars = (text: string) =>
  text.replace(
    /[『』「」【】［］()（）[\]<>《》{}\s!@#$%^&*_+=|\\:;"',.<>?/~`-]/g,
    "",
  );

const isOnlyLatin = (text: string) => /^[a-zA-Z0-9]+$/.test(text);

const hasKanji = (text: string) => /[\u4e00-\u9faf]/.test(text);

const hasJapanese = (text: string) =>
  /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);

const detectLanguageField = (title: string): TitleField => {
  const cleaned = removeSpecialChars(title);

  if (isOnlyLatin(cleaned)) return "titleLatin";
  if (hasJapanese(cleaned)) {
    return hasKanji(cleaned) ? "titleJaKanji" : "titleJaKana";
  }
  return "titleKo";
};

type SelectedTitle = {
  value: string | null;
  source: SongTitleChange["source"] | null;
};

const selectTitle = (song: SongRecord): SelectedTitle => {
  const primary = song.spotifyTrackGroup?.primaryTrack;
  if (primary?.name) {
    return { value: primary.name, source: "spotifyTrackName" };
  }
  if (primary?.musicBrainzTitle) {
    return { value: primary.musicBrainzTitle, source: "spotifyMusicBrainzTitle" };
  }
  if (song.title) {
    return { value: song.title, source: "songTitle" };
  }
  return { value: null, source: null };
};

export async function autoFillSongTitles(
  range: AutoFillSongTitlesRange,
  options: AutoFillSongTitlesOptions = {},
): Promise<AutoFillSongTitlesResult> {
  const { dryRun = false, verbose = false } = options;
  const minArtistId = range.minArtistId ?? 1;
  const maxArtistId = range.maxArtistId;
  const emit = verbose ? console.log : () => {};

  emit(
    `\n🎼 autoFillSongTitles → artistId ${minArtistId}~${maxArtistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const songs = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: {
          artistId: { gte: minArtistId, lte: maxArtistId },
        },
      },
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      titleLatin: true,
      titleJaKanji: true,
      titleJaKana: true,
      titleKo: true,
      spotifyTrackGroup: {
        select: {
          primaryTrack: {
            select: {
              name: true,
              musicBrainzTitle: true,
            },
          },
        },
      },
    },
  });

  emit(`  • Loaded ${songs.length} songs`);

  const changes: SongTitleChange[] = [];
  const updatedSongIds = new Set<number>();

  for (const song of songs) {
    const { value, source } = selectTitle(song as SongRecord);
    if (!value || !source) continue;

    const field = detectLanguageField(value);
    const currentValue = (song as Record<TitleField, string | null>)[field];
    if (currentValue) continue;

    changes.push({
      songId: song.id,
      songTitle: song.title,
      field,
      value,
      source,
    });
    updatedSongIds.add(song.id);
  }

  emit(`  • Pending updates: ${changes.length}`);

  if (!dryRun && changes.length > 0) {
    for (const change of changes) {
      await prisma.song.update({
        where: { id: change.songId },
        data: { [change.field]: change.value },
      });
    }
    emit(`  • Updated ${updatedSongIds.size} songs`);
  } else if (dryRun) {
    emit("  • DRY-RUN: no database writes");
  }

  const fieldUpdates: Record<TitleField, number> = {
    titleLatin: 0,
    titleJaKanji: 0,
    titleJaKana: 0,
    titleKo: 0,
  };

  for (const change of changes) {
    emit(
      `  [Song #${change.songId}] ${change.field}="${change.value}" (${change.source})`,
    );
    fieldUpdates[change.field] += 1;
  }

  return {
    maxArtistId,
    totalSongs: songs.length,
    updatedSongs: updatedSongIds.size,
    fieldUpdates,
    dryRun,
    changes,
  };
}
