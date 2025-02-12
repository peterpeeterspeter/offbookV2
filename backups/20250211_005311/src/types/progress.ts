export interface UploadProgress {
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  message?: string;
}

export interface AnalysisProgress {
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  progress: number;
  currentStep: string;
  totalSteps: number;
  error?: string;
}

export interface BatchProgress {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  currentBatch: number;
  totalBatches: number;
  status: 'idle' | 'processing' | 'complete' | 'error';
  error?: string;
}
