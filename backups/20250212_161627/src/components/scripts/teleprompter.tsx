"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { LucideProps } from "lucide-react";
import { ChevronUp, ChevronDown, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Line {
  id: string;
  character: string;
  text: string;
  emotion: string;
  timing: number;
}

interface TeleprompterProps {
  lines: Line[];
  currentLine?: string;
  onLineComplete: (lineId: string) => void;
  getCharacterColor: (character: string) => string;
  autoScroll?: boolean;
  scrollSpeed?: number;
  testMode?: boolean;
  disableAnimations?: boolean;
}

type IconComponent = React.ComponentType<LucideProps>;

const Icon: React.FC<{ icon: IconComponent } & Omit<LucideProps, "ref">> =
  React.forwardRef<
    SVGSVGElement,
    { icon: IconComponent } & Omit<LucideProps, "ref">
  >(({ icon: IconComponent, ...props }, ref) => {
    return <IconComponent {...props} ref={ref} />;
  });
Icon.displayName = "Icon";

const LineItem = React.forwardRef<
  HTMLLIElement,
  {
    line: Line;
    isSelected: boolean;
    onSelect: () => void;
    getCharacterColor: (character: string) => string;
    testMode?: boolean;
  }
>(({ line, isSelected, onSelect, getCharacterColor, testMode }, ref) => {
  const content = (
    <li
      ref={ref}
      id={`line-${line.id}`}
      data-testid={`line-${line.id}`}
      className={cn(
        "flex flex-col space-y-2 rounded-lg p-4 transition-colors cursor-pointer",
        isSelected && "bg-primary/10"
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect();
          e.preventDefault();
        }
      }}
      role="listitem"
      aria-label={`${line.character}: ${line.text}`}
      aria-selected={isSelected}
      tabIndex={0}
    >
      <div className="flex items-center justify-between">
        <Badge
          style={{
            backgroundColor: getCharacterColor(line.character),
            color: "#000000",
          }}
          aria-label={`Character: ${line.character}`}
          data-testid={`character-badge-${line.id}`}
        >
          {line.character}
        </Badge>
        {line.emotion && (
          <Badge
            variant="outline"
            className="text-xs"
            aria-label={`Emotion: ${line.emotion}`}
            data-testid={`emotion-badge-${line.id}`}
          >
            {line.emotion}
          </Badge>
        )}
      </div>
      <p
        className="text-lg"
        aria-label={line.text}
        data-testid={`line-text-${line.id}`}
      >
        {line.text}
      </p>
    </li>
  );

  if (testMode) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      data-testid={`motion-line-${line.id}`}
      role="presentation"
    >
      {content}
    </motion.div>
  );
});
LineItem.displayName = "LineItem";

export function Teleprompter({
  lines,
  currentLine,
  onLineComplete,
  getCharacterColor,
  autoScroll = true,
  scrollSpeed = 100,
  testMode = false,
  disableAnimations = false,
}: TeleprompterProps) {
  const [isPlaying, setIsPlaying] = React.useState(autoScroll);
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const currentLineRef = React.useRef<HTMLLIElement>(null);

  const scrollToLine = React.useCallback((lineId: string, smooth = true) => {
    const element = document.getElementById(`line-${lineId}`);
    if (element) {
      if (typeof element.scrollIntoView === "function") {
        element.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "center",
        });
      } else {
        element.focus();
      }
    }
  }, []);

  React.useEffect(() => {
    if (currentLine) {
      scrollToLine(currentLine);
    }
  }, [currentLine, scrollToLine]);

  React.useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      if (!isPlaying) return;

      const deltaTime = currentTime - lastTime;
      const pixelsToScroll = (scrollSpeed * deltaTime) / 1000;

      if (containerRef.current) {
        containerRef.current.scrollTop += pixelsToScroll;
        setScrollPosition(containerRef.current.scrollTop);
      }

      lastTime = currentTime;
      animationFrame = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, scrollSpeed]);

  const handleSpeedChange = (faster: boolean) => {
    const newSpeed = faster ? scrollSpeed * 1.5 : scrollSpeed * 0.75;
    // Clamp speed between 20 and 500 pixels per second
    return Math.min(Math.max(newSpeed, 20), 500);
  };

  const content = (
    <div className="space-y-4 p-4">
      <ul
        role="list"
        aria-label="Script lines"
        className="space-y-4"
        data-testid="script-lines-list"
      >
        {lines.map((line) => (
          <LineItem
            key={line.id}
            ref={line.id === currentLine ? currentLineRef : undefined}
            line={line}
            isSelected={line.id === currentLine}
            onSelect={() => onLineComplete(line.id)}
            getCharacterColor={getCharacterColor}
            testMode={testMode}
          />
        ))}
      </ul>
    </div>
  );

  const container = (
    <div className="relative h-full" ref={containerRef}>
      {testMode ? (
        content
      ) : (
        <ScrollArea className="h-[calc(100vh-12rem)]">{content}</ScrollArea>
      )}
      {!testMode && (
        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause auto-scroll" : "Start auto-scroll"}
            aria-pressed={isPlaying}
            data-testid="auto-scroll-toggle"
            role="button"
          >
            <Icon
              icon={isPlaying ? Pause : Play}
              className="h-4 w-4"
              aria-hidden="true"
            />
          </Button>
        </div>
      )}
    </div>
  );

  return container;
}
