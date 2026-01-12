"use client";

import { useEffect, useState, useTransition } from "react";

import { mergeArtist } from "../action";
import { useManagerArtists } from "../artist-list-context";
import { useManagerStore } from "../store";
import { useArtistDetailContext } from "./artist-detail-context";

export function ArtistMergeDialog() {
  const { detail, setDetail } = useArtistDetailContext();
  const { removeArtistSummary } = useManagerArtists();
  const isOpen = useManagerStore((state) => state.isMergeArtistDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeMergeArtistDialog);
  const setSelectedArtistId = useManagerStore(
    (state) => state.setSelectedArtistId,
  );
  const [targetArtistId, setTargetArtistId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setTargetArtistId("");
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedTargetId = Number(targetArtistId);
    if (!Number.isFinite(parsedTargetId) || parsedTargetId <= 0) {
      setErrorMessage("유효한 대상 아티스트 ID를 입력하세요.");
      return;
    }
    if (parsedTargetId === detail.id) {
      setErrorMessage("현재 아티스트와 다른 ID를 입력하세요.");
      return;
    }

    startTransition(async () => {
      try {
        setErrorMessage(null);
        await mergeArtist({
          sourceArtistId: detail.id,
          targetArtistId: parsedTargetId,
        });
        removeArtistSummary(detail.id);
        setDetail(null);
        setSelectedArtistId(parsedTargetId);
        closeDialog();
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "아티스트 병합에 실패했습니다.",
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-900">
            아티스트 병합
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            현재 아티스트의 모든 곡을 대상 아티스트로 이전한 뒤 현재
            아티스트는 삭제됩니다.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-zinc-600">
              대상 아티스트 ID
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={targetArtistId}
              onChange={(event) => setTargetArtistId(event.target.value)}
              placeholder="예: 1234"
            />
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
              {isPending ? "병합 중..." : "병합"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
