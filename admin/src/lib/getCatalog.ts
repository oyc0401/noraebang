export type Catalog = "JPOP" | "KPOP";

export type KnownArtist = {
  name: string | null;
  tjName: string | null;
  homeCatalog: string | null;
};

const JAPANESE_KANA = /[\u3040-\u309f\u30a0-\u30ff]/;
const KOREAN_HANGUL = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/;

export function getCatalog(
  title: string,
  artist: string | null,
  tjNumber?: string | number,
): Catalog | null {
  const text = `${title} ${artist ?? ""}`;

  if (JAPANESE_KANA.test(text)) {
    return "JPOP";
  }

  if (KOREAN_HANGUL.test(text)) {
    return "KPOP";
  }

  if (isStrongJpopNumberRange(tjNumber)) {
    return "JPOP";
  }

  return null;
}

// 가나/한글이 전혀 없는 제목(일본 엔카 가수가 한자만 쓰는 경우 등)을 위해
// 이미 home_catalog가 등록된 Artist와 대조해서 카탈로그를 보정한다.
export function findCatalogByKnownArtist(
  artist: string | null,
  knownArtists: KnownArtist[],
): Catalog | null {
  if (!artist) {
    return null;
  }

  const matched = knownArtists.find((known) =>
    [known.name, known.tjName].some(
      (knownName) =>
        knownName && knownName.length > 1 && artist.includes(knownName),
    ),
  );

  return (matched?.homeCatalog as Catalog | null) ?? null;
}

function isStrongJpopNumberRange(tjNumber: string | number | undefined) {
  if (tjNumber === undefined) {
    return false;
  }

  const number = Number(tjNumber);

  if (!Number.isInteger(number)) {
    return false;
  }

  return (
    (number >= 25000 && number <= 28999) ||
    (number >= 29801 && number <= 29999) ||
    (number >= 68000 && number <= 68999)
  );
}
