import { songsControllerFindOne } from "@/api/model/songs/songs";
import SongPageClient from "./SongPageClient";

export const revalidate = 1800;
export const dynamic = "force-static";

export default async function SongPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const { songId } = await params;
  const songIdNumber = Number(songId);

  if (Number.isNaN(songIdNumber)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark text-white">
        잘못된 곡 ID입니다
      </div>
    );
  }

  const response = await songsControllerFindOne(songIdNumber);

  if (!response.data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark text-white">
        곡을 찾을 수 없습니다
      </div>
    );
  }

  return <SongPageClient song={response.data} />;
}
