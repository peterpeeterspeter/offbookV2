"use client";

import * as React from "react";
import { Teleprompter } from "./teleprompter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import type { LucideProps } from "lucide-react";
import type {
  IconComponent,
  ScriptContentProps,
  Line,
} from "@/types/components";

const CHARACTER_COLORS = {
  Romeo: "#4f46e5",
  Juliet: "#e11d48",
  Mercutio: "#45B7D1",
  Nurse: "#96CEB4",
  Friar: "#FFEEAD",
} as const;

const Icon = React.forwardRef<
  SVGSVGElement,
  { icon: IconComponent } & Omit<LucideProps, "ref">
>(({ icon: IconComp, ...props }, ref) => {
  return <IconComp {...props} ref={ref} />;
});
Icon.displayName = "Icon";

export function ScriptContent({
  lines,
  currentLine,
  onLineSelect,
  characterColors,
  testMode = false,
  disableAnimations = false,
}: ScriptContentProps) {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [scrollSpeed, setScrollSpeed] = React.useState(100);

  // Map character names to colors
  const getCharacterColor = React.useCallback(
    (character: string) => {
      return (
        characterColors[character] ||
        CHARACTER_COLORS[character as keyof typeof CHARACTER_COLORS] ||
        "#808080"
      );
    },
    [characterColors]
  );

  return (
    <div className="relative h-full" data-testid="script-content-container">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-20"
        onClick={() => setIsSettingsOpen(true)}
        aria-label="Open teleprompter settings"
        data-testid="settings-button"
        role="button"
      >
        <Icon icon={Settings2} className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Teleprompter
        lines={lines}
        currentLine={currentLine ?? ""}
        onLineComplete={onLineSelect}
        getCharacterColor={getCharacterColor}
        autoScroll={autoScroll}
        scrollSpeed={scrollSpeed}
        testMode={testMode}
        disableAnimations={disableAnimations}
      />

      <Dialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        aria-label="Teleprompter settings dialog"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teleprompter Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <label htmlFor="auto-scroll" className="text-sm font-medium">
                Auto Scroll
              </label>
              <input
                id="auto-scroll"
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="toggle"
                aria-label="Enable auto scroll"
                data-testid="auto-scroll-toggle"
                role="switch"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="scroll-speed" className="text-sm font-medium">
                Scroll Speed
              </label>
              <input
                id="scroll-speed"
                type="range"
                min="20"
                max="500"
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                className="w-full"
                aria-label="Adjust scroll speed"
                data-testid="scroll-speed-slider"
                role="slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
