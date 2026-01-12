"use client";

import { useManagerStore } from "../store";
import type { ManagerArtistDetail } from "../types";

export function YoutubeInfoCard({ detail }: { detail: ManagerArtistDetail }) {
  const youtubeChannels = detail.youtubeChannels ?? [];
  const openYoutubeDialog = useManagerStore((state) => state.openYoutubeDialog);

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/40">
      <div className="flex items-center justify-between border-b border-red-100 px-4 py-2">
        <div>
          <p className="text-xs font-semibold text-red-700">YouTube 채널</p>
        </div>
        <button
          type="button"
          onClick={openYoutubeDialog}
          className="cursor-pointer rounded border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
        >
          편집
        </button>
      </div>
      {youtubeChannels.length === 0 ? (
        <div className="px-4 py-3 text-xs text-red-500">
          연결된 유튜브 채널이 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-red-100">
          {youtubeChannels.map((channel) => {
            const thumb =
              channel.thumbnails.default ??
              channel.thumbnails.medium ??
              channel.thumbnails.high ??
              null;
            const channelUrl = `https://www.youtube.com/channel/${channel.channelId}`;
            return (
              <a
                key={channel.id}
                href={channelUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-red-50/70"
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-red-100">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={channel.title ?? channel.channelId}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-red-500">
                      YT
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">
                    {channel.title ?? "채널 이름 없음"}
                  </p>
                  <p className="text-[11px] text-red-500">
                    {channel.type} · {channel.channelId}
                  </p>
                </div>
                {channel.subscriberCount ? (
                  <span className="text-xs font-semibold text-red-700">
                    {channel.subscriberCount.toLocaleString()}명
                  </span>
                ) : (
                  <span className="text-[11px] text-red-400">
                    구독자 정보 없음
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
