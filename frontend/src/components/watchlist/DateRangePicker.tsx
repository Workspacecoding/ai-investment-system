"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
};

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="watchlist-start-date">資料起日</Label>
        <Input
          id="watchlist-start-date"
          type="date"
          value={startDate}
          onChange={(event) => onChange(event.target.value, endDate)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="watchlist-end-date">資料迄日</Label>
        <Input
          id="watchlist-end-date"
          type="date"
          value={endDate}
          onChange={(event) => onChange(startDate, event.target.value)}
        />
      </div>
    </div>
  );
}
