import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { isGkpQuerySnapshotFresh } from '../config/gkpStore.js';

describe('gkpStore - isGkpQuerySnapshotFresh', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns false for invalid savedAt date', () => {
    const snapshot = {
      version: 1 as const,
      fingerprint: 'test',
      savedAt: 'invalid-date',
      ttlDays: 30,
      publication: 'test',
      keywords: [],
      mode: 'ideas' as const,
      response: {},
    };
    expect(isGkpQuerySnapshotFresh(snapshot as any)).toBe(false);
  });

  it('returns false for non-finite savedAt timestamp', () => {
    const snapshot = {
      version: 1 as const,
      fingerprint: 'test',
      savedAt: '2020-01-01T00:00:00.000Z',
      ttlDays: NaN,
      publication: 'test',
      keywords: [],
      mode: 'ideas' as const,
      response: {},
    };
    expect(isGkpQuerySnapshotFresh(snapshot as any)).toBe(false);
  });

  it('returns true for fresh snapshot within TTL', () => {
    const now = new Date('2024-01-15T12:00:00.000Z');
    const snapshot = {
      version: 1 as const,
      fingerprint: 'test',
      savedAt: '2024-01-10T00:00:00.000Z',
      ttlDays: 30,
      publication: 'test',
      keywords: [],
      mode: 'ideas' as const,
      response: {},
    };
    expect(isGkpQuerySnapshotFresh(snapshot as any, now)).toBe(true);
  });

  it('returns false for stale snapshot past TTL', () => {
    const now = new Date('2024-02-15T12:00:00.000Z');
    const snapshot = {
      version: 1 as const,
      fingerprint: 'test',
      savedAt: '2024-01-01T00:00:00.000Z',
      ttlDays: 7,
      publication: 'test',
      keywords: [],
      mode: 'ideas' as const,
      response: {},
    };
    expect(isGkpQuerySnapshotFresh(snapshot as any, now)).toBe(false);
  });

  it('returns true when just past the boundary', () => {
    const now = new Date('2024-01-10T23:59:59.999Z');
    const snapshot = {
      version: 1 as const,
      fingerprint: 'test',
      savedAt: '2024-01-01T00:00:00.000Z',
      ttlDays: 10,
      publication: 'test',
      keywords: [],
      mode: 'ideas' as const,
      response: {},
    };
    expect(isGkpQuerySnapshotFresh(snapshot as any, now)).toBe(true);
  });

  it('returns false when exactly at boundary', () => {
    const now = new Date('2024-01-11T00:00:00.000Z');
    const snapshot = {
      version: 1 as const,
      fingerprint: 'test',
      savedAt: '2024-01-01T00:00:00.000Z',
      ttlDays: 10,
      publication: 'test',
      keywords: [],
      mode: 'ideas' as const,
      response: {},
    };
    expect(isGkpQuerySnapshotFresh(snapshot as any, now)).toBe(false);
  });
});