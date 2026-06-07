import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>AI Investment System dashboard is ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
            Dashboard Placeholder
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
