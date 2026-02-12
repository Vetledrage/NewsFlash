"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false
      }
    }
  });
}

let browserQueryClient: QueryClient | undefined;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => {
    if (typeof window === "undefined") return makeQueryClient();
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

