/**
 * Generates a unique session ID for audio processing
 * @returns A unique session ID string
 */
export const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}
