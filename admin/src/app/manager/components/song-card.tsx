"use client";

import type { ManagerArtistDetail } from "../types";
import { SpotifyIcon } from "./spotify-icon";

type SongItem = ManagerArtistDetail["songs"][number];

type SongCardProps = {
  song: SongItem;
  isGroupSelected: boolean;
  onSelectGroup: (groupId: number | null) => void;
  onEditClick: (
    song: SongItem,
    options?: {
      focusTab?:
        | "info"
        | "artists"
        | "spotify"
        | "youtube"
        | "propose"
        | "admin";
    },
  ) => void;
};

export function SongCard({
  song,
  isGroupSelected,
  onSelectGroup,
  onEditClick,
}: SongCardProps) {
  const thumbnailSrc =
    song.thumbnails.default ??
    song.thumbnails.medium ??
    song.thumbnails.high ??
    null;

  const primaryTrack = song.spotifyGroup?.primaryTrack;
  const primaryRelease = primaryTrack?.releaseDate ?? "-";
  const primaryDuration = formatDuration(primaryTrack?.durationMs);

  return (
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
                <p className="font-medium text-zinc-900 flex-1">{song.title}</p>
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

              {/* 다국어 제목 라벨 */}
              {(song.titleKo || song.titleJa || song.titleJaKana || song.titleLatin) && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {song.titleKo && (
                    <span className="flex flex-col rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5">
                      <span className="text-[10px] text-blue-400">titleKo</span>
                      <span className="text-blue-700">{song.titleKo}</span>
                    </span>
                  )}
                  {song.titleJa && (
                    <span className="flex flex-col rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5">
                      <span className="text-[10px] text-amber-400">titleJa</span>
                      <span className="text-amber-700">{song.titleJa}</span>
                    </span>
                  )}
                
                  {song.titleLatin && (
                    <span className="flex flex-col rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5">
                      <span className="text-[10px] text-emerald-400">titleLatin</span>
                      <span className="text-emerald-700">{song.titleLatin}</span>
                    </span>
                  )}
                </div>
              )}

              {/* 기본 정보 뱃지 */}
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                  #{song.id}
                </span>
                <span>분류: {song.catalog ? song.catalog : "미분류"}</span>
                {/* Spotify 뱃지 */}
                {primaryTrack ? (
                  <a
                    href={primaryTrack.spotifyUrl ?? `https://open.spotify.com/search/${encodeURIComponent(song.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
                  >
                    <SpotifyIcon className="h-3 w-3" />
                    <span className="font-medium">{primaryTrack.name}</span>
                    <span className="text-emerald-500">
                      {primaryDuration} · 인기 {primaryTrack.popularity ?? "-"} · {primaryRelease?.slice(0, 4) ?? "-"}
                    </span>
                  </a>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500">
                    Spotify 없음
                  </span>
                )}
                {/* YouTube 뱃지 */}
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
                  <a
                    href={`https://music.youtube.com/search?q=${encodeURIComponent(song.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 underline-offset-2 hover:underline"
                  >
                    유튜브 없음
                  </a>
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
              </div>

              {/* 노래방/TJ 정보 */}
              <div className="flex flex-wrap gap-2 text-[11px] text-zinc-600 pt-2">
                {/* {song.karaoke.length === 0 ? (
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
                  )} */}
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
                ) : song.maxProposeHit != null && song.maxProposeHit > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-orange-700 border border-orange-200">
                    <span className="text-[10px] text-orange-500">신청곡</span>
                    <span>추천 {song.maxProposeHit}</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500">
                    TJ 정보 없음
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
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
