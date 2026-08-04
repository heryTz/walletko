import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { totalBalanceQuery } from "src/shared/queries/total-balance";
import { Button } from "src/shared/ui/button";
import { Money } from "src/shared/ui/money";
import { Skeleton } from "src/shared/ui/skeleton";

export function MobileBalanceStrip({
  hidden,
  onToggle,
}: {
  hidden: boolean;
  onToggle: () => void;
}) {
  const { data } = useQuery(totalBalanceQuery);
  const Icon = hidden ? EyeOff : Eye;

  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={hidden}
      onClick={onToggle}
      className="flex h-auto w-full justify-between gap-2 rounded-none border-0 border-b border-border px-4 py-2"
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Balance
      </span>
      <span className="flex items-center gap-1.5">
        {data ? (
          <Money
            value={data.totalBalance}
            hidden={hidden}
            className="text-sm font-semibold text-foreground"
          />
        ) : (
          <Skeleton className="h-4 w-24" />
        )}
        <Icon className="size-3.5 text-muted-foreground" />
      </span>
    </Button>
  );
}
