export class AudioDataAccessor {
  private readonly safeData: Uint8Array;
  private readonly safeLength: number;

  constructor(data: Uint8Array, length: number) {
    this.safeData = data;
    this.safeLength = Math.min(length, data.length);
  }

  getValue(index: number): number | null {
    if (index >= 0 && index < this.safeLength) {
      const value = this.safeData[index];
      return typeof value === 'number' ? value : null;
    }
    return null;
  }

  getScaledValue(index: number, scale: number): number | null {
    const value = this.getValue(index);
    return value !== null ? value / scale : null;
  }
}
