"use client";

import { useEffect, useState, useTransition } from "react";

import { updateArtistSpotifyId } from "../../action";
import { useManagerStore } from "../../store";
import { useArtistDetailContext } from "../artist-detail-context";

export function ArtistSpotifyIdDialog() {
  const { detail, setDetail } = useArtistDetailContext();
  const isOpen = useManagerStore((state) => state.isSpotifyIdDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeSpotifyIdDialog);
  const [spotifyId, setSpotifyId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen && detail) {
      setSpotifyId(detail.spotifyId ?? "");
      setErrorMessage(null);
    }
  }, [detail, isOpen]);

  if (!isOpen || !detail) {
    return null;
  }

  const handleClose = () => {
    if (isPending) return;
    closeDialog();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail) return;
    startTransition(async () => {
      try {
        setErrorMessage(null);
        const updated = await updateArtistSpotifyId({
          artistId: detail.id,
          spotifyId,
        });
        setDetail((prev) =>
          prev ? { ...prev, spotifyId: updated.spotifyId ?? null } : prev,
        );
        closeDialog();
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "스포티파이 ID를 수정하지 못했습니다.",
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">
            스포티파이 ID 편집
          </h3>
          <button
            type="button"
            className="text-sm text-zinc-400 hover:text-zinc-600"
            onClick={handleClose}
            disabled={isPending}
          >
            닫기
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-zinc-600">
              Spotify ID
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={spotifyId}
              onChange={(event) => setSpotifyId(event.target.value)}
              placeholder="스포티파이 아티스트 ID"
            />
            <p className="text-[11px] text-zinc-400">
              값을 비우면 연결이 제거됩니다.
            </p>
          </div>
          {errorMessage && (
            <p className="text-xs text-red-600">{errorMessage}</p>
          )}
          <div className="flex justify-end gap-2 text-sm">
            <button
              type="button"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-600"
              onClick={handleClose}
              disabled={isPending}
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
              disabled={isPending}
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
