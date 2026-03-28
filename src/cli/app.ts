import { Command } from 'commander';
import { runDeleteCommand } from './commands/delete.js';
import { openSettings } from './commands/settings.js';
import { runServeCommand } from './commands/serve.js';
import { runWriteCommand, runWriteResumeCommand } from './commands/write.js';

function collectOptionValue(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name('ideon')
    .description('Turn ideas into rich Markdown articles with generated images.')
    .version('0.1.0');

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
    .action(async (markdownPath: string | undefined, options: { port?: string; open: boolean }) => {
      await runServeCommand({
        markdownPath,
        port: options.port,
        openBrowser: options.open,
      });
    });

  const writeCommand = program
    .command('write')
    .description('Generate an article from a prompt or job file.')
    .argument('[idea]', 'Natural-language idea for the article')
    .option('-i, --idea <idea>', 'Natural-language idea for the article')
    .option('-j, --job <path>', 'Path to a JSON job definition')
    .option('-t, --target <type=count>', 'Generation target, repeatable (for example: article=1, x-post=10)', collectOptionValue)
    .option('--style <style>', 'Writing style (professional, friendly, technical, academic, opinionated, storytelling)')
    .option('--length <size>', 'Target length: small, medium, or large')
    .option('--dry-run', 'Run the pipeline shell without external API calls', false)
    .action(async (ideaArg: string | undefined, options: { idea?: string; job?: string; target?: string[]; style?: string; length?: string; dryRun: boolean }) => {
      await runWriteCommand({
        idea: options.idea ?? ideaArg,
        jobPath: options.job,
        targetSpecs: options.target,
        style: options.style,
        length: options.length,
        dryRun: options.dryRun,
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
