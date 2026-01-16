"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, Suspense, useState } from "react";
import { RouteChangeHandler } from "@/components/common/RouteChangeHandler";

export function Providers({ children }: PropsWithChildren) {
  const [client] = useState(new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <Suspense fallback={null}>
        <RouteChangeHandler />
      </Suspense>
      {children}
    </QueryClientProvider>
  );
}
