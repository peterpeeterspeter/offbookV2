import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="container grid h-[calc(100vh-4rem)] grid-cols-[1fr_300px] gap-6 py-6">
      {/* Main Content */}
      <div className="flex flex-col gap-6">
        {/* Video Grid */}
        <div className="grid flex-1 grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="relative aspect-video overflow-hidden bg-muted">
              <div className="absolute bottom-4 left-4">
                <Skeleton className="h-6 w-32" />
              </div>
            </Card>
          ))}
        </div>

        {/* Script Content */}
        <Card className="flex-1">
          <div className="h-[calc(100vh-24rem)] space-y-6 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </Card>

        {/* Controls */}
        <Card className="flex items-center justify-center gap-4 p-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </Card>
      </div>

      {/* Sidebar */}
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="mt-4 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-2 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </main>
  )
} 