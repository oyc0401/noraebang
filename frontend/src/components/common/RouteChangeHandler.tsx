"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSearchStore } from "@/store/searchStore";

export function RouteChangeHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { clearSearch } = useSearchStore();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // 첫 렌더링 시에는 초기화하지 않음
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // 라우트 변경 시 검색 상태 초기화
    clearSearch();
  }, [pathname, searchParams, clearSearch]);

  return null;
}
