export interface RoleAnalysis {
  role: string
  lines: string[]
}

export interface PerformanceAnalysis {
  accuracy: number
  timing: number
  feedback: string
  suggestions: string[]
}

export interface PracticeResponse {
  textResponse: string
  audioUrl: string
} 