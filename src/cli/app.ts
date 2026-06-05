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
  runGkpListCommand,
} from './commands/gkp.js';
import { runLinksCommand } from './commands/links.js';
import { runOutputCommand } from './commands/export.js';
import { openSettings } from './commands/settings.js';
import { runServeCommand } from './commands/serve.js';
import {
  runPublicationAddCommand,
  runPublicationListCommand,
  runPublicationEditCommand,
  runPublicationRemoveCommand,
} from './commands/publication.js';
import {
  runSeriesAddCommand,
  runSeriesListCommand,
  runSeriesEditCommand,
  runSeriesRemoveCommand,
} from './commands/series.js';
import {
  runQueueAddCommand,
  runQueueListCommand,
  runQueuePeekCommand,
  runQueueRemoveCommand,
  runQueueClearCommand,
} from './commands/queue.js';
import { runWriteCommand, runWriteResumeCommand } from './commands/write.js';
import { runArticleListCommand } from './commands/article.js';
import { applyContentOptions, parseContentOptions, collectOptionValue } from './contentOptions.js';
import { registerPlanCommands } from './commands/plan.js';
import packageJson from '../../package.json' with { type: 'json' };

const { version } = packageJson;

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
    .option('--publication <slug>', 'Attach cache context to a publication slug')
    .option('--series <slug>', 'Attach cache context to a series slug')
    .option('--refresh', 'Bypass cache and fetch fresh data', false)
    .option('--json', 'Print machine-readable JSON output', false)
    .action(async (options: { keywords?: string; url?: string; site?: string; country?: string; language?: string; pageSize?: number; publication?: string; series?: string; refresh: boolean; json: boolean }) => {
      await runGkpIdeasCommand(options);
    });

  gkpCommand
    .command('historical')
    .description('Get historical search volume and competition metrics for keywords.')
    .requiredOption('--keywords <keywords>', 'Comma-separated keywords to look up')
    .option('--country <codes>', 'Comma-separated ISO country codes (omit for all countries)')
    .option('--language <code>', 'ISO 639-1 language code (default: en)')
    .option('--no-include-cpc', 'Exclude average CPC from results')
    .option('--publication <slug>', 'Attach cache context to a publication slug')
    .option('--series <slug>', 'Attach cache context to a series slug')
    .option('--refresh', 'Bypass cache and fetch fresh data', false)
    .option('--json', 'Print machine-readable JSON output', false)
    .action(async (options: { keywords: string; country?: string; language?: string; includeCpc: boolean; publication?: string; series?: string; refresh: boolean; json: boolean }) => {
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
    .option('--publication <slug>', 'Attach cache context to a publication slug')
    .option('--series <slug>', 'Attach cache context to a series slug')
    .option('--refresh', 'Bypass cache and fetch fresh data', false)
    .option('--json', 'Print machine-readable JSON output', false)
    .action(async (options: { keywords: string; matchType?: string; maxCpcBid?: number; country?: string; language?: string; startDate?: string; endDate?: string; publication?: string; series?: string; refresh: boolean; json: boolean }) => {
      await runGkpForecastCommand(options);
    });

  gkpCommand
    .command('list')
    .description('List cached GKP query history.')
    .option('--publication <slug>', 'Filter by publication slug')
    .option('--series <slug>', 'Filter by series slug')
    .option('--search <query>', 'Filter by keyword, URL, site, publication, or series text')
    .option('--fresh', 'Show only fresh cache entries', false)
    .option('--stale', 'Show only stale cache entries', false)
    .option('--json', 'Print machine-readable JSON output', false)
    .option('--verbose', 'Show full cache entry details', false)
    .action(async (options: { publication?: string; series?: string; search?: string; fresh: boolean; stale: boolean; json: boolean; verbose: boolean }) => {
      await runGkpListCommand(options);
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

  const publicationCommand = program
    .command('publication')
    .description('Manage publications with editorial policies and default settings.');

  publicationCommand
    .command('add')
    .description('Create a new publication with defaults and editorial policy.')
    .argument('[name]', 'Publication name')
    .option('--style <style>', 'Default writing style')
    .option('--intent <intent>', 'Default content intent')
    .option('--length <size>', 'Default target length: small, medium, large, or word count')
    .option('--type <type>', 'Default primary content type')
    .option('--audience <description>', 'Default target audience hint')
    .option('--country <codes>', 'Comma-separated ISO country codes')
    .option('--language <code>', 'ISO 639-1 language code')
    .option('--tone <tone>', 'Editorial policy tone')
    .option('--forbidden-topics <topics>', 'Comma-separated forbidden topics')
    .option('--disclosure-requirements <requirements>', 'Comma-separated disclosure requirements')
    .option('--audience-restrictions <restrictions>', 'Comma-separated audience restrictions')
    .option('--editorial-policy <text>', 'Editorial policy notes (freeform text)')
    .action(async (name: string | undefined, options: {
      style?: string;
      intent?: string;
      length?: string;
      type?: string;
      audience?: string;
      country?: string;
      language?: string;
      tone?: string;
      forbiddenTopics?: string;
      disclosureRequirements?: string;
      audienceRestrictions?: string;
      editorialPolicy?: string;
    }) => {
      await runPublicationAddCommand({ name, ...options });
    });

  publicationCommand
    .command('list')
    .description('List all publications.')
    .option('--json', 'Print machine-readable JSON output', false)
    .option('--verbose', 'Show editorial policy details', false)
    .action(async (options: { json: boolean; verbose: boolean }) => {
      await runPublicationListCommand(options);
    });

  publicationCommand
    .command('edit')
    .description('Edit an existing publication.')
    .argument('<slug>', 'Publication slug')
    .option('--name <name>', 'New publication name')
    .option('--style <style>', 'Default writing style')
    .option('--intent <intent>', 'Default content intent')
    .option('--length <size>', 'Default target length: small, medium, large, or word count')
    .option('--type <type>', 'Default primary content type')
    .option('--audience <description>', 'Default target audience hint')
    .option('--country <codes>', 'Comma-separated ISO country codes')
    .option('--language <code>', 'ISO 639-1 language code')
    .option('--tone <tone>', 'Editorial policy tone')
    .option('--forbidden-topics <topics>', 'Comma-separated forbidden topics')
    .option('--disclosure-requirements <requirements>', 'Comma-separated disclosure requirements')
    .option('--audience-restrictions <restrictions>', 'Comma-separated audience restrictions')
    .option('--editorial-policy <text>', 'Editorial policy notes (freeform text)')
    .action(async (slug: string, options: {
      name?: string;
      style?: string;
      intent?: string;
      length?: string;
      type?: string;
      audience?: string;
      country?: string;
      language?: string;
      tone?: string;
      forbiddenTopics?: string;
      disclosureRequirements?: string;
      audienceRestrictions?: string;
      editorialPolicy?: string;
    }) => {
      await runPublicationEditCommand({ slug, ...options });
    });

  publicationCommand
    .command('remove')
    .description('Delete a publication.')
    .argument('<slug>', 'Publication slug')
    .option('-f, --force', 'Skip the confirmation prompt', false)
    .action(async (slug: string, options: { force: boolean }) => {
      await runPublicationRemoveCommand({ slug, force: options.force });
    });

  const seriesCommand = program
    .command('series')
    .description('Manage content series with topic, defaults, and optional publication association.');

  seriesCommand
    .command('add')
    .description('Create a new content series.')
    .argument('[name]', 'Series name')
    .option('--topic <topic>', 'Series topic (freeform text)')
    .option('--publication <slug>', 'Associate series to a publication')
    .option('--style <style>', 'Default writing style')
    .option('--intent <intent>', 'Default content intent')
    .option('--length <size>', 'Default target length: small, medium, large, or word count')
    .option('--type <type>', 'Default primary content type')
    .option('--audience <description>', 'Default target audience hint')
    .option('--country <codes>', 'Comma-separated ISO country codes')
    .option('--language <code>', 'ISO 639-1 language code')
    .option('--keywords <keywords>', 'Comma-separated SEO keywords')
    .option('--tone <tone>', 'Editorial policy tone')
    .option('--forbidden-topics <topics>', 'Comma-separated forbidden topics')
    .option('--disclosure-requirements <requirements>', 'Comma-separated disclosure requirements')
    .option('--audience-restrictions <restrictions>', 'Comma-separated audience restrictions')
    .option('--editorial-policy <text>', 'Editorial policy notes (freeform text)')
    .action(async (name: string | undefined, options: {
      topic?: string;
      publication?: string;
      style?: string;
      intent?: string;
      length?: string;
      type?: string;
      audience?: string;
      country?: string;
      language?: string;
      keywords?: string;
      tone?: string;
      forbiddenTopics?: string;
      disclosureRequirements?: string;
      audienceRestrictions?: string;
      editorialPolicy?: string;
    }) => {
      await runSeriesAddCommand({ name, ...options });
    });

  seriesCommand
    .command('list')
    .description('List all series.')
    .option('--json', 'Print machine-readable JSON output', false)
    .option('--verbose', 'Show editorial policy details', false)
    .option('--publication <slug>', 'Filter by publication slug')
    .action(async (options: { json: boolean; verbose: boolean; publication?: string }) => {
      await runSeriesListCommand(options);
    });

  seriesCommand
    .command('edit')
    .description('Edit an existing series.')
    .argument('<slug>', 'Series slug')
    .option('--name <name>', 'New series name')
    .option('--topic <topic>', 'Series topic (freeform text)')
    .option('--publication <slug>', 'Associate series to a publication')
    .option('--unset-publication', 'Remove publication association')
    .option('--style <style>', 'Default writing style')
    .option('--intent <intent>', 'Default content intent')
    .option('--length <size>', 'Default target length: small, medium, large, or word count')
    .option('--type <type>', 'Default primary content type')
    .option('--audience <description>', 'Default target audience hint')
    .option('--country <codes>', 'Comma-separated ISO country codes')
    .option('--language <code>', 'ISO 639-1 language code')
    .option('--keywords <keywords>', 'Comma-separated SEO keywords')
    .option('--tone <tone>', 'Editorial policy tone')
    .option('--forbidden-topics <topics>', 'Comma-separated forbidden topics')
    .option('--disclosure-requirements <requirements>', 'Comma-separated disclosure requirements')
    .option('--audience-restrictions <restrictions>', 'Comma-separated audience restrictions')
    .option('--editorial-policy <text>', 'Editorial policy notes (freeform text)')
    .action(async (slug: string, options: {
      name?: string;
      topic?: string;
      publication?: string;
      unsetPublication?: boolean;
      style?: string;
      intent?: string;
      length?: string;
      type?: string;
      audience?: string;
      country?: string;
      language?: string;
      keywords?: string;
      tone?: string;
      forbiddenTopics?: string;
      disclosureRequirements?: string;
      audienceRestrictions?: string;
      editorialPolicy?: string;
    }) => {
      await runSeriesEditCommand({ slug, ...options });
    });

  seriesCommand
    .command('remove')
    .description('Delete a series.')
    .argument('<slug>', 'Series slug')
    .option('-f, --force', 'Skip the confirmation prompt', false)
    .action(async (slug: string, options: { force: boolean }) => {
      await runSeriesRemoveCommand({ slug, force: options.force });
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

  const articleCommand = program
    .command('article')
    .description('List and search generated articles.');

  articleCommand
    .command('list')
    .description('List generated articles with optional search and filters.')
    .option('--search <query>', 'Search articles by title, keywords, description, or body content')
    .option('--publication <slug>', 'Filter by publication slug')
    .option('--series <slug>', 'Filter by series slug')
    .option('--content-type <type>', 'Filter by content type (article, blog-post, x-post, etc.)')
    .option('--limit <n>', 'Maximum number of results (default: 50)', (v) => Number.parseInt(v, 10))
    .option('--json', 'Print machine-readable JSON output', false)
    .option('--verbose', 'Show detailed article metadata', false)
    .action(async (options: {
      search?: string;
      publication?: string;
      series?: string;
      contentType?: string;
      limit?: number;
      json: boolean;
      verbose: boolean;
    }) => {
      await runArticleListCommand(options);
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

  const writeCommand = applyContentOptions(
    program.command('write')
      .description('Generate one primary content output plus optional secondary outputs from a prompt or job file.'),
  )
    .option('--dry-run', 'Run the pipeline shell without external API calls', false)
    .option('--enrich-links', 'Run link enrichment after markdown generation', false)
    .option('--link <pair>', 'Custom link "expression->url", repeatable', collectOptionValue)
    .option('--unlink <expression>', 'Remove a custom link by expression, repeatable', collectOptionValue)
    .option('--max-links <n>', 'Max number of generated links', (v) => Number.parseInt(v, 10))
    .option('--max-images <n>', 'Max total images including cover (1=cover only, 2=cover+1 inline, 3=cover+2 inline)', (v) => Number.parseInt(v, 10))
    .option('--export <path>', 'Export the generated article to the given directory after writing')
    .option('--from-queue', 'Dequeue the next pending article from the queue and write it', false)
    .action(async (ideaArg: string | undefined, options: Record<string, unknown>) => {
      const contentOptions = parseContentOptions(ideaArg, options);
      await runWriteCommand({
        ...contentOptions,
        dryRun: options.dryRun as boolean,
        enrichLinks: options.enrichLinks as boolean,
        links: options.link as string[] | undefined,
        unlinks: options.unlink as string[] | undefined,
        maxLinks: options.maxLinks as number | undefined,
        maxImages: options.maxImages as number | undefined,
        fromQueue: options.fromQueue as boolean,
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

  const queueCommand = program
    .command('queue')
    .description('Manage the content queue for scheduling future article writes.');

  applyContentOptions(
    queueCommand.command('add')
      .description('Add an article to the content queue.'),
  )
    .option('--export <path>', 'Export the generated article to the given directory after writing')
    .action(async (ideaArg: string | undefined, options: Record<string, unknown>) => {
      const contentOptions = parseContentOptions(ideaArg, options);
      await runQueueAddCommand(ideaArg, {
        ...contentOptions,
        exportPath: options.export as string | undefined,
      });
    });

  queueCommand
    .command('list')
    .description('List queued articles.')
    .option('--json', 'Print machine-readable JSON output', false)
    .option('--publication <slug>', 'Filter by publication slug')
    .option('--status <status>', 'Filter by status: pending or in-progress')
    .action(async (options: { json: boolean; publication?: string; status?: string }) => {
      await runQueueListCommand(options);
    });

  queueCommand
    .command('peek')
    .description('Show the next pending article without consuming it.')
    .option('--publication <slug>', 'Filter by publication slug')
    .action(async (options: { publication?: string }) => {
      await runQueuePeekCommand(options);
    });

  queueCommand
    .command('remove')
    .description('Delete a queued article by ID.')
    .argument('<id>', 'Queue entry ID')
    .option('-f, --force', 'Skip the confirmation prompt', false)
    .action(async (id: string, options: { force: boolean }) => {
      await runQueueRemoveCommand({ id, force: options.force });
    });

  queueCommand
    .command('clear')
    .description('Delete all queued articles.')
    .option('-f, --force', 'Skip the confirmation prompt', false)
    .action(async (options: { force: boolean }) => {
      await runQueueClearCommand({ force: options.force });
    });

  registerPlanCommands(program);

  await program.parseAsync(argv);
}
