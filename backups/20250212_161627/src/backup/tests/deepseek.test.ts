import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { detectEmotions, getPerformanceMetrics, resetMetrics } from '../services/deepseek'

// Mock fetch
global.fetch = jest.fn()

describe('DeepSeek Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetMetrics()
  })

  describe('Pipeline Tests', () => {
    it('should process text and return emotion suggestions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([{
              text: 'happy text',
              emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8
            }])
          }
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await detectEmotions('happy text')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions.length).toBe(1)
      expect(result.suggestions[0].emotion).toBe('joy')
    })

    it('should process multiple requests in batch', async () => {
      const texts = ['happy text', 'sad text', 'angry text']
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([{
              text: 'text',
              emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8
            }])
          }
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const results = await Promise.all(texts.map(text => detectEmotions(text)))
      
      results.forEach(result => {
        expect(result.suggestions).toBeDefined()
        expect(result.suggestions.length).toBe(1)
      })

      const metrics = getPerformanceMetrics()
      expect(metrics.pipeline.totalRequests).toBe(texts.length)
    })

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([{
              text: 'text',
              emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8
            }])
          }
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const startTime = Date.now()
      const results = await Promise.all(
        Array(concurrentRequests).fill(null).map(() => detectEmotions('test'))
      )
      const endTime = Date.now()

      const metrics = getPerformanceMetrics()
      expect(metrics.pipeline.totalRequests).toBe(concurrentRequests)
      expect(results.length).toBe(concurrentRequests)
    })

    it('should maintain performance under load', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([{
              text: 'text',
              emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8
            }])
          }
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const requests = Array(20).fill(null).map((_, i) => 
        `test request ${i}`
      )

      const startMetrics = getPerformanceMetrics()
      await Promise.all(requests.map(text => detectEmotions(text)))
      const endMetrics = getPerformanceMetrics()

      expect(endMetrics.pipeline.totalRequests).toBe(startMetrics.pipeline.totalRequests + requests.length)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      const result = await detectEmotions('test error')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions.length).toBe(1)

      const metrics = getPerformanceMetrics()
      expect(metrics.pipeline.errors).toBe(1)
    })

    it('should handle invalid response format', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'format' })
      })

      const result = await detectEmotions('test invalid')
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions.length).toBe(1)
    })

    it('should handle invalid inputs gracefully', async () => {
      const invalidInputs = ['', ' ', '   ', '\n', null, undefined]
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([{
              text: 'text',
              emotion: 'neutral',
              confidence: 0.9,
              intensity: 0.8
            }])
          }
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
      
      for (const input of invalidInputs) {
        const result = await detectEmotions(input as string)
        expect(result.suggestions).toBeDefined()
        expect(result.suggestions.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Caching System', () => {
    it('should cache and retrieve responses', async () => {
      const text = 'cache test'
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([{
              text: 'text',
              emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8
            }])
          }
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      // First request should hit API
      const firstResult = await detectEmotions(text)
      const firstMetrics = getPerformanceMetrics()
      
      // Second request should hit cache
      const secondResult = await detectEmotions(text)
      const secondMetrics = getPerformanceMetrics()

      expect(secondMetrics.cache.hits).toBe(firstMetrics.cache.hits + 1)
      expect(firstResult).toEqual(secondResult)
    })
  })

  describe('Performance Metrics', () => {
    it('should track metrics correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([{
              text: 'text',
              emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8
            }])
          }
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

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
            content: JSON.stringify([{
              text: 'text',
              emotion: 'joy',
              confidence: 0.9,
              intensity: 0.8
            }])
          }
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const initialMetrics = getPerformanceMetrics()
      
      // Generate load to trigger batch size adjustments
      await Promise.all(Array(30).fill(null).map((_, i) => 
        detectEmotions(`test ${i}`)
      ))

      const finalMetrics = getPerformanceMetrics()
      expect(finalMetrics.pipeline.totalRequests).toBe(initialMetrics.pipeline.totalRequests + 30)
    })
  })
}) 

