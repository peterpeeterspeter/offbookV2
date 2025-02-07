import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="container flex h-[80vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
    </div>
  )
} 