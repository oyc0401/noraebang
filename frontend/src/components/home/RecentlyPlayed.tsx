export function RecentlyPlayed() {
  return (
    <>
      <div className="flex items-center justify-between p-4">
        <h3 className="text-white text-lg font-bold leading-tight">
          최근 들었던 곡
        </h3>
        <a
          className="text-xs font-medium text-primary hover:text-primary/80"
          href="#"
        >
          전체보기
        </a>
      </div>
      <div className="flex overflow-x-auto gap-4 px-5 pb-4 no-scrollbar snap-x snap-mandatory">
        <div className="snap-start shrink-0 w-[140px] flex flex-col group">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-dark mb-3 shadow-md">
            <img
              alt="Abstract colorful neon gradient representing pop music album art"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              data-alt="Abstract colorful neon gradient representing pop music album art"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA39Lr6Eh54N38LrMt6WcfkhqWf5Uq7DNcW0hnSN5JiPFSQ9Zxbl6zey04yr3l31lbSarq1OZFQijWUxiefLh3i3tmf1hygF8Id5RhirNJrHG1h0lARq-wImpwKYUFNzYu1zXkOCOF2bVhWgV4aicGGFXP01fgCT8FfEiqClfNUFNb3bqWpp9yxrzTAzVurtJC-MYsoJBA4hilVldAFn2fhFnO2FoMKdDbnQCXlutqnjYMrmNQkhQNO6lbrgHQwc0KNgApjd8V7Qzc"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <button
              type="button"
              className="absolute bottom-2 right-2 size-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <span className="material-symbols-outlined text-lg fill-1">
                play_arrow
              </span>
            </button>
          </div>
          <div className="flex flex-col px-1">
            <span className="text-sm font-bold text-white truncate">
              Hype Boy
            </span>
            <span className="text-xs text-gray-400 truncate">NewJeans</span>
            <div className="mt-1 flex gap-1">
              <span className="text-[10px] font-bold bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">
                TJ 81523
              </span>
            </div>
          </div>
        </div>
        <div className="snap-start shrink-0 w-[140px] flex flex-col group">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-dark mb-3 shadow-md">
            <img
              alt="Surfer on a wave representing refreshing summer vibe music"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              data-alt="Surfer on a wave representing refreshing summer vibe music"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHja64TbEWRZWG4Y-yl6SMrv1XG4OncqGfX73YwGsmviUnHtHmIOgqAKpm_Sjcl6rj7-dXAylRfPP5Fen6kzlJcBQ7dYpoSd-D8EkuS7KbtjJNrrfbipubl6MaygPK7EnXZX3JUwSDG0bneW6bPe9yiXrk5IG0yzdm1aJwZXfXsN6CnB8Z3XrVN0H6xBct1a0uZd4mPjO6mIWz0jChYaw53bAwhnyIGn-WLnhoMGpPM_Q6jp41BzbhRgOYwhSyVAICdakzd5-MSc0"
            />
            <button
              type="button"
              className="absolute bottom-2 right-2 size-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <span className="material-symbols-outlined text-lg fill-1">
                play_arrow
              </span>
            </button>
          </div>
          <div className="flex flex-col px-1">
            <span className="text-sm font-bold text-white truncate">
              사건의 지평선
            </span>
            <span className="text-xs text-gray-400 truncate">윤하</span>
            <div className="mt-1 flex gap-1">
              <span className="text-[10px] font-bold bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded">
                KY 49122
              </span>
            </div>
          </div>
        </div>
        <div className="snap-start shrink-0 w-[140px] flex flex-col group">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-dark mb-3 shadow-md">
            <img
              alt="Crowd at a concert with stage lights"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              data-alt="Crowd at a concert with stage lights"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDsM9Yn54-mAxTyrqL3RZvBA-0cexht9JUUKaakYnNw4mIFLMKdSvWRNCS3rYqk7Ybq0IAvkCyLHVD71vf2u8O6EOxKCMzgVmyXLM6RBbIohroQ0Cycl2YHUbbYM1-V2LiZz40PZ-3pnanH_ldMIHZQ6_Fs-1bCWsVO4QHvJ0aBLH4tYQJVXTcSByvCgdcUo0GT-7S9kSX_Kv_1Ualryw6lWgwgP_V1HTr3mGkQdMq82AEhRcyBcGj3bafdcqu_XCSzFRX3yQn5Q0"
            />
            <button
              type="button"
              className="absolute bottom-2 right-2 size-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <span className="material-symbols-outlined text-lg fill-1">
                play_arrow
              </span>
            </button>
          </div>
          <div className="flex flex-col px-1">
            <span className="text-sm font-bold text-white truncate">Seven</span>
            <span className="text-xs text-gray-400 truncate">Jungkook</span>
            <div className="mt-1 flex gap-1">
              <span className="text-[10px] font-bold bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">
                TJ 98311
              </span>
            </div>
          </div>
        </div>
        <div className="snap-start shrink-0 w-[140px] flex flex-col group">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-dark mb-3 shadow-md">
            <img
              alt="Moody dark blue abstract smoke for ballad song cover"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              data-alt="Moody dark blue abstract smoke for ballad song cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdPb069WRktyqTEbgmAtW2eB3-mAhmr74gngfmz0o6YjTvHgLr1BGgJX0pWCSAlcm4EUlNTA3cSZ-gNgGYTmMig2dHR9e30IBBJsadiK50p4ovNqCellfiHL_9bmZxENh2TC2q5vGfSVE61BLWOj4Kq_FPPy7IVJO1YLs99bLDB5QQ3YslnxJ2lGMEi3fS4sUWJhDDIK2zIskBSkQXZfYdulzJsKoH5nKaKYavypZQmNFA0NvE88spY8HCbLqRzOTu32dPFyaE3Bo"
            />
            <button
              type="button"
              className="absolute bottom-2 right-2 size-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <span className="material-symbols-outlined text-lg fill-1">
                play_arrow
              </span>
            </button>
          </div>
          <div className="flex flex-col px-1">
            <span className="text-sm font-bold text-white truncate">
              Love wins all
            </span>
            <span className="text-xs text-gray-400 truncate">아이유 (IU)</span>
            <div className="mt-1 flex gap-1">
              <span className="text-[10px] font-bold bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">
                TJ 87291
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
