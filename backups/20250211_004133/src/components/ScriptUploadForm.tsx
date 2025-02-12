"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScriptAnalysisService } from "@/services/script-analysis";

const scriptService = new ScriptAnalysisService();

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ScriptUploadForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOCX, or TXT file.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    try {
      const script = await scriptService.uploadAndAnalyze(
        file,
        { title, description },
        "current-user-id" // TODO: Get from auth context
      );

      toast({
        title: "Upload successful",
        description:
          "Your script is being analyzed. You will be redirected shortly.",
      });

      // Redirect to script details page after successful upload
      setTimeout(() => {
        router.push(`/scripts/${script.id}`);
      }, 2000);
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Script Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setTitle(e.target.value)
            }
            placeholder="Enter script title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setDescription(e.target.value)
            }
            placeholder="Enter script description"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">Upload Script</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            required
          />
          <p className="text-sm text-gray-500">
            Supported formats: PDF, DOCX, TXT (Max 10MB)
          </p>
        </div>

        {uploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-sm text-center text-gray-500">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={uploading || !file || !title}
          className="w-full"
        >
          {uploading ? "Uploading..." : "Upload Script"}
        </Button>
      </form>
    </Card>
  );
}
