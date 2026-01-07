export function SearchBar() {
  return (
    <div className="flex flex-col w-full">
      <div className="flex w-full items-center rounded-xl h-14 bg-surface-light dark:bg-surface-dark shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-primary">
        <div className="flex items-center justify-center pl-4 text-gray-400 dark:text-gray-500">
          <span className="material-symbols-outlined">search</span>
        </div>
        <input
          className="flex-1 bg-transparent border-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 h-full focus:ring-0 text-base"
          placeholder="제목, 가수, 번호 검색..."
        />
        <button
          type="button"
          className="pr-4 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">mic</span>
        </button>
      </div>
    </div>
  );
}
