import { describe, it, expect } from 'vitest';
import { add } from '../../src/utils/add';

describe('adding numbers', () => {
  it('should add two numbers correctly', () => {
    expect(add(5, 3)).toBe(8);
  });

  it('should handle negative numbers', () => {
    expect(add(-1, -2)).toBe(-3);
  });

  it('should handle zero', () => {
    expect(add(0, 5)).toBe(5);
  });
});
