import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlphaLens — 智慧投資，洞見先機",
  description: "AI 評分引擎 × Swing Trading × Portfolio 管理 × 財務目標規劃",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Header />
        {children}
      </body>
    </html>
  );
}
