import { useEffect, useState } from "react";

type SongQueueItem = {
  id: number;
  tjNumber: string;
  title: string;
  artist?: string;
  publishdate?: string;
  catalog?: string;
  createdAt: string;
};

type SongQueueListResponse = {
  data: SongQueueItem[];
};

export function QueuePage() {
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
                <td className="border border-gray-300 p-2.5">
                  {item.artist ?? "-"}
                </td>
                <td className="border border-gray-300 p-2.5">
                  {item.publishdate ?? "-"}
                </td>
                <td className="border border-gray-300 p-2.5">
                  {item.catalog ?? "-"}
                </td>
                <td className="border border-gray-300 p-2.5">
                  {formatCreatedAt(item.createdAt)}
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
  const response = await fetch("/api/queue");

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const body = (await response.json()) as SongQueueListResponse;
  return body.data;
}

function formatCreatedAt(createdAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}
