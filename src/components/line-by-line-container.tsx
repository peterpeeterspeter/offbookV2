import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Line {
  id: string;
  content: string;
  character: string;
  timing?: number;
}

interface LineByLineContainerProps {
  lines: Line[];
  onLineClick: (line: Line) => void;
}

export function LineByLineContainer({
  lines,
  onLineClick,
}: LineByLineContainerProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.id}
                className="p-2 rounded-md cursor-pointer hover:bg-muted transition-colors"
                onClick={() => onLineClick(line)}
              >
                <div className="font-semibold text-sm text-primary">
                  {line.character}
                </div>
                <div className="text-sm">{line.content}</div>
                {line.timing && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {line.timing}s
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
