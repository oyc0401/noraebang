"use client";

import { useMemo, useState, useTransition } from "react";

import { addYoutubeChannel, removeYoutubeChannel } from "../../action";
import { useManagerStore } from "../../store";
import { useArtistDetailContext } from "../artist-detail-context";

export function ArtistYoutubeDialog() {
  const { detail, setDetail } = useArtistDetailContext();
  const isOpen = useManagerStore((state) => state.isYoutubeDialogOpen);
  const closeDialog = useManagerStore((state) => state.closeYoutubeDialog);

  const [channelId, setChannelId] = useState("");
  const [channelType, setChannelType] = useState<"MAIN" | "TOPIC">("TOPIC");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const channels = useMemo(() => detail?.youtubeChannels ?? [], [detail?.youtubeChannels]);

  const handleSubmit = () => {
    if (!detail || !channelId.trim()) return;

    startTransition(async () => {
      setError(null);
      try {
        const newChannel = await addYoutubeChannel({
          artistId: detail.id,
          channelId: channelId.trim(),
          type: channelType,
        });
        setChannelId("");
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                youtubeChannels: [
                  ...prev.youtubeChannels,
                  {
                    id: newChannel.id,
                    type: newChannel.type,
                    channelId: newChannel.channelId,
                    title: newChannel.title,
                    subscriberCount: null,
                    thumbnails: { default: null, medium: null, high: null },
                  },
                ],
              }
            : prev,
        );
      } catch (err: any) {
        setError(err.message ?? "채널 추가에 실패했습니다.");
      }
    });
  };

  const handleRemove = (id: number) => {
    if (!confirm("정말 이 채널을 제거하시겠습니까?")) return;

    startTransition(async () => {
      try {
        await removeYoutubeChannel(id);
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                youtubeChannels: prev.youtubeChannels.filter((ch) => ch.id !== id),
              }
            : prev,
        );
      } catch (err: any) {
        alert(err.message ?? "채널 제거에 실패했습니다.");
      }
    });
  };

  if (!isOpen || !detail) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">유튜브 채널 관리</h3>
            <p className="text-xs text-zinc-500">채널 ID를 입력하여 아티스트에 연결하세요.</p>
          </div>
          <button
            type="button"
            className="text-sm text-zinc-400 hover:text-zinc-600 cursor-pointer disabled:cursor-not-allowed"
            onClick={closeDialog}
            disabled={isPending}
          >
            닫기
          </button>
        </div>

        {/* 채널 추가 폼 */}
        <div className="mb-4 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="채널 ID (예: UCxxxxxxx)"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
            />
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value as "MAIN" | "TOPIC")}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none cursor-pointer"
            >
              <option value="TOPIC">TOPIC</option>
              <option value="MAIN">MAIN</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              TOPIC: 자동 생성된 토픽 채널 / MAIN: 공식 채널
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !channelId.trim()}
              className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-300 cursor-pointer"
            >
              {isPending ? "추가 중..." : "추가"}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>

        {/* 연결된 채널 목록 */}
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-zinc-900 truncate">
                      {channel.title ?? channel.channelId}
                    </p>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                      {channel.type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{channel.channelId}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://www.youtube.com/channel/${channel.channelId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-blue-600 underline"
                  >
                    열기
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemove(channel.id)}
                    disabled={isPending}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer disabled:cursor-not-allowed disabled:text-zinc-400"
                  >
                    제거
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
