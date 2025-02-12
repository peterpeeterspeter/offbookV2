import { describe, it, expect, beforeEach, vi } from 'vitest'
import { synthesizeSpeech, resetStreamingMetrics } from '../services/elevenlabs'
import type { Emotion } from '../components/EmotionHighlighter'

// Mock environment variables
process.env.REACT_APP_ELEVENLABS_API_KEY = 'test-key'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('ElevenLabs Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStreamingMetrics()
  })

  describe('Speech Synthesis', () => {
    it('should synthesize speech successfully', async () => {
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]))
          controller.close()
        }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockBody,
        headers: new Headers({
          'content-type': 'audio/mpeg'
        })
      })

      const stream = await synthesizeSpeech('Test text')
      expect(stream).toBeInstanceOf(ReadableStream)

      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.text).toBe('Test text')
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ detail: 'Server error' })
      })

      await expect(synthesizeSpeech('Test error'))
        .rejects.toThrow('ElevenLabs API error: Internal Server Error');
    })
  })

  describe('Emotion-based Speech', () => {
    const emotions: Emotion[] = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral']

    it.each(emotions)('should adjust speech parameters for %s', async (emotion) => {
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]))
          controller.close()
        }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockBody,
        headers: new Headers({
          'content-type': 'audio/mpeg'
        })
      })

      const stream = await synthesizeSpeech('Test emotion', emotion)
      expect(stream).toBeInstanceOf(ReadableStream)

      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.text).toBe('Test emotion')
    })
  })

  describe('Error Recovery', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error')
      mockFetch.mockRejectedValueOnce(networkError)

      await expect(synthesizeSpeech('Test network error'))
        .rejects.toThrow('Network error')
    })

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
        headers: new Headers({
          'content-type': 'audio/mpeg'
        })
      })

      await expect(synthesizeSpeech('Test empty response'))
        .rejects.toThrow('No response body received')
    })
  })
})
