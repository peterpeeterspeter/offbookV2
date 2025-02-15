import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Line {
  id: string;
  character: string;
  content: string;
  timing: number;
}

interface LineByLinePracticeProps {
  lines: Line[];
  currentLine?: string;
  onLineChange: (lineId: string) => void;
  onNextLine: () => void;
  onPreviousLine: () => void;
}

export function LineByLinePractice({
  lines,
  currentLine,
  onLineChange,
  onNextLine,
  onPreviousLine,
}: LineByLinePracticeProps) {
  const firstLine = lines[0];
  const lastLine = lines[lines.length - 1];
  const isFirstLine =
    !currentLine || (firstLine && currentLine === firstLine.id);
  const isLastLine = !currentLine || (lastLine && currentLine === lastLine.id);

  return (
    <Card>
      <CardContent className="p-4">
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.id}
                className={`p-2 rounded-md cursor-pointer transition-colors ${
                  line.id === currentLine
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => onLineChange(line.id)}
              >
                <div className="font-semibold text-sm">{line.character}</div>
                <div className="text-sm">{line.content}</div>
                {line.timing && (
                  <div className="text-xs opacity-70 mt-1">{line.timing}s</div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onPreviousLine}
            disabled={isFirstLine}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNextLine}
            disabled={isLastLine}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
