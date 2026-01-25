import Link from "next/link";
import { Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-8 border-t border-white/10 px-4 py-6">
      <div className="flex flex-col gap-4 text-sm text-white/60">
        <div className="flex items-center gap-2">
          <Mail className="size-4" />
          <a
            href="mailto:oyc0401@gmail.com"
            className="cursor-pointer transition-colors hover:text-white"
          >
            oyc0401@gmail.com
          </a>
        </div>

        <div className="flex gap-4">
          <Link
            href="/terms"
            className="cursor-pointer transition-colors hover:text-white"
          >
            이용약관
          </Link>
          <Link
            href="/privacy"
            className="cursor-pointer transition-colors hover:text-white"
          >
            개인정보처리방침
          </Link>
        </div>

        <p className="text-white/40">© 2025 Sing It!</p>
      </div>
    </footer>
  );
}
