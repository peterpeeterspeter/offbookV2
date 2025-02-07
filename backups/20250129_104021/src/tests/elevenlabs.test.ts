import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { synthesizeSpeech, getStreamingMetrics, resetStreamingMetrics } from '../services/elevenlabs'
import { Emotion } from '../types'

// Mock environment variables
process.env.REACT_APP_ELEVENLABS_API_KEY = 'test-key'

// Mock fetch
global.fetch = jest.fn()

describe('ElevenLabs Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetStreamingMetrics()
  })

  describe('Streaming Tests', () => {
    it('should create and manage audio streams', async () => {
      const audioData = new Uint8Array([1, 2, 3])
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(audioData)
          controller.close()
        }
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: mockBody,
        statusText: 'OK'
      })

      const stream = await synthesizeSpeech('Test text')
      expect(stream).toBeInstanceOf(ReadableStream)

      const reader = stream.getReader()
      const { value, done } = await reader.read()
      
      expect(done).toBe(false)
      expect(value).toBeInstanceOf(Uint8Array)
      expect(Array.from(value)).toEqual([1, 2, 3])

      const { done: finalDone } = await reader.read()
      expect(finalDone).toBe(true)
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      })

      await expect(synthesizeSpeech('Test error')).rejects.toThrow('ElevenLabs API error')
      
      const metrics = getStreamingMetrics()
      expect(metrics.errors).toBe(0) // Error is caught before stream creation
    })

    it('should handle stream interruptions', async () => {
      const mockBody = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream interrupted'))
        }
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: mockBody,
        statusText: 'OK'
      })

      const stream = await synthesizeSpeech('Test interruption')
      const reader = stream.getReader()
      
      try {
        await reader.read()
      } catch (error) {
        expect(error).toBeDefined()
      }
      
      const metrics = getStreamingMetrics()
      expect(metrics.errors).toBe(1)
    })
  })

  describe('Voice Selection', () => {
    const emotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral'] as const
    
    test.each(emotions)('should select appropriate voice for %s emotion', async (emotion) => {
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]))
          controller.close()
        }
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: mockBody,
        statusText: 'OK'
      })

      const stream = await synthesizeSpeech('Test text', emotion)
      expect(stream).toBeInstanceOf(ReadableStream)

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      
      expect(requestBody.voice_settings).toBeDefined()
      expect(requestBody.voice_settings.emotion).toBe(emotion)
    })
  })

  describe('Error Recovery', () => {
    it('should handle network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(synthesizeSpeech('Test network error')).rejects.toThrow('Network error')
      
      const metrics = getStreamingMetrics()
      expect(metrics.errors).toBe(0) // Error is caught before stream creation
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing API key', async () => {
      const originalKey = process.env.REACT_APP_ELEVENLABS_API_KEY
      process.env.REACT_APP_ELEVENLABS_API_KEY = ''
      
      await expect(synthesizeSpeech('Test no API key')).rejects.toThrow('API key not configured')
      
      process.env.REACT_APP_ELEVENLABS_API_KEY = originalKey
    })

    it('should handle empty response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: null,
        statusText: 'OK'
      })

      await expect(synthesizeSpeech('Test empty response')).rejects.toThrow('No response body received')
    })
  })
}) 
