import { useState } from "react";
import "./tailwind.css";

type ParserStatus = "idle" | "running" | "done" | "error";

type ParserJobResponse = {
  status: "started" | "already_running";
  message: string;
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

async function runParser(path: "/parser/recent" | "/parser/search") {
  const response = await fetch(path, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as ParserJobResponse;
}

function App() {
  const [recent, setRecent] = useState<ActionState>({
    status: "idle",
    message: "최근 TJ 신곡 수집 대기 중",
  });
  const [search, setSearch] = useState<ActionState>({
    status: "idle",
    message: "아티스트 검색 수집 대기 중",
  });

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
    } catch (error) {
      setSearch({ status: "error", message: String(error) });
    }
  }

  return (
    <main className="max-w-5xl p-6 text-gray-950">
      <h1 className="text-2xl font-semibold">JPOP Admin</h1>
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

export default App;
