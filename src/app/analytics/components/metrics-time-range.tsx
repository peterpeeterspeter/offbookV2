"use client";

import { useState } from "react";
import { useMetrics } from "@/hooks/use-metrics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TIME_RANGES = [
  { label: "1h", value: 60 * 60 * 1000 },
  { label: "6h", value: 6 * 60 * 60 * 1000 },
  { label: "24h", value: 24 * 60 * 60 * 1000 },
  { label: "7d", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "30d", value: 30 * 24 * 60 * 60 * 1000 },
] as const;

type TimeRange = (typeof TIME_RANGES)[number];

export default function MetricsTimeRange() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>(TIME_RANGES[0]);
  const { mutate } = useMetrics({
    timeRange: {
      start: Date.now() - selectedRange.value,
      end: Date.now(),
    },
  });

  return (
    <Card>
      <CardContent className="flex items-center space-x-2 py-2">
        {TIME_RANGES.map((range) => (
          <Button
            key={range.label}
            variant={selectedRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedRange(range);
              mutate();
            }}
          >
            {range.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
