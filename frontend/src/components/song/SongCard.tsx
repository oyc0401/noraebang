import { CircleThumbnail } from "@/components/common/CircleThumbnail";
import { KaraokeBadge } from "@/components/karaoke/KaraokeBadge";
import { cn } from "@/lib/cn";
import type { SongDto } from "@/api/model";

interface Props {
  song: SongDto;
  isSelected?: boolean;
  onClick?: () => void;
}

export const SongCard = ({ song, isSelected, onClick }: Props) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex gap-4 p-4 rounded-lg transition-all text-left",
      isSelected
        ? "bg-blue-950 border-2 border-blue-500"
        : "bg-zinc-900 border-2 border-transparent hover:border-zinc-700",
    )}
  >
    <CircleThumbnail
      src={song.thumbnailMedium || song.thumbnailDefault}
      alt={song.titleKo || song.title}
      size="w-16 h-16"
    />
    <div className="flex-1 min-w-0">
      <h4 className="text-base font-semibold text-white truncate">
        {song.titleKo || song.title}
      </h4>
      {song.titleKo && song.titleKo !== song.title && (
        <p className="text-sm text-zinc-400 truncate">{song.title}</p>
      )}
      <div className="flex gap-2 mt-2 flex-wrap">
        {song.karaokeSongs?.map((k, idx) => (
          <KaraokeBadge
            key={`${k.provider}-${k.karaokeNo}-${idx}`}
            provider={k.provider as any}
            karaokeNo={k.karaokeNo}
            title={k.title}
            artist={k.artist}
          />
        ))}
      </div>
    </div>
  </button>
);
