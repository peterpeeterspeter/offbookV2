export function getCurrentLine(content: string): string {
  // Simple implementation - in practice this would be more sophisticated
  // based on timing, markers, or user selection
  const lines = content.split('\n');
  return lines.find(line => line.trim().length > 0) || '';
} 