import { describe, it, expect } from 'vitest'
import { GET } from '../route'

describe('Health API Route', () => {
  it('should return healthy status', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(typeof data.timestamp).toBe('number')
  })
})
