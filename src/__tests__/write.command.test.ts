import { parsePrimaryAndSecondarySpecs, parseTargetSpec } from '../cli/commands/writeTargetSpecs.js';
import { withWriteResumeHint } from '../cli/commands/writeErrorHint.js';

describe('write target parsing', () => {
  it('parses valid target spec', () => {
    expect(parseTargetSpec('article=1')).toEqual({ contentType: 'article', count: 1 });
    expect(parseTargetSpec('x-thread=4')).toEqual({ contentType: 'x-thread', count: 4 });
    expect(parseTargetSpec('x-post=10')).toEqual({ contentType: 'x-post', count: 10 });
    expect(parseTargetSpec('press-release=2')).toEqual({ contentType: 'press-release', count: 2 });
    expect(parseTargetSpec('science-paper=1')).toEqual({ contentType: 'science-paper', count: 1 });
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
    expect(parsePrimaryAndSecondarySpecs({})).toBeUndefined();
  });

  it('parses one primary and aggregates repeated secondary targets', () => {
    expect(parsePrimaryAndSecondarySpecs({
      primarySpec: 'article=1',
      secondarySpecs: ['x-thread=2', 'x-post=2', 'x-post=3'],
    })).toEqual([
      { contentType: 'article', role: 'primary', count: 1 },
      { contentType: 'x-thread', role: 'secondary', count: 2 },
      { contentType: 'x-post', role: 'secondary', count: 5 },
    ]);
  });

  it('requires a primary spec when secondaries are provided', () => {
    expect(() => parsePrimaryAndSecondarySpecs({ secondarySpecs: ['x-post=1'] })).toThrow('Missing required --primary');
  });

  it('requires primary target count to be exactly one', () => {
    expect(() => parsePrimaryAndSecondarySpecs({ primarySpec: 'article=2' })).toThrow('Primary target count must be exactly 1');
  });

  it('rejects content type collisions between primary and secondary', () => {
    expect(() => parsePrimaryAndSecondarySpecs({ primarySpec: 'x-post=1', secondarySpecs: ['x-post=1'] })).toThrow(
      'cannot be both primary and secondary',
    );
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
