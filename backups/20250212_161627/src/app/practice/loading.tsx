import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-5 w-96 mb-8" />
        <div className="grid gap-6">
          <Skeleton className="h-11 w-full" />
          <div className="border rounded-lg p-6">
            <Skeleton className="h-6 w-36 mb-4" />
            <Skeleton className="h-5 w-72" />
          </div>
        </div>
      </div>
    </main>
  )
} 