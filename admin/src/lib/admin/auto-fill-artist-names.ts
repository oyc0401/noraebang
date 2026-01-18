import { isKana } from "wanakana";

import { prisma } from "../prisma";

// autoFillArtistNames는 단일 아티스트에 대해 Spotify/토픽 채널 이름을 활용해 언어별 이름 필드를 자동 보완합니다.

type ArtistNameField = "nameLatin" | "nameJaKanji" | "nameJaKana" | "nameKo";

type ArtistRecord = {
  id: number;
  name: string;
  nameKo: string | null;
  nameLatin: string | null;
  nameJaKanji: string | null;
  nameJaKana: string | null;
  spotifyArtist: { name: string | null } | null;
  youtubeChannels: Array<{ title: string | null }>;
};

export interface AutoFillArtistNamesOptions {
  dryRun?: boolean;
}

type ArtistNameUpdate = {
  field: ArtistNameField;
  value: string;
  source: "spotify" | "artistName" | "topicChannel";
};

const removeSpecialChars = (text: string) =>
  text.replace(
    /[『』「」【】［］()（）[\]<>《》{}\s!@#$%^&*_+=|\\:;"',.<>?/~`-]/g,
    "",
  );

const isOnlyLatin = (text: string) => /^[a-zA-Z0-9]+$/.test(text);

const hasKanji = (text: string) => /[\u4e00-\u9faf]/.test(text);

const detectField = (name: string): ArtistNameField => {
  const cleaned = removeSpecialChars(name);

  if (isOnlyLatin(cleaned)) return "nameLatin";
  if (hasKanji(cleaned)) return "nameJaKanji";
  if (isKana(cleaned)) return "nameJaKana";
  return "nameKo";
};

export async function autoFillArtistNames(
  artistId: number,
  options: AutoFillArtistNamesOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  console.log(
    `\n👤 autoFillArtistNames → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      nameLatin: true,
      nameJaKanji: true,
      nameJaKana: true,
      spotifyArtist: { select: { name: true } },
      youtubeChannels: {
        where: { type: "TOPIC" },
        select: { title: true },
      },
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  console.log(`  • Artist: ${artist.name} (${artist.nameKo ?? ""})`);

  const updateData: Partial<Record<ArtistNameField, string>> = {};
  const updates: ArtistNameUpdate[] = [];

  const saveName = (
    name: string | null | undefined,
    source: ArtistNameUpdate["source"],
  ) => {
    if (!name) return;
    const field = detectField(name);

    const currentValue = (artist as Record<ArtistNameField, string | null>)[field];
    if (currentValue || updateData[field]) return;

    updateData[field] = name;
    updates.push({ field, value: name, source });
  };

  saveName(artist.spotifyArtist?.name, "spotify");
  saveName(artist.name, "artistName");

  const topicTitle = artist.youtubeChannels[0]?.title;
  if (topicTitle?.endsWith(" - Topic")) {
    saveName(topicTitle.replace(/ - Topic$/i, "").trim(), "topicChannel");
  }

  if (updates.length === 0) {
    console.log(`  ⏭️ No updates needed`);
    return;
  }

  for (const item of updates) {
    console.log(`    ${item.field}="${item.value}" (${item.source})`);
  }

  if (!dryRun) {
    await prisma.artist.update({
      where: { id: artist.id },
      data: updateData,
    });
  }

  console.log(`  • 결과: updated=${updates.length} fields`);
}
