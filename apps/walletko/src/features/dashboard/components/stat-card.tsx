import { cn } from "src/shared/lib/utils";
import { Card, CardContent } from "src/shared/ui/card";
import { Money } from "src/shared/ui/money";

type StatCardProps = {
  label: string;
  value: number;
  human?: boolean;
  variant?: "default" | "income" | "expense";
  className?: string;
};

const valueVariants: Record<NonNullable<StatCardProps["variant"]>, string> = {
  default: "text-foreground",
  income: "text-income",
  expense: "text-destructive",
};

export function StatCard({
  label,
  value,
  human,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="pt-3 pb-3 space-y-1">
        <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest">
          {label}
        </p>
        <p
          className={cn(
            "text-2xl font-bold tracking-tight",
            valueVariants[variant],
          )}
        >
          <Money value={value} human={human} />
        </p>
      </CardContent>
    </Card>
  );
}
