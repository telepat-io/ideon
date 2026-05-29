export interface GkpGenerateIdeasInput {
  seedKeywords?: string[];
  url?: string;
  site?: string;
  countryCodes?: string[];
  language?: string;
  pageSize?: number;
}

export interface GkpGetHistoricalDataInput {
  keywords: string[];
  countryCodes?: string[];
  language?: string;
  includeAverageCpc?: boolean;
}

export interface GkpGetForecastDataInput {
  keywords: string[];
  keywordMatchType?: string;
  maxCpcBidMicros?: number;
  countryCodes?: string[];
  language?: string;
  startDate?: string;
  endDate?: string;
}

export interface KeywordIdea {
  text: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  closeVariants: string[];
}

export interface GenerateIdeasResponse {
  ideas: KeywordIdea[];
  count: number;
}

export interface KeywordMetrics {
  text: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: MonthlyVolume[];
}

export interface MonthlyVolume {
  year: number;
  month: number;
  monthlySearches: number;
}

export interface GetHistoricalDataResponse {
  keywords: KeywordMetrics[];
  count: number;
}

export interface KeywordForecastMetrics {
  text: string;
  matchType: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  ctr: number;
}

export interface GetForecastDataResponse {
  keywords: KeywordForecastMetrics[];
  count: number;
}

export const countryCodeToGeoTargetId: Record<string, number> = {
  AD: 2020, AE: 2784, AF: 2004, AG: 2028, AI: 2660, AL: 2008, AM: 2051, AO: 2024, AQ: 2010, AR: 2032, AS: 2016, AT: 2040, AU: 2036, AW: 2533, AX: 2248, AZ: 2031, BA: 2070, BB: 2052, BD: 2050, BE: 2056, BF: 2854, BG: 2100, BH: 2048, BI: 2108, BJ: 2204, BL: 2652, BM: 2060, BN: 2096, BO: 2068, BQ: 2535, BR: 2076, BS: 2044, BT: 2064, BV: 2074, BW: 2072, BY: 2112, BZ: 2084, CA: 2124, CC: 2166, CD: 2180, CF: 2140, CG: 2178, CH: 2756, CI: 2384, CK: 2184, CL: 2152, CM: 2120, CN: 2156, CO: 2170, CR: 2188, CU: 2192, CV: 2132, CW: 2531, CX: 2162, CY: 2196, CZ: 2203, DE: 2276, DJ: 2262, DK: 2208, DM: 2212, DO: 2214, DZ: 2012, EC: 2218, EE: 2233, EG: 2818, EH: 2732, ER: 2232, ES: 2724, ET: 2231, FI: 2246, FJ: 2242, FK: 2238, FM: 2583, FO: 2234, FR: 2250, GA: 2266, GB: 2826, GD: 2308, GE: 2268, GF: 2254, GG: 2831, GH: 2288, GI: 2292, GL: 2304, GM: 2270, GN: 2324, GP: 2312, GQ: 2226, GR: 2300, GS: 2239, GT: 2320, GU: 2316, GW: 2624, GY: 2328, HK: 2344, HM: 2334, HN: 2340, HR: 2191, HT: 2332, HU: 2348, ID: 2360, IE: 2372, IL: 2376, IM: 2833, IN: 2356, IO: 2086, IQ: 2368, IR: 2364, IS: 2352, IT: 2380, JE: 2832, JM: 2388, JO: 2400, JP: 2392, KE: 2404, KG: 2417, KH: 2116, KI: 2296, KM: 2174, KN: 2659, KP: 2408, KR: 2410, KW: 2414, KY: 2136, KZ: 2398, LA: 2418, LB: 2422, LC: 2662, LI: 2438, LK: 2144, LR: 2430, LS: 2426, LT: 2440, LU: 2442, LV: 2428, LY: 2434, MA: 2504, MC: 2492, MD: 2498, ME: 2499, MF: 2663, MG: 2450, MH: 2584, MK: 2807, ML: 2466, MM: 2104, MN: 2496, MO: 2446, MP: 2580, MQ: 2474, MR: 2478, MS: 2500, MT: 2470, MU: 2480, MV: 2462, MW: 2454, MX: 2484, MY: 2458, MZ: 2508, NA: 2516, NC: 2540, NE: 2562, NF: 2574, NG: 2566, NI: 2558, NL: 2528, NO: 2578, NP: 2524, NR: 2520, NU: 2570, NZ: 2554, OM: 2512, PA: 2591, PE: 2604, PF: 2258, PG: 2598, PH: 2608, PK: 2586, PL: 2616, PM: 2666, PN: 2612, PR: 2630, PS: 2275, PT: 2620, PW: 2585, PY: 2600, QA: 2634, RE: 2638, RO: 2642, RS: 2688, RU: 2643, RW: 2646, SA: 2682, SB: 2090, SC: 2690, SD: 2729, SE: 2752, SG: 2702, SH: 2654, SI: 2705, SJ: 2744, SK: 2703, SL: 2694, SM: 2674, SN: 2686, SO: 2706, SR: 2740, SS: 2728, ST: 2678, SV: 2222, SX: 2534, SY: 2760, SZ: 2748, TC: 2796, TD: 2148, TF: 2260, TG: 2768, TH: 2764, TJ: 2762, TK: 2772, TL: 2626, TM: 2795, TN: 2788, TO: 2776, TR: 2792, TT: 2780, TV: 2798, TW: 2158, TZ: 2834, UA: 2804, UG: 2800, UM: 2581, US: 2840, UY: 2858, UZ: 2860, VA: 2336, VC: 2670, VE: 2862, VG: 2092, VI: 2850, VN: 2704, VU: 2548, WF: 2876, WS: 2882, YE: 2887, YT: 2175, ZA: 2710, ZM: 2894, ZW: 2716,
};

export const languageCodeToConstantId: Record<string, number> = {
  af: 1064, sq: 1066, am: 1067, ar: 1001, hy: 1068, az: 1069, eu: 1070, be: 1071, bn: 1072, bs: 1073, bg: 1074, my: 1075, ca: 1076, zh: 1020, hr: 1077, cs: 1078, da: 1079, nl: 1080, en: 1000, et: 1081, fi: 1082, fr: 1002, gl: 1083, ka: 1084, de: 1003, el: 1008, gu: 1085, iw: 1009, hi: 1086, hu: 1087, is: 1088, id: 1089, it: 1005, ja: 1006, kn: 1090, kk: 1091, km: 1092, ko: 1007, ky: 1093, lo: 1094, lv: 1095, lt: 1096, mk: 1097, ms: 1098, ml: 1099, mr: 1100, mn: 1101, ne: 1102, no: 1103, fa: 1104, pl: 1105, pt: 1009, pa: 1106, ro: 1107, ru: 1010, sr: 1108, si: 1109, sk: 1110, sl: 1111, es: 1004, sw: 1112, sv: 1011, tl: 1113, ta: 1114, te: 1115, th: 1012, tr: 1013, uk: 1115, ur: 1116, uz: 1117, vi: 1118, zu: 1119,
};

const DEFAULT_LANGUAGE = 'en';
const DEFAULT_FORECAST_COUNTRY = 'US';
const FORECAST_DEFAULT_DAYS = 30;

const MONTH_MAP: Record<string, number> = {
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
  JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
};

function parseStrInt(s: string | undefined): number {
  if (!s) return 0;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseStrFloat(s: string | undefined): number {
  if (!s) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCompetition(raw: string | undefined): string {
  if (!raw || raw === 'COMPETITION_UNSPECIFIED') return 'UNKNOWN';
  return raw;
}

function resolveGeoTargetConstant(code: string): string {
  if (code.startsWith('geoTargetConstants/')) return code;
  const id = countryCodeToGeoTargetId[code.toUpperCase()];
  if (id === undefined) throw new Error(`Unsupported country code: ${code}`);
  return `geoTargetConstants/${id}`;
}

function resolveLanguageConstant(code: string): string {
  if (code.startsWith('languageConstants/')) return code;
  const id = languageCodeToConstantId[code.toLowerCase()];
  if (id === undefined) throw new Error(`Unsupported language code: ${code}`);
  return `languageConstants/${id}`;
}

export function resolveGeoTargets(countryCodes: string[] | undefined, forForecast: boolean): string[] | undefined {
  if (!countryCodes || countryCodes.length === 0) {
    if (forForecast) return [resolveGeoTargetConstant(DEFAULT_FORECAST_COUNTRY)];
    return undefined;
  }
  return countryCodes.map(resolveGeoTargetConstant);
}

export function resolveLanguage(lang: string | undefined): string {
  if (!lang) return resolveLanguageConstant(DEFAULT_LANGUAGE);
  return resolveLanguageConstant(lang);
}

export function buildGenerateIdeasBody(input: GkpGenerateIdeasInput): Record<string, unknown> {
  const hasKeywords = input.seedKeywords && input.seedKeywords.length > 0;
  const hasUrl = input.url && input.url.length > 0;
  const hasSite = input.site && input.site.length > 0;

  if (!hasKeywords && !hasUrl && !hasSite) {
    throw new Error('At least one of seedKeywords, url, or site is required.');
  }

  if (hasSite && (hasKeywords || hasUrl)) {
    throw new Error('site cannot be combined with seedKeywords or url.');
  }

  const body: Record<string, unknown> = {
    language: resolveLanguage(input.language),
  };

  const geoTargets = resolveGeoTargets(input.countryCodes, false);
  if (geoTargets) body.geoTargetConstants = geoTargets;

  if (hasKeywords && hasUrl) {
    body.keywordAndUrlSeed = { keywords: input.seedKeywords, url: input.url };
  } else if (hasKeywords) {
    body.keywordSeed = { keywords: input.seedKeywords };
  } else if (hasUrl) {
    body.urlSeed = { url: input.url };
  } else if (hasSite) {
    body.siteSeed = { site: input.site };
  }

  if (input.pageSize && input.pageSize > 0) {
    body.pageSize = input.pageSize;
  }

  return body;
}

export function buildGetHistoricalDataBody(input: GkpGetHistoricalDataInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    keywords: input.keywords,
  };

  body.language = resolveLanguage(input.language);

  const geoTargets = resolveGeoTargets(input.countryCodes, false);
  if (geoTargets) body.geoTargetConstants = geoTargets;

  body.historicalMetricsOptions = {
    includeAverageCpc: input.includeAverageCpc !== false,
    monthlySearchVolume: true,
  };

  return body;
}

export function buildForecastBody(input: GkpGetForecastDataInput): Record<string, unknown> {
  const now = new Date();
  const startDate = input.startDate || now.toISOString().split('T')[0];
  const endDate = input.endDate || new Date(now.getTime() + FORECAST_DEFAULT_DAYS * 86400000).toISOString().split('T')[0];

  const geoTargets = resolveGeoTargets(input.countryCodes, true);
  const language = resolveLanguage(input.language);

  const biddableKeywords = input.keywords.map((kw) => ({
    keyword: {
      text: kw,
      matchType: input.keywordMatchType || 'BROAD',
    },
  }));

  const campaign: Record<string, unknown> = {
    languageConstants: [language],
    geoTargetConstants: geoTargets,
    forecastPeriod: { startDate, endDate },
    adGroups: [{ biddableKeywords }],
  };

  if (input.maxCpcBidMicros !== undefined) {
    campaign.biddingStrategy = {
      manualCpcBiddingStrategy: {
        maxCpcBidMicros: String(input.maxCpcBidMicros),
      },
    };
  }

  return { campaign };
}

export function parseGenerateIdeasResponse(raw: Record<string, unknown>): GenerateIdeasResponse {
  const results = (raw.results as Array<Record<string, unknown>>) || [];
  const ideas: KeywordIdea[] = results.map((r) => {
    const metrics = (r.keywordIdeaMetrics || {}) as Record<string, unknown>;
    const closeVariantsRaw = (r.closeVariants as Array<Record<string, unknown>>) || [];
    return {
      text: (r.text as string) || '',
      avgMonthlySearches: parseStrInt(metrics.avgMonthlySearches as string | undefined),
      competition: normalizeCompetition(metrics.competition as string | undefined),
      competitionIndex: parseStrInt(metrics.competitionIndex as string | undefined),
      lowTopOfPageBidMicros: parseStrInt(metrics.lowTopOfPageBidMicros as string | undefined),
      highTopOfPageBidMicros: parseStrInt(metrics.highTopOfPageBidMicros as string | undefined),
      closeVariants: closeVariantsRaw.map((cv) => (cv.text as string) || ''),
    };
  });

  return { ideas, count: ideas.length };
}

export function parseGetHistoricalDataResponse(raw: Record<string, unknown>): GetHistoricalDataResponse {
  const metrics = (raw.metrics as Array<Record<string, unknown>>) || [];
  const keywords: KeywordMetrics[] = metrics.map((m) => {
    const km = (m.keywordMetrics || {}) as Record<string, unknown>;
    const monthlyRaw = (km.monthlySearchVolumes as Array<Record<string, unknown>>) || [];
    const monthlySearchVolumes: MonthlyVolume[] = monthlyRaw.map((v) => ({
      year: (v.year as number) || 0,
      month: MONTH_MAP[(v.month as string) || ''] || 0,
      monthlySearches: parseStrInt(v.monthlySearches as string | undefined),
    }));

    return {
      text: (m.text as string) || '',
      avgMonthlySearches: parseStrInt(km.avgMonthlySearches as string | undefined),
      competition: normalizeCompetition(km.competition as string | undefined),
      competitionIndex: parseStrInt(String(km.competitionIndex ?? '')),
      lowTopOfPageBidMicros: parseStrInt(km.lowTopOfPageBidMicros as string | undefined),
      highTopOfPageBidMicros: parseStrInt(km.highTopOfPageBidMicros as string | undefined),
      monthlySearchVolumes,
    };
  });

  return { keywords, count: keywords.length };
}

export function parseGetForecastDataResponse(raw: Record<string, unknown>): GetForecastDataResponse {
  const adGroupMetrics = (raw.adGroupForecastMetrics as Array<Record<string, unknown>>) || [];
  const keywords: KeywordForecastMetrics[] = [];

  for (const ag of adGroupMetrics) {
    const kfMetrics = (ag.keywordForecastMetrics as Array<Record<string, unknown>>) || [];
    for (const kf of kfMetrics) {
      const kw = (kf.keyword || {}) as Record<string, unknown>;
      const m = (kf.metrics || {}) as Record<string, unknown>;
      keywords.push({
        text: (kw.text as string) || '',
        matchType: (kw.matchType as string) || 'BROAD',
        impressions: (m.impressions as number) || 0,
        clicks: (m.clicks as number) || 0,
        costMicros: (m.costMicros as number) || 0,
        ctr: (m.ctr as number) || 0,
      });
    }
  }

  return { keywords, count: keywords.length };
}
