import {
  articlePlanSchema,
  articleSectionPlanSchema,
  inlineImagePlanSchema,
  imagePromptResultSchema,
  type ParsedArticlePlan,
  type ParsedImagePromptResult,
} from '../types/articleSchema.js';

describe('articleSectionPlanSchema', () => {
  it('should validate correct section plan', () => {
    const section = {
      title: 'Introduction',
      description: 'A brief overview',
    };

    const result = articleSectionPlanSchema.safeParse(section);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Introduction');
    }
  });

  it('should reject empty title', () => {
    const section = {
      title: '',
      description: 'A brief overview',
    };

    const result = articleSectionPlanSchema.safeParse(section);
    expect(result.success).toBe(false);
  });

  it('should reject empty description', () => {
    const section = {
      title: 'Introduction',
      description: '',
    };

    const result = articleSectionPlanSchema.safeParse(section);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const section = { title: 'Introduction' };

    const result = articleSectionPlanSchema.safeParse(section);
    expect(result.success).toBe(false);
  });
});

describe('inlineImagePlanSchema', () => {
  it('should validate correct inline image plan', () => {
    const image = {
      anchorAfterSection: 2,
      description: 'A helpful diagram',
    };

    const result = inlineImagePlanSchema.safeParse(image);
    expect(result.success).toBe(true);
  });

  it('should enforce anchorAfterSection range 1-6', () => {
    const image = {
      anchorAfterSection: 0,
      description: 'A helpful diagram',
    };

    const result = inlineImagePlanSchema.safeParse(image);
    expect(result.success).toBe(false);
  });

  it('should enforce anchorAfterSection max 6', () => {
    const image = {
      anchorAfterSection: 7,
      description: 'A helpful diagram',
    };

    const result = inlineImagePlanSchema.safeParse(image);
    expect(result.success).toBe(false);
  });

  it('should reject non-integer anchorAfterSection', () => {
    const image = {
      anchorAfterSection: 2.5,
      description: 'A helpful diagram',
    };

    const result = inlineImagePlanSchema.safeParse(image);
    expect(result.success).toBe(false);
  });

  it('should reject empty description', () => {
    const image = {
      anchorAfterSection: 2,
      description: '',
    };

    const result = inlineImagePlanSchema.safeParse(image);
    expect(result.success).toBe(false);
  });
});

describe('articlePlanSchema', () => {
  const validArticlePlan = {
    title: 'The Future of AI',
    subtitle: 'Trends to watch in 2026',
    keywords: ['AI', 'technology', 'innovation', 'future'],
    slug: 'future-of-ai',
    description: 'An article about AI trends',
    introBrief: 'Introduction here',
    outroBrief: 'Conclusion here',
    sections: [
      { title: 'Trend 1', description: 'Description' },
      { title: 'Trend 2', description: 'Description' },
      { title: 'Trend 3', description: 'Description' },
      { title: 'Trend 4', description: 'Description' },
    ],
    coverImageDescription: 'A futuristic banner',
    inlineImages: [
      { anchorAfterSection: 1, description: 'First inline image' },
      { anchorAfterSection: 3, description: 'Second inline image' },
    ],
  };

  it('should validate complete valid article plan', () => {
    const result = articlePlanSchema.safeParse(validArticlePlan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('The Future of AI');
      expect(result.data.sections).toHaveLength(4);
    }
  });

  it('should allow 6 sections (maximum)', () => {
    const plan = {
      ...validArticlePlan,
      sections: Array(6)
        .fill(null)
        .map((_, i) => ({
          title: `Section ${i + 1}`,
          description: 'Description',
        })),
    };

    const result = articlePlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  it('should reject less than 4 sections (minimum)', () => {
    const plan = {
      ...validArticlePlan,
      sections: [
        { title: 'Section 1', description: 'Description' },
        { title: 'Section 2', description: 'Description' },
        { title: 'Section 3', description: 'Description' },
      ],
    };

    const result = articlePlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it('should reject more than 6 sections (maximum)', () => {
    const plan = {
      ...validArticlePlan,
      sections: Array(7)
        .fill(null)
        .map((_, i) => ({
          title: `Section ${i + 1}`,
          description: 'Description',
        })),
    };

    const result = articlePlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it('should enforce 3-8 keywords', () => {
    const planWith2Keywords = {
      ...validArticlePlan,
      keywords: ['AI', 'Tech'],
    };
    expect(articlePlanSchema.safeParse(planWith2Keywords).success).toBe(false);

    const planWith8Keywords = {
      ...validArticlePlan,
      keywords: Array(8)
        .fill(null)
        .map((_, i) => `keyword${i}`),
    };
    expect(articlePlanSchema.safeParse(planWith8Keywords).success).toBe(true);

    const planWith9Keywords = {
      ...validArticlePlan,
      keywords: Array(9)
        .fill(null)
        .map((_, i) => `keyword${i}`),
    };
    expect(articlePlanSchema.safeParse(planWith9Keywords).success).toBe(false);
  });

  it('should enforce 2-3 inline images', () => {
    const planWith1Image = {
      ...validArticlePlan,
      inlineImages: [{ anchorAfterSection: 2, description: 'Image' }],
    };
    expect(articlePlanSchema.safeParse(planWith1Image).success).toBe(false);

    const planWith3Images = {
      ...validArticlePlan,
      inlineImages: [
        { anchorAfterSection: 1, description: 'Image 1' },
        { anchorAfterSection: 2, description: 'Image 2' },
        { anchorAfterSection: 3, description: 'Image 3' },
      ],
    };
    expect(articlePlanSchema.safeParse(planWith3Images).success).toBe(true);

    const planWith4Images = {
      ...validArticlePlan,
      inlineImages: [
        { anchorAfterSection: 1, description: 'Image 1' },
        { anchorAfterSection: 2, description: 'Image 2' },
        { anchorAfterSection: 3, description: 'Image 3' },
        { anchorAfterSection: 4, description: 'Image 4' },
      ],
    };
    expect(articlePlanSchema.safeParse(planWith4Images).success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const incomplete = {
      title: 'The Future of AI',
      subtitle: 'Trends to watch in 2026',
      // Missing all other required fields
    };

    const result = articlePlanSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('should reject empty string fields', () => {
    const plan = {
      ...validArticlePlan,
      title: '',
    };

    const result = articlePlanSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it('should return typed result with infer', () => {
    const result = articlePlanSchema.safeParse(validArticlePlan);
    expect(result.success).toBe(true);
    if (result.success) {
      const typed: ParsedArticlePlan = result.data;
      expect(typed.sections[0].title).toBe('Trend 1');
    }
  });
});

describe('imagePromptResultSchema', () => {
  it('should validate correct image prompt result', () => {
    const result = imagePromptResultSchema.safeParse({
      prompt: 'A beautiful sunset over mountains',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty prompt', () => {
    const result = imagePromptResultSchema.safeParse({
      prompt: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing prompt field', () => {
    const result = imagePromptResultSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('should return typed result with infer', () => {
    const result = imagePromptResultSchema.safeParse({
      prompt: 'test',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const typed: ParsedImagePromptResult = result.data;
      expect(typed.prompt).toBe('test');
    }
  });

  it('should reject non-string prompt', () => {
    const result = imagePromptResultSchema.safeParse({
      prompt: 123,
    });

    expect(result.success).toBe(false);
  });
});
