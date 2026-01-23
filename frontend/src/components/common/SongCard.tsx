import { EllipsisVertical } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";

interface SongCardProps {
  id?: string;
  thumbnail?: string;
  title: string;
  subtitle: string;
  tjNumber?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

export function SongCard({
  id,
  thumbnail,
  title,
  subtitle,
  tjNumber,
  isSelected,
  onClick,
}: SongCardProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
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

        <div className="shrink-0">
          <EllipsisVertical className="size-5 text-icon" />
        </div>
      </div>
    </button>
  );
}

function RecommendCount() {
  return <span className="text-[#C1B369] ml-2">{"추천 0"}</span>;
}
