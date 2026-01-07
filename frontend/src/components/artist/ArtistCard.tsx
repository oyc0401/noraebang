import Link from "next/link";
import { CircleThumbnail } from "@/components/common/CircleThumbnail";
import type { ArtistDetailsDto } from "@/api/model/models";

interface Props {
  artist: ArtistDetailsDto;
}

export const ArtistCard = ({ artist }: Props) => (
  <Link href={`/channel/${artist.id}`}>
    <div className="flex flex-col items-center gap-3 p-4 transition-transform hover:scale-105 active:scale-95">
      <CircleThumbnail
        src={artist.thumbnailMedium || artist.thumbnailDefault}
        alt={artist.nameKo}
        size="w-24 h-24"
      />
      <div className="text-center">
        <h3 className="text-base font-semibold text-white">{artist.nameKo}</h3>
        <p className="text-sm text-zinc-400">{artist.name}</p>
      </div>
    </div>
  </Link>
);
