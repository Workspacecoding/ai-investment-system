"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { GoalInput, RiskLevel, UserGoal } from "@/lib/api/goals";

type GoalFormProps = {
  selectedGoal: UserGoal | null;
  isLoading: boolean;
  onSave: (input: GoalInput, goalId?: number) => Promise<void>;
  onGenerate: () => void;
};

function defaultTargetDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 3);
  return date.toISOString().slice(0, 10);
}

export function GoalForm({ selectedGoal, isLoading, onSave, onGenerate }: GoalFormProps) {
  const [currentCapital, setCurrentCapital] = useState("100000");
  const [targetCapital, setTargetCapital] = useState("200000");
  const [targetDate, setTargetDate] = useState(defaultTargetDate());
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("balanced");
  const [allowCrypto, setAllowCrypto] = useState(false);
  const [allowPennyStock, setAllowPennyStock] = useState(false);

  useEffect(() => {
    if (!selectedGoal) return;
    setCurrentCapital(String(selectedGoal.current_capital));
    setTargetCapital(String(selectedGoal.target_capital));
    setTargetDate(selectedGoal.target_date);
  }, [selectedGoal]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(
      {
        current_capital: Number(currentCapital),
        target_capital: Number(targetCapital),
        target_date: targetDate,
        risk_level: riskLevel,
        allow_crypto: allowCrypto,
        allow_penny_stock: allowPennyStock,
      },
      selectedGoal?.id,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Goal Form</CardTitle>
        <CardDescription>設定本金、目標與風險偏好。</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current-capital">current_capital</Label>
              <Input
                id="current-capital"
                min="1"
                type="number"
                value={currentCapital}
                onChange={(event) => setCurrentCapital(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-capital">target_capital</Label>
              <Input
                id="target-capital"
                min="1"
                type="number"
                value={targetCapital}
                onChange={(event) => setTargetCapital(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-date">target_date</Label>
              <Input
                id="target-date"
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk-level">risk_level</Label>
              <Select
                id="risk-level"
                value={riskLevel}
                onChange={(event) => setRiskLevel(event.target.value as RiskLevel)}
              >
                <option value="conservative">conservative</option>
                <option value="balanced">balanced</option>
                <option value="aggressive">aggressive</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">allow_crypto</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  允許策略配置 Crypto。
                </p>
              </div>
              <Switch checked={allowCrypto} onCheckedChange={setAllowCrypto} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">allow_penny_stock</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  允許推薦低價股。
                </p>
              </div>
              <Switch checked={allowPennyStock} onCheckedChange={setAllowPennyStock} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={isLoading} type="submit">
              儲存目標
            </Button>
            <Button disabled={isLoading || !selectedGoal} onClick={onGenerate} type="button">
              產生策略
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
