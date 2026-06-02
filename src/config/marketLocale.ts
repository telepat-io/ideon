import { z } from 'zod';
import {
  countryCodeToGeoTargetId,
  languageCodeToConstantId,
} from '../integrations/keywordplanner/models.js';

function normalizeCountryCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeLanguageCode(value: string): string {
  return value.trim().toLowerCase();
}

export function isSupportedCountryCode(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(countryCodeToGeoTargetId, value);
}

export function isSupportedLanguageCode(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(languageCodeToConstantId, value);
}

export const countryCodeSchema = z.string()
  .min(1)
  .transform(normalizeCountryCode)
  .refine((value) => isSupportedCountryCode(value), {
    message: 'Invalid country code. Expected ISO 3166-1 alpha-2 code supported by Google Ads.',
  });

export const languageCodeSchema = z.string()
  .min(1)
  .transform(normalizeLanguageCode)
  .refine((value) => isSupportedLanguageCode(value), {
    message: 'Invalid language code. Expected ISO 639-1 code supported by Google Ads.',
  });

export function normalizeCountryCodes(codes: string[] | undefined): string[] | undefined {
  if (!codes || codes.length === 0) {
    return undefined;
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const code of codes) {
    const parsed = countryCodeSchema.parse(code);
    if (!seen.has(parsed)) {
      seen.add(parsed);
      normalized.push(parsed);
    }
  }

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeLanguage(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return languageCodeSchema.parse(value);
}