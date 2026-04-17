import { cwd } from 'node:process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import packageJson from '../../../package.json' with { type: 'json' };
import { resolveRunInput } from '../../config/resolver.js';
import { runPipelineShell } from '../../pipeline/runner.js';
import { runDeleteCommand } from '../../cli/commands/delete.js';
import { configGet, configSet, isConfigKey } from '../../config/manage.js';
import { parsePrimaryAndSecondarySpecs } from '../../cli/commands/writeTargetSpecs.js';
import { ReportedError } from '../../cli/reportedError.js';
import { loadWriteSession } from '../../pipeline/sessionStore.js';
import {
  type ConfigGetToolInput,
  type ConfigSetToolInput,
  type DeleteToolInput,
  type WriteResumeToolInput,
  type WriteToolInput,
  configGetToolInputSchema,
  configSetToolInputSchema,
  deleteToolInputSchema,
  writeResumeToolInputSchema,
  writeToolInputSchema,
} from './tools.js';

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
          targetLength: input.length,
          contentTargets: parsedTargets,
        });
        const run = await runPipelineShell(resolved, {
          workingDir: cwd(),
          runMode: 'fresh',
          dryRun: input.dryRun ?? false,
          enrichLinks: input.enrichLinks ?? true,
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
          throw new ReportedError('No resumable write session found in .ideon/write/state.json.');
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
          enrichLinks: input.enrichLinks ?? true,
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
