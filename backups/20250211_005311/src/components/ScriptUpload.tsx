import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./ScriptUpload.css";

export interface ScriptUploadProps {
  onUpload: (file: File) => Promise<void>;
  supportedFormats?: string[];
  maxSize?: number; // in MB
}

const ScriptUpload = ({
  onUpload,
  supportedFormats = [".pdf", ".docx", ".txt"],
  maxSize = 10,
}: ScriptUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!supportedFormats.map((f) => f.toLowerCase()).includes(extension)) {
      return `Unsupported file format. Please use: ${supportedFormats.join(
        ", "
      )}`;
    }
    if (file.size > maxSize * 1024 * 1024) {
      return `File too large. Maximum size is ${maxSize}MB`;
    }
    return null;
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setError(null);

      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) return;

      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }

      setFile(droppedFile);
      simulateUpload(droppedFile);
    },
    [supportedFormats, maxSize]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }

      setFile(selectedFile);
      simulateUpload(selectedFile);
    },
    [supportedFormats, maxSize]
  );

  const simulateUpload = async (file: File) => {
    setUploadProgress(0);
    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setUploadProgress(i);
      }
      await onUpload(file);
    } catch (err) {
      setError("Upload failed. Please try again.");
      setUploadProgress(0);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return "📄";
      case "docx":
        return "📝";
      case "txt":
        return "📃";
      default:
        return "📁";
    }
  };

  return (
    <div className="script-upload">
      <motion.div
        className={`upload-container ${isDragging ? "dragging" : ""}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="upload-dropzone-container"
        role="region"
        aria-label="Script upload dropzone"
        tabIndex={0}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={supportedFormats.join(",")}
          className="file-input"
          data-testid="upload-input"
          aria-label="Upload script file"
        />

        <div className="upload-content">
          <motion.div
            className="upload-icon"
            animate={{
              scale: isDragging ? 1.1 : 1,
              opacity: isDragging ? 0.7 : 1,
            }}
            role="presentation"
          >
            {file ? getFileIcon(file.name) : "📂"}
          </motion.div>

          <div className="upload-text">
            {file ? (
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <>
                <div className="upload-title">
                  Drop your script here or{" "}
                  <button
                    className="browse-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </button>
                </div>
                <div className="upload-subtitle">
                  Supports: {supportedFormats.join(", ")} (Max {maxSize}MB)
                </div>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <motion.div
              className="progress-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              data-testid="upload-progress"
            >
              <div className="progress-bar" data-testid="progress-bar">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="progress-text">{uploadProgress}%</div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            className="error-message"
            data-testid="upload-error"
            role="alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            ⚠️ {error}
          </motion.div>
        )}
      </motion.div>

      <div className="upload-features">
        <div className="feature-card">
          <div className="feature-icon">🔍</div>
          <div className="feature-title">Smart Analysis</div>
          <div className="feature-description">
            Automatic role and scene detection using DeepSeek NLP
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎭</div>
          <div className="feature-title">Emotion Detection</div>
          <div className="feature-description">
            Identifies emotional cues and stage directions
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <div className="feature-title">Instant Processing</div>
          <div className="feature-description">
            Ready to practice within seconds
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptUpload;
