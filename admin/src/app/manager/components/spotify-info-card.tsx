"use client";

import { useManagerStore } from "../store";
import type { ManagerArtistDetail } from "../types";

type SpotifyInfoCardProps = {
  detail: ManagerArtistDetail;
};

export function SpotifyInfoCard({ detail }: SpotifyInfoCardProps) {
  const openSpotifyIdDialog = useManagerStore(
    (state) => state.openSpotifyIdDialog,
  );
  const hasSpotifyLink = Boolean(detail.spotify?.url);

  const handleNavigate = () => {
    if (!hasSpotifyLink || !detail.spotify?.url) {
      return;
    }
    if (typeof window !== "undefined") {
      window.open(detail.spotify.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 text-sm text-zinc-700">
      <div className="flex items-center justify-between border-b border-emerald-100 px-4 py-2">
        <p className="text-xs font-semibold text-emerald-700">Spotify 정보</p>
        <button
          type="button"
          onClick={openSpotifyIdDialog}
          className="cursor-pointer rounded border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800"
        >
          편집
        </button>
      </div>
      <button
        type="button"
        onClick={handleNavigate}
        className={`w-full border-t border-emerald-100 text-left transition ${
          hasSpotifyLink
            ? "cursor-pointer hover:bg-emerald-100/40"
            : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-5 px-4 py-4">
          <div className="h-15 w-15 flex-shrink-0 overflow-hidden rounded-lg bg-emerald-100">
            {detail.spotify?.thumbnails?.[0] ? (
              <img
                src={detail.spotify.thumbnails[0] ?? undefined}
                alt={detail.spotify?.name ?? "Spotify"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-emerald-600">
                ♪
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-900">
              {detail.spotify?.name ?? "연동된 스포티파이 없음"}
            </p>
            <div className="text-[11px] text-emerald-600">
              ID: {detail.spotifyId ?? "-"}
            </div>
            <div className="flex items-center gap-1 text-[11px] pt-0.5">
              <span className="text-emerald-500">인기도:</span>
              <span className="font-semibold text-emerald-900 break-all">
                {detail.spotify?.popularity ?? "-"}
              </span>

              <span className="text-emerald-500">팔로워:</span>
              <span className="font-semibold text-emerald-900 break-all">
                {detail.spotify?.followers
                  ? detail.spotify.followers.toLocaleString()
                  : "-"}
              </span>
            </div>
            <div className="flex basis-full items-center gap-1 text-[11px] pt-0.5">
              <span className="text-emerald-500">장르:</span>
              <span className="font-semibold text-emerald-900 break-all">
                {detail.spotify?.genres?.length
                  ? detail.spotify.genres.slice(0, 3).join(", ")
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
