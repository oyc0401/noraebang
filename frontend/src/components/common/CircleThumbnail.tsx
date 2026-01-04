import Image from "next/image";
import { cn } from "@/lib/cn";

interface Props {
  src?: string;
  alt: string;
  size?: string;
  className?: string;
}

export const CircleThumbnail = ({
  src,
  alt,
  size = "w-24 h-24",
  className,
}: Props) => (
  <div
    className={cn(
      "relative rounded-full overflow-hidden bg-zinc-900",
      size,
      className,
    )}
  >
    {src ? (
      <Image src={src} alt={alt} fill className="object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-zinc-600">
        🎵
      </div>
    )}
  </div>
);
