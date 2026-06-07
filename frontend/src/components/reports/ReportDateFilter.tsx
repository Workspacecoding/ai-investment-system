"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { PaperPortfolio } from "@/lib/api/reports";

type ReportDateFilterProps = {
  portfolios: PaperPortfolio[];
  selectedPortfolioId: number | null;
  selectedYear: number;
  selectedMonth: number;
  isLoading: boolean;
  onDateChange: (year: number, month: number) => void;
  onPortfolioChange: (portfolioId: number | null) => void;
  onGenerate: () => void;
};

const months = Array.from({ length: 12 }, (_, index) => index + 1);

function yearOptions() {
  const year = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, index) => year + 1 - index);
}

export function ReportDateFilter({
  isLoading,
  onDateChange,
  onGenerate,
  onPortfolioChange,
  portfolios,
  selectedMonth,
  selectedPortfolioId,
  selectedYear,
}: ReportDateFilterProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Date Filter</CardTitle>
        <CardDescription>選擇 portfolio 與月份後產生月結績效報告。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr_0.7fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio</Label>
            <Select
              id="portfolio"
              onChange={(event) =>
                onPortfolioChange(event.target.value ? Number(event.target.value) : null)
              }
              value={selectedPortfolioId ?? ""}
            >
              <option value="">Select Portfolio</option>
              {portfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Select
              id="year"
              onChange={(event) => onDateChange(Number(event.target.value), selectedMonth)}
              value={selectedYear}
            >
              {yearOptions().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <Select
              id="month"
              onChange={(event) => onDateChange(selectedYear, Number(event.target.value))}
              value={selectedMonth}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month.toString().padStart(2, "0")}
                </option>
              ))}
            </Select>
          </div>
          <Button disabled={isLoading || !selectedPortfolioId} onClick={onGenerate} type="button">
            Generate Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
