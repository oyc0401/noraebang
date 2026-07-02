import "./tailwind.css";
import { ArtistCreationQueuePage } from "./artist-creation-queue/ArtistCreationQueuePage";
import { DataPage } from "./data/DataPage";
import { MediaPage } from "./media/MediaPage";
import { QueuePage } from "./queue/QueuePage";
import { SongPage } from "./song/SongPage";
import { SongArtistQueuePage } from "./song-artist-queue/SongArtistQueuePage";
import { SongCreationQueuePage } from "./song-creation-queue/SongCreationQueuePage";
import { TjSongPage } from "./tj-song/TjSongPage";

type AdminRoute =
  | "home"
  | "data"
  | "queue"
  | "song"
  | "tj-song"
  | "media"
  | "song-artist-queue"
  | "artist-creation-queue"
  | "song-creation-queue";

function App() {
  const route = getAdminRoute();
  document.title = getDocumentTitle(route);

  if (route === "data") {
    return <DataPage />;
  }

  if (route === "queue") {
    return <QueuePage />;
  }

  if (route === "song") {
    return <SongPage />;
  }

  if (route === "tj-song") {
    return <TjSongPage />;
  }

  if (route === "media") {
    return <MediaPage />;
  }

  if (route === "song-artist-queue") {
    return <SongArtistQueuePage />;
  }

  if (route === "artist-creation-queue") {
    return <ArtistCreationQueuePage />;
  }

  if (route === "song-creation-queue") {
    return <SongCreationQueuePage />;
  }

  return <AdminHomePage />;
}

function getDocumentTitle(route: AdminRoute): string {
  if (route === "data") {
    return "Admin - 신곡 수집";
  }

  if (route === "queue") {
    return "Admin - 신곡 큐";
  }

  if (route === "song") {
    return "Admin - Song";
  }

  if (route === "tj-song") {
    return "Admin - TJ Song";
  }

  if (route === "media") {
    return "Admin - 미디어";
  }

  if (route === "song-artist-queue") {
    return "Admin - 곡-가수 큐";
  }

  if (route === "artist-creation-queue") {
    return "Admin - 가수 생성 큐";
  }

  if (route === "song-creation-queue") {
    return "Admin - 곡 생성 큐";
  }

  return "Admin - 대시보드";
}

function AdminHomePage() {
  return (
    <main className="max-w-5xl p-6 text-gray-950">
      <h1 className="text-2xl font-semibold">JPOP Admin</h1>
      <p className="mt-2 text-gray-600">어드민 페이지 대시보드</p>

      <nav aria-label="Admin navigation" className="mt-7 grid gap-8">
        <section aria-labelledby="data-section-heading">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="data-section-heading" className="text-lg font-semibold">
              데이터 조회
            </h2>
            <a
              className="text-sm text-gray-600 underline"
              href="http://localhost:3002/api/docs"
            >
              http://localhost:3002/api/docs
            </a>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminLink href="/admin/song">Song</AdminLink>
            <AdminLink href="/admin/tj-song">TJ Song</AdminLink>
            <AdminLink href="/admin/media">미디어</AdminLink>
          </div>
        </section>

        <section aria-labelledby="collection-section-heading">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="collection-section-heading"
              className="text-lg font-semibold"
            >
              Collection
            </h2>
            <a
              className="text-sm text-gray-600 underline"
              href="http://localhost:3002/api/docs/collection"
            >
              http://localhost:3002/api/docs/collection
            </a>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminLink href="/admin/data">신곡 수집</AdminLink>
            <AdminLink href="/admin/queue">신곡 큐</AdminLink>
            <AdminLink href="/admin/song-artist-queue">곡-가수 큐</AdminLink>
            <AdminLink href="/admin/artist-creation-queue">
              가수 생성 큐
            </AdminLink>
            <AdminLink href="/admin/song-creation-queue">곡 생성 큐</AdminLink>
          </div>
        </section>
      </nav>

      <section aria-labelledby="database-section-heading" className="mt-8">
        <h2 id="database-section-heading" className="text-lg font-semibold">
          Database
        </h2>
        <a
          className="mt-3 inline-block text-sm text-gray-600 underline"
          href="http://localhost:8080/?pgsql=host.docker.internal&username=postgres&db=jpop&ns=public"
        >
          http://localhost:8080/?pgsql=host.docker.internal&username=postgres&db=jpop&ns=public
        </a>
      </section>
    </main>
  );
}

function AdminLink({ children, href }: { children: string; href: string }) {
  return (
    <a
      className="inline-block cursor-pointer border border-gray-900 px-3 py-2 text-gray-950 hover:bg-gray-100"
      href={href}
    >
      {children}
    </a>
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

  if (pathname === "/admin/tj-song") {
    return "tj-song";
  }

  if (pathname === "/admin/media") {
    return "media";
  }

  if (pathname === "/admin/song-artist-queue") {
    return "song-artist-queue";
  }

  if (pathname === "/admin/artist-creation-queue") {
    return "artist-creation-queue";
  }

  if (pathname === "/admin/song-creation-queue") {
    return "song-creation-queue";
  }

  return "home";
}

export default App;
