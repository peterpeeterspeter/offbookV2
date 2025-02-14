import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { setupGlobalErrorTracking } from "@/utils/error-tracking";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Actor Practice Platform",
  description: "Practice acting with AI-powered scene partners",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize error tracking on client side
  if (typeof window !== "undefined") {
    setupGlobalErrorTracking();
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">{children}</div>
      </body>
    </html>
  );
}
