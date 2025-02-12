export interface Scene {
  id: string;
  title?: string;
  duration?: number;
  description?: string;
  number?: number;
  content?: string;
  startTime?: number;
  endTime?: number;
  status?: 'pending' | 'active' | 'completed';
}
