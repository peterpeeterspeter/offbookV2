"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ScriptUpload from "@/components/ScriptUpload";

export default function UploadPage() {
  const router = useRouter();

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/scripts/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      router.push(`/scripts/${data.scriptId}`);
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Upload Script</h1>
      <ScriptUpload onUpload={handleUpload} />
    </div>
  );
}
