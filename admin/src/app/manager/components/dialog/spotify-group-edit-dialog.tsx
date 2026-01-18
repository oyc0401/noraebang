"use client";

import { useEffect, useMemo, useState } from "react";

import {
  addTrackToSpotifyGroup,
  getSpotifyGroupDetail,
  leaveSpotifyTrackGroup,
  setSpotifyGroupPrimaryTrack,
  type SpotifyGroupEditData,
} from "../../action";
import { useSpotifyDialogContext } from "../spotify-dialog-context";

export function SpotifyGroupEditDialog() {
  const {
    editingGroupId,
    isGroupEditDialogOpen,
    closeGroupEditDialog,
    orphanTracks,
    refetch,
  } = useSpotifyDialogContext();
  const groupId = editingGroupId;
  const [groupData, setGroupData] = useState<SpotifyGroupEditData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    async function loadGroup() {
      setIsLoading(true);
      setError(null);
      try {
        if (!groupId) return;
        const data = await getSpotifyGroupDetail(groupId);
        setGroupData(data);
      } catch (err) {
        setError("그룹 정보를 불러오지 못했습니다.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (isGroupEditDialogOpen && groupId) {
      loadGroup();
    }
  }, [groupId, isGroupEditDialogOpen]);

  const handleAddTrack = async (trackId: number) => {
    setIsAdding(true);
    try {
      await addTrackToSpotifyGroup(groupId, trackId);
      const data = await getSpotifyGroupDetail(groupId);
      setGroupData(data);
      refetch();
    } catch (err) {
      alert("트랙 추가에 실패했습니다.");
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveTrack = async (trackId: number) => {
    if (!confirm("이 트랙을 그룹에서 제거하시겠습니까?")) return;
    setIsRemoving(true);
    try {
      await leaveSpotifyTrackGroup(trackId);
      const data = await getSpotifyGroupDetail(groupId);
      setGroupData(data);
      refetch();
    } catch (err) {
      alert("트랙 제거에 실패했습니다.");
      console.error(err);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSetPrimary = async (trackId: number) => {
    setIsSettingPrimary(true);
    try {
      await setSpotifyGroupPrimaryTrack(groupId, trackId);
      const data = await getSpotifyGroupDetail(groupId);
      setGroupData(data);
      refetch();
    } catch (err) {
      alert("Primary 트랙 설정에 실패했습니다.");
      console.error(err);
    } finally {
      setIsSettingPrimary(false);
    }
  };

  // 그룹에 속하지 않은 트랙들 (orphanTracks에서 현재 그룹 트랙 제외)
  const availableTracks = useMemo(() => {
    if (!groupData) return orphanTracks;
    const groupTrackIds = new Set(groupData.tracks.map((t) => t.id));
    return orphanTracks.filter((t) => !groupTrackIds.has(t.id));
  }, [orphanTracks, groupData]);

  if (!isGroupEditDialogOpen || !groupId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-zinc-900">
            그룹 #{groupId} 편집
          </h3>
          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
            onClick={closeGroupEditDialog}
          >
            ✕
          </button>
        </div>

        <div className="max-h-[calc(85vh-130px)] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
              로딩 중...
            </div>
          ) : error ? (
            <div className="px-6 py-4 text-sm text-red-600">{error}</div>
          ) : groupData ? (
            <div className="space-y-6 p-6">
              {/* 연결된 곡 */}
              {groupData.linkedSongs.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-zinc-800">
                    연결된 곡
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {groupData.linkedSongs.map((song) => (
                      <span
                        key={song.id}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                      >
                        #{song.id} {song.title}
                        {song.titleKo && ` (${song.titleKo})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 그룹 내 트랙들 */}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-zinc-800">
                  그룹 내 트랙 ({groupData.tracks.length})
                </h4>
                <div className="space-y-2">
                  {groupData.tracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3"
                    >
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
                      <div className="flex items-center gap-2">
                        {track.id === groupData.primaryTrackId ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Primary
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="rounded-full border border-emerald-200 px-2 py-0.5 text-xs text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 cursor-pointer"
                            onClick={() => handleSetPrimary(track.id)}
                            disabled={isSettingPrimary}
                          >
                            Primary로 설정
                          </button>
                        )}
                        {groupData.tracks.length > 1 && (
                          <button
                            type="button"
                            className="rounded-full border border-red-200 px-2 py-0.5 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                            onClick={() => handleRemoveTrack(track.id)}
                            disabled={
                              isRemoving ||
                              track.id === groupData.primaryTrackId
                            }
                          >
                            제거
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 추가 가능한 트랙들 (미지정 트랙) */}
              {availableTracks.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-zinc-800">
                    추가 가능한 트랙 (그룹 미지정)
                  </h4>
                  <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3">
                    {availableTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2"
                      >
                        {track.thumbnails?.[0] && (
                          <img
                            src={track.thumbnails[0]}
                            alt=""
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {track.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            인기도: {track.popularity ?? "-"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-xs text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
                          onClick={() => handleAddTrack(track.id)}
                          disabled={isAdding}
                        >
                          {isAdding ? "추가 중..." : "그룹에 추가"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {availableTracks.length === 0 && (
                <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
                  추가할 수 있는 미지정 트랙이 없습니다.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 cursor-pointer"
            onClick={closeGroupEditDialog}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
