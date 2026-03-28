import { parseTargetSpec, parseTargetSpecs } from '../cli/commands/writeTargetSpecs.js';
import { withWriteResumeHint } from '../cli/commands/writeErrorHint.js';

describe('write target parsing', () => {
  it('parses valid target spec', () => {
    expect(parseTargetSpec('article=1')).toEqual({ contentType: 'article', count: 1 });
    expect(parseTargetSpec('x-thread=4')).toEqual({ contentType: 'x-thread', count: 4 });
    expect(parseTargetSpec('x-post=10')).toEqual({ contentType: 'x-post', count: 10 });
  });

  it('rejects malformed target spec', () => {
    expect(() => parseTargetSpec('article')).toThrow('Use format content-type=count');
    expect(() => parseTargetSpec('')).toThrow('Target spec cannot be empty');
  });

  it('rejects unsupported content type and invalid counts', () => {
    expect(() => parseTargetSpec('my-type=1')).toThrow('Unsupported content type');
    expect(() => parseTargetSpec('article=0')).toThrow('Count must be a positive integer');
    expect(() => parseTargetSpec('article=-1')).toThrow('Count must be a positive integer');
  });

  it('returns undefined for missing specs', () => {
    expect(parseTargetSpecs(undefined)).toBeUndefined();
    expect(parseTargetSpecs([])).toBeUndefined();
  });

  it('aggregates repeated targets by content type', () => {
    expect(parseTargetSpecs(['article=1', 'x-thread=2', 'x-post=2', 'x-post=3'])).toEqual([
      { contentType: 'article', count: 1 },
      { contentType: 'x-thread', count: 2 },
      { contentType: 'x-post', count: 5 },
    ]);
  });
});

describe('write failure hint', () => {
  it('appends resume hint when missing', () => {
    expect(withWriteResumeHint('Pipeline failed.')).toBe(
      'Pipeline failed. Run `ideon write resume` to retry the latest job.',
    );
  });

  it('does not append duplicate resume hint', () => {
    expect(withWriteResumeHint('Pipeline failed. Run `ideon write resume` to continue.')).toBe(
      'Pipeline failed. Run `ideon write resume` to continue.',
    );
  });
});
