import { Emotion } from '../components/EmotionHighlighter'
import OpenAI from 'openai'

interface EmotionSuggestion {
  text: string
  emotion: Emotion
  confidence: number
  intensity: number
}

interface DeepSeekResponse {
  suggestions: EmotionSuggestion[]
  error?: string
}

interface CacheEntry {
  response: DeepSeekResponse
  timestamp: number
  useCount: number
}

interface CacheMetrics {
  hits: number
  misses: number
  batchHits: number
  totalRequests: number
  startTime: number
  lastReset: number
  frequentItems: number
  averageLatency: number
  latencySamples: number[]
}

// Cache configuration aligned with PRD requirements
const CACHE_CONFIG = {
  maxEntries: 1000,                    // Increased for better coverage
  ttl: 7 * 24 * 60 * 60 * 1000,       // 7 days TTL for better reuse
  similarityThreshold: 0.85,           // Slightly relaxed for better hit rate
  batchSize: 50,                       // Number of entries to process in batch
  frequentUseThreshold: 5,             // Number of uses before considered frequent
  frequentUseTTL: 30 * 24 * 60 * 60 * 1000, // 30 days TTL for frequent items
  metricsRetention: 7 * 24 * 60 * 60 * 1000, // 7 days of metrics
  maxLatencySamples: 1000,                    // Number of latency samples to keep
} as const

// Rate limiting adjusted for PRD latency requirements
const RATE_LIMIT = {
  maxTokens: 20,                       // Increased for better throughput
  refillRate: 2,                       // 2 tokens per second
  refillInterval: 1000,
  minTimeBetweenCalls: 250,           // Reduced to meet 1.5s latency requirement
} as const

class ResponseCache {
  private cache: Map<string, CacheEntry>
  private batchQueue: string[] = []
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    batchHits: 0,
    totalRequests: 0,
    startTime: Date.now(),
    lastReset: Date.now(),
    frequentItems: 0,
    averageLatency: 0,
    latencySamples: []
  }

  constructor() {
    this.loadCache()
    this.initializeBatchProcessing()
    this.loadMetrics()
    this.initializeMetricsCleanup()
  }

  private loadCache(): void {
    try {
      const savedCache = localStorage.getItem('emotion-cache')
      if (savedCache) {
        const entries = JSON.parse(savedCache)
        this.cache = new Map(entries)
        this.cleanExpiredEntries()
      } else {
        this.cache = new Map()
      }
    } catch (error) {
      console.warn('Failed to load cache:', error)
      this.cache = new Map()
    }
  }

  private saveCache(): void {
    try {
      const entries = Array.from(this.cache.entries())
      localStorage.setItem('emotion-cache', JSON.stringify(entries))
    } catch (error) {
      console.warn('Failed to save cache:', error)
    }
  }

  private cleanExpiredEntries(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      const ttl = entry.useCount >= CACHE_CONFIG.frequentUseThreshold
        ? CACHE_CONFIG.frequentUseTTL
        : CACHE_CONFIG.ttl

      if (now - entry.timestamp > ttl) {
        this.cache.delete(key)
      }
    }
    this.saveCache()
  }

  private initializeBatchProcessing(): void {
    // Process batch queue during idle time
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => this.processBatchQueue(), { timeout: 1000 })
    } else {
      setTimeout(() => this.processBatchQueue(), 1000)
    }
  }

  private async processBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0) return

    const batch = this.batchQueue.splice(0, CACHE_CONFIG.batchSize)
    for (const text of batch) {
      if (!this.cache.has(text)) {
        try {
          const response = await detectEmotions(text)
          this.set(text, response)
        } catch (error) {
          console.warn('Failed to process batch item:', error)
        }
      }
    }

    // Schedule next batch if there are more items
    if (this.batchQueue.length > 0) {
      this.initializeBatchProcessing()
    }
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  private findSimilarEntry(text: string): DeepSeekResponse | null {
    const normalizedText = this.normalizeText(text)
    
    for (const [cachedText, entry] of this.cache.entries()) {
      if (this.calculateSimilarity(normalizedText, this.normalizeText(cachedText)) >= CACHE_CONFIG.similarityThreshold) {
        // Update use count for frequently used items
        entry.useCount = (entry.useCount || 0) + 1
        if (entry.useCount === CACHE_CONFIG.frequentUseThreshold) {
          // Extend TTL for frequently used items
          entry.timestamp = Date.now()
        }
        return entry.response
      }
    }

    return null
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity for word sets
    const words1 = new Set(text1.split(' '))
    const words2 = new Set(text2.split(' '))
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }

  private loadMetrics(): void {
    try {
      const savedMetrics = localStorage.getItem('emotion-cache-metrics')
      if (savedMetrics) {
        this.metrics = JSON.parse(savedMetrics)
        // Reset if metrics are too old
        if (Date.now() - this.metrics.lastReset > CACHE_CONFIG.metricsRetention) {
          this.resetMetrics()
        }
      }
    } catch (error) {
      console.warn('Failed to load metrics:', error)
      this.resetMetrics()
    }
  }

  private saveMetrics(): void {
    try {
      localStorage.setItem('emotion-cache-metrics', JSON.stringify(this.metrics))
    } catch (error) {
      console.warn('Failed to save metrics:', error)
    }
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      batchHits: 0,
      totalRequests: 0,
      startTime: Date.now(),
      lastReset: Date.now(),
      frequentItems: 0,
      averageLatency: 0,
      latencySamples: []
    }
    this.saveMetrics()
  }

  private initializeMetricsCleanup(): void {
    // Clean up old metrics periodically
    setInterval(() => {
      if (Date.now() - this.metrics.lastReset > CACHE_CONFIG.metricsRetention) {
        this.resetMetrics()
      }
    }, 60 * 60 * 1000) // Check every hour
  }

  private updateLatencyMetrics(latency: number): void {
    this.metrics.latencySamples.push(latency)
    if (this.metrics.latencySamples.length > CACHE_CONFIG.maxLatencySamples) {
      this.metrics.latencySamples.shift()
    }
    this.metrics.averageLatency = this.metrics.latencySamples.reduce((a, b) => a + b, 0) / this.metrics.latencySamples.length
  }

  get(text: string): DeepSeekResponse | null {
    this.cleanExpiredEntries()
    const startTime = performance.now()
    const result = this.findSimilarEntry(text)
    
    this.metrics.totalRequests++
    if (result) {
      this.metrics.hits++
      this.updateLatencyMetrics(performance.now() - startTime)
    } else {
      this.metrics.misses++
    }
    
    this.saveMetrics()
    return result
  }

  set(text: string, response: DeepSeekResponse): void {
    if (this.cache.size >= CACHE_CONFIG.maxEntries) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => (a.useCount || 0) - (b.useCount || 0))
      this.cache.delete(entries[0][0])
    }

    this.cache.set(text, {
      response,
      timestamp: Date.now(),
      useCount: 1
    })

    // Update metrics for frequent items
    this.metrics.frequentItems = Array.from(this.cache.values())
      .filter(entry => entry.useCount >= CACHE_CONFIG.frequentUseThreshold)
      .length

    this.saveCache()
    this.saveMetrics()
  }

  addToBatch(text: string): void {
    if (!this.cache.has(text) && !this.batchQueue.includes(text)) {
      this.batchQueue.push(text)
    }
  }

  getMetrics(): {
    hitRate: number
    totalRequests: number
    averageLatency: number
    frequentItemsRatio: number
    uptime: number
  } {
    const hitRate = this.metrics.totalRequests > 0
      ? (this.metrics.hits + this.metrics.batchHits) / this.metrics.totalRequests
      : 0

    return {
      hitRate,
      totalRequests: this.metrics.totalRequests,
      averageLatency: this.metrics.averageLatency,
      frequentItemsRatio: this.cache.size > 0
        ? this.metrics.frequentItems / this.cache.size
        : 0,
      uptime: Date.now() - this.metrics.startTime
    }
  }
}

class RateLimiter {
  private tokens: number
  private lastRefill: number
  private lastCall: number

  constructor() {
    this.tokens = RATE_LIMIT.maxTokens
    this.lastRefill = Date.now()
    this.lastCall = 0
  }

  private refillTokens(): void {
    const now = Date.now()
    const timePassed = now - this.lastRefill
    const tokensToAdd = Math.floor(timePassed / RATE_LIMIT.refillInterval) * RATE_LIMIT.refillRate

    this.tokens = Math.min(RATE_LIMIT.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  async acquireToken(): Promise<boolean> {
    this.refillTokens()

    const now = Date.now()
    const timeSinceLastCall = now - this.lastCall
    if (timeSinceLastCall < RATE_LIMIT.minTimeBetweenCalls) {
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMIT.minTimeBetweenCalls - timeSinceLastCall)
      )
    }

    if (this.tokens > 0) {
      this.tokens--
      this.lastCall = Date.now()
      return true
    }

    return false
  }
}

// Initialize services
const client = new OpenAI({
  apiKey: process.env.REACT_APP_DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com'
})

export const rateLimiter = new RateLimiter()
export const responseCache = new ResponseCache()

const SYSTEM_PROMPT = `You are an expert at analyzing emotions in text. For any given text:
1. Identify emotional content and context
2. Classify the emotion into one of: joy, sadness, anger, fear, surprise, disgust, or neutral
3. Provide a confidence score (0-1) for your classification
4. Suggest an intensity level (1-10) for the emotion

Output your analysis in JSON format like:
{
  "suggestions": [
    {
      "text": "the text segment",
      "emotion": "the emotion",
      "confidence": 0.85,
      "intensity": 7
    }
  ]
}`

export async function detectEmotions(text: string): Promise<DeepSeekResponse> {
  if (!process.env.REACT_APP_DEEPSEEK_API_KEY) {
    return { suggestions: analyzeTextLocally(text) }
  }

  // Check cache first
  const cachedResponse = responseCache.get(text)
  if (cachedResponse) {
    console.log('Using cached response')
    return cachedResponse
  }

  // Try to acquire a token for API call
  const canMakeCall = await rateLimiter.acquireToken()
  if (!canMakeCall) {
    console.warn('Rate limit exceeded, falling back to local analysis')
    return {
      suggestions: analyzeTextLocally(text),
      error: 'Rate limit exceeded'
    }
  }

  try {
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content) as DeepSeekResponse
    
    const validSuggestions = result.suggestions.filter(suggestion => 
      suggestion.text &&
      EMOTIONS.includes(suggestion.emotion) &&
      suggestion.confidence >= 0 && suggestion.confidence <= 1 &&
      suggestion.intensity >= 1 && suggestion.intensity <= 10
    )

    const validResponse = { suggestions: validSuggestions }
    
    // Cache the valid response
    responseCache.set(text, validResponse)
    
    return validResponse
  } catch (error) {
    console.error('DeepSeek API error:', error)
    return { 
      suggestions: analyzeTextLocally(text),
      error: error instanceof Error ? error.message : 'Failed to analyze emotions'
    }
  }
}

// Keep local analysis as fallback
const EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'] as const

function analyzeTextLocally(text: string): EmotionSuggestion[] {
  const emotionKeywords = {
    joy: ['happy', 'excited', 'delighted', 'laugh', 'wonderful', 'great'],
    sadness: ['sad', 'sorry', 'upset', 'crying', 'miserable', 'unfortunate'],
    anger: ['angry', 'mad', 'furious', 'rage', 'hate', 'damn'],
    fear: ['scared', 'afraid', 'terrified', 'worried', 'nervous'],
    surprise: ['wow', 'oh', 'what', 'unexpected', 'amazing', 'incredible'],
    disgust: ['gross', 'disgusting', 'awful', 'terrible', 'horrible'],
    neutral: []
  } as const

  const suggestions: EmotionSuggestion[] = []
  const words = text.toLowerCase().split(/\s+/)

  words.forEach((word, index) => {
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => word.includes(keyword))) {
        const start = Math.max(0, index - 3)
        const end = Math.min(words.length, index + 4)
        const context = words.slice(start, end).join(' ')

        suggestions.push({
          text: context,
          emotion: emotion as Emotion,
          confidence: 0.8,
          intensity: 7
        })
        break
      }
    }
  })

  return suggestions
} 