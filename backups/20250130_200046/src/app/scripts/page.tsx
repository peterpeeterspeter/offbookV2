"use client"

import { useScripts } from "@/lib/hooks/use-scripts"
import { ScriptCard } from "@/components/scripts/script-card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"
import { ErrorBoundaryWrapper } from "@/components/error-boundary"
import { ApiErrorBoundaryWrapper } from "@/components/api-error-boundary"

function ScriptsList() {
  const { data: scripts, isLoading, error } = useScripts()

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    throw error // This will be caught by the API error boundary
  }

  if (!scripts?.length) {
    return (
      <div className="mt-8 flex h-[30vh] flex-col items-center justify-center gap-4 rounded-lg border bg-muted/50 p-8 text-center">
        <p className="text-lg text-muted-foreground">No scripts available</p>
        <p className="text-sm text-muted-foreground">
          Upload a script to get started with practice sessions
        </p>
        <Button>Upload Script</Button>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {scripts.map((script) => (
        <ScriptCard key={script.id} script={script} />
      ))}
    </div>
  )
}

function ScriptsError() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <div className="text-center">
        <h2 className="text-lg font-semibold">Failed to load scripts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          There was a problem loading the scripts. Please try again.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => window.location.reload()}
      >
        Try again
      </Button>
    </div>
  )
}

export default function ScriptsPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Available Scripts</h1>
        <Button>Upload Script</Button>
      </div>
      
      <ErrorBoundaryWrapper>
        <ApiErrorBoundaryWrapper fallback={<ScriptsError />}>
          <ScriptsList />
        </ApiErrorBoundaryWrapper>
      </ErrorBoundaryWrapper>
    </div>
  )
} 