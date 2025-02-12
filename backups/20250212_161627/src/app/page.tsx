import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <section className="container py-24">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl lg:leading-[1.1]">
            Practice Your Lines with AI
          </h1>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            Enhance your performance with real-time feedback, emotion analysis,
            and collaborative practice sessions.
          </p>
          <div className="flex gap-4">
            <Link to="/scripts">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link to="/practice">
              <Button variant="outline" size="lg">
                Try Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

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
