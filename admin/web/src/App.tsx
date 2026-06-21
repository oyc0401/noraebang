import { Activity, DatabaseZap, Play, Search } from "lucide-react";
import { useState } from "react";
import "./styles.css";

type ParserStatus = "idle" | "running" | "done" | "error";

type ParserJobResponse = {
  status: "started" | "already_running";
  message: string;
};

type ActionState = {
  status: ParserStatus;
  message: string;
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
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">JPOP Admin</p>
          <h1>Parser Console</h1>
        </div>
        <div className="port">
          <Activity size={18} />
          <span>localhost:3002</span>
        </div>
      </header>

      <section className="panel">
        <div className="summary">
          <DatabaseZap size={22} />
          <div>
            <h2>TJ 데이터 수집</h2>
            <p>운영 DB에 TJ 원천 데이터와 신규 큐를 반영합니다.</p>
          </div>
        </div>

        <div className="actions">
          <button
            type="button"
            className="action-button"
            disabled={recent.status === "running"}
            onClick={handleRecentParser}
          >
            <Play size={18} />
            <span>Recent Parser</span>
          </button>
          <StatusBadge state={recent} />

          <button
            type="button"
            className="action-button"
            disabled={search.status === "running"}
            onClick={handleSearchParser}
          >
            <Search size={18} />
            <span>Search Parser</span>
          </button>
          <StatusBadge state={search} />
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ state }: { state: ActionState }) {
  return (
    <div className={`status status-${state.status}`}>
      <span className="dot" />
      <span>{state.message}</span>
    </div>
  );
}

export default App;
