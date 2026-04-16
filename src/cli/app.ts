import { Command } from 'commander';
import { runDeleteCommand } from './commands/delete.js';
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
    .description('Turn ideas into rich Markdown articles with generated images.')
    .version(version);

  program
    .command('settings')
    .description('Show the current Ideon settings and storage state.')
    .action(async () => {
      await openSettings();
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
    .option('--audience <description>', 'Optional natural-language audience description for shared-brief targeting')
    .option('-j, --job <path>', 'Path to a JSON job definition')
    .option('--primary <type=count>', 'Required primary output target (for example: article=1 or x-post=1)')
    .option('--secondary <type=count>', 'Secondary output target, repeatable (for example: x-thread=3, linkedin-post=2)', collectOptionValue)
    .option('--style <style>', 'Writing style (professional, friendly, technical, academic, opinionated, storytelling)')
    .option('--length <size>', 'Target length: small, medium, or large')
    .option('--dry-run', 'Run the pipeline shell without external API calls', false)
    .option('--no-enrich-links', 'Skip link enrichment after markdown generation')
    .action(async (ideaArg: string | undefined, options: { idea?: string; audience?: string; job?: string; primary?: string; secondary?: string[]; style?: string; length?: string; dryRun: boolean; enrichLinks: boolean }) => {
      await runWriteCommand({
        idea: options.idea ?? ideaArg,
        audience: options.audience,
        jobPath: options.job,
        primarySpec: options.primary,
        secondarySpecs: options.secondary,
        style: options.style,
        length: options.length,
        dryRun: options.dryRun,
        enrichLinks: options.enrichLinks,
      });
    });

  writeCommand
    .command('resume')
    .description('Resume the last failed or interrupted write session from .ideon/write.')
    .action(async () => {
      await runWriteResumeCommand();
    });

  await program.parseAsync(argv);
}
