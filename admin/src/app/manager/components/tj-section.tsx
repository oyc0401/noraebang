"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchManagerArtistTjPanel } from "../action";
import type {
  ManagerTjPanelData,
  ManagerTjProposeGroupSummary,
  ManagerTjProposeSummary,
} from "../types";
import { useManagerStore } from "../store";

export function TjSection() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const setRightSectionType = useManagerStore(
    (state) => state.setRightSectionType,
  );
  const [data, setData] = useState<ManagerTjPanelData>({
    tjName: null,
    tjNameJa: null,
    groups: [],
    orphanProposes: [],
    totalCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>(
    {},
  );

  useEffect(() => {
    if (!selectedArtistId) {
      setData({ tjName: null, tjNameJa: null, groups: [], orphanProposes: [], totalCount: 0 });
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
        if (!selectedArtistId) return;
        const response = await fetchManagerArtistTjPanel(selectedArtistId);
        if (!cancelled && fetchId === fetchIdRef.current) {
          setData(response);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setErrorMessage("TJ 신청곡 정보를 불러오지 못했습니다.");
          setData({ tjName: null, tjNameJa: null, groups: [], orphanProposes: [], totalCount: 0 });
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

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next: Record<number, boolean> = {};
      data.groups.forEach((group) => {
        next[group.groupIndex] = prev[group.groupIndex] ?? false;
      });
      return next;
    });
  }, [data.groups]);

  const hasContent = useMemo(
    () => data.groups.length > 0 || data.orphanProposes.length > 0,
    [data.groups.length, data.orphanProposes.length],
  );

  const handleCollapseAll = () => {
    const next: Record<number, boolean> = {};
    data.groups.forEach((group) => {
      next[group.groupIndex] = false;
    });
    setExpandedGroups(next);
  };

  const handleExpandAll = () => {
    const next: Record<number, boolean> = {};
    data.groups.forEach((group) => {
      next[group.groupIndex] = true;
    });
    setExpandedGroups(next);
  };

  const renderBody = () => {
    if (!selectedArtistId) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
          오른쪽 패널은 선택된 아티스트의 TJ 신청곡들을 보여줍니다.
        </div>
      );
    }

    if (isLoading && !hasContent) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
          TJ 신청곡 데이터를 불러오는 중...
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

    if (!data.tjName && !data.tjNameJa) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
          TJ 이름이 설정되지 않았습니다.
        </div>
      );
    }

    if (!hasContent) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
          해당 아티스트의 신청곡이 없습니다.
        </div>
      );
    }

    return (
      <div className="flex h-full flex-1 min-h-0 flex-col gap-4 overflow-y-auto pr-1">
        {(data.tjName || data.tjNameJa) && (
          <div className="px-4 pt-4">
            <div className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <TjIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 truncate">
                  {data.tjName ?? data.tjNameJa}
                </p>
                {data.tjName && data.tjNameJa && (
                  <p className="text-[11px] text-zinc-500">{data.tjNameJa}</p>
                )}
                <p className="text-[11px] text-zinc-500">
                  총 {data.totalCount}개의 신청곡
                </p>
              </div>
            </div>
          </div>
        )}

        {data.groups.length > 0 && (
          <div className="pt-2">
            <div className="px-4 pb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">
                연결된 그룹 ({data.groups.length})
              </h3>
              <span className="text-xs text-zinc-500">
                추천수 기준 정렬
              </span>
            </div>

            {data.groups.map((group) => (
              <TjGroupCard
                key={group.groupIndex}
                group={group}
                isExpanded={expandedGroups[group.groupIndex] ?? true}
                onToggle={() =>
                  setExpandedGroups((prev) => ({
                    ...prev,
                    [group.groupIndex]: !(prev[group.groupIndex] ?? true),
                  }))
                }
              />
            ))}
          </div>
        )}

        {data.orphanProposes.length > 0 && (
          <div className="px-4 space-y-3 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">
                미연결 신청곡 ({data.orphanProposes.length})
              </h3>
              <span className="text-xs text-zinc-500">
                Song과 연결되지 않은 신청곡
              </span>
            </div>
            <div className="space-y-2">
              {data.orphanProposes.map((propose) => (
                <TjProposeCard key={propose.id} propose={propose} />
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
      <div className="flex items-center justify-between border-b border-orange-100/80 bg-gradient-to-r from-orange-50/60 to-transparent px-4 pb-3 pt-4">
        <button
          type="button"
          className="text-left transition hover:opacity-70 cursor-pointer"
          onClick={() => setRightSectionType("spotify")}
        >
          <p className="text-[11px] uppercase tracking-[0.4em] text-orange-500">
            TJ
          </p>
          <h2 className="text-lg font-semibold text-zinc-900">
            TJ 신청곡 관리
          </h2>
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-orange-700">
            <TjIcon className="h-3.5 w-3.5" />
            {data.groups.length} / {data.orphanProposes.length}
          </span>
          <div className="flex overflow-hidden rounded-full border border-orange-200 bg-white/80 text-[11px] font-semibold text-orange-700">
            <button
              type="button"
              className="px-3 py-1 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:text-orange-300 cursor-pointer"
              onClick={handleCollapseAll}
              disabled={data.groups.length === 0}
            >
              모두 접기
            </button>
            <button
              type="button"
              className="border-l border-orange-100 px-3 py-1 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:text-orange-300 cursor-pointer"
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

type TjGroupCardProps = {
  group: ManagerTjProposeGroupSummary;
  isExpanded: boolean;
  onToggle: () => void;
};

function TjGroupCard({ group, isExpanded, onToggle }: TjGroupCardProps) {
  const proposesToRender = isExpanded ? group.proposes : group.proposes.slice(0, 1);
  const totalHit = group.proposes.reduce((sum, p) => sum + p.hit, 0);

  return (
    <div className="border border-orange-200 bg-orange-50/30 p-4 shadow-sm transition">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-zinc-900">
            그룹 #{group.groupIndex}
          </p>
          <p className="text-[11px] text-zinc-500">
            {group.proposes.length} 신청곡 · 총 추천 {totalHit}회
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 border border-orange-200 text-orange-700">
            연결됨
          </span>
          {group.proposes.length > 1 && (
            <button
              type="button"
              className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-[11px] text-zinc-600 transition hover:border-orange-200 hover:text-orange-700 cursor-pointer"
              onClick={onToggle}
            >
              {isExpanded ? "접기" : "펼치기"}
            </button>
          )}
        </div>
      </div>

      {group.linkedSong && (
        <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-zinc-600">
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5">
            <span className="text-[10px] text-zinc-400">#{group.linkedSong.id}</span>
            <span className="font-medium text-zinc-700">
              {group.linkedSong.title}
              {group.linkedSong.titleKo ? ` (${group.linkedSong.titleKo})` : ""}
            </span>
          </span>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {proposesToRender.map((propose, index) => (
          <TjProposeCard
            key={propose.id}
            propose={propose}
            isPrimary={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

type TjProposeCardProps = {
  propose: ManagerTjProposeSummary;
  isPrimary?: boolean;
};

function TjProposeCard({ propose, isPrimary = false }: TjProposeCardProps) {
  return (
    <div className="block rounded-xl border border-zinc-100 bg-white/80 p-3 shadow-sm transition hover:border-orange-200 hover:bg-orange-50/30">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 font-bold text-lg">
          {propose.hit}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900 line-clamp-2">
              {propose.songTitle}
            </p>
            {isPrimary && (
              <span className="inline-flex items-center rounded-full border border-orange-200 px-2 py-0.5 text-[10px] text-orange-600 shrink-0">
                Top
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">
            ID: <span className="font-semibold text-orange-600">{propose.id}</span>
            {" · "}
            가수: <span className="font-medium">{propose.songSinger}</span>
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] text-orange-700">
            <span className="rounded-full bg-orange-50 px-2 py-0.5">
              추천 {propose.hit}회
            </span>
            <span className="rounded-full bg-orange-50 px-2 py-0.5">
              등록 {propose.regdateView}
            </span>
            {propose.songId && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">
                Song #{propose.songId}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TjIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
    </svg>
  );
}
