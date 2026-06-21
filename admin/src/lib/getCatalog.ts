export type Catalog = "JPOP" | "KPOP" | "POP" | "CPOP";

export type KnownArtist = {
  name: string | null;
  nameJa: string | null;
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

  if (isStrongKpopNumberRange(tjNumber)) {
    return "KPOP";
  }

  if (isInNumberRanges(tjNumber, POP_NUMBER_RANGES)) {
    return "POP";
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

  const normalizedArtist = normalizeName(artist);
  const matched = knownArtists.find((known) =>
    [known.name, known.nameJa, known.tjName].some((knownName) =>
      isArtistMatch(knownName, normalizedArtist),
    ),
  );

  return (matched?.homeCatalog as Catalog | null) ?? null;
}

function normalizeName(name: string) {
  return name.replace(/\s/g, "").toLowerCase();
}

function isArtistMatch(name: string | null, normalizedArtist: string) {
  if (!name || name.length <= 1) {
    return false;
  }

  const normalizedName = normalizeName(name);

  if (hasCjkOrHangul(normalizedName)) {
    return normalizedArtist.includes(normalizedName);
  }

  return normalizedArtist === normalizedName;
}

function hasCjkOrHangul(value: string) {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(value);
}

type NumberRange = [number, number];

// 아래 번호대들은 모두 노래방번호_패턴.md에서 행 단위로 직접 확인한,
// 가나/한글/한자 비중이 90% 이상인 깨끗한 단일 블록만 포함한다.
// 80000~80299, 73700~74099처럼 다른 카탈로그가 곡 단위로 섞여 들어간
// 구간은 오분류 위험이 커서 일부러 제외했다.

const JPOP_NUMBER_RANGES: NumberRange[] = [
  [25000, 28999],
  [29801, 29999],
  [68000, 68999],
];

// 가나/한글이 전혀 없는 제목(B1A4, GOT7처럼 로마자 그룹명+영문 곡명인 K-POP)을 위한 보정.
const KPOP_NUMBER_RANGES: NumberRange[] = [
  [1, 6099],
  [8000, 19999],
  [30050, 39990],
  [42003, 47099],
  [47700, 52399],
  [53500, 53999],
  [54800, 54999],
  [59085, 64556],
  [74900, 76999],
  [77300, 77999],
  [95115, 99010],
  [99510, 99995],
];

const POP_NUMBER_RANGES: NumberRange[] = [
  [6900, 7999],
  [20000, 23999],
];

function isStrongJpopNumberRange(tjNumber: string | number | undefined) {
  return isInNumberRanges(tjNumber, JPOP_NUMBER_RANGES);
}

function isStrongKpopNumberRange(tjNumber: string | number | undefined) {
  return isInNumberRanges(tjNumber, KPOP_NUMBER_RANGES);
}

function isInNumberRanges(
  tjNumber: string | number | undefined,
  ranges: NumberRange[],
) {
  if (tjNumber === undefined) {
    return false;
  }

  const number = Number(tjNumber);

  if (!Number.isInteger(number)) {
    return false;
  }

  return ranges.some(([start, end]) => number >= start && number <= end);
}
