"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchManagerArtistSpotifyPanel,
} from "../action";
import type {
  ManagerSpotifyGroupSummary,
  ManagerSpotifyPanelData,
  ManagerSpotifyTrackSummary,
} from "../types";
import { useManagerStore } from "../store";

export function RightSection() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const [data, setData] = useState<ManagerSpotifyPanelData>({
    groups: [],
    orphanTracks: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!selectedArtistId) {
      setData({ groups: [], orphanTracks: [] });
      setIsLoading(false);
      setErrorMessage(null);
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
  }, [selectedArtistId]);

  const hasContent = useMemo(
    () => data.groups.length > 0 || data.orphanTracks.length > 0,
    [data.groups.length, data.orphanTracks.length],
  );

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
      <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
        {data.groups.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">
                스포티파이 그룹 ({data.groups.length})
              </h3>
              <span className="text-xs text-zinc-500">
                primary 트랙 기준으로 정렬
              </span>
            </div>
            {data.groups.map((group) => (
              <SpotifyGroupCard key={group.groupId} group={group} />
            ))}
          </div>
        )}

        {data.orphanTracks.length > 0 && (
          <div className="space-y-3">
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
    <section className="flex h-full flex-col overflow-hidden border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-400">
            Spotify Tracks
          </p>
          <h2 className="text-lg font-semibold text-zinc-900">
            스포티파이 트랙 관리
          </h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          {data.groups.length} 그룹 / {data.orphanTracks.length} 단독
        </span>
      </div>

      <div className="mt-4 flex-1">{renderBody()}</div>
    </section>
  );
}

type SpotifyGroupCardProps = {
  group: ManagerSpotifyGroupSummary;
};

function SpotifyGroupCard({ group }: SpotifyGroupCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white/80">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500">
        <span className="font-medium text-zinc-700">그룹 #{group.groupId}</span>
        <span>
          전체 {group.trackCount}곡 · 이 아티스트 {group.artistTrackCount}곡
        </span>
      </div>
      <div className="p-4">
        <SpotifyTrackCard track={group.primaryTrack} groupId={group.groupId} />
      </div>
    </div>
  );
}

type SpotifyTrackCardProps = {
  track: ManagerSpotifyTrackSummary;
  groupId?: number | null;
};

function SpotifyTrackCard({ track, groupId }: SpotifyTrackCardProps) {
  const durationLabel = formatDuration(track.durationMs);
  const releaseLabel = track.releaseDate ?? "발매 정보 없음";
  const createdAtDate = track.createdAt
    ? new Date(track.createdAt)
    : null;
  const createdLabel =
    createdAtDate && !Number.isNaN(createdAtDate.getTime())
      ? createdAtDate.toLocaleDateString("ko-KR")
      : "등록 정보 없음";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-zinc-100">
          {track.thumbnails?.length ? (
            <img
              src={track.thumbnails[0]}
              alt={track.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-500">
              ♪
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-zinc-900">
              {track.name}
            </p>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
              Track #{track.id}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">
              Spotify {track.spotifyId}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>발매: {releaseLabel}</span>
            <span>등록: {createdLabel}</span>
            <span>길이: {durationLabel}</span>
            <span>인기도: {track.popularity ?? "-"}</span>
            {groupId && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                그룹 #{groupId}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {groupId ? (
          <button
            type="button"
            className="rounded-xl border border-blue-200 px-3 py-1 text-[11px] font-medium text-blue-700 transition hover:border-blue-300 hover:text-blue-800"
          >
            그룹 상세 보기
          </button>
        ) : (
          <span className="rounded-xl border border-dashed border-zinc-200 px-3 py-1 text-[11px] text-zinc-500">
            그룹 없음
          </span>
        )}
        {track.spotifyUrl ? (
          <a
            href={track.spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-emerald-200 px-3 py-1 text-[11px] font-medium text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800"
          >
            스포티파이에서 열기
          </a>
        ) : (
          <span className="rounded-xl border border-zinc-100 px-3 py-1 text-[11px] text-zinc-400">
            스포티파이 URL 없음
          </span>
        )}
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
