import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioControllerProps {
  onAudioStart: () => void;
  onAudioStop: () => void;
  isRecording?: boolean;
  className?: string;
}

export function AudioController({
  onAudioStart,
  onAudioStop,
  isRecording = false,
  className,
}: AudioControllerProps) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(isRecording);
  }, [isRecording]);

  const handleToggle = () => {
    if (isActive) {
      onAudioStop();
    } else {
      onAudioStart();
    }
    setIsActive(!isActive);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "relative h-9 w-9",
        {
          "bg-red-500 text-white hover:bg-red-600": isActive,
        },
        className
      )}
      onClick={handleToggle}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
