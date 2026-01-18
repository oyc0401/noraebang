"use client";

import { useState } from "react";

import { createSpotifyTrackGroup } from "../../action";
import { useSpotifyDialogContext } from "../spotify-dialog-context";

export function SpotifyNewGroupDialog() {
  const {
    orphanTracks,
    isNewGroupDialogOpen,
    closeNewGroupDialog,
    refetch,
  } = useSpotifyDialogContext();
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<number | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const handleToggleTrack = (trackId: number) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
        // primary가 제거되면 primary도 해제
        if (selectedPrimaryId === trackId) {
          setSelectedPrimaryId(null);
        }
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const handleSetPrimary = (trackId: number) => {
    // 선택 안 됐으면 선택에도 추가
    if (!selectedTrackIds.has(trackId)) {
      setSelectedTrackIds((prev) => new Set(prev).add(trackId));
    }
    setSelectedPrimaryId(trackId);
  };

  const handleCreate = async () => {
    if (!selectedPrimaryId) {
      alert("Primary 트랙을 선택해주세요.");
      return;
    }
    if (selectedTrackIds.size === 0) {
      alert("그룹에 포함할 트랙을 선택해주세요.");
      return;
    }

    setIsCreating(true);
    try {
      const otherTrackIds = Array.from(selectedTrackIds).filter(
        (id) => id !== selectedPrimaryId,
      );
      await createSpotifyTrackGroup(selectedPrimaryId, otherTrackIds);
      alert("그룹이 생성되었습니다.");
      refetch();
      closeNewGroupDialog();
    } catch (err) {
      alert("그룹 생성에 실패했습니다.");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isNewGroupDialogOpen) {
    return null;
  }

  if (orphanTracks.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-zinc-900">새 그룹 만들기</h3>
            <button
              type="button"
              className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              onClick={closeNewGroupDialog}
            >
              ✕
            </button>
          </div>
          <div className="p-6 text-center text-sm text-zinc-500">
            그룹에 추가할 수 있는 미지정 트랙이 없습니다.
          </div>
          <div className="flex justify-end border-t border-zinc-200 px-6 py-4">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 cursor-pointer"
              onClick={closeNewGroupDialog}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-zinc-900">새 그룹 만들기</h3>
          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
            onClick={closeNewGroupDialog}
          >
            ✕
          </button>
        </div>

        <div className="border-b border-zinc-100 px-6 py-3">
          <p className="text-sm text-zinc-600">
            그룹에 포함할 트랙을 선택하고, Primary 트랙을 지정하세요.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            선택됨: {selectedTrackIds.size}개 · Primary:{" "}
            {selectedPrimaryId
              ? orphanTracks.find((t) => t.id === selectedPrimaryId)?.name ?? "-"
              : "미지정"}
          </p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-6">
          <div className="space-y-2">
            {orphanTracks.map((track) => {
              const isSelected = selectedTrackIds.has(track.id);
              const isPrimary = selectedPrimaryId === track.id;

              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                    isSelected
                      ? isPrimary
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-blue-300 bg-blue-50"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleTrack(track.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  {track.thumbnails?.[0] && (
                    <img
                      src={track.thumbnails[0]}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {track.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      인기도: {track.popularity ?? "-"} · 발매:{" "}
                      {track.releaseDate ?? "-"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`rounded-full px-2.5 py-0.5 text-xs transition cursor-pointer ${
                      isPrimary
                        ? "bg-emerald-100 text-emerald-700 font-medium"
                        : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    }`}
                    onClick={() => handleSetPrimary(track.id)}
                  >
                    {isPrimary ? "Primary" : "Primary로 설정"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 cursor-pointer"
            onClick={closeNewGroupDialog}
          >
            취소
          </button>
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            onClick={handleCreate}
            disabled={isCreating || !selectedPrimaryId || selectedTrackIds.size === 0}
          >
            {isCreating ? "생성 중..." : `그룹 생성 (${selectedTrackIds.size}트랙)`}
          </button>
        </div>
      </div>
    </div>
  );
}
