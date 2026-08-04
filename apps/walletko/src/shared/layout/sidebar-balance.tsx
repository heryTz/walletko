import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useFormatCurrency } from "src/shared/hooks/use-format-currency";
import { totalBalanceQuery } from "src/shared/queries/total-balance";
import { Button } from "src/shared/ui/button";
import { Money } from "src/shared/ui/money";
import { Skeleton } from "src/shared/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "src/shared/ui/tooltip";

export function SidebarBalance({
  collapsed,
  hidden,
  onToggle,
}: {
  collapsed: boolean;
  hidden: boolean;
  onToggle: () => void;
}) {
  const { data } = useQuery(totalBalanceQuery);
  const { formatFromCent } = useFormatCurrency();
  const Icon = hidden ? EyeOff : Eye;

  const accessibleLabel = () => {
    if (hidden) return "Balance, amount hidden";
    if (!data) return "Balance, loading";
    return `Balance, ${formatFromCent(data.totalBalance)}`;
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-pressed={hidden}
              aria-label={accessibleLabel()}
              onClick={onToggle}
              className="mb-2 self-center text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            />
          }
        >
          <Icon className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">
          {data ? <Money value={data.totalBalance} hidden={hidden} /> : "…"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      type="button"
      variant="default"
      aria-pressed={hidden}
      onClick={onToggle}
      className="mb-2 h-auto w-full flex-col items-stretch gap-0.5 rounded-lg border border-sidebar-primary/20 bg-sidebar-primary/10 px-2.5 py-2 text-sidebar-foreground hover:bg-sidebar-primary/15"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
          Balance
        </span>
        <Icon className="size-3.5 text-sidebar-foreground/50" />
      </span>
      {data ? (
        <Money
          value={data.totalBalance}
          hidden={hidden}
          className="text-left text-base font-semibold text-sidebar-primary"
        />
      ) : (
        <Skeleton className="h-6 w-28" />
      )}
    </Button>
  );
}
