"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LineByLineContainer } from "@/components/practice/line-by-line-container";
import { useToast } from "@/components/ui/use-toast";
import { PracticeSession } from "@/components/practice/practice-session";

interface Props {
  params: {
    id: string;
  };
}

interface Script {
  id: string;
  title: string;
  lines: Array<{
    id: string;
    character: string;
    text: string;
    isCurrentCharacter: boolean;
  }>;
}

export default function PracticeSessionPage({ params }: Props) {
  return (
    <div className="container mx-auto py-8">
      <PracticeSession scriptId={params.id} />
    </div>
  );
}
