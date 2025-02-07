import { RoleAnalysis, PerformanceAnalysis, PracticeResponse } from '../types/ai'

class AIService {
  private openaiKey: string
  private elevenlabsKey: string

  constructor() {
    this.openaiKey = process.env.REACT_APP_OPENAI_API_KEY || ''
    this.elevenlabsKey = process.env.REACT_APP_ELEVENLABS_API_KEY || ''
  }

  async detectRoles(scriptContent: string): Promise<RoleAnalysis[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a script analyzer. Extract all character roles and their lines.'
            },
            {
              role: 'user',
              content: `Analyze this script:\n\n${scriptContent}`
            }
          ]
        })
      })

      const data = await response.json()
      return JSON.parse(data.choices[0].message.content)
    } catch (error) {
      console.error('Role detection error:', error)
      throw error
    }
  }

  async generatePracticeResponse(
    scriptContent: string,
    currentLine: string,
    role: string,
    practiceMode: string
  ): Promise<PracticeResponse> {
    try {
      // Get text response from OpenAI
      const textResponse = await this.getOpenAIResponse(
        scriptContent,
        currentLine,
        role,
        practiceMode
      )

      // Generate audio with ElevenLabs
      const audioUrl = await this.generateAudio(textResponse)

      return { textResponse, audioUrl }
    } catch (error) {
      console.error('Practice response error:', error)
      throw error
    }
  }

  private async getOpenAIResponse(
    scriptContent: string,
    currentLine: string,
    role: string,
    practiceMode: string
  ): Promise<string> {
    // Implementation similar to Python version
    // Returns text response
  }

  private async generateAudio(text: string): Promise<string> {
    // Implementation using ElevenLabs API
    // Returns audio URL
  }
}

export const aiService = new AIService() 