"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, Users } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8">AI Actor Practice Platform</h1>
        <p className="text-xl mb-8">
          Practice acting with AI-powered scene partners
        </p>
        <div className="flex gap-4">
          <Button
            onClick={() => router.push("/practice")}
            className="px-6 py-3"
          >
            Start Practice
          </Button>
          <Button
            onClick={() => router.push("/scripts")}
            variant="outline"
            className="px-6 py-3"
          >
            Browse Scripts
          </Button>
        </div>
      </div>

      <section className="container py-24">
        <div className="grid gap-12 md:grid-cols-3">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Real-time Feedback</h3>
            <p className="text-muted-foreground">
              Get instant feedback on your delivery, timing, and emotional
              expression using advanced AI analysis.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">AI-Powered Analysis</h3>
            <p className="text-muted-foreground">
              Understand your performance with detailed emotion analysis and
              character insights from our AI models.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Collaborative Practice</h3>
            <p className="text-muted-foreground">
              Practice with other actors in real-time, share feedback, and
              improve together in virtual sessions.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
