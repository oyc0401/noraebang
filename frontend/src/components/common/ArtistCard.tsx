import Image from "next/image";
import { cn } from "@/lib/cn";

interface ArtistCardProps {
  id?: string;
  thumbnail?: string;
  title: string;
  subtitle: string;
  isSelected?: boolean;
  onClick?: () => void;
}

export function ArtistCard({
  id,
  thumbnail,
  title,
  subtitle,
  isSelected,
  onClick,
}: ArtistCardProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className={cn(
        "w-full flex rounded-sm items-center hover:bg-white/5 cursor-pointer transition-colors text-left px-2 py-2",
        isSelected && "bg-white/15",
      )}
    >
      <div className="relative w-14 h-14 shrink-0 mr-4 rounded-full bg-gray-700">
        {thumbnail && (
          <Image
            src={thumbnail}
            alt={title}
            fill
            sizes="56px"
            className="rounded-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white line-clamp-2 leading-tight">
          {title}
        </p>
        <p className="text-sm text-gray-400 truncate pt-[1px]">{subtitle}</p>
      </div>
    </button>
  );
}
