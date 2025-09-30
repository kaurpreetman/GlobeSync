"use client";

import { SessionProvider } from "next-auth/react";
import { ReactQueryProvider } from "./providers/react-query-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ReactQueryProvider>{children}</ReactQueryProvider>
    </SessionProvider>
  );
}
