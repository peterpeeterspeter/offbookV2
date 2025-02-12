import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ScriptAnalysisService } from '@/services/script-analysis'
import { AudioService } from '@/services/audio-service'
import {
  ScriptAnalysisError,
  ValidationError,
  ProcessingError,
  ScriptAnalysisErrorCode
} from '@/types/errors'
import type { TTSConfig } from '@/types/audio'
import type { UploadProgress } from '@/types/progress'

// Mock AudioService
const mockAudioService = {
  initializeTTS: vi.fn().mockImplementation(async () => {}),
  setup: vi.fn(),
  getState: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  getCurrentSession: vi.fn(),
  cleanup: vi.fn()
} as unknown as typeof AudioService

describe('ScriptAnalysisService - Error Handling', () => {
  let service: ScriptAnalysisService
  const mockProgress = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ScriptAnalysisService(mockAudioService, mockProgress)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('File Validation', () => {
    it('should reject files larger than MAX_FILE_SIZE', async () => {
      const largeFile = new File(['x'.repeat(21 * 1024 * 1024)], 'test.txt', { type: 'text/plain' })

      await expect(service.uploadScript(largeFile, { title: 'Test' }))
        .rejects
        .toThrow(ValidationError)
    })

    it('should reject unsupported file types', async () => {
      const invalidFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await expect(service.uploadScript(invalidFile, { title: 'Test' }))
        .rejects
        .toThrow(ValidationError)
    })

    it('should handle corrupted PDF files', async () => {
      const corruptedPDF = new File(['not a pdf'], 'test.pdf', { type: 'application/pdf' })

      await expect(service.uploadScript(corruptedPDF, { title: 'Test' }))
        .rejects
        .toThrow(ProcessingError)
    })

    it('should handle corrupted DOCX files', async () => {
      const corruptedDOCX = new File(['not a docx'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })

      await expect(service.uploadScript(corruptedDOCX, { title: 'Test' }))
        .rejects
        .toThrow(ProcessingError)
    })
  })

  describe('API Error Handling', () => {
    it('should handle DeepSeek API errors', async () => {
      const file = new File(['test script'], 'test.txt', { type: 'text/plain' })
      global.fetch = vi.fn().mockRejectedValue(new Error('API Error'))

      await expect(service.uploadScript(file, { title: 'Test' }))
        .rejects
        .toThrow(ProcessingError)
    })

    it('should handle rate limiting', async () => {
      const file = new File(['test script'], 'test.txt', { type: 'text/plain' })
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      await expect(service.uploadScript(file, { title: 'Test' }))
        .rejects
        .toThrow(ProcessingError)
    })

    it('should handle invalid API responses', async () => {
      const file = new File(['test script'], 'test.txt', { type: 'text/plain' })
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      })

      await expect(service.uploadScript(file, { title: 'Test' }))
        .rejects
        .toThrow(ProcessingError)
    })
  })

  describe('TTS Initialization', () => {
    it('should handle missing voice ID', async () => {
      const config: TTSConfig = {
        voiceId: '',
        settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0,
          use_speaker_boost: false
        }
      }

      await expect(service.initializeTTS(config))
        .rejects
        .toThrow(ProcessingError)
    })

    it('should handle audio service initialization failures', async () => {
      const mockInit = mockAudioService.initializeTTS as ReturnType<typeof vi.fn>
      mockInit.mockRejectedValue(new Error('Init failed'))
      const config: TTSConfig = {
        voiceId: 'test-voice',
        settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0,
          use_speaker_boost: false
        }
      }

      await expect(service.initializeTTS(config))
        .rejects
        .toThrow(ProcessingError)
    })
  })
})

describe('ScriptAnalysisService - Performance', () => {
  let service: ScriptAnalysisService
  const mockProgress = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ScriptAnalysisService(mockAudioService, mockProgress)
  })

  it('should process large scripts efficiently', async () => {
    const largeScript = 'A'.repeat(1000000) // 1MB of text
    const file = new File([largeScript], 'large.txt', { type: 'text/plain' })
    const startTime = performance.now()

    await service.uploadScript(file, { title: 'Large Script' })
    const endTime = performance.now()

    expect(endTime - startTime).toBeLessThan(5000) // Should process in under 5 seconds
  })

  it('should handle concurrent analysis requests', async () => {
    const files = Array(5).fill(null).map((_, i) =>
      new File(['test script'], `test${i}.txt`, { type: 'text/plain' })
    )

    const startTime = performance.now()
    await Promise.all(files.map(file =>
      service.uploadScript(file, { title: file.name })
    ))
    const endTime = performance.now()

    expect(endTime - startTime).toBeLessThan(10000) // Should process all in under 10 seconds
  })

  it('should efficiently use caching', async () => {
    const file = new File(['test script'], 'test.txt', { type: 'text/plain' })

    // First request - should take normal time
    const firstStart = performance.now()
    await service.uploadScript(file, { title: 'Test' })
    const firstEnd = performance.now()

    // Second request - should be faster due to caching
    const secondStart = performance.now()
    await service.uploadScript(file, { title: 'Test 2' })
    const secondEnd = performance.now()

    expect(secondEnd - secondStart).toBeLessThan((firstEnd - firstStart) / 2)
  })
})

describe('ScriptAnalysisService - Edge Cases', () => {
  let service: ScriptAnalysisService
  const mockProgress = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ScriptAnalysisService(mockAudioService, mockProgress)
  })

  it('should handle empty files', async () => {
    const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' })

    await expect(service.uploadScript(emptyFile, { title: 'Empty' }))
      .rejects
      .toThrow(ValidationError)
  })

  it('should handle files with only whitespace', async () => {
    const whitespaceFile = new File([' \n\t '], 'whitespace.txt', { type: 'text/plain' })

    await expect(service.uploadScript(whitespaceFile, { title: 'Whitespace' }))
      .rejects
      .toThrow(ValidationError)
  })

  it('should handle scripts with no dialogue', async () => {
    const noDialogueScript = 'Scene 1: A quiet room.\n\nThe wind blows.\n\nEnd scene.'
    const file = new File([noDialogueScript], 'no-dialogue.txt', { type: 'text/plain' })

    const result = await service.uploadScript(file, { title: 'No Dialogue' })
    expect(result.roles).toHaveLength(0)
  })

  it('should handle scripts with special characters', async () => {
    const specialCharsScript = '🎭 Act 1: The café\nJosé: ¿Cómo estás?\nMarie: Je suis très bien!'
    const file = new File([specialCharsScript], 'special.txt', { type: 'text/plain' })

    const result = await service.uploadScript(file, { title: 'Special Chars' })
    expect(result.roles).toBeDefined()
    expect(result.roles?.length).toBe(2)
    expect(result.roles?.[0].name).toBe('José')
  })

  it('should handle extremely long lines', async () => {
    const longLine = 'Character: ' + 'word '.repeat(1000)
    const file = new File([longLine], 'long-line.txt', { type: 'text/plain' })

    const result = await service.uploadScript(file, { title: 'Long Line' })
    const firstScene = result.scenes?.[0]
    if (!firstScene?.description) {
      throw new Error('Scene description is missing')
    }
    expect(firstScene.description.length).toBeLessThan(1000)
  })
})

describe('ScriptAnalysisService - Type Safety', () => {
  let service: ScriptAnalysisService
  const mockProgress = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ScriptAnalysisService(mockAudioService, mockProgress)
  })

  it('should enforce strict types for upload progress', async () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    let lastProgress: UploadProgress | undefined

    const service = new ScriptAnalysisService(mockAudioService, (progress) => {
      lastProgress = progress
      expect(progress.status).toMatch(/^(uploading|processing|complete|error)$/)
      expect(typeof progress.progress).toBe('number')
      expect(progress.progress).toBeGreaterThanOrEqual(0)
      expect(progress.progress).toBeLessThanOrEqual(100)
    })

    await service.uploadScript(file, { title: 'Test' })
  })

  it('should validate emotion analysis response types', async () => {
    const file = new File(['test script'], 'test.txt', { type: 'text/plain' })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: {
              primary_emotion: 123, // Invalid type - should be string
              intensity: 0.5,
              confidence: 0.8
            }
          }
        }]
      })
    })

    await expect(service.uploadScript(file, { title: 'Test' }))
      .rejects
      .toThrow(ProcessingError)
  })

  it('should enforce valid scene structure', async () => {
    const invalidSceneScript = 'Scene: Invalid\nNo proper structure or dialogue'
    const file = new File([invalidSceneScript], 'invalid.txt', { type: 'text/plain' })

    const result = await service.uploadScript(file, { title: 'Invalid Scene' })
    expect(result.scenes).toEqual([])
  })

  it('should handle null or undefined values in API responses', async () => {
    const file = new File(['test script'], 'test.txt', { type: 'text/plain' })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: {
              primary_emotion: 'happy',
              intensity: null, // Invalid - should be number
              confidence: undefined // Invalid - should be number
            }
          }
        }]
      })
    })

    await expect(service.uploadScript(file, { title: 'Test' }))
      .rejects
      .toThrow(ProcessingError)
  })
})
