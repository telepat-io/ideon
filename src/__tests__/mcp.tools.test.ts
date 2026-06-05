import { z } from 'zod';
import {
  exportToolInputZodSchema,
  writeToolInputZodSchema,
  writeResumeToolInputZodSchema,
  linksToolInputZodSchema,
  gkpGenerateIdeasToolInputZodSchema,
  gkpGetHistoricalDataToolInputZodSchema,
  gkpGetForecastDataToolInputZodSchema,
  ideonToolContracts,
  publicationAddToolInputZodSchema,
  publicationListToolInputZodSchema,
  publicationEditToolInputZodSchema,
  publicationRemoveToolInputZodSchema,
  seriesAddToolInputZodSchema,
  seriesListToolInputZodSchema,
  seriesEditToolInputZodSchema,
  seriesRemoveToolInputZodSchema,
  queueAddToolInputZodSchema,
  queueListToolInputZodSchema,
  queuePeekToolInputZodSchema,
  queueRemoveToolInputZodSchema,
  queueClearToolInputZodSchema,
  queueWriteToolInputZodSchema,
  planExploreToolInputZodSchema,
  planExpandToolInputZodSchema,
  articleListToolInputZodSchema,
} from '../integrations/mcp/tools.js';

describe('MCP tool schemas', () => {
  it('validates ideon_export input correctly', () => {
    const result = exportToolInputZodSchema.safeParse({
      generationId: '20260504-123000-my-article',
      destinationPath: '/tmp/export',
      index: 2,
      overwrite: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        generationId: '20260504-123000-my-article',
        destinationPath: '/tmp/export',
        index: 2,
        overwrite: true,
      });
    }
  });

  it('rejects ideon_export input with missing required fields', () => {
    const result = exportToolInputZodSchema.safeParse({ destinationPath: '/tmp/export' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.issues.some((issue) => issue.path.includes('generationId'))).toBe(true);
  });

  it('rejects ideon_export input with invalid index', () => {
    const result = exportToolInputZodSchema.safeParse({
      generationId: 'my-article',
      destinationPath: '/tmp/export',
      index: 0,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.issues.some((issue) => issue.path.includes('index'))).toBe(true);
  });

  it('validates write tool input with numeric length and custom links', () => {
    const result = writeToolInputZodSchema.safeParse({
      idea: 'Test',
      length: 1200,
      link: ['React->https://react.dev'],
      unlink: ['Old'],
      maxLinks: 10,
      dryRun: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(1200);
      expect(result.data.link).toEqual(['React->https://react.dev']);
      expect(result.data.maxLinks).toBe(10);
    }
  });

  it('validates write_resume tool input with optional values', () => {
    const result = writeResumeToolInputZodSchema.safeParse({
      dryRun: true,
      enrichLinks: true,
      link: ['React->https://react.dev'],
      maxLinks: 5,
    });

    expect(result.success).toBe(true);
  });

  it('validates links tool input with optional parameters', () => {
    const result = linksToolInputZodSchema.safeParse({
      slug: 'my-article',
      mode: 'append',
      link: ['React->https://react.dev'],
      maxLinks: 5,
    });

    expect(result.success).toBe(true);
  });
});

describe('MCP tool contracts', () => {
  it('includes ideon_export with the correct required fields', () => {
    const exportContract = ideonToolContracts.find((tool) => tool.name === 'ideon_export');
    expect(exportContract).toBeDefined();
    expect(exportContract?.required).toEqual(['generationId', 'destinationPath']);
    expect(exportContract?.enums).toEqual({});
  });

  it('includes ideon_write tool contract with style, intent, and length enums', () => {
    const writeContract = ideonToolContracts.find((tool) => tool.name === 'ideon_write');
    expect(writeContract).toBeDefined();
    expect(writeContract?.required).toEqual(['idea']);
    expect(writeContract?.enums).toHaveProperty('style');
    expect(writeContract?.enums).toHaveProperty('intent');
    expect(writeContract?.enums).toHaveProperty('length');
  });

  it('includes gkp_generate_ideas tool contract with no required fields', () => {
    const contract = ideonToolContracts.find((tool) => tool.name === 'gkp_generate_ideas');
    expect(contract).toBeDefined();
    expect(contract?.required).toEqual([]);
  });

  it('includes gkp_get_historical_data tool contract with keywords required', () => {
    const contract = ideonToolContracts.find((tool) => tool.name === 'gkp_get_historical_data');
    expect(contract).toBeDefined();
    expect(contract?.required).toEqual(['keywords']);
  });

  it('includes gkp_get_forecast_data tool contract with keywords required and matchType enum', () => {
    const contract = ideonToolContracts.find((tool) => tool.name === 'gkp_get_forecast_data');
    expect(contract).toBeDefined();
    expect(contract?.required).toEqual(['keywords']);
    expect(contract?.enums).toHaveProperty('keywordMatchType');
    expect(contract?.enums?.keywordMatchType).toEqual(['BROAD', 'EXACT', 'PHRASE']);
  });
});

describe('GKP tool schemas', () => {
  it('validates gkp_generate_ideas input with seedKeywords', () => {
    const result = gkpGenerateIdeasToolInputZodSchema.safeParse({
      seedKeywords: ['test', 'keyword'],
      countryCodes: ['US', 'GB'],
      language: 'en',
      pageSize: 50,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seedKeywords).toEqual(['test', 'keyword']);
      expect(result.data.countryCodes).toEqual(['US', 'GB']);
    }
  });

  it('validates gkp_generate_ideas input with url', () => {
    const result = gkpGenerateIdeasToolInputZodSchema.safeParse({ url: 'https://example.com' });
    expect(result.success).toBe(true);
  });

  it('validates gkp_generate_ideas input with site', () => {
    const result = gkpGenerateIdeasToolInputZodSchema.safeParse({ site: 'example.com' });
    expect(result.success).toBe(true);
  });

  it('validates gkp_get_historical_data input', () => {
    const result = gkpGetHistoricalDataToolInputZodSchema.safeParse({
      keywords: ['test', 'keyword'],
      countryCodes: ['US'],
      language: 'en',
      includeAverageCpc: true,
    });

    expect(result.success).toBe(true);
  });

  it('rejects gkp_get_historical_data input with empty keywords', () => {
    const result = gkpGetHistoricalDataToolInputZodSchema.safeParse({ keywords: [] });
    expect(result.success).toBe(false);
  });

  it('validates gkp_get_forecast_data input', () => {
    const result = gkpGetForecastDataToolInputZodSchema.safeParse({
      keywords: ['test', 'keyword'],
      keywordMatchType: 'EXACT',
      maxCpcBidMicros: 1500000,
      countryCodes: ['US', 'GB'],
      language: 'en',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });

    expect(result.success).toBe(true);
  });

  it('rejects gkp_get_forecast_data input with invalid matchType', () => {
    const result = gkpGetForecastDataToolInputZodSchema.safeParse({
      keywords: ['test'],
      keywordMatchType: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('coerces maxCpcBidMicros from string to number', () => {
    const result = gkpGetForecastDataToolInputZodSchema.safeParse({
      keywords: ['test'],
      maxCpcBidMicros: '1500000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxCpcBidMicros).toBe(1500000);
    }
  });
});

describe('Publication tool schemas', () => {
  it('validates publication_add input with all fields', () => {
    const result = publicationAddToolInputZodSchema.safeParse({
      name: 'My Publication',
      style: 'technical',
      intent: 'tutorial',
      length: 'large',
      type: 'article',
      audience: 'developers',
      country: 'US,GB',
      language: 'en',
      tone: 'professional',
      forbiddenTopics: ['politics'],
      disclosureRequirements: ['sponsored'],
      audienceRestrictions: ['18+'],
      editorialPolicy: 'Be factual.',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Publication');
      expect(result.data.forbiddenTopics).toEqual(['politics']);
      expect(result.data.length).toBe('large');
    }
  });

  it('rejects publication_add input with missing name', () => {
    const result = publicationAddToolInputZodSchema.safeParse({ style: 'technical' });
    expect(result.success).toBe(false);
  });

  it('validates publication_edit input with partial fields', () => {
    const result = publicationEditToolInputZodSchema.safeParse({
      slug: 'my-pub',
      style: 'academic',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe('my-pub');
      expect(result.data.style).toBe('academic');
    }
  });

  it('validates publication_list input with no fields', () => {
    const result = publicationListToolInputZodSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates publication_remove input', () => {
    const result = publicationRemoveToolInputZodSchema.safeParse({ slug: 'my-pub' });
    expect(result.success).toBe(true);
  });
});

describe('Series tool schemas', () => {
  it('validates series_add input with all fields', () => {
    const result = seriesAddToolInputZodSchema.safeParse({
      name: 'My Series',
      topic: 'testing',
      publication: 'my-pub',
      style: 'professional',
      intent: 'how-to-guide',
      keywords: ['test', 'series'],
      tone: 'friendly',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Series');
      expect(result.data.keywords).toEqual(['test', 'series']);
    }
  });

  it('validates series_list input with publication filter', () => {
    const result = seriesListToolInputZodSchema.safeParse({ publication: 'my-pub' });
    expect(result.success).toBe(true);
  });

  it('validates series_edit input with unsetPublication', () => {
    const result = seriesEditToolInputZodSchema.safeParse({
      slug: 'my-series',
      unsetPublication: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unsetPublication).toBe(true);
    }
  });

  it('validates series_remove input', () => {
    const result = seriesRemoveToolInputZodSchema.safeParse({ slug: 'my-series' });
    expect(result.success).toBe(true);
  });
});

describe('Queue tool schemas', () => {
  it('validates queue_add input with all fields', () => {
    const result = queueAddToolInputZodSchema.safeParse({
      idea: 'Write about testing',
      publication: 'my-pub',
      series: 'my-series',
      style: 'technical',
      intent: 'tutorial',
      exportPath: '/tmp/export',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.idea).toBe('Write about testing');
      expect(result.data.publication).toBe('my-pub');
    }
  });

  it('validates queue_list input with filters', () => {
    const result = queueListToolInputZodSchema.safeParse({
      status: 'pending',
      publication: 'my-pub',
    });
    expect(result.success).toBe(true);
  });

  it('rejects queue_list input with invalid status', () => {
    const result = queueListToolInputZodSchema.safeParse({ status: 'done' });
    expect(result.success).toBe(false);
  });

  it('validates queue_peek input', () => {
    const result = queuePeekToolInputZodSchema.safeParse({ publication: 'my-pub' });
    expect(result.success).toBe(true);
  });

  it('validates queue_remove input', () => {
    const result = queueRemoveToolInputZodSchema.safeParse({ id: 'uuid-1234' });
    expect(result.success).toBe(true);
  });

  it('validates queue_clear input with no fields', () => {
    const result = queueClearToolInputZodSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates queue_write input with overrides', () => {
    const result = queueWriteToolInputZodSchema.safeParse({
      publication: 'my-pub',
      dryRun: true,
      enrichLinks: true,
      link: ['React->https://react.dev'],
      maxLinks: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe('Plan tool schemas', () => {
  it('validates plan_explore input with required fields', () => {
    const result = planExploreToolInputZodSchema.safeParse({
      idea: 'content marketing',
      publication: 'my-pub',
    });
    expect(result.success).toBe(true);
  });

  it('validates plan_explore input with all fields', () => {
    const result = planExploreToolInputZodSchema.safeParse({
      idea: 'content marketing',
      publication: 'my-pub',
      context: 'B2B SaaS company',
      country: 'US,GB',
      language: 'en',
      seriesCount: 3,
      articlesPerSeries: 5,
      seedKeywords: ['marketing', 'seo'],
      excludeSeries: ['existing-series'],
      contentType: 'article',
      model: 'anthropic/claude-sonnet-4',
      intentModel: 'anthropic/claude-sonnet-4',
      autoSave: true,
      dryRun: false,
      timeout: 120,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seriesCount).toBe(3);
      expect(result.data.seedKeywords).toEqual(['marketing', 'seo']);
      expect(result.data.timeout).toBe(120);
    }
  });

  it('rejects plan_explore input with missing required fields', () => {
    const result = planExploreToolInputZodSchema.safeParse({ idea: 'test' });
    expect(result.success).toBe(false);
  });

  it('validates plan_expand input with required fields', () => {
    const result = planExpandToolInputZodSchema.safeParse({
      seriesSlug: 'my-series',
    });
    expect(result.success).toBe(true);
  });

  it('validates plan_expand input with all fields', () => {
    const result = planExpandToolInputZodSchema.safeParse({
      seriesSlug: 'my-series',
      publication: 'my-pub',
      country: 'US',
      language: 'en',
      articleCount: 4,
      seedKeywords: ['new-keyword'],
      contentType: 'blog-post',
      autoSave: true,
      timeout: 600,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.articleCount).toBe(4);
    }
  });

  it('rejects plan_expand input with missing seriesSlug', () => {
    const result = planExpandToolInputZodSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('coerces timeout from string to number', () => {
    const result = planExploreToolInputZodSchema.safeParse({
      idea: 'test',
      publication: 'my-pub',
      timeout: '120',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timeout).toBe(120);
    }
  });
});

describe('Article tool schemas', () => {
  it('validates article_list input with no fields', () => {
    const result = articleListToolInputZodSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('New MCP tool contracts', () => {
  it('includes ideon_publication_add with name required', () => {
    const contract = ideonToolContracts.find((tool) => tool.name === 'ideon_publication_add');
    expect(contract).toBeDefined();
    expect(contract?.required).toEqual(['name']);
    expect(contract?.enums).toHaveProperty('style');
    expect(contract?.enums).toHaveProperty('type');
  });

  it('includes ideon_series_add with name required', () => {
    const contract = ideonToolContracts.find((tool) => tool.name === 'ideon_series_add');
    expect(contract).toBeDefined();
    expect(contract?.required).toEqual(['name']);
  });

  it('includes ideon_queue_add with idea required', () => {
    const contract = ideonToolContracts.find((tool) => tool.name === 'ideon_queue_add');
    expect(contract).toBeDefined();
    expect(contract?.required).toEqual(['idea']);
  });

  it('includes ideon_queue_write with no required fields', () => {
    const contract = ideonToolContracts.find((tool) => tool.name === 'ideon_queue_write');
    expect(contract).toBeDefined();
    expect(contract?.required).toEqual([]);
  });

  it('includes ideon_plan_explore with idea and publication required', () => {
    const contract = ideonToolContracts.find((tool) => tool.name === 'ideon_plan_explore');
    expect(contract).toBeDefined();
    expect(contract?.required).toEqual(['idea', 'publication']);
    expect(contract?.enums).toHaveProperty('contentType');
  });

  it('includes ideon_plan_expand with seriesSlug required', () => {
    const contract = ideonToolContracts.find((tool) => tool.name === 'ideon_plan_expand');
    expect(contract).toBeDefined();
    expect(contract?.required).toEqual(['seriesSlug']);
  });

  it('includes ideon_article_list with no required fields', () => {
    const contract = ideonToolContracts.find((tool) => tool.name === 'ideon_article_list');
    expect(contract).toBeDefined();
    expect(contract?.required).toEqual([]);
  });

  it('includes all 17 new tool contracts', () => {
    const newToolNames = [
      'ideon_publication_add', 'ideon_publication_list', 'ideon_publication_edit', 'ideon_publication_remove',
      'ideon_series_add', 'ideon_series_list', 'ideon_series_edit', 'ideon_series_remove',
      'ideon_queue_add', 'ideon_queue_list', 'ideon_queue_peek', 'ideon_queue_remove', 'ideon_queue_clear', 'ideon_queue_write',
      'ideon_plan_explore', 'ideon_plan_expand',
      'ideon_article_list',
    ];
    for (const name of newToolNames) {
      expect(ideonToolContracts.find((tool) => tool.name === name)).toBeDefined();
    }
  });
});
