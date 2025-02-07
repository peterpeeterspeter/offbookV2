"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mic, MicOff, Video, VideoOff, Users } from "lucide-react"

// Mock data - replace with actual API calls
const mockSession = {
  id: "1",
  title: "Romeo and Juliet",
  scene: "Act 2, Scene 2",
  participants: [
    { id: "1", name: "Alice", role: "Romeo", isSpeaking: false },
    { id: "2", name: "Bob", role: "Juliet", isSpeaking: true },
  ],
  lines: [
    {
      id: "1",
      character: "Romeo",
      text: "But, soft! what light through yonder window breaks?",
      emotion: "Awe",
      timing: 4,
    },
    {
      id: "2",
      character: "Romeo",
      text: "It is the east, and Juliet is the sun.",
      emotion: "Love",
      timing: 3,
    },
    {
      id: "3",
      character: "Juliet",
      text: "O Romeo, Romeo! wherefore art thou Romeo?",
      emotion: "Longing",
      timing: 5,
    },
  ],
}

export default function SessionPage() {
  const params = useParams()
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [currentLine, setCurrentLine] = useState<string>()

  return (
    <main className="container grid h-[calc(100vh-4rem)] grid-cols-[1fr_300px] gap-6 py-6">
      {/* Main Content */}
      <div className="flex flex-col gap-6">
        {/* Video Grid */}
        <div className="grid flex-1 grid-cols-2 gap-4">
          {mockSession.participants.map((participant) => (
            <Card
              key={participant.id}
              className="relative aspect-video overflow-hidden bg-muted"
            >
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1 backdrop-blur">
                <span className="text-sm font-medium">
                  {participant.name} ({participant.role})
                </span>
                {participant.isSpeaking && (
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Script Content */}
        <Card className="flex-1">
          <ScrollArea className="h-[calc(100vh-24rem)]">
            <div className="space-y-6 p-6">
              {mockSession.lines.map((line) => (
                <div
                  key={line.id}
                  className="space-y-2"
                  onClick={() => setCurrentLine(line.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{line.character}</span>
                    {line.emotion && (
                      <span className="text-sm text-muted-foreground">
                        {line.emotion}
                      </span>
                    )}
                  </div>
                  <p className="text-lg">{line.text}</p>
                  {line.timing && (
                    <div className="text-sm text-muted-foreground">
                      Expected duration: {line.timing}s
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Controls */}
        <Card className="flex items-center justify-center gap-4 p-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsVideoEnabled(!isVideoEnabled)}
          >
            {isVideoEnabled ? (
              <Video className="h-4 w-4" />
            ) : (
              <VideoOff className="h-4 w-4" />
            )}
          </Button>
        </Card>
      </div>

      {/* Sidebar */}
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="font-semibold">Participants</h2>
        </div>
        <div className="mt-4 space-y-4">
          {mockSession.participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{participant.name}</p>
                <p className="text-sm text-muted-foreground">
                  {participant.role}
                </p>
              </div>
              {participant.isSpeaking && (
                <div className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </main>
  )
} 