"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  useSearchControllerSearch,
  useSearchControllerSearchSongByMusicLink,
} from "@/api/model/search/search";
import { ArtistCard } from "@/components/common/ArtistCard";
import { SongCard } from "@/components/common/SongCard";
import { SearchHeader } from "@/components/search/SearchHeader";
import { useSearchTracking } from "@/hooks/useSearchTracking";
import { formatSongTitle } from "@/lib/formatSongTitle";
import { useSearchStore } from "@/store/searchStore";

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const youtubeUrl = searchParams.get("url") || "";
  const { setQuery, clearSearch } = useSearchStore();
  const { saveSearchClick } = useSearchTracking();

  // 일반 검색
  const { data: searchResponse, isLoading: isSearchLoading } =
    useSearchControllerSearch(
      { query },
      { query: { enabled: !!query && !youtubeUrl } },
    );

  // 음악 링크 검색
  const { data: linkSearchResponse, isLoading: isLinkLoading } =
    useSearchControllerSearchSongByMusicLink(
      { url: youtubeUrl },
      { query: { enabled: !!youtubeUrl } },
    );

  const isLoading = isSearchLoading || isLinkLoading;

  useEffect(() => {
    setQuery(query);
  }, [query, setQuery]);

  const hasQuery = query.trim().length > 0 || youtubeUrl.trim().length > 0;

  // Filter the data into artists and songs
  const artists = youtubeUrl
    ? [] // 유튜브 URL 검색 시 아티스트 결과 없음
    : searchResponse?.data
        ?.filter((item) => item.type === "artist")
        .map((item) => item.artist);

  const songs = youtubeUrl
    ? linkSearchResponse?.songs // 유튜브 URL 검색 결과
    : searchResponse?.data
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
                      thumbnail={artist.thumbnailMedium}
                      title={artist.name}
                      subtitle={artist.name}
                      onClick={() => {
                        if (artist?.slug) {
                          saveSearchClick({ query, artistId: artist.id, source: "search" });
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

                return (
                  <SongCard
                    key={`song-${song.id}`}
                    songId={song.id}
                    artistId={artistForDisplay?.artistId}
                    thumbnail={song.thumbnailMedium}
                    title={formatSongTitle(
                      song.title,
                      song.titleKo,
                      song.titleJa,
                      song.titleLatin,
                    )}
                    subtitle={song.artists?.map((a) => a.name).join(", ") ?? ""}
                    tjNumber={song.tjSong?.id}
                    bestProposeHit={song.bestSongPropose?.hit}
                    spotify={song.spotify}
                    youtube={song.youtube}
                    onClick={() => {
                      if (primaryArtistWithSlug?.slug) {
                        saveSearchClick({
                          query: query || undefined,
                          url: youtubeUrl || undefined,
                          songId: song.id,
                          source: "search",
                        });
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
