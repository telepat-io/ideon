import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const hydrateStateMock = jest.fn<(...args: any[]) => Promise<any>>();
const splitSeedsByCacheMock = jest.fn<(...args: any[]) => any>();
const loadSeriesKeywordsMock = jest.fn<(...args: any[]) => Promise<any>>();

const generateSeedsMock = jest.fn<(...args: any[]) => Promise<any>>();
const mergeSeedsMock = jest.fn<(...args: any[]) => any>();
const deduplicateSeedsMock = jest.fn<(...args: any[]) => any>();

const runResearchLoopMock = jest.fn<(...args: any[]) => Promise<any>>();

const classifyIntentMock = jest.fn<(...args: any[]) => Promise<void>>();
const computeKobScoreMock = jest.fn<(...args: any[]) => number>();
const scoreAndFilterMock = jest.fn<(...args: any[]) => any>();

const formClustersMock = jest.fn<(...args: any[]) => Promise<any>>();
const planArticlesForClusterMock = jest.fn<(...args: any[]) => Promise<any>>();
const planArticlesForSeriesMock = jest.fn<(...args: any[]) => Promise<any>>();
const persistPlanMock = jest.fn<(...args: any[]) => Promise<void>>();

const cachedClientCtorMock = jest.fn(function mockCachedClientCtor(this: any, options: any) {
  this.options = options;
});

jest.unstable_mockModule('../plan/state.js', () => ({
  hydrateState: hydrateStateMock,
  splitSeedsByCache: splitSeedsByCacheMock,
  loadSeriesKeywords: loadSeriesKeywordsMock,
}));

jest.unstable_mockModule('../plan/seeds.js', () => ({
  generateSeeds: generateSeedsMock,
  mergeSeeds: mergeSeedsMock,
  deduplicateSeeds: deduplicateSeedsMock,
}));

jest.unstable_mockModule('../plan/research.js', () => ({
  runResearchLoop: runResearchLoopMock,
  DEFAULT_RESEARCH_PARAMS: {
    targetCandidates: 30,
    maxQueryRounds: 6,
  },
}));

jest.unstable_mockModule('../plan/scoring.js', () => ({
  classifyIntent: classifyIntentMock,
  computeKobScore: computeKobScoreMock,
  scoreAndFilter: scoreAndFilterMock,
  DEFAULT_SCORING_PARAMS: {
    lowVolumeMode: false,
  },
}));

jest.unstable_mockModule('../plan/clustering.js', () => ({
  formClusters: formClustersMock,
}));

jest.unstable_mockModule('../plan/articles.js', () => ({
  planArticlesForCluster: planArticlesForClusterMock,
  planArticlesForSeries: planArticlesForSeriesMock,
}));

jest.unstable_mockModule('../plan/persistence.js', () => ({
  persistPlan: persistPlanMock,
}));

jest.unstable_mockModule('../integrations/keywordplanner/cachedClient.js', () => ({
  CachedGkpClient: cachedClientCtorMock,
}));

const { runPlan } = await import('../plan/pipeline.js');

function makeState(overrides: Record<string, unknown> = {}): any {
  return {
    coverageMap: {
      'alpha-keyword': {
        title: 'Existing Alpha Article',
        seriesSlug: 'series-a',
        publishedDate: '2024-01-01',
        ageMonths: 12,
        keywords: ['alpha keyword'],
      },
    },
    cacheSummary: {},
    exhaustionMap: {},
    seriesKeywords: new Map<string, string[]>(),
    seriesMap: new Map<string, any>([
      [
        'series-a',
        {
          name: 'Series A',
          slug: 'series-a',
          topic: 'Series topic',
          defaults: { keywords: ['alpha keyword', 'beta keyword'] },
        },
      ],
    ]),
    ...overrides,
  };
}

function makeCandidate(overrides: Record<string, unknown> = {}): any {
  return {
    keyword: 'alpha keyword',
    normalised: 'alpha-keyword',
    avgMonthlySearches: 150,
    competition: 'LOW',
    competitionIndex: 20,
    highTopOfPageBidMicros: 4000000,
    fromCache: false,
    sourceSeed: 'seed',
    intentScore: 4,
    intentType: 'commercial',
    kobScore: 3.5,
    ...overrides,
  };
}

function makeArticle(overrides: Record<string, unknown> = {}): any {
  return {
    title: 'Planned Article',
    primaryKeyword: 'alpha keyword',
    secondaryKeywords: ['beta keyword'],
    intentType: 'commercial',
    funnelStage: 'middle',
    contentAngle: 'Practical angle',
    format: 'guide',
    isPillar: true,
    priority: 'high',
    refreshCandidate: null,
    type: 'new',
    ...overrides,
  };
}

describe('runPlan', () => {
  const llmClient = {} as any;
  const gkpClient = {} as any;
  const appSettings = { model: 'plan-model', temperature: 0.2 } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    hydrateStateMock.mockResolvedValue(makeState());
    splitSeedsByCacheMock.mockReturnValue({ freshSeeds: ['fresh seed'], querySeeds: ['query seed'] });
    loadSeriesKeywordsMock.mockResolvedValue(['alpha keyword']);

    generateSeedsMock.mockResolvedValue([{ keyword: 'llm seed' }]);
    mergeSeedsMock.mockReturnValue(['llm seed', 'manual seed', 'fresh seed']);
    deduplicateSeedsMock.mockImplementation((seeds: string[]) => Array.from(new Set(seeds)));

    runResearchLoopMock.mockResolvedValue({
      candidates: new Map([['alpha-keyword', makeCandidate()]]),
      queryRoundsCompleted: 2,
      cacheHits: 1,
      apiCallsMade: 1,
      lowVolumeMode: false,
      exhausted: false,
    });

    classifyIntentMock.mockResolvedValue(undefined);
    computeKobScoreMock.mockReturnValue(3.5);
    scoreAndFilterMock.mockReturnValue({
      shortlist: [makeCandidate()],
      discarded: [{ keyword: 'discarded keyword', kobScore: 1.2, reason: 'below threshold' }],
    });

    formClustersMock.mockResolvedValue([
      {
        seriesName: 'series-a',
        pillarKeyword: 'alpha keyword',
        funnelStage: 'middle',
        supportingKeywords: ['alpha keyword'],
        clusterRationale: 'cluster rationale',
        coverageGapNote: 'gap note',
      },
    ]);
    planArticlesForClusterMock.mockResolvedValue([makeArticle()]);
    planArticlesForSeriesMock.mockResolvedValue([makeArticle({ isPillar: false })]);
    persistPlanMock.mockResolvedValue(undefined);
  });

  it('executes full new-idea pipeline and persists result', async () => {
    const stageEvents: string[] = [];
    const researchEvents: string[] = [];

    const result = await runPlan({
      input: {
        mode: 'new-idea',
        contentIdea: 'test idea',
        publicationSlug: 'test-pub',
        countryCodes: ['US'],
        language: 'en',
        contentType: 'article',
        autoSave: false,
        nonInteractive: false,
        dryRun: false,
        planModel: 'plan-model',
        intentModel: 'intent-model',
        seedKeywords: ['manual seed'],
        excludeSeries: [],
        desiredSeriesCount: 1,
        desiredArticlesPerSeries: 1,
      },
      llmClient,
      gkpClient,
      appSettings,
      onEvent: (event) => {
        if ('stage' in event) stageEvents.push(event.stage);
      },
      onResearchEvent: (event) => researchEvents.push(event.type),
    });

    expect(result.mode).toBe('new-idea');
    expect(result.series).toHaveLength(1);
    expect(result.articles).toHaveLength(1);
    expect(result.discardedCandidates).toEqual([
      { keyword: 'discarded keyword', kobScore: 1.2, reason: 'below threshold' },
    ]);

    expect(stageEvents).toEqual([
      'hydrate',
      'seeds',
      'research',
      'score',
      'cluster',
      'plan-articles',
      'persist',
    ]);
    expect(researchEvents).toHaveLength(0);

    expect(cachedClientCtorMock).toHaveBeenCalledWith({
      client: gkpClient,
      publication: 'test-pub',
    });
    expect(generateSeedsMock).toHaveBeenCalledTimes(1);
    expect(loadSeriesKeywordsMock).not.toHaveBeenCalled();
    expect(formClustersMock).toHaveBeenCalledTimes(1);
    expect(planArticlesForClusterMock).toHaveBeenCalledTimes(1);
    expect(planArticlesForSeriesMock).not.toHaveBeenCalled();

    expect(classifyIntentMock).toHaveBeenCalledWith(
      llmClient,
      expect.objectContaining({ model: 'intent-model' }),
      expect.any(Array),
    );
    expect(computeKobScoreMock).toHaveBeenCalledTimes(1);
    expect(persistPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'new-idea',
        publicationSlug: 'test-pub',
        acceptedSeries: expect.arrayContaining([
          expect.objectContaining({ name: 'series-a' }),
        ]),
        acceptedArticles: expect.arrayContaining([
          expect.objectContaining({ title: 'Planned Article' }),
        ]),
        lowVolumeMode: false,
      }),
    );
  });

  it('executes expand-series flow without seed generation or clustering', async () => {
    const stageEvents: string[] = [];

    const result = await runPlan({
      input: {
        mode: 'expand-series',
        seriesSlug: 'series-a',
        publicationSlug: 'test-pub',
        countryCodes: ['US'],
        language: 'en',
        contentType: 'article',
        autoSave: false,
        nonInteractive: false,
        dryRun: false,
        planModel: 'plan-model',
        intentModel: 'intent-model',
        seedKeywords: ['manual seed'],
        desiredArticleCount: 1,
      },
      llmClient,
      gkpClient,
      appSettings,
      onEvent: (event) => {
        if ('stage' in event) stageEvents.push(event.stage);
      },
    });

    expect(result.mode).toBe('expand-series');
    expect(result.series).toHaveLength(1);
    expect(result.articles).toHaveLength(1);

    expect(stageEvents).toEqual([
      'hydrate',
      'research',
      'score',
      'plan-articles',
      'persist',
    ]);

    expect(generateSeedsMock).not.toHaveBeenCalled();
    expect(loadSeriesKeywordsMock).toHaveBeenCalledWith('series-a');
    expect(formClustersMock).not.toHaveBeenCalled();
    expect(planArticlesForClusterMock).not.toHaveBeenCalled();
    expect(planArticlesForSeriesMock).toHaveBeenCalledTimes(1);
    expect(runResearchLoopMock).toHaveBeenCalledWith(
      expect.anything(),
      ['alpha keyword', 'manual seed'],
      ['US'],
      'en',
      expect.anything(),
      expect.anything(),
      undefined,
    );
  });

  it('returns early when research is exhausted with no candidates', async () => {
    runResearchLoopMock.mockResolvedValueOnce({
      candidates: new Map(),
      queryRoundsCompleted: 3,
      cacheHits: 0,
      apiCallsMade: 0,
      lowVolumeMode: false,
      exhausted: true,
    });

    const stageEvents: string[] = [];

    const result = await runPlan({
      input: {
        mode: 'new-idea',
        contentIdea: 'niche idea',
        publicationSlug: 'test-pub',
        countryCodes: ['US'],
        language: 'en',
        contentType: 'article',
        autoSave: false,
        nonInteractive: false,
        dryRun: false,
        planModel: 'plan-model',
        intentModel: 'intent-model',
        seedKeywords: [],
        excludeSeries: [],
      },
      llmClient,
      gkpClient,
      appSettings,
      onEvent: (event) => {
        if ('stage' in event) stageEvents.push(event.stage);
      },
    });

    expect(result).toEqual({
      mode: 'new-idea',
      lowVolumeMode: false,
      researchStats: {
        queryRoundsCompleted: 3,
        candidatesEvaluated: 0,
        candidatesPassed: 0,
        cacheHits: 0,
        apiCallsMade: 0,
      },
      series: [],
      articles: [],
      discardedCandidates: [],
    });

    expect(stageEvents).toEqual(['hydrate', 'seeds', 'research']);
    expect(classifyIntentMock).not.toHaveBeenCalled();
    expect(scoreAndFilterMock).not.toHaveBeenCalled();
    expect(formClustersMock).not.toHaveBeenCalled();
    expect(planArticlesForClusterMock).not.toHaveBeenCalled();
    expect(planArticlesForSeriesMock).not.toHaveBeenCalled();
    expect(persistPlanMock).not.toHaveBeenCalled();
  });

  it('handles expand-series mode when requested series is missing', async () => {
    hydrateStateMock.mockResolvedValueOnce(
      makeState({
        seriesMap: new Map(),
      }),
    );

    const result = await runPlan({
      input: {
        mode: 'expand-series',
        seriesSlug: 'missing-series',
        publicationSlug: 'test-pub',
        countryCodes: ['US'],
        language: 'en',
        contentType: 'article',
        autoSave: false,
        nonInteractive: false,
        dryRun: false,
        planModel: 'plan-model',
        intentModel: 'intent-model',
        seedKeywords: [],
      },
      llmClient,
      gkpClient,
      appSettings,
    });

    expect(result.series).toEqual([]);
    expect(result.articles).toEqual([]);
    expect(planArticlesForSeriesMock).not.toHaveBeenCalled();
    expect(persistPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'expand-series',
        acceptedSeries: [],
        acceptedArticles: [],
      }),
    );
  });

  it('propagates low-volume mode into scoring and persisted plan', async () => {
    runResearchLoopMock.mockResolvedValueOnce({
      candidates: new Map([['alpha-keyword', makeCandidate()]]),
      queryRoundsCompleted: 1,
      cacheHits: 0,
      apiCallsMade: 1,
      lowVolumeMode: true,
      exhausted: false,
    });

    const result = await runPlan({
      input: {
        mode: 'new-idea',
        contentIdea: 'low volume idea',
        publicationSlug: 'test-pub',
        countryCodes: ['US'],
        language: 'en',
        contentType: 'article',
        autoSave: false,
        nonInteractive: false,
        dryRun: false,
        planModel: 'plan-model',
        intentModel: 'intent-model',
        seedKeywords: [],
        excludeSeries: [],
      },
      llmClient,
      gkpClient,
      appSettings,
    });

    expect(scoreAndFilterMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ lowVolumeMode: true }),
    );
    expect(result.lowVolumeMode).toBe(true);
    expect(persistPlanMock).toHaveBeenCalledWith(
      expect.objectContaining({ lowVolumeMode: true }),
    );
  });
});