"use client";

import Image from "next/image";
import { useState } from "react";
import {
  useArtistsControllerFindAllWithYoutube,
  useArtistsControllerUpdateYoutubeChannel,
} from "@/api/model/artists/artists";

export default function AdminPage() {
  const {
    data: artists = [],
    isLoading,
    refetch,
  } = useArtistsControllerFindAllWithYoutube({
    query: {
      select: (response) => response.data,
    },
  });
  const [searchQuery, setSearchQuery] = useState("");
  const youtubeMutation = useArtistsControllerUpdateYoutubeChannel();
  const updating = youtubeMutation.isPending;
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 채널 입력 모달
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<{
    alias: string;
    name: string;
  } | null>(null);

  const filteredArtists = artists?.filter(
    (artist) =>
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.nameKo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.alias?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOpenChannelModal = (alias: string, artistName: string) => {
    setSelectedArtist({ alias, name: artistName });
    setChannelUrl("");
    setShowChannelModal(true);
    setMessage(null);
  };

  const extractChannelId = (url: string): string | null => {
    // https://www.youtube.com/channel/UCxxx
    const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    if (channelMatch) return channelMatch[1];

    // https://www.youtube.com/@username
    const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
    if (handleMatch) return `@${handleMatch[1]}`;

    // https://youtube.com/c/channelname
    const customMatch = url.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/);
    if (customMatch) return customMatch[1];

    // 그냥 채널 ID만 입력한 경우
    if (url.startsWith("UC") || url.startsWith("@")) {
      return url;
    }

    return null;
  };

  const handleUpdateChannel = async () => {
    if (!selectedArtist || !channelUrl.trim()) {
      setMessage({
        type: "error",
        text: "채널 URL을 입력해주세요.",
      });
      return;
    }

    const channelId = extractChannelId(channelUrl);
    if (!channelId) {
      setMessage({
        type: "error",
        text: "올바른 YouTube 채널 URL을 입력해주세요.",
      });
      return;
    }

    setMessage(null);

    try {
      const response = await youtubeMutation.mutateAsync({
        alias: selectedArtist.alias,
        data: { channelId },
      });

      setMessage({
        type: "success",
        text: `✅ ${selectedArtist.name}: ${
          response.data.channelTitle ?? response.message ?? "업데이트 완료!"
        }`,
      });
      setShowChannelModal(false);
      setChannelUrl("");
      setSelectedArtist(null);
      refetch();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ 오류 발생: ${error.message}`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            채널 관리
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            아티스트의 YouTube 채널 정보를 관리합니다
          </p>
        </header>

        {/* 검색 */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="아티스트 검색..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
        </div>

        {/* 메시지 */}
        {message && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {isLoading && (
          <div className="text-center text-zinc-600 dark:text-zinc-400">
            로딩 중...
          </div>
        )}

        {/* 아티스트 목록 */}
        {filteredArtists && (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    썸네일
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    아티스트
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    YouTube 채널
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    구독자
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    상세 정보
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredArtists.map((artist) => (
                  <tr
                    key={artist.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3">
                      {artist.youtube?.thumbnail ? (
                        <Image
                          src={artist.youtube.thumbnail}
                          alt={artist.nameKo}
                          width={80}
                          height={48}
                          className="h-12 w-20 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {artist.nameKo}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        {artist.name}
                      </div>
                      {artist.alias && (
                        <a
                          href={`/channel/${artist.alias}`}
                          className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                        >
                          @{artist.alias}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {artist.youtube ? (
                        <div className="space-y-1">
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">
                            {artist.youtube.title}
                          </div>
                          <a
                            href={
                              artist.youtube.customUrl
                                ? `https://youtube.com/${artist.youtube.customUrl}`
                                : `https://youtube.com/channel/${artist.youtube.channelId}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {artist.youtube.customUrl ||
                              artist.youtube.channelId}
                          </a>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-400 dark:text-zinc-500">
                          채널 정보 없음
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {artist.youtube?.subscriberCount ? (
                        <span className="text-zinc-900 dark:text-zinc-50">
                          {artist.youtube.subscriberCount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-zinc-400 dark:text-zinc-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {artist.youtube ? (
                        <div className="max-w-xs space-y-1">
                          {artist.youtube.videoCount && (
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                              동영상{" "}
                              {artist.youtube.videoCount.toLocaleString()}개
                            </div>
                          )}
                          {artist.youtube.description && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-500 line-clamp-2">
                              {artist.youtube.description}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-400 dark:text-zinc-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          artist.alias &&
                          handleOpenChannelModal(artist.alias, artist.nameKo)
                        }
                        disabled={updating || !artist.alias}
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                      >
                        채널 설정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredArtists && filteredArtists.length === 0 && (
          <div className="text-center text-zinc-500 dark:text-zinc-400">
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {/* 채널 입력 모달 */}
      {showChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-zinc-900 shadow-xl">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                YouTube 채널 설정 - {selectedArtist?.name}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                YouTube 채널 링크를 입력해주세요
              </p>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label
                  htmlFor="youtube-channel-url"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  YouTube 채널 URL
                </label>
                <input
                  id="youtube-channel-url"
                  type="text"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateChannel()}
                  placeholder="https://www.youtube.com/channel/UCxxx 또는 https://www.youtube.com/@channelname"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  채널 페이지 URL을 복사해서 붙여넣기 하세요
                </p>
              </div>

              {/* 에러 메시지 표시 */}
              {message && message.type === "error" && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {message.text}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowChannelModal(false);
                  setChannelUrl("");
                  setSelectedArtist(null);
                }}
                disabled={updating}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleUpdateChannel}
                disabled={updating || !channelUrl.trim()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
              >
                {updating ? "처리 중..." : "적용"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
