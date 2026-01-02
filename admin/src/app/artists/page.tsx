"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getArtists, getSongsByArtist, updateYoutubeChannel } from "./actions";

const SORT_OPTIONS = [
  { value: "id_desc", label: "최신" },
  { value: "name_asc", label: "이름 ↑" },
  { value: "name_desc", label: "이름 ↓" },
] as const;

type Artist = {
  id: number;
  name: string;
  nameKo: string;
  alias?: string;
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  songCount: number;
  youtube?: {
    channelId: string;
    title?: string;
    customUrl?: string;
    description?: string;
    subscriberCount?: number;
    videoCount?: number;
    thumbnailDefault?: string;
    thumbnailMedium?: string;
    thumbnailHigh?: string;
  };
};

type Song = {
  id: number;
  title: string;
  titleKo?: string;
  karaokeSongs: {
    provider: string;
    karaokeNo: string;
  }[];
};

export default function AdminArtistsPage() {
  const [sort, setSort] = useState("name_asc");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showYoutubeSection, setShowYoutubeSection] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadArtists();
  }, [sort]);

  useEffect(() => {
    if (selectedArtist) {
      loadSongs(selectedArtist.id);
    }
  }, [selectedArtist]);

  const loadArtists = async () => {
    setLoading(true);
    const data = await getArtists(sort);
    setArtists(data);
    setLoading(false);
  };

  const loadSongs = async (artistId: number) => {
    setSongsLoading(true);
    const data = await getSongsByArtist(artistId);
    setSongs(data);
    setSongsLoading(false);
  };

  const filteredArtists = artists.filter(
    (artist) =>
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.nameKo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.alias?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const extractChannelId = (url: string): string | null => {
    const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    if (channelMatch) return channelMatch[1];

    const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
    if (handleMatch) return `@${handleMatch[1]}`;

    const customMatch = url.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/);
    if (customMatch) return customMatch[1];

    if (url.startsWith("UC") || url.startsWith("@")) {
      return url;
    }

    return null;
  };

  const handleUpdateChannel = async () => {
    if (!selectedArtist || !channelUrl.trim()) {
      setMessage({ type: "error", text: "채널 URL을 입력해주세요." });
      return;
    }

    const channelId = extractChannelId(channelUrl);
    if (!channelId) {
      setMessage({ type: "error", text: "올바른 YouTube 채널 URL을 입력해주세요." });
      return;
    }

    setMessage(null);
    setUpdating(true);

    try {
      const result = await updateYoutubeChannel(selectedArtist.id, channelId);
      setMessage({
        type: "success",
        text: `✅ ${selectedArtist.nameKo}: ${result.channelTitle ?? result.message}`,
      });
      setChannelUrl("");
      await loadArtists();
    } catch (error: any) {
      setMessage({ type: "error", text: `❌ 오류 발생: ${error.message}` });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Artist & Songs 관리
        </h1>
      </div>

      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="아티스트 검색..."
          className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>

      {message && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
              Artists ({filteredArtists.length})
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <div className="p-4 text-center text-sm text-zinc-500">로딩 중...</div>}
            {filteredArtists.map((artist) => (
              <button
                type="button"
                key={artist.id}
                onClick={() => setSelectedArtist(artist)}
                className={`w-full px-4 py-3 text-left border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  selectedArtist?.id === artist.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {artist.thumbnailHigh || artist.thumbnailMedium || artist.thumbnailDefault ? (
                    <Image
                      src={artist.thumbnailHigh || artist.thumbnailMedium || artist.thumbnailDefault || ""}
                      alt={artist.nameKo}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {artist.nameKo}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {artist.name}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {artist.songCount}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
          {selectedArtist ? (
            <>
              <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="flex items-center gap-3">
                  {selectedArtist.thumbnailHigh ||
                  selectedArtist.thumbnailMedium ||
                  selectedArtist.thumbnailDefault ? (
                    <Image
                      src={
                        selectedArtist.thumbnailHigh ||
                        selectedArtist.thumbnailMedium ||
                        selectedArtist.thumbnailDefault ||
                        ""
                      }
                      alt={selectedArtist.nameKo}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      {selectedArtist.nameKo}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {selectedArtist.name}
                      {selectedArtist.alias && <> • @{selectedArtist.alias}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedArtist.alias && (
                      <button
                        type="button"
                        onClick={() => setShowYoutubeSection(!showYoutubeSection)}
                        className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 159 110" className="h-6 w-9">
                          <path
                            fill="#FF0000"
                            d="M154 17.5c-1.82-6.73-7.07-12-13.8-13.8-9.04-3.49-96.6-5.2-122 0.1-6.73 1.82-12 7.07-13.8 13.8-4.08 17.9-4.39 56.6 0.1 74.9 1.82 6.73 7.07 12 13.8 13.8 17.9 4.12 103 4.7 122 0 6.73-1.82 12-7.07 13.8-13.8 4.35-19.5 4.66-55.8-0.1-75z"
                          />
                          <path fill="#FFF" d="M105 55L64.2 31.6v46.8z" />
                        </svg>
                      </button>
                    )}
                    <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {selectedArtist.songCount}곡
                    </div>
                  </div>
                </div>
              </div>

              {showYoutubeSection && selectedArtist.alias && (
                <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                    YouTube 채널 정보
                  </h3>

                  {selectedArtist.youtube ? (
                    <div className="mb-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {selectedArtist.youtube.title}
                      </div>
                      <a
                        href={
                          selectedArtist.youtube.customUrl
                            ? `https://youtube.com/${selectedArtist.youtube.customUrl}`
                            : `https://youtube.com/channel/${selectedArtist.youtube.channelId}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {selectedArtist.youtube.customUrl || selectedArtist.youtube.channelId}
                      </a>
                      {selectedArtist.youtube.subscriberCount && (
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                          구독자 {selectedArtist.youtube.subscriberCount.toLocaleString()}명
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">채널 정보가 없습니다</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={channelUrl}
                      onChange={(e) => setChannelUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateChannel()}
                      placeholder="https://www.youtube.com/channel/UCxxx"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    <button
                      type="button"
                      onClick={handleUpdateChannel}
                      disabled={updating || !channelUrl.trim()}
                      className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900"
                    >
                      {updating ? "처리 중..." : "채널 정보 업데이트"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">
                {songsLoading && <div className="text-center text-sm text-zinc-500">로딩 중...</div>}
                {songs.length === 0 && !songsLoading && (
                  <div className="text-center text-sm text-zinc-500">곡이 없습니다</div>
                )}
                <div className="space-y-2">
                  {songs.map((song) => (
                    <div
                      key={song.id}
                      className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
                    >
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">{song.title}</div>
                      {song.titleKo && song.titleKo !== song.title && (
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{song.titleKo}</div>
                      )}
                      {song.karaokeSongs.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {song.karaokeSongs.map((kn) => (
                            <span
                              key={`${kn.provider}-${kn.karaokeNo}`}
                              className="text-xs px-2 py-1 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              {kn.provider} {kn.karaokeNo}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-zinc-500 dark:text-zinc-400">
                <p className="text-sm">왼쪽에서 아티스트를 선택하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
