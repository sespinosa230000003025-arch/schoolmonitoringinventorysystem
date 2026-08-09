import { createTRPCClient, httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";

import { type AppRouter } from "~/server/api/root";

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Imperative tRPC client for client components.
 *
 * The ported pages drive their own `loading` / `submitting` state inside hand-written async
 * functions, so they call procedures directly (`trpcClient.items.list.query({ ... })`) rather
 * than through the React Query hooks. `TRPCReactProvider` is still mounted, so the hooks in
 * `~/trpc/react` remain available.
 */
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: SuperJSON,
      url: getBaseUrl() + "/api/trpc",
    }),
  ],
});
