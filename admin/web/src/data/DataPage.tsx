import { useEffect, useState } from "react";

type ParserStatus = "idle" | "running" | "done" | "error";

type ParserJobResponse = {
  status: "started" | "already_running";
  message: string;
};

type ParserLogResponse = {
  lastExecutedAt?: string;
};

type ActionState = {
  status: ParserStatus;
  message: string;
};

const statusTextClassName: Record<ParserStatus, string> = {
  idle: "text-gray-600",
  running: "text-amber-700",
  done: "text-green-700",
  error: "text-red-700",
};

export function DataPage() {
  const [recent, setRecent] = useState<ActionState>({
    status: "idle",
    message: "최근 TJ 신곡 수집 대기 중",
  });
  const [search, setSearch] = useState<ActionState>({
    status: "idle",
    message: "아티스트 검색 수집 대기 중",
  });
  const [recentLastExecutedAt, setRecentLastExecutedAt] = useState<string>();
  const [searchLastExecutedAt, setSearchLastExecutedAt] = useState<string>();
  const [isRecentLogLoaded, setIsRecentLogLoaded] = useState(false);
  const [isSearchLogLoaded, setIsSearchLogLoaded] = useState(false);

  async function refreshRecentParserLog() {
    try {
      const log = await fetchParserLog("/api/parser/recent/log");
      setRecentLastExecutedAt(log.lastExecutedAt);
    } catch {
      setRecentLastExecutedAt(undefined);
    } finally {
      setIsRecentLogLoaded(true);
    }
  }

  async function refreshSearchParserLog() {
    try {
      const log = await fetchParserLog("/api/parser/search/log");
      setSearchLastExecutedAt(log.lastExecutedAt);
    } catch {
      setSearchLastExecutedAt(undefined);
    } finally {
      setIsSearchLogLoaded(true);
    }
  }

  useEffect(() => {
    void refreshRecentParserLog();
    void refreshSearchParserLog();
  }, []);

  async function handleRecentParser() {
    setRecent({ status: "running", message: "최근 TJ 신곡 수집 요청 중" });

    try {
      const result = await runParser("/api/parser/recent");
      setRecent({ status: "done", message: result.message });
      await refreshRecentParserLog();
    } catch (error) {
      setRecent({ status: "error", message: String(error) });
    }
  }

  async function handleSearchParser() {
    setSearch({ status: "running", message: "아티스트 검색 수집 요청 중" });

    try {
      const result = await runParser("/api/parser/search");
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
                {formatLastExecutedAt(recentLastExecutedAt, isRecentLogLoaded)}
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

function StatusText({ state }: { state: ActionState }) {
  return (
    <span className={statusTextClassName[state.status]}>{state.message}</span>
  );
}

async function runParser(path: "/api/parser/recent" | "/api/parser/search") {
  const response = await fetch(path, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as ParserJobResponse;
}

async function fetchParserLog(
  path: "/api/parser/recent/log" | "/api/parser/search/log",
): Promise<ParserLogResponse> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as ParserLogResponse;
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
