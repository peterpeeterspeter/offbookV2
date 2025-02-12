"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Mock data - replace with API calls later
const scripts = [
  { id: "1", title: "Romeo and Juliet - Act 2, Scene 2" },
  { id: "2", title: "Hamlet - To be or not to be" },
]

const characters = {
  "1": [
    { id: "romeo", name: "Romeo" },
    { id: "juliet", name: "Juliet" },
  ],
  "2": [
    { id: "hamlet", name: "Hamlet" },
  ],
}

export function CreateSessionDialog() {
  const router = useRouter()
  const [selectedScript, setSelectedScript] = useState<string>("")
  const [selectedCharacter, setSelectedCharacter] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!selectedScript || !selectedCharacter) return

    setIsCreating(true)
    try {
      // Replace with actual API call
      const sessionId = "new-session-id"
      router.push(`/practice/session/${sessionId}`)
    } catch (error) {
      console.error("Failed to create session:", error)
      setIsCreating(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          Create New Session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Practice Session</DialogTitle>
          <DialogDescription>
            Choose a script and your character to start practicing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="script">Script</label>
            <Select
              value={selectedScript}
              onValueChange={setSelectedScript}
            >
              <SelectTrigger id="script">
                <SelectValue placeholder="Select a script" />
              </SelectTrigger>
              <SelectContent>
                {scripts.map((script) => (
                  <SelectItem key={script.id} value={script.id}>
                    {script.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="character">Character</label>
            <Select
              value={selectedCharacter}
              onValueChange={setSelectedCharacter}
              disabled={!selectedScript}
            >
              <SelectTrigger id="character">
                <SelectValue placeholder="Select a character" />
              </SelectTrigger>
              <SelectContent>
                {selectedScript &&
                  characters[selectedScript as keyof typeof characters]?.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!selectedScript || !selectedCharacter || isCreating}
          >
            {isCreating ? "Creating..." : "Create Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 