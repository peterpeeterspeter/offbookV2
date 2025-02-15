import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { setupGlobalErrorTracking } from "@/utils/error-tracking";
import { initializeApp } from "@/lib/init";
import { logger } from "@/lib/logger";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Actor Practice Platform",
  description: "Practice acting with AI-powered scene partners",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await initializeApp();
  } catch (error) {
    logger.error({
      message: "Failed to initialize application",
      error: error instanceof Error ? error.message : String(error),
    });
    return (
      <html>
        <body>
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Initialization Error
              </h1>
              <p className="text-gray-600 mb-4">
                The application failed to initialize properly. This is likely
                due to missing or invalid environment variables.
              </p>
              <p className="text-sm text-gray-500">
                Please check the application logs for more details.
              </p>
            </div>
          </div>
        </body>
      </html>
    );
  }

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
