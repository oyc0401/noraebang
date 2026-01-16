"use client";

import { useEffect, useRef, useState } from "react";

import { fetchManagerArtistYoutubePanel } from "../action";
import type {
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
    videos: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!selectedArtistId) {
      setData({ channel: null, videos: [] });
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
          setData({ channel: null, videos: [] });
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

        {data.videos.length > 0 && (
          <div className="px-4 pb-4">
            <div className="pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800">
                비디오 ({data.videos.length})
              </h3>
              <span className="text-xs text-zinc-500">
                발매일 기준 정렬
              </span>
            </div>
            <div className="space-y-2">
              {data.videos.map((video) => (
                <YoutubeVideoCard key={video.videoId} video={video} />
              ))}
            </div>
          </div>
        )}

        {data.videos.length === 0 && data.channel && (
          <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
            이 채널에 등록된 비디오가 없습니다.
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
            {data.videos.length}개
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">{renderBody()}</div>
    </section>
  );
}

type YoutubeVideoCardProps = {
  video: ManagerYoutubeVideoSummary;
};

function YoutubeVideoCard({ video }: YoutubeVideoCardProps) {
  const durationLabel = formatDuration(video.durationSeconds);
  const publishedLabel = video.publishedAt
    ? formatDate(video.publishedAt)
    : "-";
  const viewCountLabel = video.viewCount
    ? `조회수 ${formatNumber(Number(video.viewCount))}회`
    : null;

  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-zinc-100 bg-white/80 p-3 shadow-sm transition hover:border-red-200 hover:bg-red-50/30"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
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
          {durationLabel && (
            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
              {durationLabel}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 line-clamp-2">
            {video.title ?? "제목 없음"}
          </p>
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
    </a>
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
