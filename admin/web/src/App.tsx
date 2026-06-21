import { useEffect, useState } from "react";
import "./tailwind.css";

type ParserStatus = "idle" | "running" | "done" | "error";

type ParserJobResponse = {
  status: "started" | "already_running";
  message: string;
};

type SearchParserLogResponse = {
  lastExecutedAt?: string;
};

type ActionState = {
  status: ParserStatus;
  message: string;
};

type AdminRoute = "home" | "data" | "queue";

type SongQueueItem = {
  id: number;
  tjNumber: string;
  title: string;
  artist?: string;
  publishdate?: string;
  catalog?: string;
  createdAt: string;
};

const statusTextClassName: Record<ParserStatus, string> = {
  idle: "text-gray-600",
  running: "text-amber-700",
  done: "text-green-700",
  error: "text-red-700",
};

async function runParser(path: "/parser/recent" | "/parser/search") {
  const response = await fetch(path, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as ParserJobResponse;
}

async function fetchSearchParserLog(): Promise<SearchParserLogResponse> {
  const response = await fetch("/parser/search/log");

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as SearchParserLogResponse;
}

function App() {
  const route = getAdminRoute();

  if (route === "data") {
    return <DataPage />;
  }

  if (route === "queue") {
    return <QueuePage />;
  }

  return <AdminHomePage />;
}

function AdminHomePage() {
  return (
    <main className="max-w-5xl p-6 text-gray-950">
      <h1 className="text-2xl font-semibold">JPOP Admin</h1>
      <p className="mt-2 text-gray-600">관리 작업 화면으로 이동합니다.</p>

      <nav aria-label="Admin navigation" className="mt-7">
        <a
          className="inline-block cursor-pointer border border-gray-900 px-3 py-2 text-gray-950 hover:bg-gray-100"
          href="/admin/data"
        >
          데이터 수집 작업
        </a>
        <a
          className="ml-2 inline-block cursor-pointer border border-gray-900 px-3 py-2 text-gray-950 hover:bg-gray-100"
          href="/admin/queue"
        >
          노래 큐 상태
        </a>
      </nav>
    </main>
  );
}

function DataPage() {
  const [recent, setRecent] = useState<ActionState>({
    status: "idle",
    message: "최근 TJ 신곡 수집 대기 중",
  });
  const [search, setSearch] = useState<ActionState>({
    status: "idle",
    message: "아티스트 검색 수집 대기 중",
  });
  const [searchLastExecutedAt, setSearchLastExecutedAt] = useState<string>();
  const [isSearchLogLoaded, setIsSearchLogLoaded] = useState(false);

  async function refreshSearchParserLog() {
    try {
      const log = await fetchSearchParserLog();
      setSearchLastExecutedAt(log.lastExecutedAt);
    } catch {
      setSearchLastExecutedAt(undefined);
    } finally {
      setIsSearchLogLoaded(true);
    }
  }

  useEffect(() => {
    void refreshSearchParserLog();
  }, []);

  async function handleRecentParser() {
    setRecent({ status: "running", message: "최근 TJ 신곡 수집 요청 중" });

    try {
      const result = await runParser("/parser/recent");
      setRecent({ status: "done", message: result.message });
    } catch (error) {
      setRecent({ status: "error", message: String(error) });
    }
  }

  async function handleSearchParser() {
    setSearch({ status: "running", message: "아티스트 검색 수집 요청 중" });

    try {
      const result = await runParser("/parser/search");
      setSearch({ status: "done", message: result.message });
      await refreshSearchParserLog();
    } catch (error) {
      setSearch({ status: "error", message: String(error) });
    }
  }

  return (
    <main className="max-w-5xl p-6 text-gray-950">
      <a className="cursor-pointer text-sm text-gray-600 underline" href="/admin">
        Admin
      </a>
      <h1 className="mt-3 text-2xl font-semibold">데이터 수집 작업</h1>
      <p className="mt-2 text-gray-600">TJ 데이터 수집 작업을 실행합니다.</p>

      <section aria-labelledby="parser-heading">
        <h2 id="parser-heading" className="mt-7 text-lg font-semibold">
          Parser
        </h2>
        <table className="mt-3 w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                작업
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                실행
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                상태
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                최근 수집
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th
                className="border border-gray-300 p-2.5 text-left font-semibold"
                scope="row"
              >
                최근 TJ 신곡 수집
              </th>
              <td className="border border-gray-300 p-2.5">
                <button
                  type="button"
                  className="cursor-pointer border border-gray-900 px-2.5 py-1.5 disabled:cursor-wait disabled:text-gray-500"
                  disabled={recent.status === "running"}
                  onClick={handleRecentParser}
                >
                  Recent Parser
                </button>
              </td>
              <td className="border border-gray-300 p-2.5">
                <StatusText state={recent} />
              </td>
              <td className="border border-gray-300 p-2.5 text-sm text-gray-600">
                -
              </td>
            </tr>
            <tr>
              <th
                className="border border-gray-300 p-2.5 text-left font-semibold"
                scope="row"
              >
                아티스트 검색 수집
              </th>
              <td className="border border-gray-300 p-2.5">
                <button
                  type="button"
                  className="cursor-pointer border border-gray-900 px-2.5 py-1.5 disabled:cursor-wait disabled:text-gray-500"
                  disabled={search.status === "running"}
                  onClick={handleSearchParser}
                >
                  Search Parser
                </button>
              </td>
              <td className="border border-gray-300 p-2.5">
                <StatusText state={search} />
              </td>
              <td className="border border-gray-300 p-2.5 text-sm text-gray-600">
                {formatLastExecutedAt(searchLastExecutedAt, isSearchLogLoaded)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}

function QueuePage() {
  const [items, setItems] = useState<SongQueueItem[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    void refreshQueue();
  }, []);

  async function refreshQueue() {
    try {
      const result = await fetchSongQueue();
      setItems(result);
      setError(undefined);
    } catch (fetchError) {
      setError(String(fetchError));
    }
  }

  return (
    <main className="max-w-5xl p-6 text-gray-950">
      <a className="cursor-pointer text-sm text-gray-600 underline" href="/admin">
        Admin
      </a>
      <h1 className="mt-3 text-2xl font-semibold">노래 큐 상태</h1>
      <p className="mt-2 text-gray-600">song_queue 테이블에 쌓인 항목입니다.</p>

      {error && <p className="mt-4 text-red-700">{error}</p>}

      {!error && !items && <p className="mt-4 text-gray-600">불러오는 중</p>}

      {!error && items && items.length === 0 && (
        <p className="mt-4 text-gray-600">큐가 비어 있습니다.</p>
      )}

      {!error && items && items.length > 0 && (
        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                TJ 번호
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                제목
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                아티스트
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                발매일
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                카탈로그
              </th>
              <th className="border border-gray-300 p-2.5 text-left" scope="col">
                등록 시각
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border border-gray-300 p-2.5">{item.tjNumber}</td>
                <td className="border border-gray-300 p-2.5">{item.title}</td>
                <td className="border border-gray-300 p-2.5">{item.artist ?? "-"}</td>
                <td className="border border-gray-300 p-2.5">{item.publishdate ?? "-"}</td>
                <td className="border border-gray-300 p-2.5">{item.catalog ?? "-"}</td>
                <td className="border border-gray-300 p-2.5">
                  {formatLastExecutedAt(item.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

async function fetchSongQueue(): Promise<SongQueueItem[]> {
  const response = await fetch("/queue");

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as SongQueueItem[];
}

function getAdminRoute(): AdminRoute {
  const pathname = window.location.pathname.replace(/\/$/, "");

  if (pathname === "/admin/data") {
    return "data";
  }

  if (pathname === "/admin/queue") {
    return "queue";
  }

  return "home";
}

function formatLastExecutedAt(
  lastExecutedAt: string | undefined,
  isLoaded = true,
): string {
  if (!isLoaded) {
    return "확인 중";
  }

  if (!lastExecutedAt) {
    return "최근 수행하지 않았음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(lastExecutedAt));
}

function StatusText({ state }: { state: ActionState }) {
  return (
    <span className={statusTextClassName[state.status]}>{state.message}</span>
  );
}

export default App;
