"use client";

import Link from "next/link";
import { useSearchStore } from "@/store/searchStore";
import { CircleThumbnail } from "@/components/common/CircleThumbnail";
import { KaraokeBadge } from "@/components/karaoke/KaraokeBadge";
import { cn } from "@/lib/cn";

export const SearchResults = () => {
  const { query, results, clearSearch } = useSearchStore();

  if (!query || results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">
          "{query}" 검색 결과
        </h2>
        <button
          type="button"
          onClick={clearSearch}
          className="text-sm text-zinc-400 hover:text-white"
        >
          검색 초기화
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => {
          if (result.type === "artist" && result.artist) {
            return (
              <Link
                key={`artist-${result.artist.id}`}
                href={`/channel/${result.artist.id}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900 border-2 border-transparent hover:border-zinc-700 transition-all"
              >
                <CircleThumbnail
                  src={
                    result.artist.thumbnailMedium ||
                    result.artist.thumbnailDefault
                  }
                  alt={result.artist.nameKo}
                  size="w-16 h-16"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded">
                      아티스트
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mt-1">
                    {result.artist.nameKo}
                  </h3>
                  <p className="text-sm text-zinc-400">{result.artist.name}</p>
                  {result.artist.songCount !== undefined &&
                    result.artist.songCount !== null && (
                      <p className="text-xs text-zinc-500 mt-1">
                        곡 {result.artist.songCount}개
                      </p>
                    )}
                </div>
              </Link>
            );
          }

          if (result.type === "song" && result.song) {
            return (
              <div
                key={`song-${result.song.id}`}
                className="p-4 rounded-lg bg-zinc-900 border-2 border-transparent"
              >
                <div className="flex gap-4">
                  <CircleThumbnail
                    src={
                      result.song.thumbnailMedium || result.song.thumbnailDefault
                    }
                    alt={result.song.titleKo || result.song.title}
                    size="w-16 h-16"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-600 text-white rounded">
                        곡
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white mt-1 truncate">
                      {result.song.titleKo || result.song.title}
                    </h3>
                    {result.song.titleKo &&
                      result.song.titleKo !== result.song.title && (
                        <p className="text-sm text-zinc-400 truncate">
                          {result.song.title}
                        </p>
                      )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {result.song.karaokeSongs?.map((k, idx) => (
                        <KaraokeBadge
                          key={`${k.provider}-${k.karaokeNo}-${idx}`}
                          provider={k.provider as "TJ" | "KY" | "JOYSOUND"}
                          karaokeNo={k.karaokeNo}
                          title={k.title}
                          artist={k.artist}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
