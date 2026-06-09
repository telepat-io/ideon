import { buildEditorialChecklist, formatEditorialChecklistSummary } from '../editorial/checklist.js';

describe('buildEditorialChecklist', () => {
  it('always includes byline and disclosure items', () => {
    const items = buildEditorialChecklist({ author: null });
    expect(items.some((item) => item.id === 'add-byline')).toBe(true);
    expect(items.some((item) => item.id === 'add-ai-disclosure')).toBe(true);
    expect(items.some((item) => item.id === 'assign-author')).toBe(true);
  });

  it('flags author placeholders in draft text', () => {
    const items = buildEditorialChecklist({
      author: { name: 'Alex', slug: 'alex', profile: 'Engineer' },
      draftText: 'A useful section.\n\n[AUTHOR: add first-hand example here]',
    });

    expect(items.some((item) => item.id === 'replace-author-placeholders')).toBe(true);
  });

  it('recommends experience when author has profile but no run notes', () => {
    const items = buildEditorialChecklist({
      author: { name: 'Alex', slug: 'alex', profile: 'Engineer with cloud experience.' },
    });

    expect(items.some((item) => item.id === 'add-experience' && item.severity === 'recommended')).toBe(true);
  });

  it('requires experience when author profile and notes are empty', () => {
    const items = buildEditorialChecklist({
      author: { name: 'Alex', slug: 'alex', profile: '' },
    });

    expect(items.some((item) => item.id === 'add-experience' && item.severity === 'required')).toBe(true);
  });

  it('flags verifiable claims in draft text', () => {
    const items = buildEditorialChecklist({
      author: { name: 'Alex', slug: 'alex', profile: 'Engineer' },
      draftText: 'According to a 2024 survey, 42% of teams adopt this pattern.',
    });

    expect(items.some((item) => item.id === 'verify-stats')).toBe(true);
  });

  it('formats checklist summary for CLI output', () => {
    const summary = formatEditorialChecklistSummary([
      { id: 'add-byline', severity: 'required', message: 'Add byline' },
    ]);

    expect(summary).toContain('Editorial checklist');
    expect(summary).toContain('[REQUIRED] Add byline');
    expect(formatEditorialChecklistSummary([])).toBe('');
  });
});
