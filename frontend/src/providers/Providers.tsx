"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, Suspense, useState } from "react";
import { ReportDialog } from "@/components/common/ReportDialog";
import { RouteChangeHandler } from "@/components/common/RouteChangeHandler";
import { SongMenuBottomSheet } from "@/components/common/SongMenuBottomSheet";
import { SongProposeDialog } from "@/components/common/SongProposeDialog";
export function Providers({ children }: PropsWithChildren) {
  const [client] = useState(new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <Suspense fallback={null}>
        <RouteChangeHandler />
      </Suspense>
      {children}
      <SongMenuBottomSheet />
      <SongProposeDialog />
      <ReportDialog />
    </QueryClientProvider>
  );
}
