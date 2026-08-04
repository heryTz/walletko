import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { ensureSession } from "src/server/auth/session";
import { AppLayout } from "src/shared/layout/app-layout";
import { ErrorState } from "src/shared/ui/error-state";

function AuthenticatedError({ reset }: { reset: () => void }) {
  const router = useRouter();

  const retry = () => {
    reset();
    router.invalidate();
  };

  return (
    <div className="flex h-svh items-center justify-center bg-desk px-4">
      <ErrorState
        title="Something went wrong"
        description="We couldn't load your workspace."
        onRetry={retry}
        className="w-full max-w-sm"
      />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => ensureSession(),
  errorComponent: ({ reset }) => <AuthenticatedError reset={reset} />,
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
