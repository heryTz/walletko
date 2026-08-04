import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { createQueryClient } from "src/shared/lib/query-client";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = createQueryClient();

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
