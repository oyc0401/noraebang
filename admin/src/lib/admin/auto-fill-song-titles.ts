import { prisma } from "../prisma";

// autoFillSongTitles는 단일 아티스트의 곡에 대해 Spotify 트랙/유튜브 비디오/곡 제목 정보를 기반으로 미채워진 언어별 제목 필드를 자동 보완합니다.

type TitleField = "titleLatin" | "titleJaKanji" | "titleJaKana" | "titleKo";

type SongRecord = {
  id: number;
  title: string;
  titleLatin: string | null;
  titleJaKanji: string | null;
  titleJaKana: string | null;
  titleKo: string | null;
  spotifyTrackGroup: {
    tracks: Array<{
      name: string;
      musicBrainzTitle: string | null;
    }>;
  } | null;
  youtubeVideos: Array<{
    youtubeVideo: {
      title: string | null;
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
  value: string;
  source: TitleSource;
} | null;

const selectTitle = (song: SongRecord): SelectedTitle => {
  // 1순위: musicBrainzTitle (가장 정확한 제목)
  for (const track of song.spotifyTrackGroup?.tracks ?? []) {
    if (track.musicBrainzTitle?.trim()) {
      return { value: track.musicBrainzTitle, source: "spotifyMusicBrainzTitle" };
    }
  }

  // 2순위: spotify track name
  for (const track of song.spotifyTrackGroup?.tracks ?? []) {
    if (track.name?.trim()) {
      return { value: track.name, source: "spotifyTrackName" };
    }
  }

  // 3순위: youtube video title
  for (const sv of song.youtubeVideos) {
    if (sv.youtubeVideo.title?.trim()) {
      return { value: sv.youtubeVideo.title, source: "youtubeVideoTitle" };
    }
  }

  // 4순위: song title
  if (song.title?.trim()) {
    return { value: song.title, source: "songTitle" };
  }

  return null;
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
      titleJaKanji: true,
      titleJaKana: true,
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
      youtubeVideos: {
        select: {
          youtubeVideo: {
            select: {
              title: true,
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

  const changes: SongTitleChange[] = [];
  const updatedSongIds = new Set<number>();

  for (const song of songs) {
    const selected = selectTitle(song as SongRecord);
    if (!selected) continue;

    const field = detectLanguageField(selected.value);
    const currentValue = (song as Record<TitleField, string | null>)[field];
    if (currentValue) continue;

    changes.push({
      songId: song.id,
      songTitle: song.title,
      field,
      value: selected.value,
      source: selected.source,
    });
    updatedSongIds.add(song.id);
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
