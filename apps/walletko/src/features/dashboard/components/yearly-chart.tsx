"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthStatDTO } from "src/server/contracts/dashboard";
import {
  humanizeFromCent,
  useFormatCurrency,
} from "src/shared/hooks/use-format-currency";
import { Card, CardContent } from "src/shared/ui/card";
import { Select } from "src/shared/ui/select";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type ChartColors = { income: string; expense: string; cumulativeNet: string };

const EMPTY_COLORS: ChartColors = {
  income: "",
  expense: "",
  cumulativeNet: "",
};

const readChartColors = (): ChartColors => {
  const styles = getComputedStyle(document.documentElement);
  return {
    income: styles.getPropertyValue("--income").trim(),
    expense: styles.getPropertyValue("--destructive").trim(),
    cumulativeNet: styles.getPropertyValue("--primary").trim(),
  };
};

// Tokens are resolved on the client only: getComputedStyle is unavailable
// during SSR, and the values change when the theme toggles the root class.
function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(() =>
    typeof document === "undefined" ? EMPTY_COLORS : readChartColors(),
  );

  useEffect(() => {
    const update = () => setColors(readChartColors());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}

type YearlyChartProps = {
  data: MonthStatDTO[];
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
};

type MoneyAxisTickProps = {
  formatExact: (cents: number) => string;
  x?: number;
  y?: number;
  payload?: { value: number };
};

function MoneyAxisTick({
  formatExact,
  x = 0,
  y = 0,
  payload,
}: MoneyAxisTickProps) {
  const value = payload?.value ?? 0;
  return (
    <text
      x={x}
      y={y}
      dy="0.355em"
      textAnchor="end"
      fontSize={13}
      className="fill-muted-foreground"
    >
      <title>{formatExact(value)}</title>
      {humanizeFromCent(value)}
    </text>
  );
}

export function YearlyChart({
  data,
  year,
  availableYears,
  onYearChange,
}: YearlyChartProps) {
  const { formatFromCent } = useFormatCurrency();
  const colors = useChartColors();

  const chartData = data.map((d) => ({
    month: MONTH_LABELS[d.month - 1],
    income: d.income,
    expense: d.expense,
    cumulativeNet: d.cumulativeNet,
  }));

  const yearOptions = availableYears.map((y) => ({
    value: String(y),
    label: String(y),
  }));

  return (
    <Card>
      <CardContent className="pt-3 pb-3 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest">
            Yearly overview
          </p>
          <Select
            value={String(year)}
            onChange={(v) => onYearChange(Number(v))}
            options={yearOptions}
          />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 13 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={<MoneyAxisTick formatExact={formatFromCent} />}
              className="text-muted-foreground"
              width={80}
            />
            <Tooltip
              formatter={(value: number) => formatFromCent(value)}
              contentStyle={{ fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke={colors.income}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke={colors.expense}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="cumulativeNet"
              name="Cumulative net"
              stroke={colors.cumulativeNet}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
