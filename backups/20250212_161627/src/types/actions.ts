/**
 * Generic response type for all actions in the application
 */
export interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
