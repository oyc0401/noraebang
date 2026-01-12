"use client";

import { useManagerStore } from "../store";

export function GroupDetailDialog() {
  const groupDetail = useManagerStore((state) => state.groupDetail);
  const closeGroupDetail = useManagerStore((state) => state.closeGroupDetail);

  if (!groupDetail) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">
              그룹 #{groupDetail.groupId} 상세
            </h3>
            <p className="text-xs text-zinc-500">
              연결된 스포티파이 트랙 목록
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-zinc-400 hover:text-zinc-600"
            onClick={closeGroupDetail}
          >
            닫기
          </button>
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2 text-sm">
          {groupDetail.tracks.map((track) => (
            <div
              key={`${groupDetail.groupId}-${track.id}`}
              className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-zinc-100">
                  {track.thumbnails?.length ? (
                    <img
                      src={track.thumbnails[0]}
                      alt={track.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-500">
                      ♪
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-900">
                    {track.name}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Track #{track.id} · Spotify {track.spotifyId}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-zinc-500">
                    <span>발매 {track.releaseDate ?? "-"}</span>
                    <span>길이 {formatDuration(track.durationMs)}</span>
                    <span>인기도 {track.popularity ?? "-"}</span>
                  </div>
                </div>
                {track.spotifyUrl ? (
                  <a
                    href={track.spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-emerald-600 underline"
                  >
                    열기
                  </a>
                ) : null}
              </div>
            </div>
          ))}
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
