import "./tailwind.css";
import { ArtistCreationQueuePage } from "./artist-creation-queue/ArtistCreationQueuePage";
import { DataPage } from "./data/DataPage";
import { QueuePage } from "./queue/QueuePage";
import { SongPage } from "./song/SongPage";
import { SongArtistQueuePage } from "./song-artist-queue/SongArtistQueuePage";

type AdminRoute =
  | "home"
  | "data"
  | "queue"
  | "song"
  | "song-artist-queue"
  | "artist-creation-queue";

function App() {
  const route = getAdminRoute();

  if (route === "data") {
    return <DataPage />;
  }

  if (route === "queue") {
    return <QueuePage />;
  }

  if (route === "song") {
    return <SongPage />;
  }

  if (route === "song-artist-queue") {
    return <SongArtistQueuePage />;
  }

  if (route === "artist-creation-queue") {
    return <ArtistCreationQueuePage />;
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
          href="/admin/song"
        >
          전체 곡
        </a>
        <a
          className="ml-2 inline-block cursor-pointer border border-gray-900 px-3 py-2 text-gray-950 hover:bg-gray-100"
          href="/admin/queue"
        >
          노래 큐 상태
        </a>
        <a
          className="ml-2 inline-block cursor-pointer border border-gray-900 px-3 py-2 text-gray-950 hover:bg-gray-100"
          href="/admin/song-artist-queue"
        >
          가수있는곡큐 상태
        </a>
        <a
          className="ml-2 inline-block cursor-pointer border border-gray-900 px-3 py-2 text-gray-950 hover:bg-gray-100"
          href="/admin/artist-creation-queue"
        >
          가수생성큐 상태
        </a>
      </nav>
    </main>
  );
}

function getAdminRoute(): AdminRoute {
  const pathname = window.location.pathname.replace(/\/$/, "");

  if (pathname === "/admin/data") {
    return "data";
  }

  if (pathname === "/admin/queue") {
    return "queue";
  }

  if (pathname === "/admin/song") {
    return "song";
  }

  if (pathname === "/admin/song-artist-queue") {
    return "song-artist-queue";
  }

  if (pathname === "/admin/artist-creation-queue") {
    return "artist-creation-queue";
  }

  return "home";
}

export default App;
