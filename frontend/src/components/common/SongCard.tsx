import Image from "next/image";
import { KaraokeBadge } from "@/components/common/KaraokeBadge";
import { RecommendBadge } from "./RecommendBadge";

interface SongCardProps {
  thumbnail?: string;
  title: string;
  subtitle: string;
  tjNumber?: string;
  onClick?: () => void;
}

export function SongCard({
  thumbnail,
  title,
  subtitle,
  tjNumber,
  onClick,
}: SongCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full   flex items-center hover:bg-white/5 cursor-pointer transition-colors text-left"
    >
      {thumbnail && (
        <Image
          src={thumbnail}
          alt={title}
          width={54}
          height={54}
          className="rounded-sm shrink-0 mx-4 my-2 object-cover size-12"
        />
      )}
      <div className="flex-1 min-w-0 flex flex-row items-center">
        <div className="flex-1 ">
          <p className="text-sm font-semibold text-white line-clamp-2 pt-[3px]">
            {title}
          </p>

          <p className="text-sm text-gray-400 truncate pt-[1px]">{subtitle}</p>
        </div>

        <div className="px-4 shrink-0">
          {tjNumber ? (
            <KaraokeBadge provider="TJ" number={tjNumber} />
          ) : (
            <RecommendBadge />
          )}
        </div>
      </div>
    </button>
  );
}
