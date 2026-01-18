"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchManagerArtistSpotifyPanel,
  leaveSpotifyTrackGroup,
  runCreateSongsFromSpotifyGroups,
  runGroupSpotifyTracksForArtist,
  getSpotifyGroupDetail,
  addTrackToSpotifyGroup,
  createSpotifyTrackGroup,
  setSpotifyGroupPrimaryTrack,
  type SpotifyGroupEditData,
} from "../action";
import type {
  ManagerSpotifyGroupSummary,
  ManagerSpotifyPanelData,
  ManagerSpotifyTrackSummary,
} from "../types";
import { useManagerStore } from "../store";
import { SpotifyIcon } from "./spotify-icon";

export function SpotifySection() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const selectedGroupId = useManagerStore((state) => state.selectedGroupId);
  const setSelectedGroupId = useManagerStore(
    (state) => state.setSelectedGroupId,
  );
  const setRightSectionType = useManagerStore(
    (state) => state.setRightSectionType,
  );
  const [data, setData] = useState<ManagerSpotifyPanelData>({
    groups: [],
    orphanTracks: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>(
    {},
  );
  const [isCreatingSongs, setIsCreatingSongs] = useState(false);
  const [isGroupingTracks, setIsGroupingTracks] = useState(false);
  const [isCreateSongDialogOpen, setIsCreateSongDialogOpen] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());

  // 그룹 편집 다이얼로그 상태
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [isGroupEditDialogOpen, setIsGroupEditDialogOpen] = useState(false);

  // 새 그룹 만들기 다이얼로그 상태
  const [isNewGroupDialogOpen, setIsNewGroupDialogOpen] = useState(false);

  const openGroupEditDialog = (groupId: number) => {
    setEditingGroupId(groupId);
    setIsGroupEditDialogOpen(true);
  };

  const closeGroupEditDialog = () => {
    setIsGroupEditDialogOpen(false);
    setEditingGroupId(null);
  };

  // 미연결 그룹 목록
  const unlinkedGroups = useMemo(
    () => data.groups.filter((g) => g.linkedSongs.length === 0),
    [data.groups],
  );

  const openCreateSongDialog = () => {
    // 다이얼로그 열 때 전체 선택 상태로
    setSelectedGroupIds(new Set(unlinkedGroups.map((g) => g.groupId)));
    setIsCreateSongDialogOpen(true);
  };

  const handleSelectAll = () => {
    setSelectedGroupIds(new Set(unlinkedGroups.map((g) => g.groupId)));
  };

  const handleDeselectAll = () => {
    setSelectedGroupIds(new Set());
  };

  const toggleGroupSelection = (groupId: number) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleCreateSongsFromGroups = async () => {
    if (!selectedArtistId || selectedGroupIds.size === 0) return;

    setIsCreatingSongs(true);
    try {
      await runCreateSongsFromSpotifyGroups(
        selectedArtistId,
        Array.from(selectedGroupIds),
      );
      alert("곡 생성 작업이 완료되었습니다. (로그를 확인하세요)");
      setIsCreateSongDialogOpen(false);
      refetch();
    } catch (error) {
      alert(`오류: ${error}`);
    } finally {
      setIsCreatingSongs(false);
    }
  };

  const handleGroupTracks = async () => {
    if (!selectedArtistId) return;
    if (
      !confirm(
        `미연결 스포티파이 트랙(${data.orphanTracks.length}개)을 그룹화하시겠습니까?\n\n같은 이름의 트랙끼리 SpotifyTrackGroup으로 묶습니다.`,
      )
    )
      return;

    setIsGroupingTracks(true);
    try {
      await runGroupSpotifyTracksForArtist(selectedArtistId);
      alert("그룹화 완료! (로그를 확인하세요)");
      refetch();
    } catch (error) {
      alert(`오류: ${error}`);
    } finally {
      setIsGroupingTracks(false);
    }
  };

  useEffect(() => {
    if (!selectedArtistId) {
      setData({ groups: [], orphanTracks: [] });
      setIsLoading(false);
      setErrorMessage(null);
      setSelectedGroupId(null);
      return;
    }

    let cancelled = false;
    const fetchId = fetchIdRef.current + 1;
    fetchIdRef.current = fetchId;

    async function run() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetchManagerArtistSpotifyPanel(selectedArtistId);
        if (!cancelled && fetchId === fetchIdRef.current) {
          setData(response);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setErrorMessage("스포티파이 트랙 정보를 불러오지 못했습니다.");
          setData({ groups: [], orphanTracks: [] });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [selectedArtistId, setSelectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }
    const element = document.getElementById(`spotify-group-${selectedGroupId}`);
    element?.scrollIntoView({ block: "nearest" });
  }, [selectedGroupId, data.groups.length]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next: Record<number, boolean> = {};
      data.groups.forEach((group) => {
        next[group.groupId] = prev[group.groupId] ?? false;
      });
      return next;
    });
  }, [data.groups]);

  const hasContent = useMemo(
    () => data.groups.length > 0 || data.orphanTracks.length > 0,
    [data.groups.length, data.orphanTracks.length],
  );

  const handleCollapseAll = () => {
    const next: Record<number, boolean> = {};
    data.groups.forEach((group) => {
      next[group.groupId] = false;
    });
    setExpandedGroups(next);
  };

  const handleExpandAll = () => {
    const next: Record<number, boolean> = {};
    data.groups.forEach((group) => {
      next[group.groupId] = true;
    });
    setExpandedGroups(next);
  };

  const refetch = useCallback(async () => {
    if (!selectedArtistId) return;
    try {
      const response = await fetchManagerArtistSpotifyPanel(selectedArtistId);
      setData(response);
    } catch (error) {
      console.error(error);
    }
  }, [selectedArtistId]);

  const renderBody = () => {
    if (!selectedArtistId) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
          오른쪽 패널은 선택된 아티스트의 스포티파이 트랙들을 보여줍니다.
        </div>
      );
    }

    if (isLoading && !hasContent) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
          스포티파이 트랙 데이터를 불러오는 중...
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      );
    }

    if (!hasContent) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
          연결된 스포티파이 트랙이 없습니다.
        </div>
      );
    }

    return (
      <div className="flex h-full flex-1 min-h-0 flex-col gap-4 overflow-y-auto pr-1">
        {data.groups.length > 0 && (
          <div className="pt-4">
            <div className="px-4 pb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">
                스포티파이 그룹 ({data.groups.length})
              </h3>
              <span className="text-xs text-zinc-500">
                primary 트랙 기준으로 정렬
              </span>
            </div>

            {data.groups.map((group) => (
              <SpotifyGroupCard
                key={group.groupId}
                group={group}
                isExpanded={expandedGroups[group.groupId] ?? true}
                onToggle={() =>
                  setExpandedGroups((prev) => ({
                    ...prev,
                    [group.groupId]: !(prev[group.groupId] ?? true),
                  }))
                }
                isSelected={selectedGroupId === group.groupId}
                onSelect={
                  group.linkedSongs.length
                    ? () => setSelectedGroupId(group.groupId)
                    : undefined
                }
                onRefetch={refetch}
                onEditGroup={() => openGroupEditDialog(group.groupId)}
              />
            ))}
          </div>
        )}

        {data.orphanTracks.length > 0 && (
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">
                그룹 미지정 트랙 ({data.orphanTracks.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-blue-600 transition hover:bg-blue-50 cursor-pointer"
                  onClick={() => setIsNewGroupDialogOpen(true)}
                >
                  + 새 그룹 만들기
                </button>
                <span className="text-xs text-zinc-500">
                  그룹에 속하지 않은 순수 트랙
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {data.orphanTracks.map((track) => (
                <SpotifyTrackCard key={track.id} track={track} />
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center text-xs text-zinc-400">
            새 데이터를 불러오는 중...
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-sm text-zinc-700 shadow-sm">
      <div className="flex items-center justify-between border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/60 to-transparent px-4 pb-3 pt-4">
        <button
          type="button"
          className="text-left transition hover:opacity-70 cursor-pointer"
          onClick={() => setRightSectionType("youtube")}
        >
          <p className="text-[11px] uppercase tracking-[0.4em] text-emerald-500">
            Spotify
          </p>
          <h2 className="text-lg font-semibold text-zinc-900">
            스포티파이 트랙 관리
          </h2>
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            <SpotifyIcon className="h-3.5 w-3.5" />
            {data.groups.length} / {data.orphanTracks.length}
          </span>
          <div className="flex overflow-hidden rounded-full border border-emerald-200 bg-white/80 text-[11px] font-semibold text-emerald-700">
            <button
              type="button"
              className="px-3 py-1 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-emerald-300"
              onClick={handleCollapseAll}
              disabled={data.groups.length === 0}
            >
              모두 접기
            </button>
            <button
              type="button"
              className="border-l border-emerald-100 px-3 py-1 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-emerald-300"
              onClick={handleExpandAll}
              disabled={data.groups.length === 0}
            >
              모두 펼치기
            </button>
          </div>
        </div>
      </div>

      {/* 액션 버튼 영역 */}
      {selectedArtistId && (unlinkedGroups.length > 0 || data.orphanTracks.length > 0) && (
        <div className="flex items-center gap-2 border-b border-emerald-100/80 bg-emerald-50/30 px-4 py-2">
          {data.orphanTracks.length > 0 && (
            <button
              type="button"
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              onClick={handleGroupTracks}
              disabled={isGroupingTracks || isCreatingSongs}
            >
              {isGroupingTracks
                ? "그룹화 중..."
                : `트랙 그룹화 (${data.orphanTracks.length})`}
            </button>
          )}
          {unlinkedGroups.length > 0 && (
            <button
              type="button"
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              onClick={openCreateSongDialog}
              disabled={isCreatingSongs || isGroupingTracks}
            >
              {`그룹으로 곡 생성 (${unlinkedGroups.length})`}
            </button>
          )}
        </div>
      )}

      {/* 곡 생성 다이얼로그 */}
      {isCreateSongDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-zinc-900">
                곡 생성할 그룹 선택
              </h3>
              <button
                type="button"
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                onClick={() => setIsCreateSongDialogOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-2">
              <span className="text-sm text-zinc-600">
                {selectedGroupIds.size}개 선택됨
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                  onClick={handleSelectAll}
                >
                  전체 선택
                </button>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                  onClick={handleDeselectAll}
                >
                  전체 해제
                </button>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                {unlinkedGroups.map((group) => (
                  <label
                    key={group.groupId}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-3 transition hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.has(group.groupId)}
                      onChange={() => toggleGroupSelection(group.groupId)}
                      className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {group.primaryTrack?.name ?? `그룹 #${group.groupId}`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {group.tracks.length}트랙 · 그룹 #{group.groupId}
                      </p>
                    </div>
                    {group.primaryTrack?.thumbnails?.[0] && (
                      <img
                        src={group.primaryTrack.thumbnails[0]}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4">
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 cursor-pointer"
                onClick={() => setIsCreateSongDialogOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                onClick={handleCreateSongsFromGroups}
                disabled={isCreatingSongs || selectedGroupIds.size === 0}
              >
                {isCreatingSongs ? "생성 중..." : `${selectedGroupIds.size}개 곡 생성`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">{renderBody()}</div>

      {/* 그룹 편집 다이얼로그 */}
      {isGroupEditDialogOpen && editingGroupId && (
        <SpotifyGroupEditDialog
          groupId={editingGroupId}
          orphanTracks={data.orphanTracks}
          onClose={closeGroupEditDialog}
          onRefetch={refetch}
        />
      )}

      {/* 새 그룹 만들기 다이얼로그 */}
      {isNewGroupDialogOpen && (
        <SpotifyNewGroupDialog
          orphanTracks={data.orphanTracks}
          onClose={() => setIsNewGroupDialogOpen(false)}
          onRefetch={refetch}
        />
      )}
    </section>
  );
}

type SpotifyGroupCardProps = {
  group: ManagerSpotifyGroupSummary;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect?: () => void;
  onRefetch: () => void;
  onEditGroup: () => void;
};

function SpotifyGroupCard({
  group,
  isExpanded,
  onToggle,
  isSelected,
  onSelect,
  onRefetch,
  onEditGroup,
}: SpotifyGroupCardProps) {
  const hasLinkedSongs = group.linkedSongs.length > 0;
  const tracksToRender =
    isExpanded || !group.primaryTrack ? group.tracks : [group.primaryTrack];

  return (
    <div
      id={`spotify-group-${group.groupId}`}
      className={` border-1  p-4 shadow-sm transition ${
        hasLinkedSongs && onSelect ? "cursor-pointer" : "cursor-default"
      } ${
        isSelected
          ? "border-emerald-400 bg-emerald-50/70"
          : hasLinkedSongs
            ? "border-gray-300 bg-white hover:border-emerald-300"
            : "border-amber-300 bg-amber-50 hover:border-amber-400"
      }`}
      onClick={() => {
        if (!hasLinkedSongs || !onSelect) return;
        onSelect();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-zinc-900">
            그룹 #{group.groupId}
          </p>
          <p className="text-[11px] text-zinc-500">
            {group.tracks.length} 트랙 · {group.linkedSongs.length}곡 연결
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 ${
              hasLinkedSongs
                ? "border border-emerald-200 text-emerald-700"
                : "border border-dashed border-amber-200 text-amber-600"
            }`}
          >
            {hasLinkedSongs ? "연결됨" : "미연결"}
          </span>
          <button
            type="button"
            className="rounded-full border border-blue-200 px-2.5 py-0.5 text-[11px] text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              onEditGroup();
            }}
          >
            그룹 편집
          </button>
          <button
            type="button"
            className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-[11px] text-zinc-600 transition hover:border-emerald-200 hover:text-emerald-700 cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? "접기" : "펼치기"}
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {tracksToRender.map((track, index) => (
          <SpotifyTrackCard
            key={`${group.groupId}-${track.id}`}
            track={track}
            groupId={group.groupId}
            linkedSongs={group.linkedSongs}
            onSelect={onSelect}
            isSelected={isSelected}
            variant="group"
            isPrimary={track.id === group.primaryTrack.id && index === 0}
            onLeaveGroup={onRefetch}
          />
        ))}
      </div>
    </div>
  );
}

type SpotifyTrackCardProps = {
  track: ManagerSpotifyTrackSummary;
  groupId?: number | null;
  linkedSongs?: Array<{ id: number; title: string; titleKo?: string | null }>;
  onSelect?: () => void;
  isSelected?: boolean;
  variant?: "group" | "standalone";
  isPrimary?: boolean;
  onLeaveGroup?: () => void;
};

function SpotifyTrackCard({
  track,
  groupId,
  linkedSongs = [],
  onSelect,
  isSelected = false,
  variant = "standalone",
  isPrimary = false,
  onLeaveGroup,
}: SpotifyTrackCardProps) {
  const openSongCreateDialog = useManagerStore(
    (state) => state.openSongCreateDialog,
  );
  const [isLeaving, setIsLeaving] = useState(false);

  const handleCreateSong = (e: React.MouseEvent) => {
    e.stopPropagation();
    openSongCreateDialog(track.name, groupId ?? undefined);
  };

  const handleLeaveGroup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 트랙을 그룹에서 제거하시겠습니까?")) return;

    setIsLeaving(true);
    try {
      await leaveSpotifyTrackGroup(track.id);
      onLeaveGroup?.();
    } catch (error) {
      console.error(error);
      alert("그룹 나가기에 실패했습니다.");
    } finally {
      setIsLeaving(false);
    }
  };
  const durationLabel = formatDuration(track.durationMs);
  const releaseLabel = track.releaseDate ?? "-";
  const hasLinkedSongs = Boolean(groupId && linkedSongs.length > 0);
  const isGroupVariant = variant === "group";
  const canSelect = Boolean(onSelect) && (!groupId || hasLinkedSongs);
  const cardStateClass = isGroupVariant
    ? "border border-zinc-100 bg-white/80"
    : isSelected
      ? "border-emerald-400 bg-emerald-50/70"
      : "border-zinc-100 bg-white/80";
  const showLinkedSongs =
    Boolean(groupId) && (!isGroupVariant || (isGroupVariant && isPrimary));

  return (
    <div
      className={`rounded-xl p-3 shadow-sm transition ${
        canSelect ? "cursor-pointer" : "cursor-default"
      } ${cardStateClass}`}
      onClick={(event) => {
        event.stopPropagation();
        if (!canSelect) return;
        onSelect?.();
      }}
    >
      <div className="flex items-start gap-3">
        {track.spotifyUrl ? (
          <a
            href={track.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 transition hover:opacity-80"
          >
            {track.thumbnails?.length ? (
              <img
                src={track.thumbnails[0]}
                alt={track.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-emerald-500">
                <SpotifyIcon className="h-4 w-4" />
              </span>
            )}
          </a>
        ) : (
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
            {track.thumbnails?.length ? (
              <img
                src={track.thumbnails[0]}
                alt={track.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-emerald-500">
                <SpotifyIcon className="h-4 w-4" />
              </span>
            )}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">
                {track.name}
              </p>
              {track.musicBrainzTitle && (
                <span className="text-[11px] font-normal text-zinc-400">
                  {`(${track.musicBrainzTitle})`}
                </span>
              )}
              <p className="text-[11px] text-zinc-500">
                Track ID:{" "}
                <span className="font-semibold text-emerald-600">
                  {track.spotifyId}
                </span>
              </p>
            </div>
            {isGroupVariant ? (
              <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                {isPrimary ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 px-2 py-0.5">
                    Primary
                  </span>
                ) : null}
                {linkedSongs.length === 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-blue-600 transition hover:bg-blue-50 cursor-pointer"
                    onClick={handleCreateSong}
                  >
                    곡 만들기
                  </button>
                )}
                {groupId && linkedSongs.length === 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full border border-red-200 bg-white px-2 py-0.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                    onClick={handleLeaveGroup}
                    disabled={isLeaving}
                  >
                    {isLeaving ? "처리중..." : "그룹 나가기"}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1 text-[10px]">
                {groupId ? (
                  <>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 px-2 py-0.5 text-emerald-700">
                      그룹 #{groupId}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                        hasLinkedSongs
                          ? "border border-emerald-200 text-emerald-700"
                          : "border border-dashed border-amber-200 text-amber-600"
                      }`}
                    >
                      {hasLinkedSongs
                        ? `${linkedSongs.length}곡 연결`
                        : "연결된 곡 없음"}
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-zinc-600">
                    단독 트랙
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-emerald-700">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5">
              발매 {releaseLabel}
            </span>

            <span className="rounded-full bg-emerald-50 px-2 py-0.5">
              길이 {durationLabel}
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5">
              인기도 {track.popularity ?? "-"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
            {track.artists.length === 0 ? (
              <span className="text-zinc-400">연결된 아티스트 없음</span>
            ) : (
              track.artists
                .sort((a, b) => {
                  if (a?.artistId == null && b?.artistId == null) return 0;
                  if (a?.artistId == null) return 1;
                  if (b?.artistId == null) return -1;
                  return a.artistId - b.artistId;
                })
                .map((artist) => (
                  <span
                    key={`${track.id}-${artist.spotifyId}-${artist.artistId ?? "none"}`}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5"
                  >
                    <span className="text-[10px] text-zinc-400">
                      #{artist.artistId ?? "--"}
                    </span>
                    <span className="font-semibold text-zinc-700">
                      {artist.spotifyName}
                    </span>
                  </span>
                ))
            )}
          </div>
          {showLinkedSongs ? (
            hasLinkedSongs ? (
              <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-zinc-600">
                {linkedSongs.map((song) => (
                  <span
                    key={`${track.id}-song-${song.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5"
                  >
                    <span className="text-[10px] text-zinc-400">
                      #{song.id}
                    </span>
                    <span className="font-medium text-zinc-700">
                      {song.title}
                      {song.titleKo ? ` (${song.titleKo})` : ""}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-zinc-400">
                아직 이 그룹과 연결된 곡이 없습니다.
              </p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatDuration(durationMs?: number | null) {
  if (!durationMs || durationMs <= 0) return "-";
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// 그룹 편집 다이얼로그
type SpotifyGroupEditDialogProps = {
  groupId: number;
  orphanTracks: ManagerSpotifyTrackSummary[];
  onClose: () => void;
  onRefetch: () => void;
};

function SpotifyGroupEditDialog({
  groupId,
  orphanTracks,
  onClose,
  onRefetch,
}: SpotifyGroupEditDialogProps) {
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
        const data = await getSpotifyGroupDetail(groupId);
        setGroupData(data);
      } catch (err) {
        setError("그룹 정보를 불러오지 못했습니다.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadGroup();
  }, [groupId]);

  const handleAddTrack = async (trackId: number) => {
    setIsAdding(true);
    try {
      await addTrackToSpotifyGroup(groupId, trackId);
      const data = await getSpotifyGroupDetail(groupId);
      setGroupData(data);
      onRefetch();
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
      onRefetch();
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
      onRefetch();
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
            onClick={onClose}
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
                            disabled={isRemoving || track.id === groupData.primaryTrackId}
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
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// 새 그룹 만들기 다이얼로그
type SpotifyNewGroupDialogProps = {
  orphanTracks: ManagerSpotifyTrackSummary[];
  onClose: () => void;
  onRefetch: () => void;
};

function SpotifyNewGroupDialog({
  orphanTracks,
  onClose,
  onRefetch,
}: SpotifyNewGroupDialogProps) {
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
      onRefetch();
      onClose();
    } catch (err) {
      alert("그룹 생성에 실패했습니다.");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  if (orphanTracks.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-zinc-900">새 그룹 만들기</h3>
            <button
              type="button"
              className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              onClick={onClose}
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
              onClick={onClose}
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
            onClick={onClose}
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
            onClick={onClose}
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
