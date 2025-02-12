import { describe, it, expect, beforeEach, vi } from 'vitest'
import { detectEmotions, getPerformanceMetrics, resetMetrics } from '../services/deepseek'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Mock API configuration
vi.mock('../config', () => ({
  DEEPSEEK_API_URL: 'https://api.deepseek.test',
  DEEPSEEK_API_KEY: 'test-api-key'
}))

// Helper to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('DeepSeek Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMetrics()
  })

  describe('Pipeline Tests', () => {
    it('should process text and return emotion suggestions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              primary_emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8,
              secondary_emotions: []
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const result = await detectEmotions('happy text')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions?.length).toBe(1)
      expect(result.suggestions?.[0]?.emotion).toBe('joy')
    })

    it('should process multiple requests with rate limiting', async () => {
      const texts = ['happy text', 'sad text', 'angry text']
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              primary_emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8,
              secondary_emotions: []
            })
          }
        }]
      }

      mockFetch.mockImplementation(async () => {
        await delay(100) // Simulate API delay
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      })

      const results = await Promise.all(
        texts.map(async (text, index) => {
          await delay(index * 200) // Add delay between requests
          return detectEmotions(text)
        })
      )

      results.forEach(result => {
        expect(result.suggestions).toBeDefined()
        expect(result.suggestions?.length).toBe(1)
      })

      const metrics = getPerformanceMetrics()
      expect(metrics.pipeline.totalRequests).toBe(texts.length)
      expect(metrics.pipeline.errors).toBe(0)
    })

    it('should handle rate limiting gracefully', async () => {
      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        if (callCount % 3 === 0) { // Simulate rate limit every 3rd request
          return new Response(JSON.stringify({ error: { type: 'rate_limit_exceeded' } }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                primary_emotion: 'joy',
                confidence: 0.9,
                intensity: 0.8,
                secondary_emotions: []
              })
            }
          }]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      })

      const requests = Array(5).fill(null).map((_, i) => `test ${i}`)
      const results = await Promise.all(
        requests.map(async (text, index) => {
          await delay(index * 100) // Add delay between requests
          return detectEmotions(text)
        })
      )

      expect(results.length).toBe(requests.length)
      results.forEach(result => {
        expect(result.suggestions).toBeDefined()
        expect(result.suggestions?.length).toBeGreaterThan(0)
      })

      const metrics = getPerformanceMetrics()
      expect(metrics.pipeline.errors).toBeGreaterThan(0)
      expect(metrics.pipeline.errorRate).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors with fallback', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'API Error' } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const result = await detectEmotions('test error')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions?.length).toBeGreaterThan(0)
      expect(result.suggestions?.[0]?.emotion).toBeDefined()
      expect(['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral']).toContain(result.suggestions?.[0]?.emotion)

      const metrics = getPerformanceMetrics()
      expect(metrics.pipeline.errors).toBe(1)
      expect(metrics.pipeline.errorRate).toBeGreaterThan(0)
    })

    it('should handle rate limit errors with backoff', async () => {
      let attempts = 0
      mockFetch.mockImplementation(async () => {
        attempts++
        if (attempts <= 1) { // Fail on first attempt
          return new Response(JSON.stringify({ error: { type: 'rate_limit_exceeded' } }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                primary_emotion: 'joy',
                confidence: 0.9,
                intensity: 0.8,
                secondary_emotions: []
              })
            }
          }]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      })

      const result = await detectEmotions('test rate limit')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions?.length).toBeGreaterThan(0)
      expect(attempts).toBe(2) // Verify exactly two attempts occurred
    })
  })

  describe('Caching System', () => {
    it('should cache and retrieve responses', async () => {
      const text = 'cache test'
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              primary_emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8,
              secondary_emotions: []
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      // First request should hit API
      const firstResult = await detectEmotions(text)
      const firstMetrics = getPerformanceMetrics()

      // Second request should hit cache
      const secondResult = await detectEmotions(text)
      const secondMetrics = getPerformanceMetrics()

      expect(secondMetrics.cache.hits).toBe(firstMetrics.cache.hits + 1)
      expect(firstResult).toEqual(secondResult)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Verify only one API call
    })
  })

  describe('Performance Metrics', () => {
    it('should track metrics correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              primary_emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8,
              secondary_emotions: []
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      await detectEmotions('test metrics')
      const metrics = getPerformanceMetrics()

      expect(metrics.pipeline.totalRequests).toBe(1)
      expect(metrics.pipeline.errors).toBe(0)
      expect(metrics.cache.misses).toBe(1)
      expect(metrics.cache.hits).toBe(0)
    })

    it('should optimize batch size based on performance', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              primary_emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8,
              secondary_emotions: []
            })
          }
        }]
      }

      mockFetch.mockImplementation(async () => {
        await delay(100) // Simulate API delay
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      })

      const startMetrics = getPerformanceMetrics()
      const batchSize = 10
      const requests = Array(batchSize).fill(null).map((_, i) => `test ${i}`)

      await Promise.all(requests.map(text => detectEmotions(text)))

      const endMetrics = getPerformanceMetrics()
      expect(endMetrics.pipeline.totalRequests).toBe(startMetrics.pipeline.totalRequests + batchSize)
      expect(endMetrics.pipeline.avgResponseTime).toBeGreaterThan(0)
      expect(endMetrics.pipeline.batchEfficiency).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Advanced Emotion Analysis', () => {
    it('should handle secondary emotions correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              primary_emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8,
              secondary_emotions: [
                { emotion: 'excitement', intensity: 0.6 },
                { emotion: 'contentment', intensity: 0.4 }
              ]
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await detectEmotions('happy and excited')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions?.length).toBe(3) // Primary + 2 secondary
      expect(result.suggestions?.[0]?.emotion).toBe('joy')
      expect(result.suggestions?.[1]?.emotion).toBe('excitement')
      expect(result.suggestions?.[2]?.emotion).toBe('contentment')
      expect(result.suggestions?.[1]?.intensity).toBe(0.6)
    })

    it('should handle mixed emotions with varying intensities', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              primary_emotion: 'confusion',
              confidence: 0.85,
              intensity: 0.9,
              secondary_emotions: [
                { emotion: 'anxiety', intensity: 0.7 },
                { emotion: 'curiosity', intensity: 0.5 }
              ]
            })
          }
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await detectEmotions('complex emotional state')
      expect(result.suggestions?.length).toBe(3)
      expect(result.suggestions?.[0]?.confidence).toBe(0.85)
      expect(result.suggestions?.[1]?.intensity).toBe(0.7)
    })
  })

  describe('Performance and Rate Limiting', () => {
    it('should track response times accurately', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              primary_emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8,
              secondary_emotions: []
            })
          }
        }]
      }

      // Simulate a delay of 100ms
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() =>
            resolve({
              ok: true,
              json: () => Promise.resolve(mockResponse)
            }), 100)
        )
      )

      const startTime = Date.now()
      await detectEmotions('test response time')
      const endTime = Date.now()

      const metrics = getPerformanceMetrics()
      expect(metrics.pipeline.avgResponseTime).toBeGreaterThan(0)
      expect(endTime - startTime).toBeGreaterThanOrEqual(100)
    })

    it('should handle rate limiting gracefully', async () => {
      // First mock a rate limit response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      // Then mock a successful response for retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                primary_emotion: 'neutral',
                confidence: 0.9,
                intensity: 0.8,
                secondary_emotions: []
              })
            }
          }]
        })
      })

      const result = await detectEmotions('test rate limit')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions?.length).toBeGreaterThan(0)
      expect(result.suggestions?.[0]?.emotion).toBeDefined()

      const metrics = getPerformanceMetrics()
      expect(metrics.pipeline.errors).toBeGreaterThan(0)
      expect(metrics.pipeline.errorRate).toBeGreaterThan(0)
    })
  })

  describe('Batch Processing', () => {
    it('should optimize batch size based on response times', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              primary_emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8,
              secondary_emotions: []
            })
          }
        }]
      }

      // Simulate varying response times
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        const delay = callCount % 3 === 0 ? 150 : 50 // Every third call is slower
        return new Promise(resolve =>
          setTimeout(() =>
            resolve({
              ok: true,
              json: () => Promise.resolve(mockResponse)
            }), delay)
        )
      })

      const batchSize = 10
      const requests = Array(batchSize).fill(null).map((_, i) => `batch test ${i}`)

      const startMetrics = getPerformanceMetrics()
      await Promise.all(requests.map(text => detectEmotions(text)))
      const endMetrics = getPerformanceMetrics()

      expect(endMetrics.pipeline.totalRequests).toBe(startMetrics.pipeline.totalRequests + batchSize)
      expect(endMetrics.pipeline.avgResponseTime).toBeGreaterThan(0)
      expect(endMetrics.pipeline.batchEfficiency).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const result = await detectEmotions('error text')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions?.length).toBeGreaterThan(0)
      expect(result.suggestions?.[0]?.emotion).toBeDefined()
      expect(['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral']).toContain(result.suggestions?.[0]?.emotion)

      const metrics = getPerformanceMetrics()
      expect(metrics.pipeline.errors).toBe(1)
    })

    it('should detect multiple emotions', async () => {
      const result = await detectEmotions('complex text')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions?.length).toBe(3) // Primary + 2 secondary
      expect(result.suggestions?.[0]?.emotion).toBe('joy')
      expect(result.suggestions?.[1]?.emotion).toBe('excitement')
      expect(result.suggestions?.[2]?.emotion).toBe('contentment')
      expect(result.suggestions?.[1]?.intensity).toBe(0.6)
    })

    it('should handle mixed emotions with varying intensities', async () => {
      const result = await detectEmotions('complex emotional state')
      expect(result.suggestions?.length).toBe(3)
      expect(result.suggestions?.[0]?.confidence).toBe(0.85)
      expect(result.suggestions?.[1]?.intensity).toBe(0.7)
    })

    it('should handle errors with retry', async () => {
      const result = await detectEmotions('error prone text')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions?.length).toBeGreaterThan(0)
      expect(result.suggestions?.[0]?.emotion).toBeDefined()

      const metrics = getPerformanceMetrics()
      expect(metrics.pipeline.errors).toBeGreaterThan(0)
    })
  })
})

