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
import { Plus } from "lucide-react"

// Mock data - replace with API calls
const mockScripts = [
  {
    id: "1",
    title: "Romeo and Juliet - Act 2, Scene 2",
    characters: ["Romeo", "Juliet"],
  },
  {
    id: "2",
    title: "Hamlet - Act 3, Scene 1",
    characters: ["Hamlet", "Ophelia"],
  },
]

interface CreateSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSessionDialog({
  open,
  onOpenChange,
}: CreateSessionDialogProps) {
  const router = useRouter()
  const [selectedScript, setSelectedScript] = useState<string>()
  const [selectedCharacter, setSelectedCharacter] = useState<string>()
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!selectedScript || !selectedCharacter) return

    try {
      setIsCreating(true)
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push(`/practice/session/${selectedScript}`)
    } catch (error) {
      console.error("Failed to create session:", error)
    } finally {
      setIsCreating(false)
      onOpenChange(false)
    }
  }

  const selectedScriptData = mockScripts.find(
    (script) => script.id === selectedScript
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Practice Session</DialogTitle>
          <DialogDescription>
            Choose a script and your character to start a new practice session.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label
              htmlFor="script"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Script
            </label>
            <Select
              value={selectedScript}
              onValueChange={setSelectedScript}
            >
              <SelectTrigger id="script">
                <SelectValue placeholder="Select a script" />
              </SelectTrigger>
              <SelectContent>
                {mockScripts.map((script) => (
                  <SelectItem key={script.id} value={script.id}>
                    {script.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="character"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Character
            </label>
            <Select
              value={selectedCharacter}
              onValueChange={setSelectedCharacter}
              disabled={!selectedScript}
            >
              <SelectTrigger id="character">
                <SelectValue placeholder="Select your character" />
              </SelectTrigger>
              <SelectContent>
                {selectedScriptData?.characters.map((character) => (
                  <SelectItem key={character} value={character}>
                    {character}
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
            {isCreating ? (
              "Creating..."
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 