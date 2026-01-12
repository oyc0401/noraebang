"use client";

import { useEffect, useState, useTransition } from "react";

import { updateArtistCatalog } from "../action";
import { useManagerArtists } from "../artist-list-context";
import { useManagerStore } from "../store";
import { useArtistDetailContext } from "./artist-detail-context";

const catalogOptions = ["미정", "KPOP", "JPOP", "POP"] as const;

export function ArtistCatalogDialog() {
  const { detail, setDetail } = useArtistDetailContext();
  const { updateArtistSummary } = useManagerArtists();
  const isOpen = useManagerStore((state) => state.isCatalogDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeCatalogDialog);
  const [catalog, setCatalog] = useState<(typeof catalogOptions)[number]>("미정");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen && detail) {
      const resolved = detail.catalog && catalogOptions.includes(detail.catalog as any)
        ? (detail.catalog as (typeof catalogOptions)[number])
        : "미정";
      setCatalog(resolved);
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
        const updated = await updateArtistCatalog({
          artistId: detail.id,
          catalog,
        });
        const resolvedCatalog = updated.homeCatalog ?? null;
        setDetail((prev) =>
          prev ? { ...prev, catalog: resolvedCatalog } : prev,
        );
        updateArtistSummary(updated.id, { catalog: resolvedCatalog });
        closeDialog();
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "분류를 수정하지 못했습니다.",
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">
            가수 분류 편집
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
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-2 text-sm">
            {catalogOptions.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="catalog"
                  value={option}
                  checked={catalog === option}
                  onChange={() => setCatalog(option)}
                />
                <span>{option}</span>
              </label>
            ))}
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
