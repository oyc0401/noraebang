"use client";

import Image from "next/image";
import { useArtistsStore } from "./store";

export function SpotifyTracksSection() {
  const {
    selectedArtist,
    spotifyGroups,
    spotifyArtistId,
    spotifyTracksLoading,
    openGroupDialog,
  } = useArtistsStore();

  return (
    <div className="w-96 bg-white dark:bg-zinc-900 flex flex-col">
        {selectedArtist ? (
          <>
            {/* Spotify Tracks Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Spotify Groups
                </div>
                {spotifyArtistId && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    ({spotifyArtistId})
                  </div>
                )}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {spotifyGroups.length}개 그룹
              </div>
            </div>

          {/* Spotify Groups List */}
          <div className="flex-1 overflow-y-auto">
            {spotifyTracksLoading ? (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                로딩 중...
              </div>
            ) : spotifyGroups.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Spotify 그룹이 없습니다
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {spotifyGroups.map((group, index) => (
                  <div
                    key={group.groupId ?? `ungrouped-${index}`}
                    className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex gap-3">
                      {group.primaryTrack.thumbnails[0] ? (
                        <Image
                          src={group.primaryTrack.thumbnails[0]}
                          alt={group.primaryTrack.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-zinc-200 dark:bg-zinc-700" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
                          {group.primaryTrack.name}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center mt-0.5">
                          {group.primaryTrack.releaseDate && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {group.primaryTrack.releaseDate}
                            </div>
                          )}
                          {group.primaryTrack.durationMs && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {Math.floor(group.primaryTrack.durationMs / 60000)}:
                              {String(
                                Math.floor((group.primaryTrack.durationMs % 60000) / 1000),
                              ).padStart(2, "0")}
                            </div>
                          )}
                          {group.primaryTrack.popularity !== undefined && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              인기도: {group.primaryTrack.popularity}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center mt-1">
                          <div className="text-xs text-zinc-400 dark:text-zinc-500">
                            ID: {group.primaryTrack.id}
                          </div>
                          {group.groupId && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              • 그룹: {group.groupId} ({group.trackCount}개)
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {group.primaryTrack.spotifyUrl && (
                            <a
                              href={group.primaryTrack.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-green-600 hover:underline dark:text-green-400"
                              style={{ cursor: "pointer" }}
                            >
                              Spotify
                            </a>
                          )}
                          {group.groupId && group.trackCount > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (group.groupId) {
                                  openGroupDialog(group.groupId);
                                }
                              }}
                              className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                              style={{ cursor: "pointer" }}
                            >
                              그룹 전체보기
                            </button>
                          )}
                        </div>
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
