import { z } from 'zod';
import {
  exportToolInputZodSchema,
  writeToolInputZodSchema,
  writeResumeToolInputZodSchema,
  linksToolInputZodSchema,
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
});
