"use client";

import { useState, useTransition } from "react";

import { createArtist } from "../action-left";
import { useManagerArtists } from "../artist-list-context";
import { useManagerStore } from "../store";

export function ArtistCreateDialog() {
  const isOpen = useManagerStore((state) => state.isCreateArtistDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeCreateArtistDialog);
  const [name, setName] = useState("");
  const [nameKo, setNameKo] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { prependArtist } = useManagerArtists();

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (isPending) return;
    setName("");
    setNameKo("");
    setErrorMessage(null);
    closeDialog();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        setErrorMessage(null);
        const artist = await createArtist({ name, nameKo });
        prependArtist(artist);
        handleClose();
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "아티스트를 생성하지 못했습니다.",
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">
            아티스트 생성
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
              {isPending ? "생성 중..." : "생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
