import { describe, expect, it } from "vitest";
import { JpopTjArtistIndex } from "./jpopTjArtistIndex";

describe("JpopTjArtistIndex", () => {
  it("returns the linked artist id when the same TJ artist exists on a JPOP song", () => {
    const index = new JpopTjArtistIndex([
      {
        catalog: "JPOP",
        tjSong: { artist: "Psypspspsy" },
        artistSongs: [{ artistId: 123 }],
      },
    ]);

    expect(index.findJpopArtistId("Psypspspsy")).toBe(123);
  });

  it("returns null when the matching TJ artist only exists on non-JPOP songs", () => {
    const index = new JpopTjArtistIndex([
      {
        catalog: "KPOP",
        tjSong: { artist: "Psypspspsy" },
        artistSongs: [{ artistId: 123 }],
      },
    ]);

    expect(index.findJpopArtistId("Psypspspsy")).toBeNull();
  });

  it("normalizes whitespace and letter case in TJ artist names", () => {
    const index = new JpopTjArtistIndex([
      {
        catalog: "JPOP",
        tjSong: { artist: "PSY PSY" },
        artistSongs: [{ artistId: 456 }],
      },
    ]);

    expect(index.findJpopArtistId("psypsy")).toBe(456);
  });
});
