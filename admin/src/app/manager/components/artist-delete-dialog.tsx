"use client";

import { useEffect, useState, useTransition } from "react";

import { deleteArtist } from "../action";
import { useManagerArtists } from "../artist-list-context";
import { useManagerStore } from "../store";
import { useArtistDetailContext } from "./artist-detail-context";

export function ArtistDeleteDialog() {
  const { detail, setDetail } = useArtistDetailContext();
  const { removeArtistSummary } = useManagerArtists();
  const isOpen = useManagerStore((state) => state.isDeleteArtistDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeDeleteArtistDialog);
  const setSelectedArtistId = useManagerStore(
    (state) => state.setSelectedArtistId,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen || !detail) {
    return null;
  }

  const handleClose = () => {
    if (isPending) return;
    closeDialog();
  };

  const handleDelete = () => {
    if (!detail) return;
    startTransition(async () => {
      try {
        setErrorMessage(null);
        await deleteArtist(detail.id);
        removeArtistSummary(detail.id);
        setDetail(null);
        setSelectedArtistId(null);
        closeDialog();
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "아티스트를 삭제하지 못했습니다.",
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-red-700">
            아티스트 삭제
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            "{detail.name}" 아티스트와 연결된 곡, 스포티파이 정보가 모두
            삭제됩니다. 계속하시겠습니까?
          </p>
        </div>
        {errorMessage && (
          <p className="mb-3 text-xs text-red-600">{errorMessage}</p>
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
            type="button"
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
