"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchManagerArtistSpotifyPanel } from "../action";
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
              <span className="text-xs text-zinc-500">
                그룹에 속하지 않은 순수 트랙
              </span>
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

      <div className="flex-1 min-h-0 overflow-hidden">{renderBody()}</div>
    </section>
  );
}

type SpotifyGroupCardProps = {
  group: ManagerSpotifyGroupSummary;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect?: () => void;
};

function SpotifyGroupCard({
  group,
  isExpanded,
  onToggle,
  isSelected,
  onSelect,
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
          : "border-gray-300 bg-white hover:border-emerald-300"
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
            className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-[11px] text-zinc-600 transition hover:border-emerald-200 hover:text-emerald-700"
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
};

function SpotifyTrackCard({
  track,
  groupId,
  linkedSongs = [],
  onSelect,
  isSelected = false,
  variant = "standalone",
  isPrimary = false,
}: SpotifyTrackCardProps) {
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
              <div className="text-[10px] text-emerald-600">
                {isPrimary ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 px-2 py-0.5">
                    Primary
                  </span>
                ) : null}
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
