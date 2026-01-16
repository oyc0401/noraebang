"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { fetchManagerArtistYoutubePanel } from "../action";
import type {
  ManagerYoutubeGroupSummary,
  ManagerYoutubePanelData,
  ManagerYoutubeVideoSummary,
} from "../types";
import { useManagerStore } from "../store";
import { YoutubeIcon } from "./youtube-icon";

export function YoutubeSection() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const setRightSectionType = useManagerStore(
    (state) => state.setRightSectionType,
  );
  const [data, setData] = useState<ManagerYoutubePanelData>({
    channel: null,
    groups: [],
    orphanVideos: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>(
    {},
  );

  useEffect(() => {
    if (!selectedArtistId) {
      setData({ channel: null, groups: [], orphanVideos: [] });
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
        const response = await fetchManagerArtistYoutubePanel(selectedArtistId);
        if (!cancelled && fetchId === fetchIdRef.current) {
          setData(response);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setErrorMessage("유튜브 비디오 정보를 불러오지 못했습니다.");
          setData({ channel: null, groups: [], orphanVideos: [] });
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
        next[group.groupIndex] = prev[group.groupIndex] ?? true;
      });
      return next;
    });
  }, [data.groups]);

  const hasContent = useMemo(
    () => data.groups.length > 0 || data.orphanVideos.length > 0,
    [data.groups.length, data.orphanVideos.length],
  );

  const totalVideoCount = useMemo(() => {
    const groupVideos = data.groups.reduce(
      (sum, g) => sum + g.videos.length,
      0,
    );
    return groupVideos + data.orphanVideos.length;
  }, [data.groups, data.orphanVideos.length]);

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
          오른쪽 패널은 선택된 아티스트의 유튜브 비디오들을 보여줍니다.
        </div>
      );
    }

    if (isLoading && !data.channel) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
          유튜브 비디오 데이터를 불러오는 중...
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

    if (!data.channel) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
          연결된 토픽 채널이 없습니다.
        </div>
      );
    }

    if (!hasContent) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
          이 채널에 등록된 비디오가 없습니다.
        </div>
      );
    }

    return (
      <div className="flex h-full flex-1 min-h-0 flex-col gap-4 overflow-y-auto pr-1">
        {data.channel && (
          <div className="px-4 pt-4">
            <a
              href={`https://www.youtube.com/channel/${data.channel.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 p-3 transition hover:border-red-200"
            >
              {data.channel.thumbnailMedium ? (
                <img
                  src={data.channel.thumbnailMedium}
                  alt={data.channel.title ?? "채널"}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <YoutubeIcon className="h-5 w-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 truncate">
                  {data.channel.title ?? "토픽 채널"}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {data.channel.subscriberCount
                    ? `구독자 ${formatNumber(data.channel.subscriberCount)}명`
                    : "구독자 비공개"}
                  {data.channel.videoCount
                    ? ` · 동영상 ${data.channel.videoCount}개`
                    : ""}
                </p>
              </div>
            </a>
          </div>
        )}

        {data.groups.length > 0 && (
          <div className="pt-2">
            <div className="px-4 pb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">
                연결된 그룹 ({data.groups.length})
              </h3>
              <span className="text-xs text-zinc-500">
                연결된 곡 수 기준 정렬
              </span>
            </div>

            {data.groups.map((group) => (
              <YoutubeGroupCard
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

        {data.orphanVideos.length > 0 && (
          <div className="px-4 space-y-3 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">
                미연결 비디오 ({data.orphanVideos.length})
              </h3>
              <span className="text-xs text-zinc-500">
                곡과 연결되지 않은 비디오
              </span>
            </div>
            <div className="space-y-2">
              {data.orphanVideos.map((video) => (
                <YoutubeVideoCard key={video.videoId} video={video} />
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
      <div className="flex items-center justify-between border-b border-red-100/80 bg-gradient-to-r from-red-50/60 to-transparent px-4 pb-3 pt-4">
        <button
          type="button"
          className="text-left transition hover:opacity-70"
          onClick={() => setRightSectionType("spotify")}
        >
          <p className="text-[11px] uppercase tracking-[0.4em] text-red-500">
            YouTube
          </p>
          <h2 className="text-lg font-semibold text-zinc-900">
            유튜브 비디오 관리
          </h2>
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-red-700">
            <YoutubeIcon className="h-3.5 w-3.5" />
            {data.groups.length} / {data.orphanVideos.length}
          </span>
          <div className="flex overflow-hidden rounded-full border border-red-200 bg-white/80 text-[11px] font-semibold text-red-700">
            <button
              type="button"
              className="px-3 py-1 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
              onClick={handleCollapseAll}
              disabled={data.groups.length === 0}
            >
              모두 접기
            </button>
            <button
              type="button"
              className="border-l border-red-100 px-3 py-1 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
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

type YoutubeGroupCardProps = {
  group: ManagerYoutubeGroupSummary;
  isExpanded: boolean;
  onToggle: () => void;
};

function YoutubeGroupCard({
  group,
  isExpanded,
  onToggle,
}: YoutubeGroupCardProps) {
  const hasLinkedSongs = group.linkedSongs.length > 0;
  const videosToRender = isExpanded ? group.videos : group.videos.slice(0, 1);

  return (
    <div
      className={`border p-4 shadow-sm transition ${
        hasLinkedSongs
          ? "border-red-200 bg-red-50/30"
          : "border-gray-300 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-zinc-900">
            그룹 #{group.groupIndex}
          </p>
          <p className="text-[11px] text-zinc-500">
            {group.videos.length} 비디오 · {group.linkedSongs.length}곡 연결
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 ${
              hasLinkedSongs
                ? "border border-red-200 text-red-700"
                : "border border-dashed border-amber-200 text-amber-600"
            }`}
          >
            {hasLinkedSongs ? "연결됨" : "미연결"}
          </span>
          {group.videos.length > 1 && (
            <button
              type="button"
              className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-[11px] text-zinc-600 transition hover:border-red-200 hover:text-red-700"
              onClick={onToggle}
            >
              {isExpanded ? "접기" : "펼치기"}
            </button>
          )}
        </div>
      </div>

      {hasLinkedSongs && (
        <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-zinc-600">
          {group.linkedSongs.map((song) => (
            <span
              key={song.id}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5"
            >
              <span className="text-[10px] text-zinc-400">#{song.id}</span>
              <span className="font-medium text-zinc-700">
                {song.title}
                {song.titleKo ? ` (${song.titleKo})` : ""}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {videosToRender.map((video, index) => (
          <YoutubeVideoCard
            key={video.videoId}
            video={video}
            isPrimary={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

type YoutubeVideoCardProps = {
  video: ManagerYoutubeVideoSummary;
  isPrimary?: boolean;
};

function YoutubeVideoCard({ video, isPrimary = false }: YoutubeVideoCardProps) {
  const durationLabel = formatDuration(video.durationSeconds);
  const publishedLabel = video.publishedAt
    ? formatDate(video.publishedAt)
    : "-";
  const viewCountLabel = video.viewCount
    ? `조회수 ${formatNumber(Number(video.viewCount))}회`
    : null;

  return (
    <div className="block rounded-xl border border-zinc-100 bg-white/80 p-3 shadow-sm transition hover:border-red-200 hover:bg-red-50/30">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {video.thumbnailMedium || video.thumbnailHigh ? (
              <img
                src={video.thumbnailMedium ?? video.thumbnailHigh ?? ""}
                alt={video.title ?? "비디오"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-red-500">
                <YoutubeIcon className="h-6 w-6" />
              </span>
            )}
          </a>

          {durationLabel && (
            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
              {durationLabel}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900 line-clamp-2">
              {video.title ?? "제목 없음"}
            </p>
            {isPrimary && (
              <span className="inline-flex items-center rounded-full border border-red-200 px-2 py-0.5 text-[10px] text-red-600 shrink-0">
                Primary
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">
            Video ID:{" "}
            <span className="font-semibold text-red-600">{video.videoId}</span>
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] text-red-700">
            <span className="rounded-full bg-red-50 px-2 py-0.5">
              발매 {publishedLabel}
            </span>
            {viewCountLabel && (
              <span className="rounded-full bg-red-50 px-2 py-0.5">
                {viewCountLabel}
              </span>
            )}
            {video.likeCount != null && (
              <span className="rounded-full bg-red-50 px-2 py-0.5">
                좋아요 {formatNumber(video.likeCount)}개
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(isoString: string) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
}

function formatNumber(num: number) {
  if (num >= 100000000) {
    return `${(num / 100000000).toFixed(1)}억`;
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}만`;
  }
  return num.toLocaleString("ko-KR");
}
