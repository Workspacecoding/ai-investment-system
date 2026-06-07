"use client";

import { useEffect, useState } from "react";

import { GoalAllocationChart } from "@/components/goals/GoalAllocationChart";
import { GoalForm } from "@/components/goals/GoalForm";
import { GoalProgressCard } from "@/components/goals/GoalProgressCard";
import { GoalRecommendationsTable } from "@/components/goals/GoalRecommendationsTable";
import { GoalStrategyPanel } from "@/components/goals/GoalStrategyPanel";
import { ProfitAllocationPanel } from "@/components/goals/ProfitAllocationPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GoalInput } from "@/lib/api/goals";
import { useGoalStore } from "@/store/goalStore";

export default function GoalPlannerPage() {
  const [activeTab, setActiveTab] = useState("strategy");
  const {
    goals,
    selectedGoal,
    latestStrategy,
    strategyRecommendations,
    latestProfitAllocation,
    profitAllocationRecommendations,
    isLoading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    generateStrategy,
    fetchLatestStrategy,
    generateProfitAllocation,
    fetchLatestProfitAllocation,
  } = useGoalStore();

  useEffect(() => {
    fetchGoals();
    fetchLatestStrategy();
    fetchLatestProfitAllocation();
  }, [fetchGoals, fetchLatestProfitAllocation, fetchLatestStrategy]);

  async function handleSave(input: GoalInput, goalId?: number) {
    if (goalId) {
      await updateGoal(goalId, input);
      return;
    }
    await createGoal(input);
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 text-[hsl(var(--foreground))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Goal Planner Center</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            設定投資目標，產生策略配置與推薦標的。
          </p>
        </div>

        {error ? (
          <Alert className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertTitle>操作失敗</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading && goals.length === 0 ? <Skeleton className="h-32 w-full" /> : null}

        {!isLoading && goals.length === 0 ? (
          <Alert>
            <AlertTitle>尚未設定投資目標。</AlertTitle>
            <AlertDescription>請先建立你的第一個目標。</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <GoalForm
            selectedGoal={selectedGoal}
            isLoading={isLoading}
            onSave={handleSave}
            onGenerate={generateStrategy}
          />
          <GoalProgressCard goal={selectedGoal} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger
              activeValue={activeTab}
              onValueChange={setActiveTab}
              tabValue="strategy"
            >
              Strategy
            </TabsTrigger>
            <TabsTrigger
              activeValue={activeTab}
              onValueChange={setActiveTab}
              tabValue="profit"
            >
              Profit Allocation
            </TabsTrigger>
          </TabsList>

          <TabsContent activeValue={activeTab} tabValue="strategy">
            <GoalStrategyPanel strategy={latestStrategy} />
            <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
              <GoalAllocationChart strategy={latestStrategy} />
              <GoalRecommendationsTable recommendations={strategyRecommendations} />
            </div>
          </TabsContent>

          <TabsContent activeValue={activeTab} tabValue="profit">
            <ProfitAllocationPanel
              allocation={latestProfitAllocation}
              recommendations={profitAllocationRecommendations}
              isLoading={isLoading}
              onGenerate={generateProfitAllocation}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
