"use client";

import React from "react";
import ScriptDetails from "@/components/ScriptDetails";

interface Props {
  params: {
    scriptId: string;
  };
}

export default function ScriptDetailsPage({ params }: Props) {
  return (
    <div className="container mx-auto py-8">
      <ScriptDetails scriptId={params.scriptId} />
    </div>
  );
}
