"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function SwitchTheme() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="size-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
    >
      <span className="material-symbols-outlined text-gray-900 dark:text-white">
        {theme === "light" ? "dark_mode" : "light_mode"}
      </span>
    </button>
  );
}
