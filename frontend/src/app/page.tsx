'use client';

import { useArtists } from '@/hooks/use-artists';
import Link from 'next/link';

export default function Home() {
  const { data: artists, isLoading, error } = useArtists();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-12">
          <h1 className="mb-4 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            노래방 검색
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            아티스트를 선택해주세요
          </p>
        </header>

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

        {artists && (
          <div className="grid gap-4 sm:grid-cols-2">
            {artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/${artist.pathname}`}
                className="group rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <h2 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
                  {artist.name}
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {artist.nameKo}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
