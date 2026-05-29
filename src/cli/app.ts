import { Command } from 'commander';
import { runDeleteCommand } from './commands/delete.js';
import {
  runAgentInstallCommand,
  runAgentStatusCommand,
  runAgentUninstallCommand,
} from './commands/agent.js';
import {
  runConfigGetCommand,
  runConfigListCommand,
  runConfigSetCommand,
  runConfigUnsetCommand,
} from './commands/config.js';
import { runMcpServeCommand } from './commands/mcp.js';
import {
  runGadsLoginCommand,
  runGadsLogoutCommand,
  runGadsStatusCommand,
  runGadsTestCommand,
} from './commands/gads.js';
import {
  runGkpIdeasCommand,
  runGkpHistoricalCommand,
  runGkpForecastCommand,
} from './commands/gkp.js';
import { runLinksCommand } from './commands/links.js';
import { runOutputCommand } from './commands/export.js';
import { openSettings } from './commands/settings.js';
import { runServeCommand } from './commands/serve.js';
import { runWriteCommand, runWriteResumeCommand } from './commands/write.js';
import packageJson from '../../package.json' with { type: 'json' };

const { version } = packageJson;

function collectOptionValue(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name('ideon')
    .description('Turn one idea into articles, threads, and social posts — quality content without the token tax.')
    .version(version);

  program
    .command('settings')
    .description('Show the current Ideon settings and storage state.')
    .action(async () => {
      await openSettings();
    });

  const configCommand = program
    .command('config')
    .description('Manage Ideon settings non-interactively for automation and scripting.');

  configCommand
    .command('list')
    .description('List current settings and secret availability.')
    .option('--json', 'Print machine-readable JSON output', false)
    .action(async (options: { json: boolean }) => {
      await runConfigListCommand({ json: options.json });
    });

  configCommand
    .command('get')
    .description('Read a single setting or secret presence by key path.')
    .argument('<key>', 'Setting key path (for example: modelSettings.temperature)')
    .option('--json', 'Print machine-readable JSON output', false)
    .action(async (key: string, options: { json: boolean }) => {
      await runConfigGetCommand({ key, json: options.json });
    });

  configCommand
    .command('set')
    .description('Set a setting value or secret token non-interactively.')
    .argument('<key>', 'Setting key path (for example: style)')
    .argument('<value>', 'Value to assign')
    .action(async (key: string, value: string) => {
      await runConfigSetCommand({ key, value });
    });

  configCommand
    .command('unset')
    .description('Unset a setting override or delete a stored secret.')
    .argument('<key>', 'Setting key path (for example: model or openRouterApiKey)')
    .action(async (key: string) => {
      await runConfigUnsetCommand({ key });
    });

  program
    .command('mcp')
    .description('Model Context Protocol server operations.')
    .command('serve')
    .description('Start the Ideon MCP server over stdio transport.')
    .action(async () => {
      await runMcpServeCommand();
    });

  const gadsCommand = program
    .command('gads')
    .description('Manage Google Ads integration credentials and verification.');

  gadsCommand
    .command('login')
    .description('Start OAuth flow to obtain Google Ads tokens.')
    .option('--force', 'Re-authorize even if a refresh token already exists', false)
    .option('--developer-token <token>', 'Google Ads developer token')
    .option('--client-id <id>', 'OAuth2 client ID')
    .option('--client-secret <secret>', 'OAuth2 client secret')
    .option('--customer-id <id>', 'Google Ads customer ID (10 digits)')
    .option('--login-customer-id <id>', 'Manager account customer ID (MCC only)')
    .action(async (options: {
      force: boolean;
      developerToken?: string;
      clientId?: string;
      clientSecret?: string;
      customerId?: string;
      loginCustomerId?: string;
    }) => {
      await runGadsLoginCommand({
        force: options.force,
        developerToken: options.developerToken,
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        customerId: options.customerId,
        loginCustomerId: options.loginCustomerId,
      });
    });

  gadsCommand
    .command('logout')
    .description('Clear stored Google Ads credentials.')
    .option('--all', 'Clear all Google Ads credentials instead of just the refresh token', false)
    .action(async (options: { all: boolean }) => {
      await runGadsLogoutCommand({ all: options.all });
    });

  gadsCommand
    .command('status')
    .description('Show which Google Ads credentials are configured.')
    .option('--json', 'Print machine-readable JSON output', false)
    .action(async (options: { json: boolean }) => {
      await runGadsStatusCommand({ json: options.json });
    });

  gadsCommand
    .command('test')
    .description('Verify Google Ads credentials by making a test API call.')
    .action(async () => {
      await runGadsTestCommand({});
    });

  const gkpCommand = program
    .command('gkp')
    .description('Query Google Ads Keyword Planner data.');

  gkpCommand
    .command('ideas')
    .description('Generate keyword ideas from seed keywords, a URL, or a site.')
    .option('--keywords <keywords>', 'Comma-separated seed keywords')
    .option('--url <url>', 'Seed URL for keyword ideas')
    .option('--site <site>', 'Seed site domain (exclusive with keywords/url)')
    .option('--country <codes>', 'Comma-separated ISO country codes (omit for all countries)')
    .option('--language <code>', 'ISO 639-1 language code (default: en)')
    .option('--page-size <n>', 'Number of results per page', (v) => Number.parseInt(v, 10))
    .option('--json', 'Print machine-readable JSON output', false)
    .action(async (options: { keywords?: string; url?: string; site?: string; country?: string; language?: string; pageSize?: number; json: boolean }) => {
      await runGkpIdeasCommand(options);
    });

  gkpCommand
    .command('historical')
    .description('Get historical search volume and competition metrics for keywords.')
    .requiredOption('--keywords <keywords>', 'Comma-separated keywords to look up')
    .option('--country <codes>', 'Comma-separated ISO country codes (omit for all countries)')
    .option('--language <code>', 'ISO 639-1 language code (default: en)')
    .option('--no-include-cpc', 'Exclude average CPC from results')
    .option('--json', 'Print machine-readable JSON output', false)
    .action(async (options: { keywords: string; country?: string; language?: string; includeCpc: boolean; json: boolean }) => {
      await runGkpHistoricalCommand({ ...options, includeCpc: options.includeCpc });
    });

  gkpCommand
    .command('forecast')
    .description('Get projected impressions, clicks, and cost for keywords.')
    .requiredOption('--keywords <keywords>', 'Comma-separated keywords to forecast')
    .option('--match-type <type>', 'Keyword match type: BROAD, EXACT, or PHRASE', 'BROAD')
    .option('--max-cpc-bid <micros>', 'Max CPC bid in micros', (v) => Number.parseInt(v, 10))
    .option('--country <codes>', 'Comma-separated ISO country codes (default: US)')
    .option('--language <code>', 'ISO 639-1 language code (default: en)')
    .option('--start-date <date>', 'Forecast start date (YYYY-MM-DD)')
    .option('--end-date <date>', 'Forecast end date (YYYY-MM-DD)')
    .option('--json', 'Print machine-readable JSON output', false)
    .action(async (options: { keywords: string; matchType?: string; maxCpcBid?: number; country?: string; language?: string; startDate?: string; endDate?: string; json: boolean }) => {
      await runGkpForecastCommand(options);
    });

  const agentCommand = program
    .command('agent')
    .description('Manage local agent integration runtime registrations.');

  agentCommand
    .command('install')
    .description('Install a runtime integration profile (CLI/MCP only).')
    .argument('<runtime>', 'Runtime id (claude, chatgpt, gemini, generic-mcp)')
    .option('--dry-run', 'Preview actions without writing state', false)
    .action(async (runtime: string, options: { dryRun: boolean }) => {
      await runAgentInstallCommand({ runtime, dryRun: options.dryRun });
    });

  agentCommand
    .command('uninstall')
    .description('Remove a runtime integration profile.')
    .argument('<runtime>', 'Runtime id (claude, chatgpt, gemini, generic-mcp)')
    .option('--dry-run', 'Preview actions without writing state', false)
    .action(async (runtime: string, options: { dryRun: boolean }) => {
      await runAgentUninstallCommand({ runtime, dryRun: options.dryRun });
    });

  agentCommand
    .command('status')
    .description('Show installed runtimes and product readiness checks.')
    .option('--json', 'Print machine-readable JSON output', false)
    .action(async (options: { json: boolean }) => {
      await runAgentStatusCommand({ json: options.json });
    });

  program
    .command('delete')
    .description('Delete a generated article by slug, including its assets and analytics sidecar.')
    .argument('<slug>', 'Slug of the generated article to delete')
    .option('-f, --force', 'Skip the confirmation prompt', false)
    .action(async (slug: string, options: { force: boolean }) => {
      await runDeleteCommand({
        slug,
        force: options.force,
      });
    });

  program
    .command('links')
    .description('Run link enrichment for a previously generated article by slug.')
    .argument('<slug>', 'Slug of the generated article to enrich')
    .option('--mode <mode>', 'Link merge mode: fresh or append', 'fresh')
    .option('--link <pair>', 'Custom link "expression->url", repeatable', collectOptionValue)
    .option('--unlink <expression>', 'Remove a custom link by expression, repeatable', collectOptionValue)
    .option('--max-links <n>', 'Max number of generated links', (v) => Number.parseInt(v, 10))
    .action(async (slug: string, options: { mode: string; link?: string[]; unlink?: string[]; maxLinks?: number }) => {
      await runLinksCommand({
        slug,
        mode: options.mode,
        links: options.link,
        unlinks: options.unlink,
        maxLinks: options.maxLinks,
      });
    });

  program
    .command('export')
    .description('Export a generated article as a standalone markdown file with inline links and copied images.')
    .argument('<generationId>', 'Generation id or article slug to export')
    .argument('<path>', 'Destination directory for the exported file and images')
    .option('--index <n>', 'Which primary article variant to export when multiple exist (default: 1)', (v) => Number.parseInt(v, 10))
    .option('--overwrite', 'Overwrite the destination file if it already exists', false)
    .action(async (generationId: string, destinationPath: string, options: { index?: number; overwrite: boolean }) => {
      await runOutputCommand({
        generationId,
        destinationPath,
        index: options.index,
        overwrite: options.overwrite,
      });
    });

  program
    .command('preview')
    .description('Preview a generated article in a local browser with linked assets.')
    .argument('[markdownPath]', 'Path to the markdown file to preview')
    .option('-p, --port <port>', 'Port for the local preview server (default: 4173)')
    .option('--no-open', 'Do not auto-open browser after server startup')
    .option('--watch', 'Rebuild the preview UI on source changes and auto-reload the browser', false)
    .action(async (markdownPath: string | undefined, options: { port?: string; open: boolean; watch: boolean }) => {
      await runServeCommand({
        markdownPath,
        port: options.port,
        openBrowser: options.open,
        watch: options.watch,
      });
    });

  const writeCommand = program
    .command('write')
    .description('Generate one primary content output plus optional secondary outputs from a prompt or job file.')
    .argument('[idea]', 'Natural-language idea for the generation run')
    .option('-i, --idea <idea>', 'Natural-language idea for the generation run')
    .option('--audience <description>', 'Optional natural-language audience description for shared-plan targeting')
    .option('-j, --job <path>', 'Path to a JSON job definition')
    .option('--primary <type=count>', 'Required primary output target (for example: article=1 or x-post=1)')
    .option('--secondary <type=count>', 'Secondary output target, repeatable (for example: x-thread=3, linkedin-post=2)', collectOptionValue)
    .option('--style <style>', 'Writing style (academic, analytical, authoritative, conversational, empathetic, friendly, journalistic, minimalist, persuasive, playful, professional, storytelling, technical)')
    .option('--intent <intent>', 'Content intent (announcement, case-study, cornerstone, counterargument, critique-review, deep-dive-analysis, how-to-guide, interview-q-and-a, listicle, opinion-piece, personal-essay, roundup-curation, tutorial)')
    .option('--length <size>', 'Target length: small, medium, large, or a positive integer word count')
    .option('--no-interactive', 'Fail instead of prompting for missing input in TTY mode')
    .option('--dry-run', 'Run the pipeline shell without external API calls', false)
    .option('--enrich-links', 'Run link enrichment after markdown generation', false)
    .option('--link <pair>', 'Custom link "expression->url", repeatable', collectOptionValue)
    .option('--unlink <expression>', 'Remove a custom link by expression, repeatable', collectOptionValue)
    .option('--max-links <n>', 'Max number of generated links', (v) => Number.parseInt(v, 10))
    .option('--max-images <n>', 'Max total images including cover (1=cover only, 2=cover+1 inline, 3=cover+2 inline)', (v) => Number.parseInt(v, 10))
    .option('--export <path>', 'Export the generated article to the given directory after writing')
    .action(async (ideaArg: string | undefined, options: {
      idea?: string;
      audience?: string;
      job?: string;
      primary?: string;
      secondary?: string[];
      style?: string;
      intent?: string;
      length?: string;
      interactive: boolean;
      dryRun: boolean;
      enrichLinks: boolean;
      link?: string[];
      unlink?: string[];
      maxLinks?: number;
      maxImages?: number;
      export?: string;
    }) => {
      await runWriteCommand({
        idea: options.idea ?? ideaArg,
        audience: options.audience,
        jobPath: options.job,
        primarySpec: options.primary,
        secondarySpecs: options.secondary,
        style: options.style,
        intent: options.intent,
        length: options.length,
        noInteractive: !options.interactive,
        dryRun: options.dryRun,
        enrichLinks: options.enrichLinks,
        links: options.link,
        unlinks: options.unlink,
        maxLinks: options.maxLinks,
        maxImages: options.maxImages,
        exportPath: options.export,
      });
    });

  writeCommand
    .command('resume')
    .description('Resume the last failed or interrupted write session.')
    .option('--no-interactive', 'Force plain non-interactive output even in TTY mode', false)
    .option('--enrich-links', 'Run link enrichment after markdown generation', false)
    .option('--link <pair>', 'Custom link "expression->url", repeatable', collectOptionValue)
    .option('--unlink <expression>', 'Remove a custom link by expression, repeatable', collectOptionValue)
    .option('--max-links <n>', 'Max number of generated links', (v) => Number.parseInt(v, 10))
    .option('--max-images <n>', 'Max total images including cover (1=cover only, 2=cover+1 inline, 3=cover+2 inline)', (v) => Number.parseInt(v, 10))
    .option('--export <path>', 'Export the generated article to the given directory after writing')
    .action(async (options: { noInteractive: boolean; enrichLinks: boolean; link?: string[]; unlink?: string[]; maxLinks?: number; maxImages?: number; export?: string }) => {
      await runWriteResumeCommand({
        noInteractive: options.noInteractive,
        enrichLinks: options.enrichLinks,
        links: options.link,
        unlinks: options.unlink,
        maxLinks: options.maxLinks,
        maxImages: options.maxImages,
        exportPath: options.export,
      });
    });

  await program.parseAsync(argv);
}
