'use client';

import { useSongs } from '@/hooks/use-songs';
import { useState } from 'react';
import { Provider } from '@/types/models';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: songs, isLoading, error } = useSongs(searchQuery);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-12">
          <h1 className="mb-4 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            노래방 검색
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            일본 노래를 검색해보세요
          </p>
        </header>

        <div className="mb-8">
          <input
            type="text"
            placeholder="곡명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
          />
        </div>

        {isLoading && (
          <div className="text-center text-zinc-600 dark:text-zinc-400">
            로딩 중...
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            에러가 발생했습니다: {error.message}
          </div>
        )}

        {songs && (
          <div className="space-y-4">
            {songs.length === 0 ? (
              <div className="text-center text-zinc-600 dark:text-zinc-400">
                검색 결과가 없습니다
              </div>
            ) : (
              songs.map((song) => (
                <div
                  key={song.id}
                  className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-4">
                    <div className="mb-2">
                      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        {song.title}
                      </h2>
                      {song.titleKo && (
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                          {song.titleKo}
                        </p>
                      )}
                    </div>
                    {song.primaryArtist && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="rounded-full bg-zinc-200 px-3 py-1 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {song.primaryArtist.name}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-500">
                          {song.primaryArtist.nameKo}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {song.karaokeSongs.map((karaoke) => (
                      <div
                        key={karaoke.id}
                        className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
                      >
                        <span
                          className={`font-semibold ${
                            karaoke.provider === Provider.TJ
                              ? 'text-blue-600 dark:text-blue-400'
                              : karaoke.provider === Provider.KY
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          {karaoke.provider}
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {karaoke.karaokeNo}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
