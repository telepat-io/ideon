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
