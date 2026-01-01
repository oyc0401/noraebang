'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AdminDashboard() {
  const [crawlingJobs] = useState([
    { name: 'TJ 노래 크롤링', lastRun: '2024-01-15 14:23:11', status: '완료', implemented: false },
    { name: 'YouTube 채널 정보 업데이트', lastRun: '2024-01-15 12:00:00', status: '완료', implemented: false },
    { name: 'Spotify API 동기화', lastRun: '-', status: '대기중', implemented: false },
  ]);

  const [pendingReviews] = useState({
    channels: 3,
    songs: 15,
    implemented: false,
  });

  const [recentSongs] = useState([
    { title: 'マリーゴールド', artist: 'あいみょん', addedAt: '2시간 전', implemented: false },
    { title: '君はロックを聴かない', artist: 'あいみょん', addedAt: '5시간 전', implemented: false },
    { title: 'ハルノヒ', artist: 'あいみょん', addedAt: '1일 전', implemented: false },
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            관리자 대시보드
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            노래방 검색 서비스 관리 시스템
          </p>
        </header>

        {/* Quick Navigation */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/artists"
            className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                <svg
                  className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  아티스트 & 곡 관리
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  아티스트와 곡 정보 관리
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/youtube"
            className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
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
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  YouTube 채널 관리
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  YouTube 채널 정보 연동
                </p>
              </div>
            </div>
          </Link>

          <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 p-6 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
                <svg
                  className="h-6 w-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  통계
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  서비스 이용 통계 (미구현)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Reviews */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                검수 대기
              </h2>
              {!pendingReviews.implemented && (
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  미구현
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                    <svg
                      className="h-5 w-5 text-orange-600 dark:text-orange-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    검수 안한 채널
                  </span>
                </div>
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {pendingReviews.channels}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                    <svg
                      className="h-5 w-5 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                      />
                    </svg>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    검수 안한 곡
                  </span>
                </div>
                <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {pendingReviews.songs}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Songs */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                최신 곡
              </h2>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                미구현
              </span>
            </div>
            <div className="space-y-3">
              {recentSongs.map((song, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {song.title}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {song.artist}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500">
                    {song.addedAt}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Crawling Jobs */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                크롤링 작업
              </h2>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                미구현
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full">
                <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      작업 이름
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      마지막 실행
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      상태
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {crawlingJobs.map((job, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">
                          {job.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          {job.lastRun}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            job.status === '완료'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          disabled
                          className="rounded-lg bg-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-500"
                        >
                          실행
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
