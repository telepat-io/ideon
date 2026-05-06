import { contentPlanSchema, type ParsedContentPlan } from '../types/contentPlanSchema.js';

describe('contentPlanSchema', () => {
  const validBrief = {
    title: 'Practical Multi-Channel Content System',
    description:
      'A practical content package explaining how to turn planning outputs into channel-native drafts without losing core substance.',
    targetAudience: 'Content teams shipping across article, social, and newsletter channels.',
    corePromise: 'Readers get a clear operating model they can apply in their next publishing cycle.',
    keyPoints: [
      'Use one explicit narrative spine across every output type.',
      'Keep channel formatting native while preserving core meaning.',
      'Translate guidance into concrete examples and next steps.',
    ],
    voiceNotes: 'Direct, specific, and practical tone with no hype and no vague claims.',
    primaryContentType: 'article',
    secondaryContentTypes: ['x-post', 'linkedin-post'],
    secondaryContentStrategy: 'Each secondary output should stand alone and create clear motivation to consume the primary piece.',
  };

  it('validates a complete shared plan', () => {
    const result = contentPlanSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
  });

  it('rejects too-short description', () => {
    const result = contentPlanSchema.safeParse({
      ...validBrief,
      description: 'Too short.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects too-short title', () => {
    const result = contentPlanSchema.safeParse({
      ...validBrief,
      title: 'Short',
    });
    expect(result.success).toBe(false);
  });

  it('enforces 3-6 key points', () => {
    expect(
      contentPlanSchema.safeParse({
        ...validBrief,
        keyPoints: ['Only one point that is long enough'],
      }).success,
    ).toBe(false);

    expect(
      contentPlanSchema.safeParse({
        ...validBrief,
        keyPoints: [
          'Point one with enough detail',
          'Point two with enough detail',
          'Point three with enough detail',
          'Point four with enough detail',
          'Point five with enough detail',
          'Point six with enough detail',
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects too-short secondary strategy when secondary content exists', () => {
    const result = contentPlanSchema.safeParse({
      ...validBrief,
      secondaryContentStrategy: 'too short',
    });

    expect(result.success).toBe(false);
  });

  it('allows empty secondary strategy when no secondary content is requested', () => {
    const result = contentPlanSchema.safeParse({
      ...validBrief,
      secondaryContentTypes: [],
      secondaryContentStrategy: '',
    });

    expect(result.success).toBe(true);
  });

  it('treats sentinel secondary type values as no secondary outputs', () => {
    const result = contentPlanSchema.safeParse({
      ...validBrief,
      secondaryContentTypes: ['none'],
      secondaryContentStrategy: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.secondaryContentTypes).toEqual([]);
    }
  });

  it('normalizes trimmed sentinel secondary type values', () => {
    const result = contentPlanSchema.safeParse({
      ...validBrief,
      secondaryContentTypes: ['N/A', '  no secondary outputs  '],
      secondaryContentStrategy: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.secondaryContentTypes).toEqual([]);
    }
  });

  it('returns typed result with infer', () => {
    const result = contentPlanSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
    if (result.success) {
      const typed: ParsedContentPlan = result.data;
      expect(typed.keyPoints).toHaveLength(3);
    }
  });
});
