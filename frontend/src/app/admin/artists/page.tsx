'use client';

import { useAdminArtists, useAdminArtistSongs } from '@/hooks/use-admin';
import { useState } from 'react';

interface Artist {
  id: number;
  name: string;
  nameKo: string;
  alias: string | null;
  imageUrl: string | null;
  songCount: number;
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
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const { data: songs, isLoading: songsLoading } = useAdminArtistSongs(
    selectedArtist?.id || null,
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArtists = artists?.filter(
    (artist: Artist) =>
      artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.nameKo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.alias?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

            {filteredArtists?.map((artist: Artist) => (
              <button
                key={artist.id}
                onClick={() => setSelectedArtist(artist)}
                className={`w-full px-4 py-3 text-left border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                  selectedArtist?.id === artist.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {artist.imageUrl ? (
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
              {/* Song List Header */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="flex items-center gap-3">
                  {selectedArtist.imageUrl ? (
                    <img
                      src={selectedArtist.imageUrl}
                      alt={selectedArtist.nameKo}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      {selectedArtist.nameKo}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {selectedArtist.name}
                      {selectedArtist.alias && ` • @${selectedArtist.alias}`}
                    </p>
                  </div>
                  <div className="ml-auto text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {selectedArtist.songCount}곡
                  </div>
                </div>
              </div>

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
