import { describe, it, expect } from 'vitest';
import { sub } from '../../src/utils/sub';

describe('subtracting numbers', () => {
  it('should subtract two numbers correctly', () => {
    expect(sub(5, 3)).toBe(2);
  });

  it('should handle negative numbers', () => {
    expect(sub(-1, -2)).toBe(1);
  });

  it('should handle zero', () => {
    expect(sub(0, 5)).toBe(-5);
  });
});
