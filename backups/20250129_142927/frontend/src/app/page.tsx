import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mic, Sparkles, Users } from "lucide-react"

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="container space-y-6 py-24 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
          Practice Acting with AI
        </h1>
        <p className="mx-auto max-w-[42rem] text-muted-foreground sm:text-xl">
          Enhance your acting skills with real-time feedback, emotion analysis, and
          collaborative practice sessions powered by AI.
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/practice">Start Practice</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/scripts">Browse Scripts</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
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
              Practice with other actors in real-time, share feedback, and improve
              together in virtual sessions.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
