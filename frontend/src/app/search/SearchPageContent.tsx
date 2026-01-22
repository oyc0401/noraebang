"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSearchControllerSearch } from "@/api/model/search/search";
import { ArtistCard } from "@/components/common/ArtistCard";
import { SongCard } from "@/components/common/SongCard";
import { SearchHeader } from "@/components/search/SearchHeader";
import { useSearchStore } from "@/store/searchStore";

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const { setQuery, clearSearch } = useSearchStore();

  const { data: searchResponse, isLoading } = useSearchControllerSearch(
    { query },
    { query: { enabled: !!query } },
  );

  useEffect(() => {
    setQuery(query);
  }, [query, setQuery]);

  const hasQuery = query.trim().length > 0;

  // Filter the data into artists and songs
  const artists = searchResponse?.data
    ?.filter((item) => item.type === "artist")
    .map((item) => item.artist);
  const songs = searchResponse?.data
    ?.filter((item) => item.type === "song")
    .map((item) => item.song);

  return (
    <div className="bg-background-dark flex flex-col min-h-screen">
      <SearchHeader value={hasQuery ? query : ""} />

      <main className="flex-1 flex flex-col w-full mx-auto overflow-y-auto py-2 px-2 gap-6">
        {!hasQuery && (
          <div className="px-4 text-center text-gray-400 py-16">
            검색어를 입력해 주세요.
          </div>
        )}

        {hasQuery &&
          artists &&
          artists.length > 0 && ( // Use the new 'artists' array
            <div>
              <h2 className="text-xl font-bold mb-3 px-2">아티스트</h2>
              {artists.map(
                (artist) =>
                  artist && (
                    <ArtistCard
                      key={`artist-${artist.id}`}
                      thumbnail={artist.thumbnailDefault}
                      title={artist.nameKo || artist.name}
                      subtitle={artist.name}
                      onClick={() => {
                        if (artist?.slug) {
                          router.push(`/artist/${artist.slug}`);
                          clearSearch();
                        }
                      }}
                    />
                  ),
              )}
            </div>
          )}
        {hasQuery &&
          songs &&
          songs.length > 0 && ( // Use the new 'songs' array
            <div>
              <h2 className="text-xl font-bold mb-3 px-2">곡</h2>
              {songs.map((song) => {
                if (!song) {
                  return null;
                }

                const primaryArtistWithSlug = song.artists?.find(
                  (artist) => !!artist.slug,
                );
                const fallbackArtist = song.artists?.[0];
                const artistForDisplay =
                  primaryArtistWithSlug ?? fallbackArtist ?? null;

                const tjKaraoke = song.karaokeSongs?.find(
                  (k) => k.provider === "TJ",
                );

                return (
                  <SongCard
                    key={`song-${song.id}`}
                    thumbnail={song.thumbnailDefault}
                    title={song.title}
                    subtitle={artistForDisplay.nameKo ?? ""}
                    tjNumber={tjKaraoke?.karaokeNo}
                    onClick={() => {
                      if (primaryArtistWithSlug?.slug) {
                        router.push(
                          `/artist/${primaryArtistWithSlug.slug}#${song.id}`,
                        );
                        clearSearch();
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        {hasQuery &&
          !isLoading &&
          (!artists || artists.length === 0) && // Check new arrays
          (!songs || songs.length === 0) && ( // Check new arrays
            <div className="text-center text-gray-400 py-8">
              검색 결과가 없습니다.
            </div>
          )}
      </main>
    </div>
  );
}
