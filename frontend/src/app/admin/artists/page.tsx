'use client';

import { useAdminArtists, useAdminArtistSongs } from '@/hooks/use-admin';
import { useArtistsWithYoutube } from '@/hooks/use-artists';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';

interface Artist {
  id: number;
  name: string;
  nameKo: string;
  alias: string | null;
  imageUrl: string | null;
  songCount: number;
  aliasGroup?: {
    groupId: string;
    aliases: string[];
  } | null;
}

interface Song {
  id: number;
  title: string;
  titleKo: string | null;
  role: string | null;
  karaokeNumbers: {
    provider: string;
    karaokeNo: string;
  }[];
}

export default function AdminArtistsPage() {
  const { data: artists, isLoading: artistsLoading } = useAdminArtists();
  const { data: artistsWithYoutube, refetch: refetchYoutube } = useArtistsWithYoutube();
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const { data: songs, isLoading: songsLoading } = useAdminArtistSongs(
    selectedArtist?.id || null,
  );
  const [searchQuery, setSearchQuery] = useState('');

  // YouTube 채널 관리
  const [showYoutubeSection, setShowYoutubeSection] = useState(false);
  const [channelUrl, setChannelUrl] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Merge artists with YouTube info
  const mergedArtists = artists?.map((artist: Artist) => {
    const youtubeInfo = artistsWithYoutube?.find(yt => yt.id === artist.id);
    return {
      ...artist,
      youtube: youtubeInfo?.youtube,
    };
  });

  const filteredArtists = mergedArtists?.filter(
    (artist: Artist & { youtube?: any }) =>
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.nameKo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.alias?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 초기 로드시 URL 해시로부터 아티스트 선택
  useEffect(() => {
    if (!mergedArtists || mergedArtists.length === 0 || selectedArtist) return;

    const hash = window.location.hash;
    if (hash) {
      const artistId = parseInt(hash.replace('#', ''), 10);
      const artist = mergedArtists.find((a: Artist) => a.id === artistId);
      if (artist) {
        setSelectedArtist(artist);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artists]);

  // 아티스트 선택시 URL 해시 업데이트
  useEffect(() => {
    if (selectedArtist) {
      window.history.replaceState(null, '', `#${selectedArtist.id}`);

      // 선택된 아티스트로 스크롤
      const element = document.getElementById(`artist-${selectedArtist.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedArtist]);

  // 키보드 이벤트 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!filteredArtists || filteredArtists.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();

        const currentIndex = selectedArtist
          ? filteredArtists.findIndex((a: Artist) => a.id === selectedArtist.id)
          : -1;

        let nextIndex: number;
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < filteredArtists.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : filteredArtists.length - 1;
        }

        setSelectedArtist(filteredArtists[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredArtists, selectedArtist]);

  const extractChannelId = (url: string): string | null => {
    const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    if (channelMatch) return channelMatch[1];

    const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
    if (handleMatch) return `@${handleMatch[1]}`;

    const customMatch = url.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/);
    if (customMatch) return customMatch[1];

    if (url.startsWith('UC') || url.startsWith('@')) {
      return url;
    }

    return null;
  };

  const handleUpdateChannel = async () => {
    if (!selectedArtist || !channelUrl.trim()) {
      setMessage({
        type: 'error',
        text: '채널 URL을 입력해주세요.',
      });
      return;
    }

    const channelId = extractChannelId(channelUrl);
    if (!channelId) {
      setMessage({
        type: 'error',
        text: '올바른 YouTube 채널 URL을 입력해주세요.',
      });
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/youtube/update-artist-channel/${selectedArtist.alias}?channelId=${encodeURIComponent(channelId)}`,
        { method: 'POST' }
      );

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.message || result.error?.message || `오류 (${response.status})`;
        setMessage({
          type: 'error',
          text: `❌ ${selectedArtist.nameKo}: ${errorMessage}`,
        });
        return;
      }

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✅ ${selectedArtist.nameKo}: ${result.data.channelTitle}로 업데이트 완료!`,
        });
        setChannelUrl('');
        refetchYoutube();
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ 오류 발생: ${error.message}`,
      });
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'MAIN':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'FEATURING':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'PRODUCER':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'MAIN':
        return '메인';
      case 'FEATURING':
        return '피처링';
      case 'PRODUCER':
        return '프로듀서';
      default:
        return '-';
    }
  };

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Artist & Songs 관리
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          아티스트와 곡을 관리합니다
        </p>
      </div>

      {/* Search */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="아티스트 검색..."
          className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
        />
      </div>

      {/* Message */}
      {message && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Artist List */}
        <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
          {/* Artist List Header */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-2">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
              Artists ({filteredArtists?.length || 0})
            </div>
          </div>

          {/* Artist List */}
          <div className="flex-1 overflow-y-auto">
            {artistsLoading && (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                로딩 중...
              </div>
            )}

            {filteredArtists?.map((artist: any) => (
              <button
                key={artist.id}
                id={`artist-${artist.id}`}
                onClick={() => setSelectedArtist(artist)}
                className={`w-full px-4 py-3 text-left border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                  selectedArtist?.id === artist.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {artist.youtube?.thumbnail ? (
                    <img
                      src={artist.youtube.thumbnail}
                      alt={artist.nameKo}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : artist.imageUrl ? (
                    <img
                      src={artist.imageUrl}
                      alt={artist.nameKo}
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

            {filteredArtists?.length === 0 && !artistsLoading && (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                검색 결과가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Right: Song List */}
        <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
          {selectedArtist ? (
            <>
              {/* Artist Info Header */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="flex items-center gap-3">
                  {(selectedArtist as any).youtube?.thumbnail ? (
                    <img
                      src={(selectedArtist as any).youtube.thumbnail}
                      alt={selectedArtist.nameKo}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : selectedArtist.imageUrl ? (
                    <img
                      src={selectedArtist.imageUrl}
                      alt={selectedArtist.nameKo}
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
                      {selectedArtist.alias && (
                        <>
                          {' • '}
                          <a
                            href={`/channel/${selectedArtist.alias}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            @{selectedArtist.alias}
                          </a>
                        </>
                      )}
                    </p>
                    {selectedArtist.aliasGroup && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          별칭 그룹:
                        </span>
                        <div className="flex gap-1">
                          {selectedArtist.aliasGroup.aliases.map((alias) => (
                            <span
                              key={alias}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                alias === selectedArtist.alias
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {alias}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedArtist.alias && (
                      <button
                        onClick={() => setShowYoutubeSection(!showYoutubeSection)}
                        className="rounded-lg p-2 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="YouTube 정보"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 159 110"
                          className="h-6 w-9"
                        >
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

              {/* Expandable YouTube Section */}
              {showYoutubeSection && selectedArtist.alias && (
                <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                    YouTube 채널 정보
                  </h3>

                  {/* Current YouTube Info */}
                  {(selectedArtist as any).youtube ? (
                    <div className="mb-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <div className="space-y-2">
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">
                            {(selectedArtist as any).youtube.title}
                          </div>
                          <a
                            href={
                              (selectedArtist as any).youtube.customUrl
                                ? `https://youtube.com/${(selectedArtist as any).youtube.customUrl}`
                                : `https://youtube.com/channel/${(selectedArtist as any).youtube.channelId}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {(selectedArtist as any).youtube.customUrl || (selectedArtist as any).youtube.channelId}
                          </a>
                        </div>
                        {(selectedArtist as any).youtube.subscriberCount && (
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            구독자 {(selectedArtist as any).youtube.subscriberCount.toLocaleString()}명
                          </div>
                        )}
                        {(selectedArtist as any).youtube.videoCount && (
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            동영상 {(selectedArtist as any).youtube.videoCount.toLocaleString()}개
                          </div>
                        )}
                        {(selectedArtist as any).youtube.description && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                            {(selectedArtist as any).youtube.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        채널 정보가 없습니다
                      </p>
                    </div>
                  )}

                  {/* Update Channel Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        YouTube 채널 URL
                      </label>
                      <input
                        type="text"
                        value={channelUrl}
                        onChange={(e) => setChannelUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateChannel()}
                        placeholder="https://www.youtube.com/channel/UCxxx 또는 https://www.youtube.com/@channelname"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
                      />
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        채널 페이지 URL을 복사해서 붙여넣기 하세요
                      </p>
                    </div>
                    <button
                      onClick={handleUpdateChannel}
                      disabled={updating || !channelUrl.trim()}
                      className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                    >
                      {updating ? '처리 중...' : '채널 정보 업데이트'}
                    </button>
                  </div>
                </div>
              )}

              {/* Song List */}
              <div className="flex-1 overflow-y-auto p-6">
                {songsLoading && (
                  <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                    로딩 중...
                  </div>
                )}

                {songs && songs.length === 0 && (
                  <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                    곡이 없습니다
                  </div>
                )}

                <div className="space-y-2">
                  {songs?.map((song: Song) => (
                    <div
                      key={song.id}
                      className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">
                            {song.title}
                          </div>
                          {song.titleKo && song.titleKo !== song.title && (
                            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {song.titleKo}
                            </div>
                          )}
                          {song.karaokeNumbers.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {song.karaokeNumbers.map((kn, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                >
                                  {kn.provider} {kn.karaokeNo}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {song.role && (
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium ${getRoleBadgeColor(song.role)}`}
                          >
                            {getRoleLabel(song.role)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-zinc-500 dark:text-zinc-400">
                <svg
                  className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
                <p className="text-sm">왼쪽에서 아티스트를 선택하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
