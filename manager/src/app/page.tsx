import Link from "next/link";
import {
  BarChart3,
  Database,
  FileQuestion,
  ListMusic,
  Music2,
  RadioTower,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

const primaryLinks = [
  {
    href: "/artists",
    title: "아티스트",
    description: "아티스트 원본명, 표기, 연결 상태를 관리합니다.",
    icon: UsersRound,
  },
  {
    href: "/songs",
    title: "곡",
    description: "곡 정보와 TJ 노래방 번호 연결을 정리합니다.",
    icon: Music2,
  },
  {
    href: "/tj-songs",
    title: "TJ 원본",
    description: "TJ 수집 데이터와 신규 큐 상태를 확인합니다.",
    icon: ListMusic,
  },
  {
    href: "/reports",
    title: "신고",
    description: "사용자 제보와 수정 요청을 처리합니다.",
    icon: FileQuestion,
  },
];

const secondaryLinks = [
  { href: "/search", label: "검색 품질", icon: Search },
  { href: "/statistics", label: "통계", icon: BarChart3 },
  { href: "/sync", label: "동기화", icon: RadioTower },
  { href: "/data", label: "데이터", icon: Database },
];

export default function ManagerHome() {
  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-zinc-200 border-r bg-white px-4 py-5 lg:block">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-950 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-zinc-950">Sing It</p>
              <p className="text-sm text-zinc-500">Manager</p>
            </div>
          </div>

          <nav className="space-y-1">
            {secondaryLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-10 items-center gap-3 rounded-md px-3 font-medium text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-zinc-200 border-b bg-white px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="font-bold text-2xl text-zinc-950">
                  관리자 콘솔
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  기존 admin 기능을 새 manager 앱으로 옮기는 작업 공간
                </p>
              </div>
              <Link
                href="/settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                aria-label="설정"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </header>

          <div className="grid flex-1 gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {primaryLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="grid h-11 w-11 place-items-center rounded-md bg-zinc-100 text-zinc-800 transition group-hover:bg-zinc-950 group-hover:text-white">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className="rounded-full bg-zinc-100 px-2 py-1 font-medium text-xs text-zinc-500">
                          관리
                        </span>
                      </div>
                      <h2 className="mt-5 font-semibold text-lg text-zinc-950">
                        {item.title}
                      </h2>
                      <p className="mt-2 min-h-10 text-sm text-zinc-500">
                        {item.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold text-zinc-950">이전 작업 기준</h2>
                  <p className="text-sm text-zinc-500">admin 컨벤션 유지</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <StatusRow label="Next.js" value="16.1.0" />
                <StatusRow label="React" value="19.2.3" />
                <StatusRow label="스타일" value="Tailwind v4" />
                <StatusRow label="포트" value="3002" />
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-zinc-50 px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value}</span>
    </div>
  );
}
