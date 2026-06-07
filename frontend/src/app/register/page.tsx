"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { register } from "@/lib/api/auth";
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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不一致。");
      return;
    }

    setIsLoading(true);
    try {
      await register({ name, email, password });
      router.push("/login");
    } catch {
      setError("註冊失敗，請確認資料或換一個 Email。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register</CardTitle>
        <CardDescription>Create your AI Investment System account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              autoComplete="name"
              id="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Milai"
              required
              value={name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              autoComplete="email"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              autoComplete="new-password"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              autoComplete="new-password"
              id="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <Button className="w-full" disabled={isLoading} type="submit">
            {isLoading ? "Creating account..." : "Register"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          已有帳號？{" "}
          <Link className="font-medium text-[hsl(var(--foreground))] underline" href="/login">
            前往登入
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
