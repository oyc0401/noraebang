"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, Suspense, useState } from "react";
import { RouteChangeHandler } from "@/components/common/RouteChangeHandler";
import { AuthProvider } from "./AuthProvider";

export function Providers({ children }: PropsWithChildren) {
  const [client] = useState(new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Suspense fallback={null}>
          <RouteChangeHandler />
        </Suspense>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
