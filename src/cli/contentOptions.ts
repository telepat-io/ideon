import type { Command } from 'commander';

export function collectOptionValue(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

export interface ContentCommandOptions {
  idea?: string;
  audience?: string;
  jobPath?: string;
  publication?: string;
  series?: string;
  author?: string;
  experience?: string;
  primarySpec?: string;
  secondarySpecs?: string[];
  style?: string;
  intent?: string;
  length?: string;
  keywords?: string;
  exportPath?: string;
}

export function applyContentOptions(command: Command): Command {
  return command
    .argument('[idea]', 'Natural-language idea for the generation run')
    .option('-i, --idea <idea>', 'Natural-language idea for the generation run')
    .option('--audience <description>', 'Optional natural-language audience description for shared-plan targeting')
    .option('-j, --job <path>', 'Path to a JSON job definition')
    .option('--primary <type=count>', 'Required primary output target (for example: article=1 or x-post=1)')
    .option('--secondary <type=count>', 'Secondary output target, repeatable (for example: x-thread=3, linkedin-post=2)', collectOptionValue)
    .option('--style <style>', 'Writing style (academic, analytical, authoritative, conversational, empathetic, friendly, journalistic, minimalist, persuasive, playful, professional, storytelling, technical)')
    .option('--intent <intent>', 'Content intent (announcement, case-study, cornerstone, counterargument, critique-review, deep-dive-analysis, how-to-guide, interview-q-and-a, listicle, opinion-piece, personal-essay, roundup-curation, tutorial)')
    .option('--length <size>', 'Target length: small, medium, large, or a positive integer word count')
    .option('--keywords <keywords>', 'Comma-separated SEO keywords (e.g. "organic marketing, content strategy, seo")')
    .option('--publication <slug>', 'Publication slug to use for defaults and editorial policy')
    .option('--series <slug>', 'Content series slug to use for defaults and thematic context')
    .option('--author <slug>', 'Author slug for voice and expertise (overrides publication/series defaults)')
    .option('--experience <text>', 'Per-run anecdotes or first-hand experience to weave into the draft')
    .option('--no-interactive', 'Fail instead of prompting for missing input in TTY mode');
}

export function resolveFaqSectionCliFlag(options: Record<string, unknown>): boolean | undefined {
  if (options.faqSection === true) {
    return true;
  }

  if (options.noFaqSection === true) {
    return false;
  }

  return undefined;
}

export function parseContentOptions(ideaArg: string | undefined, options: Record<string, unknown>): ContentCommandOptions & { noInteractive: boolean } {
  return {
    idea: (options.idea as string | undefined) ?? ideaArg,
    audience: options.audience as string | undefined,
    jobPath: options.job as string | undefined,
    publication: options.publication as string | undefined,
    series: options.series as string | undefined,
    author: options.author as string | undefined,
    experience: options.experience as string | undefined,
    primarySpec: options.primary as string | undefined,
    secondarySpecs: options.secondary as string[] | undefined,
    style: options.style as string | undefined,
    intent: options.intent as string | undefined,
    length: options.length as string | undefined,
    keywords: options.keywords as string | undefined,
    exportPath: options.export as string | undefined,
    noInteractive: !(options.interactive as boolean),
  };
}
