"use client";

import { useState } from "react";

import type { ManagerArtistDetail, SongLinkedArtist } from "../types";
import { SpotifyIcon } from "./spotify-icon";
import { SongArtistDialog } from "./song-artist-dialog";

type SongItem = ManagerArtistDetail["songs"][number];

type SongCardProps = {
  song: SongItem;
  isGroupSelected: boolean;
  onSelectGroup: (groupId: number | null) => void;
  onEditClick: (song: SongItem) => void;
  onArtistsChange?: (songId: number, artists: SongLinkedArtist[]) => void;
};

export function SongCard({
  song,
  isGroupSelected,
  onSelectGroup,
  onEditClick,
  onArtistsChange,
}: SongCardProps) {
  const [isArtistDialogOpen, setIsArtistDialogOpen] = useState(false);

  const thumbnailSrc =
    song.thumbnails.default ??
    song.thumbnails.medium ??
    song.thumbnails.high ??
    null;

  const primaryTrack = song.spotifyGroup?.primaryTrack;
  const primaryRelease = primaryTrack?.releaseDate ?? "-";
  const primaryDuration = formatDuration(primaryTrack?.durationMs);

  return (
    <>
      <div
        id={`song-card-${song.id}`}
        onClick={() => onSelectGroup(song.spotifyGroup?.id ?? null)}
        className={`rounded-xl border px-4 py-3 transition cursor-pointer ${
          isGroupSelected
            ? "border-blue-400 bg-blue-50"
            : "border-zinc-100 bg-white/80 hover:border-zinc-200"
        }`}
      >
        <div className="flex gap-3">
          {/* 썸네일 */}
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={song.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-400">
                ♪
              </span>
            )}
          </div>

          {/* 곡 정보 */}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* 제목 및 편집 버튼 */}
                <div className="flex items-start gap-2">
                  <p className="font-medium text-zinc-900 flex-1">
                    {song.title}
                    {song.titleKo && (
                      <span className="ml-2 text-sm text-zinc-500 font-normal">
                        {`(${song.titleKo})`}
                      </span>
                    )}
                    {song.titleLatin && (
                      <span className="ml-2 text-sm text-zinc-500 font-normal">
                        {`(${song.titleLatin})`}
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick(song);
                    }}
                    className="flex-shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 cursor-pointer"
                  >
                    편집
                  </button>
                </div>

                {/* 기본 정보 뱃지 */}
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                    #{song.id}
                  </span>
                  <span>분류: {song.catalog ? song.catalog : "미분류"}</span>
                  {song.topYoutubeVideo ? (
                    <a
                      href={`https://www.youtube.com/watch?v=${song.topYoutubeVideo.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2 py-0.5 text-[11px] text-red-700"
                    >
                      YouTube
                      <span className="text-[10px] text-red-500">
                        {song.topYoutubeVideo.videoId}
                      </span>
                      <span className="text-[10px] text-red-400">
                        ({formatViewCount(song.topYoutubeVideo.viewCount)})
                      </span>
                    </a>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                      유튜브 없음
                    </span>
                  )}
                </div>

                {/* 아티스트 뱃지 */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-500">아티스트:</span>
                  {song.artists.length === 0 ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                      연결된 아티스트 없음
                    </span>
                  ) : (
                    song.artists.map((artist) => (
                      <span
                        key={artist.id}
                        className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700 border border-purple-100"
                      >
                        <span className="text-purple-400">#{artist.id}</span>
                        {artist.nameKo || artist.name}
                        {artist.role && (
                          <span className="text-[10px] text-purple-500">
                            ({getRoleLabel(artist.role)})
                          </span>
                        )}
                      </span>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsArtistDialogOpen(true);
                    }}
                    className="rounded-full border border-dashed border-purple-300 bg-white px-2 py-0.5 text-xs text-purple-600 transition hover:bg-purple-50 cursor-pointer"
                  >
                    + 관리
                  </button>
                </div>

                {/* 노래방/TJ 정보 */}
                <div className="flex flex-wrap gap-2 text-[11px] text-zinc-600 pt-2">
                  {song.karaoke.length === 0 ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                      노래방 등록 없음
                    </span>
                  ) : (
                    song.karaoke.map((item) => (
                      <span
                        key={`${song.id}-${item.provider}-${item.karaokeNo}`}
                        className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700"
                      >
                        {item.provider}: {item.karaokeNo}
                      </span>
                    ))
                  )}
                  {song.tjSong ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
                      <span className="text-[10px] text-emerald-600">
                        TJ #{song.tjSong.id}
                      </span>
                      <span>
                        {song.tjSong.title ?? "제목 없음"} ·{" "}
                        {song.tjSong.artist ?? "아티스트 미상"}
                      </span>
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500">
                      TJ 정보 없음
                    </span>
                  )}
                </div>
              </div>

              {/* Spotify 그룹 카드 */}
              {song.spotifyGroup ? (
                <div className="rounded-lg border border-emerald-100/70 bg-white/70 p-3 text-[11px] text-zinc-500 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                      <SpotifyIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-500">
                        Group #{song.spotifyGroup.id}
                      </p>
                      {primaryTrack?.name ? (
                        primaryTrack.spotifyUrl ? (
                          <a
                            href={primaryTrack.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="group block"
                          >
                            <span className="text-sm font-semibold text-zinc-900 group-hover:text-emerald-600">
                              {primaryTrack?.name}
                            </span>
                            {primaryTrack.musicBrainzTitle && (
                              <span className="block text-[11px] text-zinc-400 truncate">{`(${primaryTrack.musicBrainzTitle})`}</span>
                            )}
                          </a>
                        ) : (
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">
                              {primaryTrack?.name}
                            </p>
                            {primaryTrack.musicBrainzTitle && (
                              <span className="block text-[11px] text-zinc-400 truncate">{`(${primaryTrack.musicBrainzTitle})`}</span>
                            )}
                          </div>
                        )
                      ) : (
                        <p className="font-semibold text-emerald-600">
                          Primary track 없음
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                    <span className="inline-flex items-center rounded-full border border-emerald-100 px-2.5 py-0.5">
                      길이 {primaryDuration}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-emerald-100 px-2.5 py-0.5">
                      인기도 {primaryTrack?.popularity ?? "-"}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-emerald-100 px-2.5 py-0.5">
                      발매일 {primaryRelease}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* 아티스트 관리 다이얼로그 */}
      <SongArtistDialog
        open={isArtistDialogOpen}
        song={song}
        onOpenChange={setIsArtistDialogOpen}
        onArtistsChange={(artists) => {
          onArtistsChange?.(song.id, artists);
        }}
      />
    </>
  );
}

function formatDuration(durationMs?: number | null) {
  if (!durationMs || durationMs <= 0) return "-";
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatViewCount(viewCount?: string | null): string {
  if (!viewCount) return "0";
  const count = Number(viewCount);
  if (Number.isNaN(count)) return viewCount;
  if (count >= 100_000_000) {
    return `${(count / 100_000_000).toFixed(1)}억`;
  }
  if (count >= 10_000) {
    return `${(count / 10_000).toFixed(1)}만`;
  }
  return count.toLocaleString();
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "MAIN":
      return "메인";
    case "FEATURING":
      return "피처링";
    case "PRODUCER":
      return "프로듀서";
    default:
      return role;
  }
}
