"use client";

import { useEffect, useState } from "react";
import { fetchArtistAliases, type ArtistAlias } from "../action";
import { useManagerStore } from "../store";
import { useArtistDetailContext } from "./artist-detail-context";

export function ArtistAliasDialog() {
  const isOpen = useManagerStore((state) => state.isAliasDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeAliasDialog);
  const { detail } = useArtistDetailContext();
  const [aliases, setAliases] = useState<ArtistAlias[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !detail?.id) {
      setAliases([]);
      return;
    }

    let cancelled = false;

    async function load() {
      if (!detail?.id) return;
      setIsLoading(true);
      try {
        const data = await fetchArtistAliases(detail.id);
        if (!cancelled) {
          setAliases(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, detail?.id]);

  if (!isOpen) {
    return null;
  }

  const localeMap: Record<string, string> = {
    KO: "한국어",
    JA_KANA: "일본어(가나)",
    JA_KANJI: "일본어(한자)",
    LATIN: "라틴",
  };

  const kindMap: Record<string, string> = {
    SPOTIFY: "스포티파이",
    YOUTUBE: "유튜브",
    ROMANIZATION: "로마자 표기",
    TRANSLATION: "번역",
    TJ_NAME: "TJ 이름",
    NICKNAME: "별명",
    COMMON_NAME: "통칭",
  };

  const sourceMap: Record<string, string> = {
    MANUAL: "수동",
    AI: "AI",
    OPERATOR: "운영자",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={closeDialog}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">
            별칭 목록 - {detail?.name}
          </h2>
          <button
            type="button"
            onClick={closeDialog}
            className="cursor-pointer rounded-lg px-3 py-1 text-zinc-600 transition hover:bg-zinc-100"
          >
            닫기
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            별칭을 불러오는 중...
          </div>
        ) : aliases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-500">
            등록된 별칭이 없습니다.
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-50">
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-3 font-semibold text-zinc-700">
                    별칭
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">
                    언어
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">
                    종류
                  </th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">
                    출처
                  </th>
                </tr>
              </thead>
              <tbody>
                {aliases.map((alias) => (
                  <tr
                    key={alias.id}
                    className="border-b border-zinc-100 transition hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {alias.alias}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {localeMap[alias.locale] ?? alias.locale}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {kindMap[alias.kind] ?? alias.kind}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${
                          alias.source === "AI"
                            ? "bg-purple-100 text-purple-700"
                            : alias.source === "OPERATOR"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {sourceMap[alias.source] ?? alias.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={closeDialog}
            className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
