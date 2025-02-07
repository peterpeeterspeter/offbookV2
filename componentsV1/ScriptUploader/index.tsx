import React, { useState, useCallback } from 'react'
import { scriptAnalyzer, ScriptAnalysis } from '../../services/scriptAnalysis'
import { documentParser } from '../../services/documentParser'

interface FileProgress {
  fileName: string
  stage: 'queued' | 'parsing' | 'scenes' | 'characters' | 'emotions' | 'complete' | 'error'
  percent: number
  error?: string
}

interface ScriptUploaderProps {
  onAnalysisComplete: (analysis: ScriptAnalysis) => void
  onError: (error: string) => void
  className?: string
}

export const ScriptUploader: React.FC<ScriptUploaderProps> = ({
  onAnalysisComplete,
  onError,
  className
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [fileProgress, setFileProgress] = useState<Map<string, FileProgress>>(new Map())
  const [currentFile, setCurrentFile] = useState<string | null>(null)

  const updateFileProgress = (fileName: string, update: Partial<FileProgress>) => {
    setFileProgress(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(fileName) || {
        fileName,
        stage: 'queued',
        percent: 0
      }
      newMap.set(fileName, { ...current, ...update })
      return newMap
    })
  }

  const processFile = async (file: File): Promise<ScriptAnalysis> => {
    const fileName = file.name
    updateFileProgress(fileName, { stage: 'parsing', percent: 0 })

    try {
      // Parse document
      const text = await documentParser.parseDocument(file)
      updateFileProgress(fileName, { stage: 'parsing', percent: 25 })
      
      // Analyze scenes
      updateFileProgress(fileName, { stage: 'scenes', percent: 50 })
      const scenes = await scriptAnalyzer.detectScenes(text)
      
      // Analyze characters
      updateFileProgress(fileName, { stage: 'characters', percent: 75 })
      const characters = await scriptAnalyzer.detectCharacters(text)
      
      // Analyze emotions
      updateFileProgress(fileName, { stage: 'emotions', percent: 90 })
      const emotionSuggestions = await scriptAnalyzer.suggestEmotions(text)
      
      updateFileProgress(fileName, { stage: 'complete', percent: 100 })
      
      return {
        scenes,
        characters,
        emotionSuggestions
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze script'
      updateFileProgress(fileName, { stage: 'error', error: errorMessage })
      throw error
    }
  }

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setIsAnalyzing(true)
    setFileProgress(new Map(
      files.map(file => [file.name, {
        fileName: file.name,
        stage: 'queued',
        percent: 0
      }])
    ))

    try {
      // Process files sequentially to avoid overwhelming the API
      for (const file of files) {
        setCurrentFile(file.name)
        const analysis = await processFile(file)
        onAnalysisComplete(analysis)
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to analyze scripts')
    } finally {
      setIsAnalyzing(false)
      setCurrentFile(null)
    }
  }, [onAnalysisComplete, onError])

  const getAcceptedFileTypes = () => {
    return [
      '.txt',                                                         // Text files
      '.pdf',                                                         // PDF files
      '.doc', '.docx',                                               // Word files
      'text/plain',                                                  // MIME types
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ].join(',')
  }

  const renderProgress = (progress: FileProgress) => {
    const getStatusColor = () => {
      switch (progress.stage) {
        case 'complete': return 'bg-green-600'
        case 'error': return 'bg-red-600'
        default: return 'bg-blue-600'
      }
    }

    return (
      <div key={progress.fileName} className="w-full">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span className="truncate">{progress.fileName}</span>
          <span className="ml-2">
            {progress.stage === 'error' ? 'Error' :
             progress.stage === 'complete' ? 'Complete' :
             `${progress.stage === 'queued' ? 'Queued' : 'Processing'} (${progress.percent}%)`}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {progress.error && (
          <p className="text-sm text-red-600 mt-1">{progress.error}</p>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-start gap-4 ${className || ''}`}>
      <div className="flex items-center gap-4">
        <label
          htmlFor="script-upload"
          className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
            isAnalyzing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isAnalyzing ? 'Processing...' : 'Upload Scripts'}
          <input
            id="script-upload"
            type="file"
            accept={getAcceptedFileTypes()}
            onChange={handleFileUpload}
            disabled={isAnalyzing}
            multiple
            className="hidden"
          />
        </label>
        <span className="text-sm text-gray-500">
          Supported formats: TXT, PDF, DOC, DOCX
        </span>
      </div>

      {fileProgress.size > 0 && (
        <div className="w-full max-w-md space-y-4">
          {Array.from(fileProgress.values()).map(renderProgress)}
        </div>
      )}
    </div>
  )
} 