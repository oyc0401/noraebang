"use client";

import Image from "next/image";
import { useArtistsStore } from "./store";

export function SpotifyTracksSection() {
  const {
    selectedArtist,
    spotifyTracks,
    spotifyArtistId,
    spotifyTracksLoading,
    showGroupDialog,
    groupDialogGroupId,
    groupDialogTracks,
    groupDialogLoading,
    openGroupDialog,
    closeGroupDialog,
  } = useArtistsStore();

  return (
    <>
      <div className="w-96 bg-white dark:bg-zinc-900 flex flex-col">
        {selectedArtist ? (
          <>
            {/* Spotify Tracks Header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Spotify Tracks
                </div>
                {spotifyArtistId && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    ({spotifyArtistId})
                  </div>
                )}
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
                      track.groupId && !track.isPrimary ? "opacity-50" : ""
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
                          className={`font-medium text-sm text-zinc-900 dark:text-zinc-50 ${
                            track.groupId && !track.isPrimary ? "line-through" : ""
                          }`}
                        >
                          {track.name}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center mt-0.5">
                          {track.releaseDate && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
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
                          {track.popularity !== undefined && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              인기도: {track.popularity}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center mt-1">
                          <div className="text-xs text-zinc-400 dark:text-zinc-500">
                            ID: {track.id}
                          </div>
                          {track.groupId && (
                            <button
                              type="button"
                              onClick={() => openGroupDialog(track.groupId!)}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                              style={{ cursor: "pointer" }}
                            >
                              그룹: {track.groupId}
                            </button>
                          )}
                        </div>
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

      {/* Group Dialog */}
      {showGroupDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-lg bg-white shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                그룹 ID: {groupDialogGroupId}
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                이 그룹에 속한 스포티파이 트랙들
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {groupDialogLoading ? (
                <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                  로딩 중...
                </div>
              ) : groupDialogTracks.length === 0 ? (
                <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                  트랙이 없습니다
                </div>
              ) : (
                <div className="space-y-4">
                  {groupDialogTracks.map((track) => (
                    <div
                      key={track.id}
                      className={`p-4 rounded-lg border ${
                        track.isPrimary
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      <div className="flex gap-3">
                        {track.thumbnails[0] ? (
                          <Image
                            src={track.thumbnails[0]}
                            alt={track.name}
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
                              {track.name}
                            </div>
                            {track.isPrimary && (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 items-center mt-1">
                            {track.releaseDate && (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
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
                            {track.popularity !== undefined && (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                인기도: {track.popularity}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 items-center mt-1">
                            <div className="text-xs text-zinc-400 dark:text-zinc-500">
                              ID: {track.id}
                            </div>
                          </div>
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

            <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={closeGroupDialog}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                style={{ cursor: "pointer" }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
