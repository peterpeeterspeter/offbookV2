import { Emotion } from '../types'

export interface SceneInfo {
  id: string
  title: string
  description?: string
  startLine: number
  endLine: number
  characters: string[]
}

export interface CharacterInfo {
  name: string
  lines: number
  emotions: Record<Emotion, number>
  relationships: Record<string, string>
}

export interface ScriptAnalysis {
  scenes: SceneInfo[]
  characters: CharacterInfo[]
  emotionSuggestions: {
    line: number
    text: string
    emotion: Emotion
    intensity: number
    confidence: number
  }[]
}

const SCENE_MARKERS = [
  'INT.',
  'EXT.',
  'INTERIOR',
  'EXTERIOR',
  'FADE IN:',
  'CUT TO:',
  'DISSOLVE TO:'
]

const CHARACTER_INDICATORS = [
  'enters',
  'exits',
  'walks in',
  'leaves',
  'appears',
  'disappears'
]

export class ScriptAnalyzer {
  private apiKey: string

  constructor() {
    const apiKey = process.env.REACT_APP_DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('DeepSeek API key not found')
    }
    this.apiKey = apiKey
  }

  private async analyzeWithDeepSeek(text: string, prompt: string): Promise<any> {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a script analysis expert. Analyze the script for scenes, characters, and emotional context.'
            },
            {
              role: 'user',
              content: `${prompt}\n\nScript:\n${text}`
            }
          ],
          temperature: 0.3
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze script with DeepSeek')
      }

      return await response.json()
    } catch (error) {
      console.error('Script analysis error:', error)
      throw error
    }
  }

  public async detectScenes(text: string): Promise<SceneInfo[]> {
    const prompt = `Analyze this script and identify all scenes. For each scene, provide:
    1. A unique ID
    2. Scene title/heading
    3. Brief description
    4. Start and end line numbers
    5. List of characters present
    Format the response as JSON.`

    const analysis = await this.analyzeWithDeepSeek(text, prompt)
    return this.parseSceneAnalysis(analysis)
  }

  public async detectCharacters(text: string): Promise<CharacterInfo[]> {
    const prompt = `Analyze this script and identify all characters. For each character, provide:
    1. Character name
    2. Number of lines
    3. Dominant emotions expressed
    4. Key relationships with other characters
    Format the response as JSON.`

    const analysis = await this.analyzeWithDeepSeek(text, prompt)
    return this.parseCharacterAnalysis(analysis)
  }

  public async suggestEmotions(text: string): Promise<ScriptAnalysis['emotionSuggestions']> {
    const prompt = `Analyze this script and suggest emotions for each line of dialogue. For each line, provide:
    1. Line number
    2. Text content
    3. Suggested emotion (joy, sadness, anger, fear, surprise, disgust, neutral)
    4. Emotion intensity (0-100)
    5. Confidence score (0-100)
    Format the response as JSON.`

    const analysis = await this.analyzeWithDeepSeek(text, prompt)
    return this.parseEmotionSuggestions(analysis)
  }

  private parseSceneAnalysis(analysis: any): SceneInfo[] {
    try {
      const scenes = JSON.parse(analysis.choices[0].message.content)
      return scenes.map((scene: any) => ({
        id: scene.id,
        title: scene.title,
        description: scene.description,
        startLine: scene.startLine,
        endLine: scene.endLine,
        characters: scene.characters
      }))
    } catch (error) {
      console.error('Error parsing scene analysis:', error)
      return []
    }
  }

  private parseCharacterAnalysis(analysis: any): CharacterInfo[] {
    try {
      const characters = JSON.parse(analysis.choices[0].message.content)
      return characters.map((char: any) => ({
        name: char.name,
        lines: char.lines,
        emotions: char.emotions,
        relationships: char.relationships
      }))
    } catch (error) {
      console.error('Error parsing character analysis:', error)
      return []
    }
  }

  private parseEmotionSuggestions(analysis: any): ScriptAnalysis['emotionSuggestions'] {
    try {
      const suggestions = JSON.parse(analysis.choices[0].message.content)
      return suggestions.map((sugg: any) => ({
        line: sugg.line,
        text: sugg.text,
        emotion: sugg.emotion,
        intensity: sugg.intensity,
        confidence: sugg.confidence
      }))
    } catch (error) {
      console.error('Error parsing emotion suggestions:', error)
      return []
    }
  }
}

export const scriptAnalyzer = new ScriptAnalyzer() 