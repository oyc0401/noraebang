export function LinkPasteCard() {
  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/5 relative overflow-hidden">
      <div className="relative z-10">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-snug mb-4">
          <span className="text-gray-900 dark:text-white font-bold">
            유튜브
          </span>
          ,{" "}
          <span className="text-gray-900 dark:text-white font-bold">
            스포티파이
          </span>{" "}
          링크를
          <br />
          붙여넣어 검색해보세요
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center -space-x-2 pl-1">
            <div className="relative z-30 size-9 rounded-full bg-white dark:bg-surface-dark shadow-sm ring-2 ring-white dark:ring-[#2a1b32] flex items-center justify-center p-2">
              <svg
                className="w-full h-full fill-[#FF0000]"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <div className="relative z-20 size-9 rounded-full bg-white dark:bg-surface-dark shadow-sm ring-2 ring-white dark:ring-[#2a1b32] flex items-center justify-center p-2">
              <svg
                className="w-full h-full fill-[#FF0000]"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12zm0-22.5c5.799 0 10.5 4.701 10.5 10.5S17.799 22.5 12 22.5 1.5 17.799 1.5 12 6.201 1.5 12 1.5zM9.5 8.5v7l6-3.5-6-3.5z" />
              </svg>
            </div>
            <div className="relative z-10 size-9 rounded-full bg-white dark:bg-surface-dark shadow-sm ring-2 ring-white dark:ring-[#2a1b32] flex items-center justify-center p-2">
              <svg
                className="w-full h-full fill-[#1DB954]"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.66.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 4.32-1.38 9.841-.719 13.44 1.56.541.3.66.839.301 1.261zm.12-3.36C15.54 8.46 9.06 8.22 5.28 9.361c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.24z" />
              </svg>
            </div>
          </div>
          <button
            type="button"
            className="flex min-w-[120px] cursor-pointer items-center justify-center rounded-full h-11 px-5 bg-primary hover:bg-primary/90 transition-colors text-white gap-2 text-sm font-bold leading-normal shadow-lg shadow-primary/25 active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">
              content_paste
            </span>
            <span>링크 붙여넣기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
