import { resolveFaqSectionEnabled } from '../config/faqSection.js';
import { defaultAppSettings } from '../config/schema.js';

describe('resolveFaqSectionEnabled', () => {
  it('returns true for informational intents on long-form primary targets by default', () => {
    expect(resolveFaqSectionEnabled(defaultAppSettings)).toBe(true);
  });

  it('returns false for narrative intents by default', () => {
    expect(resolveFaqSectionEnabled({
      ...defaultAppSettings,
      intent: 'opinion-piece',
    })).toBe(false);
  });

  it('returns false for short-form primary targets by default', () => {
    expect(resolveFaqSectionEnabled({
      ...defaultAppSettings,
      contentTargets: [{ contentType: 'x-post', role: 'primary', count: 1 }],
    })).toBe(false);
  });

  it('honors explicit faqSection override', () => {
    expect(resolveFaqSectionEnabled({
      ...defaultAppSettings,
      intent: 'opinion-piece',
      faqSection: true,
    })).toBe(true);

    expect(resolveFaqSectionEnabled({
      ...defaultAppSettings,
      faqSection: false,
    })).toBe(false);
  });
});
