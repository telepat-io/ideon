import { Command } from 'commander';
import { openSettings } from './commands/settings.js';
import { runWriteCommand } from './commands/write.js';

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
    .command('write')
    .description('Generate an article from a prompt or job file.')
    .argument('[idea]', 'Natural-language idea for the article')
    .option('-j, --job <path>', 'Path to a JSON job definition')
    .option('--dry-run', 'Run the pipeline shell without external API calls', false)
    .action(async (idea: string | undefined, options: { job?: string; dryRun: boolean }) => {
      await runWriteCommand({
        idea,
        jobPath: options.job,
        dryRun: options.dryRun,
      });
    });

  await program.parseAsync(argv);
}