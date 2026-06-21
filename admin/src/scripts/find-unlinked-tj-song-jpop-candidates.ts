import { config } from "dotenv";
import { Pool } from "pg";

config({ override: true, quiet: true });

// Song이 없는 TjSong 중 JPOP으로 추정되는 후보를 출력하는 스크립트.
// pnpm tsx src/scripts/find-unlinked-tj-song-jpop-candidates.ts

type TjSongRow = {
  id: string;
  title: string;
  artist: string | null;
  lyricist: string | null;
  composer: string | null;
  publishdate: string | null;
  is_mr: boolean;
  is_mv: boolean;
  is_over_60: boolean;
};

type ArtistRow = {
  id: number;
  name: string;
  name_ko: string;
  tj_name: string | null;
  name_ja: string | null;
  name_latin: string | null;
};

type MatchedArtist = {
  id: number;
  name: string;
  nameKo: string;
  tjName: string | null;
};

type CandidateRow = TjSongRow & {
  matchedArtists: MatchedArtist[];
  hasKanaTitle: boolean;
  hasKanaCredit: boolean;
  hasJpopArtistMatch: boolean;
  score: number;
};

const KANA_PATTERN = /[ぁ-んァ-ンー]/;
const ARTIST_SPLIT_PATTERN = /[,，、/&×+]|(?:\s+X\s+)|(?:\s+x\s+)|(?:\s+and\s+)/;

function hasKana(value: string | null): boolean {
  return value !== null && KANA_PATTERN.test(value);
}

function normalizeName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .toLowerCase();
}

function extractArtistTokens(value: string | null): string[] {
  if (!value) return [];

  const withoutParentheses = value
    .replace(/\([^)]*\)/g, " ")
    .replace(/（[^）]*）/g, " ");

  return withoutParentheses
    .split(ARTIST_SPLIT_PATTERN)
    .map(normalizeName)
    .filter((token) => token.length >= 2);
}

function buildArtistNameIndex(artists: ArtistRow[]): Map<string, MatchedArtist[]> {
  const index = new Map<string, MatchedArtist[]>();

  for (const artist of artists) {
    const names = [
      artist.name,
      artist.tj_name,
      artist.name_ja,
      artist.name_latin,
    ];

    for (const name of names) {
      if (!name) continue;

      const normalized = normalizeName(name);
      if (normalized.length < 2) continue;

      const item = {
        id: artist.id,
        name: artist.name,
        nameKo: artist.name_ko,
        tjName: artist.tj_name,
      };

      const existing = index.get(normalized) ?? [];
      if (!existing.some((current) => current.id === item.id)) {
        existing.push(item);
      }
      index.set(normalized, existing);
    }
  }

  return index;
}

function matchArtists(
  tjArtist: string | null,
  artistIndex: Map<string, MatchedArtist[]>,
): MatchedArtist[] {
  const matched = new Map<number, MatchedArtist>();

  for (const token of extractArtistTokens(tjArtist)) {
    for (const artist of artistIndex.get(token) ?? []) {
      matched.set(artist.id, artist);
    }
  }

  return Array.from(matched.values()).sort((a, b) => a.id - b.id);
}

function formatArtists(row: CandidateRow): string {
  return row.matchedArtists
    .map((artist) => {
      const tjName = artist.tjName ? `/${artist.tjName}` : "";
      return `${artist.id}:${artist.name}${tjName}(${artist.nameKo})`;
    })
    .join(", ");
}

function formatReasons(row: CandidateRow): string {
  const reasons: string[] = [];

  if (row.hasJpopArtistMatch) reasons.push("jpop_artist_match");
  if (row.hasKanaTitle) reasons.push("title_kana_text");
  if (row.hasKanaCredit) reasons.push("credit_kana_text");

  return reasons.join(", ");
}

function scoreCandidate(row: TjSongRow, matchedArtists: MatchedArtist[]) {
  const hasKanaTitle = hasKana(row.title);
  const hasKanaCredit =
    hasKana(row.artist) || hasKana(row.lyricist) || hasKana(row.composer);
  const hasJpopArtistMatch = matchedArtists.length > 0;

  const score =
    (hasJpopArtistMatch ? 100 : 0) +
    (hasKanaTitle ? 35 : 0) +
    (hasKanaCredit ? 35 : 0);

  return {
    ...row,
    matchedArtists,
    hasKanaTitle,
    hasKanaCredit,
    hasJpopArtistMatch,
    score,
  };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const pool = new Pool({ connectionString });

  try {
    const [tjSongsResult, artistsResult] = await Promise.all([
      pool.query<TjSongRow>(`
        select
          t.id,
          t.title,
          t.artist,
          t.lyricist,
          t.composer,
          t.publishdate,
          t.is_mr,
          t.is_mv,
          t.is_over_60
        from tj_song t
        left join song s on s.tj_song_id = t.id
        where s.id is null;
      `),
      pool.query<ArtistRow>(`
        select id, name, name_ko, tj_name, name_ja, name_latin
        from artist
        where home_catalog = 'JPOP';
      `),
    ]);

    const artistIndex = buildArtistNameIndex(artistsResult.rows);
    const candidates = tjSongsResult.rows
      .map((row) => scoreCandidate(row, matchArtists(row.artist, artistIndex)))
      .filter(
        (row) => row.hasJpopArtistMatch || row.hasKanaTitle || row.hasKanaCredit,
      )
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.publishdate ?? "").localeCompare(a.publishdate ?? "");
      });

    console.log("Unlinked TjSong JPOP candidate summary");
    console.table([
      {
        tjSongWithoutSongCount: tjSongsResult.rowCount,
        jpopArtistCount: artistsResult.rowCount,
        candidateCount: candidates.length,
        jpopArtistMatchCount: candidates.filter((row) => row.hasJpopArtistMatch)
          .length,
        kanaTextCount: candidates.filter(
          (row) => row.hasKanaTitle || row.hasKanaCredit,
        ).length,
      },
    ]);
    console.log("Showing 100 rows.");

    console.table(
      candidates.slice(0, 100).map((row) => ({
        score: row.score,
        tjSongId: row.id,
        title: row.title,
        artist: row.artist,
        lyricist: row.lyricist,
        composer: row.composer,
        publishdate: row.publishdate,
        isMR: row.is_mr,
        isMV: row.is_mv,
        isOver60: row.is_over_60,
        matchedArtists: formatArtists(row),
        reasons: formatReasons(row),
      })),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
