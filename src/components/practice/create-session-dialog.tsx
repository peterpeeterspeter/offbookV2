"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function CreateSessionDialog({
  open,
  onOpenChange,
  onConfirm,
}: CreateSessionDialogProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // Replace with actual API call
      const sessionId = "new-session-id";
      router.push(`/practice/session/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Practice Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            Are you ready to start practicing? Make sure you have a microphone
            connected and are in a quiet environment.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isCreating}>
              {isCreating ? "Creating..." : "Start Practice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
