"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSearchControllerSearch } from "@/api/model/search/search";
import { KaraokeBadge } from "@/components/common/KaraokeBadge";
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

      <main className="flex-1 flex flex-col w-full mx-auto overflow-y-auto px-5 py-4 gap-6">
        {!hasQuery && (
          <div className="text-center text-gray-400 py-16">
            검색어를 입력해 주세요.
          </div>
        )}
        {hasQuery && isLoading && (
          <div className="text-center text-gray-400 py-8">검색 중...</div>
        )}
        {hasQuery &&
          artists &&
          artists.length > 0 && ( // Use the new 'artists' array
            <div>
              <h2 className="text-xl font-bold mb-4">아티스트</h2>
              <div className="space-y-2">
                {artists.map(
                  (artist) =>
                    artist && ( // Ensure artist is not undefined
                      <button
                        key={`artist-${artist.id}`}
                        type="button"
                        onClick={() => {
                          if (artist?.slug) {
                            router.push(`/artist/${artist.slug}`);
                            clearSearch();
                          }
                        }}
                        className="w-full p-4 rounded-lg bg-surface-dark hover:bg-white/5 cursor-pointer transition-colors text-left flex items-center gap-4"
                      >
                        {artist.thumbnailDefault && ( // Changed from thumbnail to thumbnailDefault based on ArtistDetailsDto
                          <Image
                            src={artist.thumbnailDefault}
                            alt={artist.name || artist.nameKo}
                            width={48}
                            height={48}
                            className="rounded-full shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">
                            {artist.nameKo || artist.name}
                          </div>
                          <div className="text-sm text-gray-400 truncate">
                            {artist.name}
                          </div>
                        </div>
                      </button>
                    ),
                )}
              </div>
            </div>
          )}
        {hasQuery &&
          songs &&
          songs.length > 0 && ( // Use the new 'songs' array
            <div>
              <h2 className="text-xl font-bold mb-4">곡</h2>
              <div className="space-y-2">
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

                  return (
                    <button
                      key={`song-${song.id}`}
                      type="button"
                      onClick={() => {
                        if (primaryArtistWithSlug?.slug) {
                          router.push(
                            `/artist/${primaryArtistWithSlug.slug}#${song.id}`,
                          );
                          clearSearch();
                        }
                      }}
                      className="w-full p-4 rounded-lg bg-surface-dark hover:bg-white/5 cursor-pointer transition-colors text-left flex items-center gap-4"
                    >
                      {song.thumbnailDefault && ( // Changed from thumbnail to thumbnailDefault based on SongDto
                        <Image
                          src={song.thumbnailDefault}
                          alt={song.title}
                          width={48}
                          height={48}
                          className="rounded-lg shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">
                          {song.titleKo || song.title}
                        </div>
                        <div className="text-sm text-gray-400 truncate mb-1">
                          {artistForDisplay
                            ? artistForDisplay.nameKo || artistForDisplay.name
                            : ""}
                        </div>
                        {song.karaokeSongs &&
                          song.karaokeSongs.length > 0 &&
                          (song.karaokeSongs[0].provider === "TJ" ||
                            song.karaokeSongs[0].provider === "KY") && (
                            <KaraokeBadge
                              provider={song.karaokeSongs[0].provider}
                              number={song.karaokeSongs[0].karaokeNo}
                            />
                          )}
                      </div>
                    </button>
                  );
                })}
              </div>
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
