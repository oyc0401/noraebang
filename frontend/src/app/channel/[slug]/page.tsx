import { artistsControllerFindByIdOrSlug } from "@/api/model/artists/artists";
import { SongList } from "@/components/song/SongList";
import { CircleThumbnail } from "@/components/common/CircleThumbnail";
import Link from "next/link";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await artistsControllerFindByIdOrSlug(slug);

  if (!artist.data) {
    return <div>아티스트를 찾을 수 없습니다</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* 아티스트 헤더 */}
      <header className="bg-gradient-to-b from-zinc-900 to-black px-4 py-12">
        <Link
          href="/"
          className="text-zinc-400 hover:text-white mb-4 inline-block"
        >
          ← 홈으로
        </Link>

        <div className="flex items-center gap-6 mt-4">
          <CircleThumbnail
            src={artist.data.thumbnailMedium || artist.data.thumbnailDefault}
            alt={artist.data.nameKo}
            size="w-32 h-32"
          />
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {artist.data.nameKo}
            </h1>
            <p className="text-xl text-zinc-400">{artist.data.name}</p>
            {artist.data.songCount !== undefined &&
              artist.data.songCount !== null && (
                <p className="text-sm text-zinc-500 mt-2">
                  곡 {artist.data.songCount}개
                </p>
              )}
          </div>
        </div>

        {/* YouTube/TJ 링크 */}
        <div className="flex gap-3 mt-6">
          {artist.data.youtube?.channelId && (
            <a
              href={`https://youtube.com/channel/${artist.data.youtube.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
            >
              YouTube
            </a>
          )}
          {artist.data.tjSongRequestUrl && (
            <a
              href={artist.data.tjSongRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              TJ 곡 추가 요청
            </a>
          )}
        </div>
      </header>

      {/* 곡 목록 */}
      <main className="px-4 py-8">
        <h2 className="text-2xl font-semibold text-white mb-6">곡 목록</h2>
        <SongList artistId={artist.data.id} />
      </main>
    </div>
  );
}
