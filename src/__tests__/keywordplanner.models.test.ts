import {
  buildGenerateIdeasBody,
  buildGetHistoricalDataBody,
  buildForecastBody,
  parseGenerateIdeasResponse,
  parseGetHistoricalDataResponse,
  parseGetForecastDataResponse,
  resolveGeoTargets,
  resolveLanguage,
  countryCodeToGeoTargetId,
  languageCodeToConstantId,
} from '../integrations/keywordplanner/models.js';

describe('countryCodeToGeoTargetId', () => {
  it('maps common country codes to geo target IDs', () => {
    expect(countryCodeToGeoTargetId['US']).toBe(2840);
    expect(countryCodeToGeoTargetId['GB']).toBe(2826);
    expect(countryCodeToGeoTargetId['CA']).toBe(2124);
    expect(countryCodeToGeoTargetId['AU']).toBe(2036);
    expect(countryCodeToGeoTargetId['DE']).toBe(2276);
    expect(countryCodeToGeoTargetId['FR']).toBe(2250);
    expect(countryCodeToGeoTargetId['JP']).toBe(2392);
    expect(countryCodeToGeoTargetId['IN']).toBe(2356);
    expect(countryCodeToGeoTargetId['BR']).toBe(2076);
  });

  it('includes a comprehensive set of countries', () => {
    expect(Object.keys(countryCodeToGeoTargetId).length).toBeGreaterThan(200);
  });
});

describe('languageCodeToConstantId', () => {
  it('maps common language codes to constant IDs', () => {
    expect(languageCodeToConstantId['en']).toBe(1000);
    expect(languageCodeToConstantId['fr']).toBe(1002);
    expect(languageCodeToConstantId['de']).toBe(1003);
    expect(languageCodeToConstantId['es']).toBe(1004);
    expect(languageCodeToConstantId['it']).toBe(1005);
    expect(languageCodeToConstantId['ja']).toBe(1006);
    expect(languageCodeToConstantId['ko']).toBe(1007);
    expect(languageCodeToConstantId['pt']).toBe(1009);
    expect(languageCodeToConstantId['ru']).toBe(1010);
  });

  it('includes a comprehensive set of languages', () => {
    expect(Object.keys(languageCodeToConstantId).length).toBeGreaterThan(50);
  });
});

describe('resolveGeoTargets', () => {
  it('returns undefined for ideas/historical when no country codes provided', () => {
    expect(resolveGeoTargets(undefined, false)).toBeUndefined();
    expect(resolveGeoTargets([], false)).toBeUndefined();
  });

  it('defaults to US for forecast when no country codes provided', () => {
    expect(resolveGeoTargets(undefined, true)).toEqual(['geoTargetConstants/2840']);
    expect(resolveGeoTargets([], true)).toEqual(['geoTargetConstants/2840']);
  });

  it('converts country codes to geo target constants', () => {
    const result = resolveGeoTargets(['US', 'GB'], false);
    expect(result).toEqual(['geoTargetConstants/2840', 'geoTargetConstants/2826']);
  });

  it('passes through raw resource names', () => {
    const result = resolveGeoTargets(['geoTargetConstants/2840'], false);
    expect(result).toEqual(['geoTargetConstants/2840']);
  });

  it('throws on unsupported country code', () => {
    expect(() => resolveGeoTargets(['XX'], false)).toThrow('Unsupported country code: XX');
  });
});

describe('resolveLanguage', () => {
  it('defaults to English when no language provided', () => {
    expect(resolveLanguage(undefined)).toBe('languageConstants/1000');
  });

  it('converts language codes to constant IDs', () => {
    expect(resolveLanguage('en')).toBe('languageConstants/1000');
    expect(resolveLanguage('fr')).toBe('languageConstants/1002');
    expect(resolveLanguage('de')).toBe('languageConstants/1003');
  });

  it('passes through raw resource names', () => {
    expect(resolveLanguage('languageConstants/1000')).toBe('languageConstants/1000');
  });

  it('throws on unsupported language code', () => {
    expect(() => resolveLanguage('xx')).toThrow('Unsupported language code: xx');
  });
});

describe('buildGenerateIdeasBody', () => {
  it('builds keywordSeed body', () => {
    const body = buildGenerateIdeasBody({ seedKeywords: ['test', 'keyword'] });
    expect(body).toEqual({
      language: 'languageConstants/1000',
      keywordSeed: { keywords: ['test', 'keyword'] },
    });
  });

  it('builds urlSeed body', () => {
    const body = buildGenerateIdeasBody({ url: 'https://example.com' });
    expect(body).toEqual({
      language: 'languageConstants/1000',
      urlSeed: { url: 'https://example.com' },
    });
  });

  it('builds keywordAndUrlSeed body when both provided', () => {
    const body = buildGenerateIdeasBody({ seedKeywords: ['test'], url: 'https://example.com' });
    expect(body).toEqual({
      language: 'languageConstants/1000',
      keywordAndUrlSeed: { keywords: ['test'], url: 'https://example.com' },
    });
  });

  it('builds siteSeed body', () => {
    const body = buildGenerateIdeasBody({ site: 'example.com' });
    expect(body).toEqual({
      language: 'languageConstants/1000',
      siteSeed: { site: 'example.com' },
    });
  });

  it('includes geo targets when country codes provided', () => {
    const body = buildGenerateIdeasBody({ seedKeywords: ['test'], countryCodes: ['US', 'GB'] });
    expect(body.geoTargetConstants).toEqual(['geoTargetConstants/2840', 'geoTargetConstants/2826']);
  });

  it('omits geo targets when no country codes provided', () => {
    const body = buildGenerateIdeasBody({ seedKeywords: ['test'] });
    expect(body.geoTargetConstants).toBeUndefined();
  });

  it('includes custom language', () => {
    const body = buildGenerateIdeasBody({ seedKeywords: ['test'], language: 'fr' });
    expect(body.language).toBe('languageConstants/1002');
  });

  it('includes pageSize when provided', () => {
    const body = buildGenerateIdeasBody({ seedKeywords: ['test'], pageSize: 50 });
    expect(body.pageSize).toBe(50);
  });

  it('omits pageSize when not provided', () => {
    const body = buildGenerateIdeasBody({ seedKeywords: ['test'] });
    expect(body.pageSize).toBeUndefined();
  });

  it('throws when no seed provided', () => {
    expect(() => buildGenerateIdeasBody({})).toThrow('At least one of seedKeywords, url, or site is required.');
  });

  it('throws when site combined with seedKeywords', () => {
    expect(() => buildGenerateIdeasBody({ seedKeywords: ['test'], site: 'example.com' })).toThrow(
      'site cannot be combined with seedKeywords or url.',
    );
  });

  it('throws when site combined with url', () => {
    expect(() => buildGenerateIdeasBody({ url: 'https://example.com', site: 'example.com' })).toThrow(
      'site cannot be combined with seedKeywords or url.',
    );
  });
});

describe('buildGetHistoricalDataBody', () => {
  it('builds body with keywords only', () => {
    const body = buildGetHistoricalDataBody({ keywords: ['test', 'keyword'] });
    expect(body).toEqual({
      keywords: ['test', 'keyword'],
      language: 'languageConstants/1000',
      historicalMetricsOptions: {
        includeAverageCpc: true,
        monthlySearchVolume: true,
      },
    });
  });

  it('includes geo targets when country codes provided', () => {
    const body = buildGetHistoricalDataBody({ keywords: ['test'], countryCodes: ['US'] });
    expect(body.geoTargetConstants).toEqual(['geoTargetConstants/2840']);
  });

  it('omits geo targets when no country codes provided', () => {
    const body = buildGetHistoricalDataBody({ keywords: ['test'] });
    expect(body.geoTargetConstants).toBeUndefined();
  });

  it('includes custom language', () => {
    const body = buildGetHistoricalDataBody({ keywords: ['test'], language: 'de' });
    expect(body.language).toBe('languageConstants/1003');
  });

  it('sets includeAverageCpc to false when specified', () => {
    const body = buildGetHistoricalDataBody({ keywords: ['test'], includeAverageCpc: false });
    expect((body.historicalMetricsOptions as Record<string, unknown>).includeAverageCpc).toBe(false);
  });

  it('defaults includeAverageCpc to true', () => {
    const body = buildGetHistoricalDataBody({ keywords: ['test'] });
    expect((body.historicalMetricsOptions as Record<string, unknown>).includeAverageCpc).toBe(true);
  });
});

describe('buildForecastBody', () => {
  it('builds body with keywords only', () => {
    const body = buildForecastBody({ keywords: ['test', 'keyword'] });
    expect(body.campaign).toBeDefined();
    const campaign = body.campaign as Record<string, unknown>;
    expect(campaign.languageConstants).toEqual(['languageConstants/1000']);
    expect(campaign.geoTargetConstants).toEqual(['geoTargetConstants/2840']);
    expect(campaign.adGroups).toHaveLength(1);
    expect((campaign.adGroups as Array<Record<string, unknown>>)[0].biddableKeywords).toHaveLength(2);
  });

  it('defaults to US geo target', () => {
    const body = buildForecastBody({ keywords: ['test'] });
    const campaign = body.campaign as Record<string, unknown>;
    expect(campaign.geoTargetConstants).toEqual(['geoTargetConstants/2840']);
  });

  it('uses provided country codes', () => {
    const body = buildForecastBody({ keywords: ['test'], countryCodes: ['GB', 'FR'] });
    const campaign = body.campaign as Record<string, unknown>;
    expect(campaign.geoTargetConstants).toEqual(['geoTargetConstants/2826', 'geoTargetConstants/2250']);
  });

  it('uses provided language', () => {
    const body = buildForecastBody({ keywords: ['test'], language: 'fr' });
    const campaign = body.campaign as Record<string, unknown>;
    expect(campaign.languageConstants).toEqual(['languageConstants/1002']);
  });

  it('includes bidding strategy when maxCpcBidMicros provided', () => {
    const body = buildForecastBody({ keywords: ['test'], maxCpcBidMicros: 1500000 });
    const campaign = body.campaign as Record<string, unknown>;
    expect(campaign.biddingStrategy).toEqual({
      manualCpcBiddingStrategy: { maxCpcBidMicros: '1500000' },
    });
  });

  it('omits bidding strategy when maxCpcBidMicros not provided', () => {
    const body = buildForecastBody({ keywords: ['test'] });
    const campaign = body.campaign as Record<string, unknown>;
    expect(campaign.biddingStrategy).toBeUndefined();
  });

  it('uses provided keywordMatchType', () => {
    const body = buildForecastBody({ keywords: ['test'], keywordMatchType: 'EXACT' });
    const campaign = body.campaign as Record<string, unknown>;
    const adGroups = campaign.adGroups as Array<Record<string, unknown>>;
    const biddable = adGroups[0].biddableKeywords as Array<Record<string, unknown>>;
    expect((biddable[0].keyword as Record<string, unknown>).matchType).toBe('EXACT');
  });

  it('defaults keywordMatchType to BROAD', () => {
    const body = buildForecastBody({ keywords: ['test'] });
    const campaign = body.campaign as Record<string, unknown>;
    const adGroups = campaign.adGroups as Array<Record<string, unknown>>;
    const biddable = adGroups[0].biddableKeywords as Array<Record<string, unknown>>;
    expect((biddable[0].keyword as Record<string, unknown>).matchType).toBe('BROAD');
  });

  it('uses provided startDate and endDate', () => {
    const body = buildForecastBody({ keywords: ['test'], startDate: '2024-01-01', endDate: '2024-01-31' });
    const campaign = body.campaign as Record<string, unknown>;
    expect(campaign.forecastPeriod).toEqual({ startDate: '2024-01-01', endDate: '2024-01-31' });
  });

  it('defaults dates to today + 30 days', () => {
    const body = buildForecastBody({ keywords: ['test'] });
    const campaign = body.campaign as Record<string, unknown>;
    const forecastPeriod = campaign.forecastPeriod as Record<string, string>;
    const today = new Date().toISOString().split('T')[0];
    expect(forecastPeriod.startDate).toBe(today);
  });
});

describe('parseGenerateIdeasResponse', () => {
  it('parses raw API response', () => {
    const raw = {
      results: [
        {
          text: 'test keyword',
          keywordIdeaMetrics: {
            avgMonthlySearches: '1000',
            competition: 'HIGH',
            competitionIndex: '80',
            lowTopOfPageBidMicros: '500000',
            highTopOfPageBidMicros: '1500000',
          },
          closeVariants: [{ text: 'test keywords' }, { text: 'testing keyword' }],
        },
      ],
    };

    const result = parseGenerateIdeasResponse(raw);
    expect(result.count).toBe(1);
    expect(result.ideas[0]).toEqual({
      text: 'test keyword',
      avgMonthlySearches: 1000,
      competition: 'HIGH',
      competitionIndex: 80,
      lowTopOfPageBidMicros: 500000,
      highTopOfPageBidMicros: 1500000,
      closeVariants: ['test keywords', 'testing keyword'],
    });
  });

  it('handles empty results', () => {
    const raw = { results: [] };
    const result = parseGenerateIdeasResponse(raw);
    expect(result.count).toBe(0);
    expect(result.ideas).toEqual([]);
  });

  it('handles missing metrics', () => {
    const raw = {
      results: [
        {
          text: 'test keyword',
          keywordIdeaMetrics: {},
        },
      ],
    };

    const result = parseGenerateIdeasResponse(raw);
    expect(result.ideas[0].avgMonthlySearches).toBe(0);
    expect(result.ideas[0].competition).toBe('UNKNOWN');
    expect(result.ideas[0].competitionIndex).toBe(0);
  });

  it('normalizes COMPETITION_UNSPECIFIED to UNKNOWN', () => {
    const raw = {
      results: [
        {
          text: 'test keyword',
          keywordIdeaMetrics: {
            competition: 'COMPETITION_UNSPECIFIED',
          },
        },
      ],
    };

    const result = parseGenerateIdeasResponse(raw);
    expect(result.ideas[0].competition).toBe('UNKNOWN');
  });
});

describe('parseGetHistoricalDataResponse', () => {
  it('parses raw API response', () => {
    const raw = {
      metrics: [
        {
          text: 'test keyword',
          keywordMetrics: {
            avgMonthlySearches: '2000',
            competition: 'MEDIUM',
            competitionIndex: 50,
            lowTopOfPageBidMicros: '300000',
            highTopOfPageBidMicros: '900000',
            monthlySearchVolumes: [
              { year: 2024, month: 'JANUARY', monthlySearches: '1500' },
              { year: 2024, month: 'FEBRUARY', monthlySearches: '2500' },
            ],
          },
        },
      ],
    };

    const result = parseGetHistoricalDataResponse(raw);
    expect(result.count).toBe(1);
    expect(result.keywords[0]).toEqual({
      text: 'test keyword',
      avgMonthlySearches: 2000,
      competition: 'MEDIUM',
      competitionIndex: 50,
      lowTopOfPageBidMicros: 300000,
      highTopOfPageBidMicros: 900000,
      monthlySearchVolumes: [
        { year: 2024, month: 1, monthlySearches: 1500 },
        { year: 2024, month: 2, monthlySearches: 2500 },
      ],
    });
  });

  it('handles empty results', () => {
    const raw = { metrics: [] };
    const result = parseGetHistoricalDataResponse(raw);
    expect(result.count).toBe(0);
    expect(result.keywords).toEqual([]);
  });

  it('maps month names to numbers', () => {
    const raw = {
      metrics: [
        {
          text: 'test',
          keywordMetrics: {
            monthlySearchVolumes: [
              { year: 2024, month: 'MARCH', monthlySearches: '100' },
              { year: 2024, month: 'DECEMBER', monthlySearches: '200' },
            ],
          },
        },
      ],
    };

    const result = parseGetHistoricalDataResponse(raw);
    expect(result.keywords[0].monthlySearchVolumes[0].month).toBe(3);
    expect(result.keywords[0].monthlySearchVolumes[1].month).toBe(12);
  });
});

describe('parseGetForecastDataResponse', () => {
  it('parses raw API response', () => {
    const raw = {
      adGroupForecastMetrics: [
        {
          keywordForecastMetrics: [
            {
              keyword: { text: 'test keyword', matchType: 'BROAD' },
              metrics: { impressions: 1000, clicks: 50, costMicros: 25000, ctr: 0.05 },
            },
          ],
        },
      ],
    };

    const result = parseGetForecastDataResponse(raw);
    expect(result.count).toBe(1);
    expect(result.keywords[0]).toEqual({
      text: 'test keyword',
      matchType: 'BROAD',
      impressions: 1000,
      clicks: 50,
      costMicros: 25000,
      ctr: 0.05,
    });
  });

  it('flattens multiple ad groups', () => {
    const raw = {
      adGroupForecastMetrics: [
        {
          keywordForecastMetrics: [
            { keyword: { text: 'kw1', matchType: 'BROAD' }, metrics: { impressions: 100, clicks: 10, costMicros: 5000, ctr: 0.1 } },
          ],
        },
        {
          keywordForecastMetrics: [
            { keyword: { text: 'kw2', matchType: 'EXACT' }, metrics: { impressions: 200, clicks: 20, costMicros: 10000, ctr: 0.1 } },
          ],
        },
      ],
    };

    const result = parseGetForecastDataResponse(raw);
    expect(result.count).toBe(2);
    expect(result.keywords.map((k) => k.text)).toEqual(['kw1', 'kw2']);
  });

  it('handles empty results', () => {
    const raw = { adGroupForecastMetrics: [] };
    const result = parseGetForecastDataResponse(raw);
    expect(result.count).toBe(0);
    expect(result.keywords).toEqual([]);
  });
});
