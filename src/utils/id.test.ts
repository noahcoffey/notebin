import { describe, it, expect } from 'vitest';
import { generateId } from './id';

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('matches the expected format (base36timestamp-randomchars)', () => {
    const id = generateId();
    // Format: base36 timestamp, hyphen, 7 random base36 chars
    expect(id).toMatch(/^[0-9a-z]+-[0-9a-z]{1,7}$/);
  });

  it('contains a hyphen separator', () => {
    const id = generateId();
    expect(id).toContain('-');
    expect(id.split('-')).toHaveLength(2);
  });
});
