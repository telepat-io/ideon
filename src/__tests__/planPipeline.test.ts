import { describe, it, expect } from '@jest/globals';
import { runPlan } from '../plan/pipeline.js';

describe('runPlan', () => {
  it('is exported as a function', () => {
    expect(typeof runPlan).toBe('function');
  });
});
