import { cwd } from 'node:process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import packageJson from '../../../package.json' with { type: 'json' };
import { resolveRunInput } from '../../config/resolver.js';
import { runPipelineShell } from '../../pipeline/runner.js';
import { runDeleteCommand } from '../../cli/commands/delete.js';
import { runLinksCommand } from '../../cli/commands/links.js';
import { runOutputCommand } from '../../cli/commands/export.js';
import { configGet, configList, configSet, configUnset, isConfigKey } from '../../config/manage.js';
import { parsePrimaryAndSecondarySpecs } from '../../cli/commands/writeTargetSpecs.js';
import { ReportedError } from '../../cli/reportedError.js';
import { loadWriteSession } from '../../pipeline/sessionStore.js';
import {
  type ConfigGetToolInput,
  type ConfigListToolInput,
  type ConfigSetToolInput,
  type ConfigUnsetToolInput,
  type DeleteToolInput,
  type ExportToolInput,
  type GkpGenerateIdeasToolInput,
  type GkpGetForecastDataToolInput,
  type GkpGetHistoricalDataToolInput,
  type LinksToolInput,
  type WriteResumeToolInput,
  type WriteToolInput,
  type PublicationAddToolInput,
  type PublicationEditToolInput,
  type PublicationRemoveToolInput,
  type SeriesAddToolInput,
  type SeriesListToolInput,
  type SeriesEditToolInput,
  type SeriesRemoveToolInput,
  type QueueAddToolInput,
  type QueueListToolInput,
  type QueuePeekToolInput,
  type QueueRemoveToolInput,
  type QueueWriteToolInput,
  type PlanExploreToolInput,
  type PlanExpandToolInput,
  configGetToolInputSchema,
  configListToolInputSchema,
  configSetToolInputSchema,
  configUnsetToolInputSchema,
  deleteToolInputSchema,
  exportToolInputZodSchema,
  gkpGenerateIdeasToolInputZodSchema,
  gkpGetForecastDataToolInputZodSchema,
  gkpGetHistoricalDataToolInputZodSchema,
  linksToolInputSchema,
  writeResumeToolInputSchema,
  writeToolInputSchema,
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
} from './tools.js';
import { GkpClient } from '../keywordplanner/client.js';
import { CachedGkpClient } from '../keywordplanner/cachedClient.js';
import { loadSecrets } from '../../config/secretStore.js';
import { readEnvSettings } from '../../config/env.js';
import {
  savePublication,
  listPublications,
  loadPublication,
  deletePublication,
  publicationExists,
} from '../../config/publicationStore.js';
import {
  saveSeries,
  listSeries,
  loadSeries,
  deleteSeries,
  seriesExists,
} from '../../config/seriesStore.js';
import {
  generateQueueId,
  saveQueueEntry,
  listQueueEntries,
  getNextPendingEntry,
  deleteQueueEntry,
  clearQueue,
  claimNextPendingEntry,
  deleteClaimedEntry,
  revertClaimedEntry,
} from '../../config/queueStore.js';
import { deriveSlugFromName, type Publication, type PublicationDefaults, type EditorialPolicy } from '../../types/publication.js';
import { deriveSeriesSlugFromName, type Series, type SeriesDefaults, type SeriesEditorialPolicy } from '../../types/series.js';
import type { QueueEntry } from '../../types/queue.js';
import type { ExplorePlanInput, ExpandPlanInput } from '../../types/plan.js';
import { runPlan } from '../../plan/pipeline.js';
import { normalizeCountryCodes, normalizeLanguage } from '../../config/marketLocale.js';
import { loadSavedSettings } from '../../config/settingsFile.js';
import { OpenRouterClient } from '../../llm/openRouterClient.js';
import { runArticleListCommand } from '../../cli/commands/article.js';

let cachedGkpClient: CachedGkpClient | null = null;

async function getOrCreateCachedGkpClient(): Promise<CachedGkpClient> {
  if (cachedGkpClient) return cachedGkpClient;

  const envSettings = readEnvSettings();
  const secrets = await loadSecrets({ disableKeytar: envSettings.disableKeytar });

  const devToken = envSettings.googleAdsDeveloperToken ?? secrets.googleAdsDeveloperToken;
  const clientId = envSettings.googleAdsClientId ?? secrets.googleAdsClientId;
  const clientSecret = envSettings.googleAdsClientSecret ?? secrets.googleAdsClientSecret;
  const refreshToken = envSettings.googleAdsRefreshToken ?? secrets.googleAdsRefreshToken;
  const customerId = envSettings.googleAdsCustomerId ?? secrets.googleAdsCustomerId;
  const loginCustomerId = envSettings.googleAdsLoginCustomerId ?? secrets.googleAdsLoginCustomerId;

  if (!devToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    throw new ReportedError(
      'Google Ads credentials are not configured. Set googleAdsDeveloperToken, googleAdsClientId, googleAdsClientSecret, googleAdsRefreshToken, and googleAdsCustomerId via ideon_config_set or environment variables.',
    );
  }

  const client = new GkpClient({
    developerToken: devToken,
    clientId,
    clientSecret,
    refreshToken,
    customerId,
    loginCustomerId: loginCustomerId || undefined,
  });

  cachedGkpClient = new CachedGkpClient({ client });
  return cachedGkpClient;
}

export function registerIdeonTools(server: McpServer): void {
  server.registerTool(
    'ideon_write',
    {
      title: 'Ideon Write',
      description: 'Generate content from an idea using the Ideon pipeline.',
      inputSchema: writeToolInputSchema,
    },
    async (input: WriteToolInput) => {
      try {
        const parsedTargets = parsePrimaryAndSecondarySpecs({
          primarySpec: input.primary,
          secondarySpecs: input.secondary,
        });
        const resolved = await resolveRunInput({
          idea: input.idea,
          audience: input.audience,
          jobPath: input.jobPath,
          style: input.style,
          intent: input.intent,
          targetLength: input.length,
          contentTargets: parsedTargets,
        });
        const run = await runPipelineShell(resolved, {
          workingDir: cwd(),
          runMode: 'fresh',
          dryRun: input.dryRun ?? false,
          enrichLinks: input.enrichLinks ?? false,
          customLinks: input.link,
          unlinks: input.unlink,
          maxLinks: input.maxLinks,
          maxImages: input.maxImages,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Generated ${run.artifact.outputCount} output(s). Primary markdown: ${run.artifact.markdownPath}`,
            },
          ],
          structuredContent: {
            slug: run.artifact.slug,
            title: run.artifact.title,
            outputCount: run.artifact.outputCount,
            markdownPath: run.artifact.markdownPath,
            markdownPaths: run.artifact.markdownPaths,
            generationDir: run.artifact.generationDir,
            analyticsPath: run.artifact.analyticsPath,
          },
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_write_resume',
    {
      title: 'Ideon Write Resume',
      description: 'Resume the last failed or interrupted Ideon write session.',
      inputSchema: writeResumeToolInputSchema,
    },
    async (input: WriteResumeToolInput) => {
      try {
        const session = await loadWriteSession(cwd());
        if (!session) {
          throw new ReportedError('No resumable write session found.');
        }

        if (session.status === 'completed') {
          throw new ReportedError('The last write session already completed.');
        }

        const resolved = await resolveRunInput({
          idea: session.idea,
          audience: session.targetAudienceHint ?? undefined,
        });
        const resumeInput = {
          ...resolved,
          job: session.job,
          config: {
            settings: session.settings,
            secrets: resolved.config.secrets,
          },
        };
        const run = await runPipelineShell(resumeInput, {
          workingDir: cwd(),
          runMode: 'resume',
          dryRun: input.dryRun ?? false,
          enrichLinks: input.enrichLinks ?? false,
          customLinks: input.link,
          unlinks: input.unlink,
          maxLinks: input.maxLinks,
          maxImages: input.maxImages,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Resumed write session and generated ${run.artifact.outputCount} output(s).`,
            },
          ],
          structuredContent: {
            slug: run.artifact.slug,
            title: run.artifact.title,
            outputCount: run.artifact.outputCount,
            markdownPath: run.artifact.markdownPath,
            markdownPaths: run.artifact.markdownPaths,
            generationDir: run.artifact.generationDir,
          },
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_delete',
    {
      title: 'Ideon Delete',
      description: 'Delete generated output and assets by slug.',
      inputSchema: deleteToolInputSchema,
    },
    async (input: DeleteToolInput) => {
      try {
        const messages: string[] = [];
        await runDeleteCommand(
          { slug: input.slug, force: true },
          {
            cwd: cwd(),
            log: (message) => {
              messages.push(message);
            },
          },
        );

        return {
          content: [
            {
              type: 'text',
              text: messages.length > 0 ? messages.join('\n') : `Deleted ${input.slug}.`,
            },
          ],
          structuredContent: {
            slug: input.slug,
            deleted: true,
          },
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_links',
    {
      title: 'Ideon Links',
      description: 'Run link enrichment for a previously generated article by slug.',
      inputSchema: linksToolInputSchema,
    },
    async (input: LinksToolInput) => {
      try {
        const messages: string[] = [];
        await runLinksCommand(
          {
            slug: input.slug,
            mode: input.mode ?? 'fresh',
            links: input.link,
            unlinks: input.unlink,
            maxLinks: input.maxLinks,
          },
          {
            cwd: cwd(),
            log: (message) => {
              messages.push(message);
            },
          },
        );

        return {
          content: [
            {
              type: 'text',
              text: messages.length > 0 ? messages.join('\n') : `Enriched links for ${input.slug}.`,
            },
          ],
          structuredContent: {
            slug: input.slug,
            mode: input.mode ?? 'fresh',
          },
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_export',
    {
      title: 'Ideon Export',
      description: 'Export a generated article as a standalone markdown file with inline links and copied images.',
      inputSchema: exportToolInputZodSchema,
    },
    async (input) => {
      try {
        const messages: string[] = [];
        await runOutputCommand(
          {
            generationId: input.generationId,
            destinationPath: input.destinationPath,
            index: input.index,
            overwrite: input.overwrite,
          },
          {
            cwd: cwd(),
            log: (message) => {
              messages.push(message);
            },
          },
        );

        return {
          content: [
            {
              type: 'text',
              text: messages.length > 0 ? messages.join('\n') : `Exported ${input.generationId}.`,
            },
          ],
          structuredContent: {
            generationId: input.generationId,
            destinationPath: input.destinationPath,
            index: input.index ?? 1,
            overwrite: input.overwrite ?? false,
            messages,
          },
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_config_get',
    {
      title: 'Ideon Config Get',
      description: 'Read a configuration value or secret availability flag.',
      inputSchema: configGetToolInputSchema,
    },
    async (input: ConfigGetToolInput) => {
      try {
        if (!isConfigKey(input.key)) {
          throw new ReportedError(`Unsupported config key: ${input.key}`);
        }

        const result = await configGet(input.key);
        return {
          content: [
            {
              type: 'text',
              text: `${result.key}=${String(result.value)}`,
            },
          ],
          structuredContent: {
            key: result.key,
            value: result.value,
            isSecret: result.isSecret,
          },
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_config_set',
    {
      title: 'Ideon Config Set',
      description: 'Set a configuration value or secret token.',
      inputSchema: configSetToolInputSchema,
    },
    async (input: ConfigSetToolInput) => {
      try {
        if (!isConfigKey(input.key)) {
          throw new ReportedError(`Unsupported config key: ${input.key}`);
        }

        await configSet(input.key, input.value);
        return {
          content: [
            {
              type: 'text',
              text: `Set ${input.key}.`,
            },
          ],
          structuredContent: {
            key: input.key,
            updated: true,
          },
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_config_list',
    {
      title: 'Ideon Config List',
      description: 'List current settings and secret availability flags.',
      inputSchema: configListToolInputSchema,
    },
    async (_input: ConfigListToolInput) => {
      try {
        const result = await configList();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_config_unset',
    {
      title: 'Ideon Config Unset',
      description: 'Reset a setting to its default or delete a stored secret.',
      inputSchema: configUnsetToolInputSchema,
    },
    async (input: ConfigUnsetToolInput) => {
      try {
        if (!isConfigKey(input.key)) {
          throw new ReportedError(`Unsupported config key: ${input.key}`);
        }

        await configUnset(input.key);
        return {
          content: [
            {
              type: 'text',
              text: `Unset ${input.key}.`,
            },
          ],
          structuredContent: {
            key: input.key,
            updated: true,
          },
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'gkp_generate_ideas',
    {
      title: 'Google Keyword Planner - Generate Ideas',
      description: 'Generate keyword ideas from seed keywords, a URL, or a site using Google Ads Keyword Planner.',
      inputSchema: gkpGenerateIdeasToolInputZodSchema,
    },
    async (input: GkpGenerateIdeasToolInput) => {
      try {
        const client = await getOrCreateCachedGkpClient();
        const result = await client.generateKeywordIdeas({
          seedKeywords: input.seedKeywords,
          url: input.url,
          site: input.site,
          countryCodes: input.countryCodes,
          language: input.language,
          pageSize: input.pageSize,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'gkp_get_historical_data',
    {
      title: 'Google Keyword Planner - Historical Data',
      description: 'Get historical search volume and competition metrics for a list of keywords.',
      inputSchema: gkpGetHistoricalDataToolInputZodSchema,
    },
    async (input: GkpGetHistoricalDataToolInput) => {
      try {
        const client = await getOrCreateCachedGkpClient();
        const result = await client.getHistoricalMetrics({
          keywords: input.keywords,
          countryCodes: input.countryCodes,
          language: input.language,
          includeAverageCpc: input.includeAverageCpc,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'gkp_get_forecast_data',
    {
      title: 'Google Keyword Planner - Forecast Data',
      description: 'Get projected impressions, clicks, and cost for a set of keywords.',
      inputSchema: gkpGetForecastDataToolInputZodSchema,
    },
    async (input: GkpGetForecastDataToolInput) => {
      try {
        const client = await getOrCreateCachedGkpClient();
        const result = await client.getForecastData({
          keywords: input.keywords,
          keywordMatchType: input.keywordMatchType,
          maxCpcBidMicros: input.maxCpcBidMicros,
          countryCodes: input.countryCodes,
          language: input.language,
          startDate: input.startDate,
          endDate: input.endDate,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ─── Publication tools ──────────────────────────────────────────────────

  server.registerTool(
    'ideon_publication_add',
    {
      title: 'Ideon Publication Add',
      description: 'Create a new publication with editorial policy and defaults.',
      inputSchema: publicationAddToolInputZodSchema,
    },
    async (input: PublicationAddToolInput) => {
      try {
        const slug = deriveSlugFromName(input.name);
        if (await publicationExists(slug)) {
          throw new ReportedError(`Publication "${slug}" already exists. Choose a different name.`);
        }

        const defaults: PublicationDefaults = {};
        if (input.style) defaults.style = input.style;
        if (input.intent) defaults.intent = input.intent;
        if (input.length) {
          const resolved = parseTargetLength(input.length);
          if (resolved !== undefined) defaults.targetLength = resolved;
        }
        if (input.type) defaults.contentTargets = [{ contentType: input.type, role: 'primary', count: 1 }];
        if (input.audience) defaults.targetAudienceHint = input.audience;
        if (input.country) defaults.countryCodes = normalizeCountryCodes(input.country.split(',').map((c) => c.trim())) ?? undefined;
        if (input.language) defaults.language = normalizeLanguage(input.language) ?? undefined;

        const editorialPolicy: EditorialPolicy = {
          tone: input.tone ?? '',
          forbiddenTopics: input.forbiddenTopics ?? [],
          disclosureRequirements: input.disclosureRequirements ?? [],
          audienceRestrictions: input.audienceRestrictions ?? [],
          notes: input.editorialPolicy ?? '',
        };

        const publication: Publication = { name: input.name, slug, editorialPolicy, defaults };
        await savePublication(publication);
        return { content: [{ type: 'text', text: JSON.stringify(publication, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_publication_list',
    {
      title: 'Ideon Publication List',
      description: 'List all publications.',
      inputSchema: publicationListToolInputZodSchema,
    },
    async () => {
      try {
        const publications = await listPublications();
        return { content: [{ type: 'text', text: JSON.stringify(publications, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_publication_edit',
    {
      title: 'Ideon Publication Edit',
      description: 'Update fields on an existing publication (patch semantics).',
      inputSchema: publicationEditToolInputZodSchema,
    },
    async (input: PublicationEditToolInput) => {
      try {
        const publication = await loadPublication(input.slug);

        if (input.name) publication.name = input.name;
        if (input.style) publication.defaults.style = input.style;
        if (input.intent) publication.defaults.intent = input.intent;
        if (input.length) {
          const resolved = parseTargetLength(input.length);
          if (resolved !== undefined) publication.defaults.targetLength = resolved;
        }
        if (input.type) publication.defaults.contentTargets = [{ contentType: input.type, role: 'primary', count: 1 }];
        if (input.audience) publication.defaults.targetAudienceHint = input.audience;
        if (input.country !== undefined) publication.defaults.countryCodes = normalizeCountryCodes(input.country.split(',').map((c) => c.trim())) ?? undefined;
        if (input.language !== undefined) publication.defaults.language = normalizeLanguage(input.language) ?? undefined;
        if (input.tone) publication.editorialPolicy.tone = input.tone;
        if (input.forbiddenTopics) publication.editorialPolicy.forbiddenTopics = input.forbiddenTopics;
        if (input.disclosureRequirements) publication.editorialPolicy.disclosureRequirements = input.disclosureRequirements;
        if (input.audienceRestrictions) publication.editorialPolicy.audienceRestrictions = input.audienceRestrictions;
        if (input.editorialPolicy) publication.editorialPolicy.notes = input.editorialPolicy;

        await savePublication(publication);
        return { content: [{ type: 'text', text: JSON.stringify(publication, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_publication_remove',
    {
      title: 'Ideon Publication Remove',
      description: 'Delete a publication by slug.',
      inputSchema: publicationRemoveToolInputZodSchema,
    },
    async (input: PublicationRemoveToolInput) => {
      try {
        await deletePublication(input.slug);
        return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, slug: input.slug }) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ─── Series tools ───────────────────────────────────────────────────────

  server.registerTool(
    'ideon_series_add',
    {
      title: 'Ideon Series Add',
      description: 'Create a new content series with editorial policy and defaults.',
      inputSchema: seriesAddToolInputZodSchema,
    },
    async (input: SeriesAddToolInput) => {
      try {
        const slug = deriveSeriesSlugFromName(input.name);
        if (await seriesExists(slug)) {
          throw new ReportedError(`Series "${slug}" already exists. Choose a different name.`);
        }

        const defaults: SeriesDefaults = {};
        if (input.style) defaults.style = input.style;
        if (input.intent) defaults.intent = input.intent;
        if (input.length) {
          const resolved = parseTargetLength(input.length);
          if (resolved !== undefined) defaults.targetLength = resolved;
        }
        if (input.type) defaults.contentTargets = [{ contentType: input.type, role: 'primary', count: 1 }];
        if (input.audience) defaults.targetAudienceHint = input.audience;
        if (input.country) defaults.countryCodes = normalizeCountryCodes(input.country.split(',').map((c) => c.trim())) ?? undefined;
        if (input.language) defaults.language = normalizeLanguage(input.language) ?? undefined;
        if (input.keywords) defaults.keywords = input.keywords;

        const editorialPolicy: SeriesEditorialPolicy = {
          tone: input.tone ?? '',
          forbiddenTopics: input.forbiddenTopics ?? [],
          disclosureRequirements: input.disclosureRequirements ?? [],
          audienceRestrictions: input.audienceRestrictions ?? [],
          notes: input.editorialPolicy ?? '',
        };

        const series: Series = {
          name: input.name,
          slug,
          topic: input.topic ?? '',
          publication: input.publication,
          editorialPolicy,
          defaults,
        };
        await saveSeries(series);
        return { content: [{ type: 'text', text: JSON.stringify(series, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_series_list',
    {
      title: 'Ideon Series List',
      description: 'List all content series, optionally filtered by publication.',
      inputSchema: seriesListToolInputZodSchema,
    },
    async (input: SeriesListToolInput) => {
      try {
        const seriesList = await listSeries(
          input.publication ? { publicationSlug: input.publication } : undefined,
        );
        return { content: [{ type: 'text', text: JSON.stringify(seriesList, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_series_edit',
    {
      title: 'Ideon Series Edit',
      description: 'Update fields on an existing series (patch semantics).',
      inputSchema: seriesEditToolInputZodSchema,
    },
    async (input: SeriesEditToolInput) => {
      try {
        const series = await loadSeries(input.slug);

        if (input.name) series.name = input.name;
        if (input.topic) series.topic = input.topic;
        if (input.unsetPublication) series.publication = undefined;
        else if (input.publication) series.publication = input.publication;
        if (input.style) series.defaults.style = input.style;
        if (input.intent) series.defaults.intent = input.intent;
        if (input.length) {
          const resolved = parseTargetLength(input.length);
          if (resolved !== undefined) series.defaults.targetLength = resolved;
        }
        if (input.type) series.defaults.contentTargets = [{ contentType: input.type, role: 'primary', count: 1 }];
        if (input.audience) series.defaults.targetAudienceHint = input.audience;
        if (input.country !== undefined) series.defaults.countryCodes = normalizeCountryCodes(input.country.split(',').map((c) => c.trim())) ?? undefined;
        if (input.language !== undefined) series.defaults.language = normalizeLanguage(input.language) ?? undefined;
        if (input.keywords) series.defaults.keywords = input.keywords;
        if (input.tone) series.editorialPolicy.tone = input.tone;
        if (input.forbiddenTopics) series.editorialPolicy.forbiddenTopics = input.forbiddenTopics;
        if (input.disclosureRequirements) series.editorialPolicy.disclosureRequirements = input.disclosureRequirements;
        if (input.audienceRestrictions) series.editorialPolicy.audienceRestrictions = input.audienceRestrictions;
        if (input.editorialPolicy) series.editorialPolicy.notes = input.editorialPolicy;

        await saveSeries(series);
        return { content: [{ type: 'text', text: JSON.stringify(series, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_series_remove',
    {
      title: 'Ideon Series Remove',
      description: 'Delete a series by slug.',
      inputSchema: seriesRemoveToolInputZodSchema,
    },
    async (input: SeriesRemoveToolInput) => {
      try {
        await deleteSeries(input.slug);
        return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, slug: input.slug }) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ─── Queue tools ────────────────────────────────────────────────────────

  server.registerTool(
    'ideon_queue_add',
    {
      title: 'Ideon Queue Add',
      description: 'Add an article idea to the content queue.',
      inputSchema: queueAddToolInputZodSchema,
    },
    async (input: QueueAddToolInput) => {
      try {
        const resolved = await resolveRunInput({
          idea: input.idea,
          audience: input.audience,
          publication: input.publication,
          series: input.series,
          style: input.style,
          intent: input.intent,
          targetLength: input.length,
          contentTargets: input.type ? [{ contentType: input.type, role: 'primary', count: 1 }] : undefined,
          countryCodes: input.country ? input.country.split(',').map((c) => c.trim()) : undefined,
          language: input.language,
        });

        const entry: QueueEntry = {
          id: generateQueueId(),
          status: 'pending',
          idea: input.idea,
          targetAudienceHint: resolved.targetAudienceHint,
          settings: resolved.config.settings,
          job: resolved.job,
          publication: resolved.publication,
          series: resolved.series,
          exportPath: input.exportPath,
          addedAt: new Date().toISOString(),
          type: 'new',
        };

        await saveQueueEntry(entry);
        return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_queue_list',
    {
      title: 'Ideon Queue List',
      description: 'List queued articles, optionally filtered by status and publication.',
      inputSchema: queueListToolInputZodSchema,
    },
    async (input: QueueListToolInput) => {
      try {
        const entries = await listQueueEntries({
          status: input.status,
          publicationSlug: input.publication,
        });
        return { content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_queue_peek',
    {
      title: 'Ideon Queue Peek',
      description: 'Show the next pending queue entry without claiming it.',
      inputSchema: queuePeekToolInputZodSchema,
    },
    async (input: QueuePeekToolInput) => {
      try {
        const entry = await getNextPendingEntry({
          publicationSlug: input.publication,
        });
        return { content: [{ type: 'text', text: JSON.stringify(entry ?? null, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_queue_remove',
    {
      title: 'Ideon Queue Remove',
      description: 'Delete a queue entry by ID.',
      inputSchema: queueRemoveToolInputZodSchema,
    },
    async (input: QueueRemoveToolInput) => {
      try {
        await deleteQueueEntry(input.id);
        return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, id: input.id }) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_queue_clear',
    {
      title: 'Ideon Queue Clear',
      description: 'Delete all queue entries.',
      inputSchema: queueClearToolInputZodSchema,
    },
    async () => {
      try {
        const count = await clearQueue();
        return { content: [{ type: 'text', text: JSON.stringify({ cleared: count }) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_queue_write',
    {
      title: 'Ideon Queue Write',
      description: 'Claim the next pending queue entry and write it. Deletes the entry on success, reverts to pending on failure.',
      inputSchema: queueWriteToolInputZodSchema,
    },
    async (input: QueueWriteToolInput) => {
      try {
        const entry = await claimNextPendingEntry({ publicationSlug: input.publication });
        if (!entry) {
          const filter = input.publication ? ` for publication "${input.publication}"` : '';
          throw new ReportedError(`No pending articles in the queue${filter}.`);
        }

        const envSettings = readEnvSettings();
        const secrets = await loadSecrets({ disableKeytar: envSettings.disableKeytar });

        const queueInput: Awaited<ReturnType<typeof resolveRunInput>> = {
          config: {
            settings: entry.settings,
            secrets: {
              openRouterApiKey: envSettings.openRouterApiKey ?? secrets.openRouterApiKey,
              replicateApiToken: envSettings.replicateApiToken ?? secrets.replicateApiToken,
              googleAdsDeveloperToken: envSettings.googleAdsDeveloperToken ?? secrets.googleAdsDeveloperToken,
              googleAdsClientId: envSettings.googleAdsClientId ?? secrets.googleAdsClientId,
              googleAdsClientSecret: envSettings.googleAdsClientSecret ?? secrets.googleAdsClientSecret,
              googleAdsRefreshToken: envSettings.googleAdsRefreshToken ?? secrets.googleAdsRefreshToken,
              googleAdsCustomerId: envSettings.googleAdsCustomerId ?? secrets.googleAdsCustomerId,
              googleAdsLoginCustomerId: envSettings.googleAdsLoginCustomerId ?? secrets.googleAdsLoginCustomerId,
            },
          },
          idea: entry.idea,
          targetAudienceHint: entry.targetAudienceHint,
          job: entry.job,
          publication: entry.publication,
          series: entry.series,
        };

        try {
          const run = await runPipelineShell(queueInput, {
            workingDir: cwd(),
            runMode: 'fresh',
            dryRun: input.dryRun ?? false,
            enrichLinks: input.enrichLinks ?? false,
            customLinks: input.link,
            unlinks: input.unlink,
            maxLinks: input.maxLinks,
            maxImages: input.maxImages,
          });
          await deleteClaimedEntry(entry.id);

          return {
            content: [{
              type: 'text',
              text: `Generated ${run.artifact.outputCount} output(s) from queue entry "${entry.id}". Primary markdown: ${run.artifact.markdownPath}`,
            }],
          };
        } catch (writeError) {
          await revertClaimedEntry(entry);
          throw writeError;
        }
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ─── Plan tools ─────────────────────────────────────────────────────────

  server.registerTool(
    'ideon_plan_explore',
    {
      title: 'Ideon Plan Explore',
      description: 'Research a content idea using keyword planner and generate series/article plans.',
      inputSchema: planExploreToolInputZodSchema,
    },
    async (input: PlanExploreToolInput) => {
      try {
        const [savedSettings, secrets] = await Promise.all([
          loadSavedSettings(),
          loadSecrets(),
        ]);

        if (!secrets.openRouterApiKey) {
          throw new ReportedError('OpenRouter API key not configured. Set it via ideon_config_set.');
        }
        if (!secrets.googleAdsDeveloperToken) {
          throw new ReportedError('Google Ads developer token not configured. Set it via ideon_config_set.');
        }

        const publication = await loadPublication(input.publication);
        const pubDefaults = publication.defaults ?? {};
        const countryCodes = normalizeCountryCodes(
          input.country ? input.country.split(',').map((c) => c.trim()) : undefined,
        ) ?? normalizeCountryCodes(pubDefaults.countryCodes) ?? ['US'];
        const language = normalizeLanguage(input.language)
          ?? normalizeLanguage(pubDefaults.language) ?? 'en';
        const planModel = input.model ?? savedSettings.planModel ?? 'deepseek/deepseek-v4-pro';
        const intentModel = input.intentModel ?? savedSettings.planIntentModel ?? 'deepseek/deepseek-v4-flash';

        const llmClient = new OpenRouterClient(secrets.openRouterApiKey);
        const gkpClient = new GkpClient({
          developerToken: secrets.googleAdsDeveloperToken,
          clientId: secrets.googleAdsClientId || '',
          clientSecret: secrets.googleAdsClientSecret || '',
          refreshToken: secrets.googleAdsRefreshToken || '',
          customerId: secrets.googleAdsCustomerId || '',
          loginCustomerId: secrets.googleAdsLoginCustomerId ?? undefined,
        });

        const planInput: ExplorePlanInput = {
          mode: 'new-idea',
          contentIdea: input.idea,
          publicationSlug: input.publication,
          businessContext: input.context,
          countryCodes,
          language,
          desiredSeriesCount: input.seriesCount,
          desiredArticlesPerSeries: input.articlesPerSeries,
          seedKeywords: input.seedKeywords ?? [],
          excludeSeries: input.excludeSeries ?? [],
          contentType: input.contentType ?? 'article',
          autoSave: input.autoSave ?? false,
          nonInteractive: true,
          dryRun: input.dryRun ?? false,
          planModel,
          intentModel,
        };

        const timeoutMs = (input.timeout ?? 600) * 1000;
        const plan = await Promise.race([
          runPlan({
            input: planInput,
            llmClient,
            gkpClient,
            appSettings: { ...savedSettings, model: planModel },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Plan explore timed out after ${input.timeout ?? 600}s`)), timeoutMs),
          ),
        ]);

        return { content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.registerTool(
    'ideon_plan_expand',
    {
      title: 'Ideon Plan Expand',
      description: 'Expand an existing series with new article ideas using keyword research.',
      inputSchema: planExpandToolInputZodSchema,
    },
    async (input: PlanExpandToolInput) => {
      try {
        const [savedSettings, secrets] = await Promise.all([
          loadSavedSettings(),
          loadSecrets(),
        ]);

        if (!secrets.openRouterApiKey) {
          throw new ReportedError('OpenRouter API key not configured. Set it via ideon_config_set.');
        }
        if (!secrets.googleAdsDeveloperToken) {
          throw new ReportedError('Google Ads developer token not configured. Set it via ideon_config_set.');
        }

        const series = await loadSeries(input.seriesSlug);
        const publicationSlug = input.publication ?? series.publication;
        const publication = publicationSlug ? await loadPublication(publicationSlug) : null;
        const pubDefaults = publication?.defaults ?? {};
        const countryCodes = normalizeCountryCodes(
          input.country ? input.country.split(',').map((c) => c.trim()) : undefined,
        ) ?? normalizeCountryCodes(pubDefaults.countryCodes) ?? ['US'];
        const language = normalizeLanguage(input.language)
          ?? normalizeLanguage(pubDefaults.language) ?? 'en';
        const planModel = input.model ?? savedSettings.planModel ?? 'deepseek/deepseek-v4-pro';
        const intentModel = input.intentModel ?? savedSettings.planIntentModel ?? 'deepseek/deepseek-v4-flash';

        const llmClient = new OpenRouterClient(secrets.openRouterApiKey);
        const gkpClient = new GkpClient({
          developerToken: secrets.googleAdsDeveloperToken,
          clientId: secrets.googleAdsClientId || '',
          clientSecret: secrets.googleAdsClientSecret || '',
          refreshToken: secrets.googleAdsRefreshToken || '',
          customerId: secrets.googleAdsCustomerId || '',
          loginCustomerId: secrets.googleAdsLoginCustomerId ?? undefined,
        });

        const planInput: ExpandPlanInput = {
          mode: 'expand-series',
          seriesSlug: input.seriesSlug,
          publicationSlug: publicationSlug ?? '',
          countryCodes,
          language,
          desiredArticleCount: input.articleCount,
          seedKeywords: input.seedKeywords ?? [],
          contentType: input.contentType ?? 'article',
          autoSave: input.autoSave ?? false,
          nonInteractive: true,
          dryRun: input.dryRun ?? false,
          planModel,
          intentModel,
        };

        const timeoutMs = (input.timeout ?? 600) * 1000;
        const plan = await Promise.race([
          runPlan({
            input: planInput,
            llmClient,
            gkpClient,
            appSettings: { ...savedSettings, model: planModel },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Plan expand timed out after ${input.timeout ?? 600}s`)), timeoutMs),
          ),
        ]);

        return { content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  // ─── Article tools ──────────────────────────────────────────────────────

  server.registerTool(
    'ideon_article_list',
    {
      title: 'Ideon Article List',
      description: 'List generated articles in the current workspace.',
      inputSchema: articleListToolInputZodSchema,
    },
    async () => {
      try {
        const messages: string[] = [];
        await runArticleListCommand(
          { json: true, verbose: false },
          {
            cwd: cwd(),
            log: (message: string) => { messages.push(message); },
          },
        );
        const output = messages.join('\n');
        return { content: [{ type: 'text', text: output || '[]' }] };
      } catch (error) {
        return formatToolError(error);
      }
    },
  );
}

export async function startIdeonMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'ideon',
    version: packageJson.version,
  });

  registerIdeonTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function formatToolError(error: unknown): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

function parseTargetLength(value: string | number): number | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }
  const normalized = value.trim().toLowerCase();
  const aliasMap: Record<string, number> = { small: 500, medium: 900, large: 1400 };
  if (normalized in aliasMap) {
    return aliasMap[normalized];
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
