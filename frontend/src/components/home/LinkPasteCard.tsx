import Image from "next/image";
import { Link } from "lucide-react";
import YoutubeMusicIcon from "@/icons/youtube-music.svg";
import SpotifyIcon from "@/icons/spotify.svg";
import AppleMusicIcon from "@/icons/apple-music.svg";

export function LinkPasteCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-dark p-4 shadow-sm ring-1 ring-surface-border">
      <div className="relative z-10">
        <p className="text-sm font-medium text-surface-text leading-snug">
          <span className="text-white font-bold">음악 플랫폼 링크</span>
          를
          <br />
          붙여넣어 검색해보세요
        </p>
        <div className="flex items-end justify-between">
          <div className="flex items-center pl-1 ">
            <div className="  flex items-center justify-center pr-1.5">
              <Image
                src={YoutubeMusicIcon}
                alt="YouTube Music"
                width={32}
                height={32}
              />
            </div>
            <div className=" flex items-center justify-center  pr-1.5">
              <Image src={SpotifyIcon} alt="Spotify" width={32} height={32} />
            </div>
            <div className=" flex items-center justify-center">
              <Image
                src={AppleMusicIcon}
                alt="Apple Music"
                width={32}
                height={32}
              />
            </div>
          </div>
          <button
            type="button"
            className="flex min-w-30 cursor-pointer items-center justify-center rounded-full h-11 px-5 bg-primary hover:bg-primary/90 transition-colors text-white gap-2 text-sm font-bold leading-normal shadow-lg shadow-primary/25 active:scale-95 duration-200"
          >
            <Link className="size-4" />
            <span>링크 붙여넣기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
