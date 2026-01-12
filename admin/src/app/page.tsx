/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            관리자 대시보드
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            노래방 검색 서비스 관리 시스템
          </p>
          <div className="mt-4">
            <Link
              href="/manager"
              className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600 cursor-pointer"
            >
              관리자 매니저 페이지로 돌아가기
            </Link>
          </div>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/artists"
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
            href="/tj-artist"
            className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
                <svg
                  className="h-6 w-6 text-amber-600 dark:text-amber-400"
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
                  TJ 아티스트
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  TjSong 기반 아티스트/곡 상태 확인
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/youtube"
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

          <Link
            href="/song"
            className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/30">
                <svg
                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 18V5l12-3v13M9 18c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  곡 상세 관리
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  곡 정보, 아티스트, 노래방 필터
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
