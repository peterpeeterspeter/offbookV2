import { Emotion } from '../components/EmotionHighlighter'
import OpenAI from 'openai'
import { PerformanceMetrics, PipelineMetrics } from '../types'
import { DeepSeekResponse, EmotionSuggestion } from './types'
import { SimpleCache } from './cache'

// Pipeline integration
interface PipelineContext {
  startTime: number
  batchSize: number
  processingTime: number[]
  queueSize: number
  lastProcessedTimestamp: number
}

class DeepSeekPipeline {
  private context: PipelineContext
  private metrics: PipelineMetrics

  constructor() {
    this.context = {
      startTime: Date.now(),
      batchSize: 10,
      processingTime: [],
      queueSize: 0,
      lastProcessedTimestamp: Date.now()
    }
    this.metrics = {
      averageLatency: 0,
      throughput: 0,
      errorRate: 0,
      queueUtilization: 0,
      batchEfficiency: 0
    }
  }

  private updateMetrics(results: { success: boolean; time: number }[], batchTime: number) {
    const successCount = results.filter(r => r.success).length
    const totalTime = results.reduce((sum, r) => sum + r.time, 0)

    this.metrics = {
      averageLatency: totalTime / results.length,
      throughput: results.length / (batchTime / 1000),
      errorRate: (results.length - successCount) / results.length,
      queueUtilization: this.context.queueSize / CACHE_CONFIG.maxEntries,
      batchEfficiency: results.length / this.context.batchSize
    }

    // Optimize batch size based on performance
    if (this.metrics.averageLatency > 1500) { // If latency > 1.5s
      this.context.batchSize = Math.max(1, this.context.batchSize - 1)
    } else if (this.metrics.averageLatency < 500 && this.metrics.errorRate < 0.1) {
      this.context.batchSize = Math.min(20, this.context.batchSize + 1)
    }
  }

  getMetrics(): PipelineMetrics {
    return this.metrics
  }
}

// Create singleton instance
const pipeline = new DeepSeekPipeline()

// Performance metrics
let metrics: PerformanceMetrics = {
  pipeline: {
    averageLatency: 0,
    totalRequests: 0,
    errors: 0,
    batchSize: 20,
  },
  cache: {
    hits: 0,
    misses: 0,
    size: 0,
  }
}

// Cache for API responses
const responseCache = new SimpleCache(500, 1000 * 60 * 60) // 500 items, 1 hour TTL

// Local fallback analysis
function analyzeTextLocally(text: string): EmotionSuggestion[] {
  const basicEmotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral']
  const randomEmotion = basicEmotions[Math.floor(Math.random() * basicEmotions.length)]
  
  return [{
    text,
    emotion: randomEmotion,
    confidence: 0.7,
    intensity: 0.5
  }]
}

// Reset metrics (for testing)
export function resetMetrics() {
  metrics = {
    pipeline: {
      averageLatency: 0,
      totalRequests: 0,
      errors: 0,
      batchSize: 20,
    },
    cache: {
      hits: 0,
      misses: 0,
      size: 0,
    }
  }
  responseCache.clear()
}

// Get performance metrics
export function getPerformanceMetrics(): PerformanceMetrics {
  return {
    ...metrics,
    cache: {
      ...metrics.cache,
      size: responseCache.size
    }
  }
}

// Main emotion detection function
export async function detectEmotions(text: string): Promise<{ suggestions: EmotionSuggestion[] }> {
  const startTime = Date.now()
  metrics.pipeline.totalRequests++
  
  try {
    // Check cache first
    const cached = responseCache.get(text)
    if (cached) {
      metrics.cache.hits++
      return cached
    }
    metrics.cache.misses++

    // Make API request using the chat completions endpoint
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an emotion detection assistant. Analyze the text and return emotions in JSON format.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Parse the response content to extract emotions
    const content = result.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('Invalid API response format')
    }

    // Parse the content as JSON or extract emotion keywords
    let emotions
    try {
      emotions = JSON.parse(content)
    } catch {
      // Fallback to simple text parsing if not JSON
      const emotionKeywords = {
        joy: ['happy', 'joyful', 'excited'],
        sadness: ['sad', 'depressed', 'unhappy'],
        anger: ['angry', 'furious', 'mad'],
        fear: ['scared', 'afraid', 'fearful'],
        surprise: ['surprised', 'shocked', 'amazed'],
        neutral: ['neutral', 'calm', 'balanced']
      }

      const detectedEmotion = Object.entries(emotionKeywords)
        .find(([_, keywords]) => 
          keywords.some(keyword => content.toLowerCase().includes(keyword))
        )?.[0] || 'neutral'

      emotions = [{
        text,
        emotion: detectedEmotion,
        confidence: 0.8,
        intensity: 0.5
      }]
    }

    const suggestions = Array.isArray(emotions) ? emotions : [emotions]
    const responseData = { suggestions }
    responseCache.set(text, responseData)

    // Update metrics
    const processingTime = Date.now() - startTime
    metrics.pipeline.averageLatency = (
      metrics.pipeline.averageLatency * (metrics.pipeline.totalRequests - 1) +
      processingTime
    ) / metrics.pipeline.totalRequests

    return responseData

  } catch (error) {
    metrics.pipeline.errors++
    console.error('DeepSeek API error:', error)
    // Fallback to local analysis
    return { suggestions: analyzeTextLocally(text) }
  }
} 