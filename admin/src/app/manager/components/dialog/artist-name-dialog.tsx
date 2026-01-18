"use client";

import { useEffect, useState, useTransition } from "react";

import { updateArtistNames } from "../../action";
import { useManagerArtists } from "../../artist-list-context";
import { useManagerStore } from "../../store";
import { useArtistDetailContext } from "../artist-detail-context";

export function ArtistNameDialog() {
  const { detail, setDetail } = useArtistDetailContext();
  const { updateArtistSummary } = useManagerArtists();
  const isOpen = useManagerStore((state) => state.isArtistNameDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeArtistNameDialog);
  const [name, setName] = useState("");
  const [nameKo, setNameKo] = useState("");
  const [nameJa, setNameJa] = useState("");
  const [nameJaKana, setNameJaKana] = useState("");
  const [nameLatin, setNameLatin] = useState("");
  const [tjName, setTjName] = useState("");
  const [tjNameJa, setTjNameJa] = useState("");
  const [slug, setSlug] = useState("");
  const [catalog, setCatalog] = useState<"미정" | "KPOP" | "JPOP" | "POP">(
    "미정",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen && detail) {
      setName(detail.name);
      setNameKo(detail.nameKo);
      setNameJa(detail.nameJa ?? "");
      setNameJaKana(detail.nameJaKana ?? "");
      setNameLatin(detail.nameLatin ?? "");
      setTjName(detail.tjName ?? "");
      setTjNameJa(detail.tjNameJa ?? "");
      setSlug(detail.slug ?? "");
      const resolvedCatalog = detail.catalog ?? "미정";
      setCatalog(
        resolvedCatalog === "KPOP" ||
          resolvedCatalog === "JPOP" ||
          resolvedCatalog === "POP"
          ? resolvedCatalog
          : "미정",
      );
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
          nameJa,
          nameJaKana,
          nameLatin,
          tjName,
          tjNameJa,
          slug,
          catalog,
        });

        setDetail((prev) =>
          prev
            ? {
                ...prev,
                name: updated.name,
                nameKo: updated.nameKo,
                nameJa: updated.nameJa,
                nameJaKana: updated.nameJaKana,
                nameLatin: updated.nameLatin,
                tjName: updated.tjName,
                tjNameJa: updated.tjNameJa,
                slug: updated.slug,
                catalog: updated.homeCatalog ?? null,
              }
            : prev,
        );
        updateArtistSummary(updated.id, {
          name: updated.name,
          nameKo: updated.nameKo,
          nameLatin: updated.nameLatin ?? null,
          nameJa: updated.nameJa ?? null,
          slug: updated.slug ?? null,
          catalog: updated.homeCatalog ?? null,
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
            <label className="text-xs font-semibold text-blue-600">
              nameKo (한국어)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={nameKo}
              onChange={(event) => setNameKo(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-amber-600">
              nameJa
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm outline-none focus:border-amber-500"
              value={nameJa}
              onChange={(event) => setNameJa(event.target.value)}
              placeholder="대표 일본어 이름"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-amber-600">
              nameJaKana
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm outline-none focus:border-amber-500"
              value={nameJaKana}
              onChange={(event) => setNameJaKana(event.target.value)}
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-emerald-600">
              nameLatin
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              value={nameLatin}
              onChange={(event) => setNameLatin(event.target.value)}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-rose-600">
              tjName (TJ 아티스트명)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-sm outline-none focus:border-rose-500"
              value={tjName}
              onChange={(event) => setTjName(event.target.value)}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-rose-600">
              tjNameJa (TJ 일본어 아티스트명)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-sm outline-none focus:border-rose-500"
              value={tjNameJa}
              onChange={(event) => setTjNameJa(event.target.value)}
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-zinc-600">slug</label>
            <input
              type="text"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="slug 입력 (비워두면 null)"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-xs font-semibold text-zinc-600">분류</label>
            <select
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={catalog}
              onChange={(event) =>
                setCatalog(
                  event.target.value as "미정" | "KPOP" | "JPOP" | "POP",
                )
              }
            >
              <option value="미정">미분류</option>
              <option value="KPOP">KPOP</option>
              <option value="JPOP">JPOP</option>
              <option value="POP">POP</option>
            </select>
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
