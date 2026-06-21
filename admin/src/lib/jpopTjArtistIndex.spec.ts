import { describe, expect, it } from "vitest";
import { JpopTjArtistIndex } from "./jpopTjArtistIndex";

describe("JpopTjArtistIndex", () => {
  it("returns the linked artist id when the same TJ artist exists on a JPOP song", () => {
    const index = new JpopTjArtistIndex(
      [],
      [
        {
          catalog: "JPOP",
          tjSong: { artist: "Psypspspsy" },
          artistSongs: [{ artistId: 123 }],
        },
      ],
    );

    expect(index.findJpopArtistId("Psypspspsy")).toBe(123);
  });

  it("returns null when the matching TJ artist only exists on non-JPOP songs", () => {
    const index = new JpopTjArtistIndex(
      [],
      [
        {
          catalog: "KPOP",
          tjSong: { artist: "Psypspspsy" },
          artistSongs: [{ artistId: 123 }],
        },
      ],
    );

    expect(index.findJpopArtistId("Psypspspsy")).toBeNull();
  });

  it("normalizes whitespace and letter case in TJ artist names", () => {
    const index = new JpopTjArtistIndex(
      [],
      [
        {
          catalog: "JPOP",
          tjSong: { artist: "PSY PSY" },
          artistSongs: [{ artistId: 456 }],
        },
      ],
    );

    expect(index.findJpopArtistId("psypsy")).toBe(456);
  });

  it("matches against Artist.name before falling back to the song-derived index", () => {
    const index = new JpopTjArtistIndex(
      [{ id: 789, name: "Yorushika", tjName: null }],
      [
        {
          catalog: "JPOP",
          tjSong: { artist: "Yorushika" },
          artistSongs: [{ artistId: 999 }],
        },
      ],
    );

    expect(index.findJpopArtistId("Yorushika")).toBe(789);
  });

  it("matches against Artist.tjName", () => {
    const index = new JpopTjArtistIndex(
      [{ id: 321, name: "ヨルシカ", tjName: "Yorushika" }],
      [],
    );

    expect(index.findJpopArtistId("yorushika")).toBe(321);
  });
});
