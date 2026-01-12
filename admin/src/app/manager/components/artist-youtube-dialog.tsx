"use client";

import { useMemo } from "react";

import { useManagerStore } from "../store";
import { useArtistDetailContext } from "./artist-detail-context";

export function ArtistYoutubeDialog() {
  const { detail } = useArtistDetailContext();
  const isOpen = useManagerStore((state) => state.isYoutubeDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeYoutubeDialog);

  const channels = useMemo(() => detail?.youtubeChannels ?? [], [detail?.youtubeChannels]);

  if (!isOpen || !detail) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">유튜브 채널 관리</h3>
            <p className="text-xs text-zinc-500">추후에 직접 편집할 수 있도록 확장 예정입니다.</p>
          </div>
          <button
            type="button"
            className="text-sm text-zinc-400 hover:text-zinc-600"
            onClick={closeDialog}
          >
            닫기
          </button>
        </div>
        {channels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
            연결된 유튜브 채널이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-zinc-900">{channel.title ?? channel.channelId}</p>
                  <p className="text-xs text-zinc-500">{channel.channelId}</p>
                </div>
                <a
                  href={`https://www.youtube.com/channel/${channel.channelId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 underline"
                >
                  채널 열기
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
