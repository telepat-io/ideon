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
} from './tools.js';
import { GkpClient } from '../keywordplanner/client.js';
import { loadSecrets } from '../../config/secretStore.js';
import { readEnvSettings } from '../../config/env.js';

let gkpClient: GkpClient | null = null;

async function getOrCreateGkpClient(): Promise<GkpClient> {
  if (gkpClient) return gkpClient;

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

  gkpClient = new GkpClient({
    developerToken: devToken,
    clientId,
    clientSecret,
    refreshToken,
    customerId,
    loginCustomerId: loginCustomerId || undefined,
  });

  return gkpClient;
}

export async function startIdeonMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'ideon',
    version: packageJson.version,
  });

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
        const client = await getOrCreateGkpClient();
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
        const client = await getOrCreateGkpClient();
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
        const client = await getOrCreateGkpClient();
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
