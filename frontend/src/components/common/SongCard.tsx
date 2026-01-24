import { EllipsisVertical } from "lucide-react";
import Image from "next/image";
import type {
  SpotifyTrackInfoDto,
  YoutubeVideoInfoDto,
} from "@/api/model/models";
import { cn } from "@/lib/cn";
import { useSongMenuStore } from "@/store/songMenuStore";

interface SongCardProps {
  id?: string;
  songId?: number;
  artistId?: number;
  thumbnail?: string;
  title: string;
  subtitle: string;
  tjNumber?: string;
  spotify?: SpotifyTrackInfoDto;
  youtube?: YoutubeVideoInfoDto;
  isSelected?: boolean;
  onClick?: () => void;
}

export function SongCard({
  id,
  songId,
  artistId,
  thumbnail,
  title,
  subtitle,
  tjNumber,
  spotify,
  youtube,
  isSelected,
  onClick,
}: SongCardProps) {
  const { openMenu } = useSongMenuStore();

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (songId) {
      openMenu({
        id: songId,
        title,
        artistName: subtitle,
        artistId,
        tjNumber,
        spotify,
        youtube,
      });
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: 내부에 버튼이 있어 div 사용 필요
    <div
      id={id}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
      className={cn(
        "w-full flex rounded-sm items-center hover:bg-white/5 cursor-pointer transition-colors text-left px-2 py-2 ",
        isSelected && "bg-white/15",
      )}
    >
      <div className="relative w-14 h-14 shrink-0 mr-4 rounded-sm bg-gray-700">
        {thumbnail && (
          <Image
            src={thumbnail}
            alt={title}
            fill
            sizes="56px"
            className="rounded-sm object-cover"
            unoptimized
          />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-row items-center">
        <div className="flex-1 ">
          <p className="text-sm font-semibold text-white line-clamp-2 leading-tight">
            {title}
          </p>

          <p className="text-sm   truncate pt-[1px]">
            <span className="text-gray-400">{subtitle}</span>
            {tjNumber && (
              <span className="text-[#CE8FED] ml-2">{`TJ - ${tjNumber}`}</span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleMenuClick}
          className="shrink-0 p-2 -mr-2 cursor-pointer hover:bg-white/10 rounded-full transition-colors"
        >
          <EllipsisVertical className="size-5 text-icon" />
        </button>
      </div>
    </div>
  );
}
