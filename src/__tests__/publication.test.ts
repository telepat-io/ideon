import { mkdtemp, mkdir, rm, readFile, stat, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { jest } from '@jest/globals';

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'ideon-pub-test-'));
const tempConfigDir = path.join(tempRoot, 'config');

jest.unstable_mockModule('env-paths', () => ({
  default: () => ({ config: tempConfigDir }),
}));

const { deriveSlugFromName, publicationSchema, editorialPolicySchema, publicationDefaultsSchema } = await import('../types/publication.js');
const { buildEditorialPolicyDirective } = await import('../llm/prompts/publicationPolicy.js');
const {
  loadPublication,
  listPublications,
  savePublication,
  deletePublication,
  publicationExists,
  getPublicationsDir,
} = await import('../config/publicationStore.js');

describe('publication types', () => {
  describe('deriveSlugFromName', () => {
    it('converts name to lowercase kebab-case', () => {
      expect(deriveSlugFromName('My Blog')).toBe('my-blog');
    });

    it('strips leading and trailing hyphens', () => {
      expect(deriveSlugFromName('  --Hello World--  ')).toBe('hello-world');
    });

    it('collapses multiple non-alphanumeric chars into single hyphen', () => {
      expect(deriveSlugFromName('Tech & Science!!!')).toBe('tech-science');
    });

    it('returns untitled-publication for empty input', () => {
      expect(deriveSlugFromName('')).toBe('untitled-publication');
      expect(deriveSlugFromName('   ')).toBe('untitled-publication');
    });
  });

  describe('editorialPolicySchema', () => {
    it('parses empty object with defaults', () => {
      const result = editorialPolicySchema.parse({});
      expect(result.tone).toBe('');
      expect(result.forbiddenTopics).toEqual([]);
      expect(result.disclosureRequirements).toEqual([]);
      expect(result.audienceRestrictions).toEqual([]);
      expect(result.notes).toBe('');
    });

    it('parses full policy', () => {
      const result = editorialPolicySchema.parse({
        tone: 'formal',
        forbiddenTopics: ['politics'],
        disclosureRequirements: ['FTC compliance'],
        audienceRestrictions: ['no jargon'],
        notes: 'Keep it simple.',
      });
      expect(result.tone).toBe('formal');
      expect(result.forbiddenTopics).toEqual(['politics']);
    });
  });

  describe('publicationDefaultsSchema', () => {
    it('parses empty object', () => {
      const result = publicationDefaultsSchema.parse({});
      expect(result).toEqual({});
    });

    it('parses style and intent', () => {
      const result = publicationDefaultsSchema.parse({
        style: 'technical',
        intent: 'tutorial',
      });
      expect(result.style).toBe('technical');
      expect(result.intent).toBe('tutorial');
    });

    it('rejects invalid style', () => {
      expect(() => publicationDefaultsSchema.parse({ style: 'invalid' })).toThrow();
    });
  });

  describe('publicationSchema', () => {
    it('parses minimal publication', () => {
      const result = publicationSchema.parse({
        name: 'Test',
        slug: 'test',
      });
      expect(result.name).toBe('Test');
      expect(result.slug).toBe('test');
      expect(result.editorialPolicy.tone).toBe('');
      expect(result.defaults).toEqual({});
    });

    it('parses full publication', () => {
      const result = publicationSchema.parse({
        name: 'Tech Blog',
        slug: 'tech-blog',
        editorialPolicy: {
          tone: 'professional',
          forbiddenTopics: ['competitors'],
          notes: 'Always cite sources.',
        },
        defaults: {
          style: 'technical',
          intent: 'deep-dive-analysis',
          targetLength: 1400,
        },
      });
      expect(result.defaults.style).toBe('technical');
      expect(result.editorialPolicy.tone).toBe('professional');
    });
  });
});

describe('publicationPolicy prompt builder', () => {
  it('returns empty string for null publication', () => {
    expect(buildEditorialPolicyDirective(null)).toBe('');
  });

  it('includes publication name', () => {
    const pub = publicationSchema.parse({ name: 'My Pub', slug: 'my-pub' });
    expect(buildEditorialPolicyDirective(pub)).toContain('Publication: "My Pub"');
  });

  it('includes tone when set', () => {
    const pub = publicationSchema.parse({
      name: 'Test',
      slug: 'test',
      editorialPolicy: { tone: 'authoritative' },
    });
    expect(buildEditorialPolicyDirective(pub)).toContain('Tone: authoritative');
  });

  it('includes forbidden topics', () => {
    const pub = publicationSchema.parse({
      name: 'Test',
      slug: 'test',
      editorialPolicy: { forbiddenTopics: ['politics', 'religion'] },
    });
    const directive = buildEditorialPolicyDirective(pub);
    expect(directive).toContain('Forbidden topics: politics, religion');
  });

  it('includes disclosure requirements', () => {
    const pub = publicationSchema.parse({
      name: 'Test',
      slug: 'test',
      editorialPolicy: { disclosureRequirements: ['FTC', 'affiliate'] },
    });
    expect(buildEditorialPolicyDirective(pub)).toContain('Disclosure requirements: FTC; affiliate');
  });

  it('includes audience restrictions', () => {
    const pub = publicationSchema.parse({
      name: 'Test',
      slug: 'test',
      editorialPolicy: { audienceRestrictions: ['no jargon'] },
    });
    expect(buildEditorialPolicyDirective(pub)).toContain('Audience restrictions: no jargon');
  });

  it('includes editorial notes', () => {
    const pub = publicationSchema.parse({
      name: 'Test',
      slug: 'test',
      editorialPolicy: { notes: 'Always cite sources.' },
    });
    expect(buildEditorialPolicyDirective(pub)).toContain('Editorial policy notes: Always cite sources.');
  });

  it('builds complete policy with all fields', () => {
    const pub = publicationSchema.parse({
      name: 'Full Pub',
      slug: 'full-pub',
      editorialPolicy: {
        tone: 'formal',
        forbiddenTopics: ['competitors'],
        disclosureRequirements: ['FTC'],
        audienceRestrictions: ['B2B only'],
        notes: 'Be precise.',
      },
    });
    const directive = buildEditorialPolicyDirective(pub);
    expect(directive).toContain('Publication: "Full Pub"');
    expect(directive).toContain('Tone: formal');
    expect(directive).toContain('Forbidden topics: competitors');
    expect(directive).toContain('Disclosure requirements: FTC');
    expect(directive).toContain('Audience restrictions: B2B only');
    expect(directive).toContain('Editorial policy notes: Be precise.');
  });
});

describe('publicationStore', () => {
  beforeEach(async () => {
    await mkdir(tempConfigDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(path.join(tempConfigDir, 'publications'), { recursive: true, force: true });
  });

  describe('getPublicationsDir', () => {
    it('returns correct path', () => {
      expect(getPublicationsDir()).toBe(path.join(tempConfigDir, 'publications'));
    });
  });

  describe('savePublication and loadPublication', () => {
    it('saves and loads a publication', async () => {
      const pub = publicationSchema.parse({ name: 'Test', slug: 'test' });
      await savePublication(pub);

      const loaded = await loadPublication('test');
      expect(loaded.name).toBe('Test');
      expect(loaded.slug).toBe('test');
    });

    it('creates directory on save', async () => {
      const pub = publicationSchema.parse({ name: 'Test', slug: 'test' });
      await savePublication(pub);

      const dirStat = await stat(path.join(tempConfigDir, 'publications'));
      expect(dirStat.isDirectory()).toBe(true);
    });

    it('throws when publication not found', async () => {
      await expect(loadPublication('missing')).rejects.toThrow('Publication "missing" not found.');
    });
  });

  describe('listPublications', () => {
    it('returns empty array when no publications exist', async () => {
      const result = await listPublications();
      expect(result).toEqual([]);
    });

    it('returns sorted publications', async () => {
      await savePublication(publicationSchema.parse({ name: 'Z', slug: 'z-pub' }));
      await savePublication(publicationSchema.parse({ name: 'A', slug: 'a-pub' }));

      const result = await listPublications();
      expect(result).toHaveLength(2);
      expect(result[0]!.slug).toBe('a-pub');
      expect(result[1]!.slug).toBe('z-pub');
    });

    it('skips non-json files', async () => {
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));
      await writeFile(path.join(tempConfigDir, 'publications', 'readme.md'), '# Readme', 'utf8');

      const result = await listPublications();
      expect(result).toHaveLength(1);
    });
  });

  describe('deletePublication', () => {
    it('removes the file', async () => {
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));
      await deletePublication('test');

      await expect(loadPublication('test')).rejects.toThrow('Publication "test" not found.');
    });

    it('throws when file not found', async () => {
      await expect(deletePublication('missing')).rejects.toThrow('Publication "missing" not found.');
    });
  });

  describe('publicationExists', () => {
    it('returns true when file exists', async () => {
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));
      expect(await publicationExists('test')).toBe(true);
    });

    it('returns false when file does not exist', async () => {
      expect(await publicationExists('missing')).toBe(false);
    });
  });
});

describe('publication commands', () => {
  beforeEach(async () => {
    await mkdir(tempConfigDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(path.join(tempConfigDir, 'publications'), { recursive: true, force: true });
  });

  describe('runPublicationAddCommand', () => {
    it('creates publication from flags', async () => {
      const { runPublicationAddCommand } = await import('../cli/commands/publication.js');

      const logs: string[] = [];
      await runPublicationAddCommand(
        {
          name: 'Tech Blog',
          style: 'technical',
          intent: 'tutorial',
          tone: 'formal',
          forbiddenTopics: 'politics, religion',
          editorialPolicy: 'Always cite sources.',
        },
        { log: (msg) => logs.push(msg) },
      );

      const pub = await loadPublication('tech-blog');
      expect(pub.name).toBe('Tech Blog');
      expect(pub.slug).toBe('tech-blog');
      expect(pub.defaults.style).toBe('technical');
      expect(pub.editorialPolicy.tone).toBe('formal');
      expect(pub.editorialPolicy.forbiddenTopics).toEqual(['politics', 'religion']);
      expect(pub.editorialPolicy.notes).toBe('Always cite sources.');
      expect(logs[0]).toContain('Created publication "Tech Blog"');
    });

    it('throws when name is missing in non-interactive mode', async () => {
      const { runPublicationAddCommand } = await import('../cli/commands/publication.js');
      await expect(runPublicationAddCommand({})).rejects.toThrow('Publication name is required');
    });

    it('throws when slug already exists', async () => {
      const { runPublicationAddCommand } = await import('../cli/commands/publication.js');
      await savePublication(publicationSchema.parse({ name: 'Existing', slug: 'existing' }));

      await expect(
        runPublicationAddCommand({ name: 'Existing' }, { log: () => {} }),
      ).rejects.toThrow('Publication "existing" already exists');
    });
  });

  describe('runPublicationListCommand', () => {
    it('prints empty message when no publications', async () => {
      const { runPublicationListCommand } = await import('../cli/commands/publication.js');

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runPublicationListCommand({ json: false, verbose: false });
      } finally {
        console.log = origLog;
      }

      expect(logs.some((l) => l.includes('No publications found'))).toBe(true);
    });

    it('prints JSON output', async () => {
      const { runPublicationListCommand } = await import('../cli/commands/publication.js');
      await savePublication(publicationSchema.parse({ name: 'Pub', slug: 'pub' }));

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runPublicationListCommand({ json: true, verbose: false });
      } finally {
        console.log = origLog;
      }

      const jsonOutput = JSON.parse(logs[0]!);
      expect(jsonOutput).toHaveLength(1);
      expect(jsonOutput[0].slug).toBe('pub');
    });
  });

  describe('runPublicationEditCommand', () => {
    it('edits style and intent', async () => {
      const { runPublicationEditCommand } = await import('../cli/commands/publication.js');
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        await runPublicationEditCommand({ slug: 'test', style: 'technical', intent: 'how-to-guide' });
      } finally {
        console.log = origLog;
      }

      const pub = await loadPublication('test');
      expect(pub.defaults.style).toBe('technical');
      expect(pub.defaults.intent).toBe('how-to-guide');
      expect(logs[0]).toContain('Updated publication "test"');
    });

    it('edits editorial policy fields', async () => {
      const { runPublicationEditCommand } = await import('../cli/commands/publication.js');
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));

      const origLog = console.log;
      console.log = () => {};
      try {
        await runPublicationEditCommand({
          slug: 'test',
          tone: 'casual',
          forbiddenTopics: 'sports, weather',
          editorialPolicy: 'New policy notes.',
        });
      } finally {
        console.log = origLog;
      }

      const pub = await loadPublication('test');
      expect(pub.editorialPolicy.tone).toBe('casual');
      expect(pub.editorialPolicy.forbiddenTopics).toEqual(['sports', 'weather']);
      expect(pub.editorialPolicy.notes).toBe('New policy notes.');
    });

    it('rejects invalid style', async () => {
      const { runPublicationEditCommand } = await import('../cli/commands/publication.js');
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));

      await expect(
        runPublicationEditCommand({ slug: 'test', style: 'invalid' }),
      ).rejects.toThrow('Invalid style');
    });

    it('rejects invalid intent', async () => {
      const { runPublicationEditCommand } = await import('../cli/commands/publication.js');
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));

      await expect(
        runPublicationEditCommand({ slug: 'test', intent: 'invalid' }),
      ).rejects.toThrow('Invalid intent');
    });

    it('rejects invalid content type', async () => {
      const { runPublicationEditCommand } = await import('../cli/commands/publication.js');
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));

      await expect(
        runPublicationEditCommand({ slug: 'test', type: 'invalid' }),
      ).rejects.toThrow('Invalid type');
    });

    it('rejects invalid length', async () => {
      const { runPublicationEditCommand } = await import('../cli/commands/publication.js');
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));

      await expect(
        runPublicationEditCommand({ slug: 'test', length: 'not-a-number' }),
      ).rejects.toThrow('Invalid length');
    });
  });

  describe('runPublicationRemoveCommand', () => {
    it('deletes when forced', async () => {
      const { runPublicationRemoveCommand } = await import('../cli/commands/publication.js');
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));

      const logs: string[] = [];
      await runPublicationRemoveCommand(
        { slug: 'test', force: true },
        { log: (msg) => logs.push(msg) },
      );

      await expect(publicationExists('test')).resolves.toBe(false);
      expect(logs[0]).toContain('Deleted publication "test"');
    });

    it('cancels when confirmation declined', async () => {
      const { runPublicationRemoveCommand } = await import('../cli/commands/publication.js');
      await savePublication(publicationSchema.parse({ name: 'Test', slug: 'test' }));
      const restoreTty = mockTty(true, true);

      try {
        const logs: string[] = [];
        await runPublicationRemoveCommand(
          { slug: 'test', force: false },
          {
            confirmDeletion: async () => false,
            log: (msg) => logs.push(msg),
          },
        );

        await expect(publicationExists('test')).resolves.toBe(true);
        expect(logs).toContain('Removal cancelled.');
      } finally {
        restoreTty();
      }
    });

    it('requires --force outside interactive terminal', async () => {
      const { runPublicationRemoveCommand } = await import('../cli/commands/publication.js');
      const restoreTty = mockTty(false, false);

      try {
        await expect(
          runPublicationRemoveCommand({ slug: 'test', force: false }),
        ).rejects.toThrow('Remove requires confirmation');
      } finally {
        restoreTty();
      }
    });
  });
});

function mockTty(stdoutIsTty: boolean, stdinIsTty: boolean): () => void {
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');

  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: stdoutIsTty,
  });

  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: stdinIsTty,
  });

  return () => {
    if (stdoutDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', stdoutDescriptor);
    }
    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    }
  };
}
