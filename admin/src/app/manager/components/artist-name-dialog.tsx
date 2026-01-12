"use client";

import { useEffect, useState, useTransition } from "react";

import { updateArtistNames } from "../action";
import { useManagerArtists } from "../artist-list-context";
import { useManagerStore } from "../store";
import { useArtistDetailContext } from "./artist-detail-context";

export function ArtistNameDialog() {
  const { detail, setDetail } = useArtistDetailContext();
  const { updateArtistSummary } = useManagerArtists();
  const isOpen = useManagerStore((state) => state.isArtistNameDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeArtistNameDialog);
  const [name, setName] = useState("");
  const [nameKo, setNameKo] = useState("");
  const [nameJaKana, setNameJaKana] = useState("");
  const [nameJaKanji, setNameJaKanji] = useState("");
  const [nameLatin, setNameLatin] = useState("");
  const [slug, setSlug] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen && detail) {
      setName(detail.name);
      setNameKo(detail.nameKo);
      setNameJaKana(detail.nameJaKana ?? "");
      setNameJaKanji(detail.nameJaKanji ?? "");
      setNameLatin(detail.nameLatin ?? "");
      setSlug(detail.slug ?? "");
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
        const updated = await updateArtistNames({
          artistId: detail.id,
          name,
          nameKo,
          nameJaKana,
          nameJaKanji,
          nameLatin,
          slug,
        });

        setDetail((prev) =>
          prev
            ? {
                ...prev,
                name: updated.name,
                nameKo: updated.nameKo,
                nameJa: updated.nameJaKanji ?? updated.nameJaKana,
                nameJaKana: updated.nameJaKana,
                nameJaKanji: updated.nameJaKanji,
                nameLatin: updated.nameLatin,
                slug: updated.slug,
              }
            : prev,
        );
        updateArtistSummary(updated.id, {
          name: updated.name,
          nameKo: updated.nameKo,
          nameLatin: updated.nameLatin ?? null,
          nameJa: updated.nameJaKanji ?? updated.nameJaKana ?? null,
          slug: updated.slug ?? null,
        });
        closeDialog();
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "아티스트 정보를 수정하지 못했습니다.",
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">
              아티스트 이름 편집
            </h3>
            <p className="text-xs text-zinc-500">
              name 필드를 포함한 다국어 이름을 수정합니다.
            </p>
          </div>
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
              name (기본)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-zinc-600">
              nameKo (한국어)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={nameKo}
              onChange={(event) => setNameKo(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-zinc-600">
              nameJaKana
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={nameJaKana}
              onChange={(event) => setNameJaKana(event.target.value)}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-zinc-600">
              nameJaKanji
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={nameJaKanji}
              onChange={(event) => setNameJaKanji(event.target.value)}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-zinc-600">
              nameLatin
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={nameLatin}
              onChange={(event) => setNameLatin(event.target.value)}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-zinc-600">
              slug
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="slug 입력 (비워두면 null)"
            />
          </div>
          {errorMessage && (
            <p className="text-xs text-red-600">{errorMessage}</p>
          )}
          <div className="flex justify-end gap-2 pt-2 text-sm">
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
