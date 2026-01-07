export function Header() {
  return (
    <header className="flex items-center justify-between p-4 pt-12 pb-2 sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md transition-colors">
      <div className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <span className="material-symbols-outlined text-2xl">music_note</span>
      </div>
      <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
        Sing It!
      </h2>
      <div className="size-10" />
    </header>
  );
}
