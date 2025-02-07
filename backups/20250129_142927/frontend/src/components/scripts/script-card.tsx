"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, BookOpen, Users } from "lucide-react"
import Link from "next/link"
import type { Script } from "@/lib/api"

interface ScriptCardProps {
  script: Script
}

export function ScriptCard({ script }: ScriptCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="line-clamp-1">{script.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{Math.round(script.estimatedDuration / 60)} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>{script.sceneCount} scenes • {script.totalLines} lines</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{script.metadata.characterCount || 0} characters</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button asChild className="flex-1">
          <Link href={`/scripts/${script.id}`}>
            View Script
          </Link>
        </Button>
        <Button asChild variant="secondary" className="flex-1">
          <Link href={`/practice/new?scriptId=${script.id}`}>
            Practice
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
} 