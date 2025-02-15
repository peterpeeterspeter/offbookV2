import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Line {
  id: string;
  character: string;
  text: string;
  isCurrentCharacter: boolean;
}

interface LineByLineContainerProps {
  lines: Line[];
  currentLineIndex: number;
  onLineClick: (index: number) => void;
}

export function LineByLineContainer({
  lines,
  currentLineIndex,
  onLineClick,
}: LineByLineContainerProps) {
  const handlePreviousLine = () => {
    if (currentLineIndex > 0) {
      onLineClick(currentLineIndex - 1);
    }
  };

  const handleNextLine = () => {
    if (currentLineIndex < lines.length - 1) {
      onLineClick(currentLineIndex + 1);
    }
  };

  const isFirstLine = currentLineIndex === 0;
  const isLastLine = currentLineIndex === lines.length - 1;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            {lines.map((line, index) => (
              <div
                key={line.id}
                className={`mb-4 cursor-pointer rounded-lg p-3 transition-colors ${
                  index === currentLineIndex
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => onLineClick(index)}
              >
                <div className="font-semibold">{line.character}</div>
                <div>{line.text}</div>
              </div>
            ))}
          </ScrollArea>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousLine}
              disabled={isFirstLine}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous Line
            </Button>
            <Button
              variant="outline"
              onClick={handleNextLine}
              disabled={isLastLine}
            >
              Next Line
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
