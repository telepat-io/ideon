import { describe, it, expect } from '@jest/globals';
import { DEFAULT_RESEARCH_PARAMS } from '../plan/research.js';

describe('research - DEFAULT_RESEARCH_PARAMS', () => {
  it('has correct targetCandidates', () => {
    expect(DEFAULT_RESEARCH_PARAMS.targetCandidates).toBe(30);
  });

  it('has correct maxQueryRounds', () => {
    expect(DEFAULT_RESEARCH_PARAMS.maxQueryRounds).toBe(6);
  });

  it('has correct diminishingReturnsThreshold', () => {
    expect(DEFAULT_RESEARCH_PARAMS.diminishingReturnsThreshold).toBe(3);
  });

  it('has correct maxBroadeningAttempts', () => {
    expect(DEFAULT_RESEARCH_PARAMS.maxBroadeningAttempts).toBe(2);
  });

  it('has correct highCpcSignalMicros', () => {
    expect(DEFAULT_RESEARCH_PARAMS.highCpcSignalMicros).toBe(3_000_000);
  });

  it('has correct cacheTtlDays', () => {
    expect(DEFAULT_RESEARCH_PARAMS.cacheTtlDays).toBe(30);
  });

  it('has all required fields', () => {
    expect(DEFAULT_RESEARCH_PARAMS).toHaveProperty('targetCandidates');
    expect(DEFAULT_RESEARCH_PARAMS).toHaveProperty('maxQueryRounds');
    expect(DEFAULT_RESEARCH_PARAMS).toHaveProperty('diminishingReturnsThreshold');
    expect(DEFAULT_RESEARCH_PARAMS).toHaveProperty('maxBroadeningAttempts');
    expect(DEFAULT_RESEARCH_PARAMS).toHaveProperty('highCpcSignalMicros');
    expect(DEFAULT_RESEARCH_PARAMS).toHaveProperty('cacheTtlDays');
  });
});
