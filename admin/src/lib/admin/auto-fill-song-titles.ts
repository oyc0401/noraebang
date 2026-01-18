import { prisma } from "../prisma";

// autoFillSongTitles는 단일 아티스트의 곡에 대해 Spotify/곡 제목 정보를 기반으로 미채워진 언어별 제목 필드를 자동 보완합니다.

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

export interface AutoFillSongTitlesOptions {
  dryRun?: boolean;
}

type SongTitleChange = {
  songId: number;
  songTitle: string;
  field: TitleField;
  value: string;
  source: "spotifyTrackName" | "spotifyMusicBrainzTitle" | "songTitle";
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

  console.log(`  • Artist: ${artist.name} (${artist.nameKo ?? ""})`);
  console.log(`  • Songs: ${songs.length}`);

  if (songs.length === 0) {
    console.log(`  ⏭️ No songs`);
    return;
  }

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
