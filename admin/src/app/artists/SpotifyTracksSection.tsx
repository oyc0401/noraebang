"use client";

import Image from "next/image";
import { useArtistsStore } from "./store";

export function SpotifyTracksSection() {
  const { selectedArtist, spotifyTracks, spotifyTracksLoading } =
    useArtistsStore();

  return (
    <div className="w-96 bg-white dark:bg-zinc-900 flex flex-col">
      {selectedArtist ? (
        <>
          {/* Spotify Tracks Header */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Spotify Tracks
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {spotifyTracks.length}개 트랙
            </div>
          </div>

          {/* Spotify Tracks List */}
          <div className="flex-1 overflow-y-auto">
            {spotifyTracksLoading ? (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                로딩 중...
              </div>
            ) : spotifyTracks.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Spotify 트랙이 없습니다
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {spotifyTracks.map((track) => (
                  <div
                    key={track.id}
                    className={`p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                      track.disabled ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      {track.thumbnails[0] ? (
                        <Image
                          src={track.thumbnails[0]}
                          alt={track.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-zinc-200 dark:bg-zinc-700" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate ${
                            track.disabled ? "line-through" : ""
                          }`}
                        >
                          {track.name}
                        </div>
                        {track.releaseDate && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {track.releaseDate}
                          </div>
                        )}
                        {track.durationMs && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {Math.floor(track.durationMs / 60000)}:
                            {String(
                              Math.floor((track.durationMs % 60000) / 1000),
                            ).padStart(2, "0")}
                          </div>
                        )}
                        {track.spotifyUrl && (
                          <a
                            href={track.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline dark:text-blue-400 mt-1 inline-block"
                            style={{ cursor: "pointer" }}
                          >
                            Spotify에서 열기
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 text-sm text-zinc-500 dark:text-zinc-400">
          아티스트를 선택하세요
        </div>
      )}
    </div>
  );
}
