"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { searchSongByYoutubeUrl } from "@/api/custom/searchSongByYoutubeUrl";
import { searchControllerSearch } from "@/api/model/search/search";
import { isYoutubeUrl } from "@/lib/youtube";
import { useSearchStore } from "@/store/searchStore";

export const useUnifiedSearch = () => {
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string>();
  const { setQuery, setResults } = useSearchStore();

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setError(undefined);

    try {
      if (isYoutubeUrl(query)) {
        // YouTube URL 검색
        const response = await searchSongByYoutubeUrl({ url: query });
        const song = response.data;

        if (!song) {
          setError("곡을 찾을 수 없습니다");
          return;
        }

        const artistId = song.artists[0]?.artistId;
        if (artistId) {
          router.push(`/channel/${artistId}#${song.id}`);
        }
      } else {
        // 일반 검색 - 통합 검색 API 사용
        const response = await searchControllerSearch({ query });

        if (!response.data || response.data.length === 0) {
          setError("검색 결과가 없습니다");
          setResults([]);
          return;
        }

        setQuery(query);
        setResults(response.data);
      }
    } catch (err) {
      setError("검색 중 오류가 발생했습니다");
    } finally {
      setIsSearching(false);
    }
  };

  return { handleSearch, isSearching, error };
};
