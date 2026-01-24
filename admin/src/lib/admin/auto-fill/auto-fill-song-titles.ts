import { prisma } from "../../prisma";
// autoFillSongTitles는 단일 아티스트의 곡에 대해 Spotify 트랙/유튜브 비디오/곡 제목 정보를 기반으로 미채워진 언어별 제목 필드를 자동 보완합니다.
// 프로세스:
//   1. 아티스트 곡 목록을 가져와 titleKo/titleJa/titleLatin 현재 값 확인
//   2. titleLatin이 "instrumental"을 포함하거나 각 필드가 언어 규칙에 맞지 않으면 먼저 null 처리
//   3. 곡별로 song title → Spotify track name (인기도 순) → musicBrainzTitle (트랙 인기 순) → YouTube title (조회수 순) 순으로 후보를 모음
//      - 언어 감지를 통해 해당 필드가 null일 때만 삽입하며, 기존 값이 있으면 삭제/대체하지 않음
//      - titleKo/titleJa 필드는 한국어·일본어가 섞여 있어도 허용되며, titleLatin만 한국어/일본어가 둘 다 없어야 함
//   4. dryRun이 아니면 DB에 반영하고 로그로 어떤 필드가 어떻게 바뀌었는지 출력

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
  value: string | null;
  source: TitleSource | "cleanup";
};

const hasKanji = (text: string) => /[\u4e00-\u9faf]/.test(text);

const hasKana = (text: string) => /[\u3040-\u309f\u30a0-\u30ff]/.test(text);

const hasJapanese = (text: string) => hasKana(text) || hasKanji(text);

const hasKorean = (text: string) =>
  /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(text); // 한글 음절, 자모, 호환 자모

const hasInstrumentalKeyword = (text: string) => /instrumental/i.test(text);

const detectLanguageField = (title: string): TitleField | null => {
  if (hasKorean(title)) return "titleKo";
  if (hasJapanese(title)) return "titleJa";
  return "titleLatin"; // 그 외는 모두 Latin
};

const isValidFieldValue = (field: TitleField, value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (field === "titleKo") {
    return hasKorean(trimmed);
  }

  if (field === "titleJa") {
    return hasJapanese(trimmed);
  }

  return !hasKorean(trimmed) && !hasJapanese(trimmed);
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
    const songRecord = song as SongRecord;

    const cleanupInstrumentalLatin = () => {
      const currentValue = songRecord.titleLatin;
      if (!currentValue) return;
      if (!hasInstrumentalKeyword(currentValue)) return;

      changes.push({
        songId: songRecord.id,
        songTitle: songRecord.title,
        field: "titleLatin",
        value: null,
        source: "cleanup",
      });
      songRecord.titleLatin = null;
      updatedSongIds.add(songRecord.id);
    };

    cleanupInstrumentalLatin();

    const cleanupFieldIfInvalid = (field: TitleField) => {
      const currentValue = songRecord[field];
      if (!currentValue) return;
      if (isValidFieldValue(field, currentValue)) return;

      changes.push({
        songId: songRecord.id,
        songTitle: songRecord.title,
        field,
        value: null,
        source: "cleanup",
      });
      songRecord[field] = null;
      updatedSongIds.add(songRecord.id);
    };

    cleanupFieldIfInvalid("titleKo");
    cleanupFieldIfInvalid("titleJa");
    cleanupFieldIfInvalid("titleLatin");

    const allTitles = collectAllTitles(songRecord);
    if (allTitles.length === 0) continue;

    // 각 필드별로 첫 번째로 매칭되는 소스를 사용 (우선순위 유지)
    const filledFields = new Set<TitleField>();

    for (const selected of allTitles) {
      const field = detectLanguageField(selected.value);
      if (!field) continue;

      // 이미 이 필드에 값이 있거나, 이번 루프에서 이미 채웠으면 스킵
      const currentValue = songRecord[field];
      if (currentValue) continue;
      if (filledFields.has(field)) continue;

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
    const renderedValue = change.value === null ? "null" : `"${change.value}"`;
    console.log(
      `    [Song #${change.songId}] ${change.field}=${renderedValue} (${change.source})`,
    );
  }

  console.log(`  • 결과: updated=${updatedSongIds.size}`);
}
