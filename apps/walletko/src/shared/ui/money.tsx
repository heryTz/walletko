import {
  humanizeFromCent,
  useFormatCurrency,
} from "src/shared/hooks/use-format-currency";
import { cn } from "src/shared/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "src/shared/ui/tooltip";

type MoneyProps = {
  value: number;
  human?: boolean;
  hidden?: boolean;
  className?: string;
};

export function Money({ value, human, hidden, className }: MoneyProps) {
  const { formatFromCent } = useFormatCurrency();
  const exact = formatFromCent(value);

  if (hidden) {
    return (
      <span
        className={cn("tabular-nums", className)}
        role="img"
        aria-label="Amount hidden"
      >
        ••••••
      </span>
    );
  }

  if (!human) {
    return <span className={cn("tabular-nums", className)}>{exact}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={cn("tabular-nums cursor-default", className)} />
        }
      >
        {humanizeFromCent(value)}
      </TooltipTrigger>
      <TooltipContent>{exact}</TooltipContent>
    </Tooltip>
  );
}
