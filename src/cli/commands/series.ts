import { createInterface } from 'node:readline/promises';
import {
  contentIntentValues,
  contentTypeValues,
  writingStyleValues,
  resolveTargetLengthAlias,
  targetLengthValues,
} from '../../config/schema.js';
import {
  loadSeries,
  listSeries,
  saveSeries,
  deleteSeries,
  seriesExists,
} from '../../config/seriesStore.js';
import { listPublications } from '../../config/publicationStore.js';
import { assertAuthorExists } from './author.js';
import {
  deriveSeriesSlugFromName,
  type Series,
  type SeriesDefaults,
  type SeriesEditorialPolicy,
} from '../../types/series.js';
import { normalizeCountryCodes, normalizeLanguage } from '../../config/marketLocale.js';
import { ReportedError } from '../reportedError.js';

interface SeriesAddOptions {
  name?: string;
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
  author?: string;
  experience?: string;
}

interface SeriesListOptions {
  json: boolean;
  verbose: boolean;
  publication?: string;
}

interface SeriesEditOptions {
  slug: string;
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
  author?: string;
  experience?: string;
  unsetAuthor?: boolean;
}

interface SeriesRemoveOptions {
  slug: string;
  force: boolean;
}

export async function runSeriesAddCommand(
  options: SeriesAddOptions,
  dependencies: { log?: (message: string) => void; prompt?: typeof promptForSeriesInput } = {},
): Promise<void> {
  const log = dependencies.log ?? ((message: string) => console.log(message));

  let name = options.name;
  if (!name && process.stdout.isTTY && process.stdin.isTTY) {
    name = await promptForName();
  }

  if (!name) {
    throw new ReportedError('Series name is required. Pass a name argument or use interactive mode.');
  }

  const slug = deriveSeriesSlugFromName(name);

  if (await seriesExists(slug)) {
    throw new ReportedError(`Series "${slug}" already exists. Choose a different name.`);
  }

  const hasAnyFlag = options.topic || options.publication || options.style || options.intent || options.length || options.type
    || options.audience || options.country || options.language || options.keywords || options.tone || options.forbiddenTopics
    || options.disclosureRequirements || options.audienceRestrictions || options.editorialPolicy || options.author || options.experience;

  let defaults: SeriesDefaults = {};
  let editorialPolicy: SeriesEditorialPolicy = {
    tone: '',
    forbiddenTopics: [],
    disclosureRequirements: [],
    audienceRestrictions: [],
    notes: '',
  };
  let topic = options.topic ?? '';
  let publication = options.publication;

  if (hasAnyFlag) {
    defaults = buildDefaultsFromFlags(options);
    editorialPolicy = buildPolicyFromFlags(options);
  } else if (process.stdout.isTTY && process.stdin.isTTY) {
    const prompted = await (dependencies.prompt ?? promptForSeriesInput)(name);
    defaults = prompted.defaults;
    editorialPolicy = prompted.editorialPolicy;
    topic = prompted.topic;
    publication = prompted.publication;
  }

  await validateAuthorFlag(defaults.defaultAuthor);

  const series: Series = {
    name,
    slug,
    topic,
    publication,
    editorialPolicy,
    defaults,
  };

  await saveSeries(series);
  log(`Created series "${name}" (${slug}).`);
}

export async function runSeriesListCommand(options: SeriesListOptions): Promise<void> {
  const seriesList = await listSeries(options.publication ? { publicationSlug: options.publication } : undefined);

  if (options.json) {
    console.log(JSON.stringify(seriesList, null, 2));
    return;
  }

  if (seriesList.length === 0) {
    const filterNote = options.publication ? ` for publication "${options.publication}"` : '';
    console.log(`No series found${filterNote}. Create one with \`ideon series add\`.`);
    return;
  }

  if (options.verbose) {
    for (const series of seriesList) {
      console.log(`\n  ${series.slug}`);
      console.log(`    Name: ${series.name}`);
      if (series.topic) console.log(`    Topic: ${series.topic}`);
      if (series.publication) console.log(`    Publication: ${series.publication}`);
      if (series.defaults.style) console.log(`    Style: ${series.defaults.style}`);
      if (series.defaults.intent) console.log(`    Intent: ${series.defaults.intent}`);
      if (series.defaults.targetLength) console.log(`    Length: ${resolveTargetLengthAlias(series.defaults.targetLength)}`);
      if (series.defaults.countryCodes && series.defaults.countryCodes.length > 0) console.log(`    Countries: ${series.defaults.countryCodes.join(', ')}`);
      if (series.defaults.language) console.log(`    Language: ${series.defaults.language}`);
      if (series.defaults.keywords && series.defaults.keywords.length > 0) console.log(`    Keywords: ${series.defaults.keywords.join(', ')}`);
      if (series.defaults.defaultAuthor) console.log(`    Author: ${series.defaults.defaultAuthor}`);
      if (series.defaults.experienceNotes) {
        const preview = series.defaults.experienceNotes.length > 120
          ? `${series.defaults.experienceNotes.slice(0, 120)}...`
          : series.defaults.experienceNotes;
        console.log(`    Experience: ${preview}`);
      }
      if (series.defaults.contentTargets) {
        const primary = series.defaults.contentTargets.find((t) => t.role === 'primary');
        if (primary) console.log(`    Type: ${primary.contentType}`);
      }
      if (series.editorialPolicy.tone) console.log(`    Tone: ${series.editorialPolicy.tone}`);
      if (series.editorialPolicy.notes) console.log(`    Policy: ${series.editorialPolicy.notes.slice(0, 80)}${series.editorialPolicy.notes.length > 80 ? '...' : ''}`);
    }
    return;
  }

  const slugWidth = Math.max(6, ...seriesList.map((s) => s.slug.length));
  const nameWidth = Math.max(6, ...seriesList.map((s) => s.name.length));
  const topicWidth = Math.max(6, ...seriesList.map((s) => (s.topic || '-').length));
  const pubWidth = Math.max(6, ...seriesList.map((s) => (s.publication ?? '-').length));

  console.log(
    '  ' +
    'Slug'.padEnd(slugWidth) + '  ' +
    'Name'.padEnd(nameWidth) + '  ' +
    'Topic'.padEnd(topicWidth) + '  ' +
    'Publication'.padEnd(pubWidth)
  );

  console.log('  ' + '-'.repeat(slugWidth + nameWidth + topicWidth + pubWidth + 10));

  for (const series of seriesList) {
    const topic = series.topic || '-';
    const pub = series.publication ?? '-';
    console.log(
      '  ' +
      series.slug.padEnd(slugWidth) + '  ' +
      series.name.padEnd(nameWidth) + '  ' +
      topic.padEnd(topicWidth) + '  ' +
      pub.padEnd(pubWidth)
    );
  }
}

export async function runSeriesEditCommand(options: SeriesEditOptions): Promise<void> {
  const series = await loadSeries(options.slug);

  if (options.name) {
    series.name = options.name;
  }

  if (options.topic) {
    series.topic = options.topic;
  }

  if (options.unsetPublication) {
    series.publication = undefined;
  } else if (options.publication) {
    series.publication = options.publication;
  }

  if (options.style) {
    if ((writingStyleValues as readonly string[]).includes(options.style)) {
      series.defaults.style = options.style as (typeof writingStyleValues)[number];
    } else {
      throw new ReportedError(`Invalid style "${options.style}". Valid values: ${writingStyleValues.join(', ')}`);
    }
  }

  if (options.intent) {
    if ((contentIntentValues as readonly string[]).includes(options.intent)) {
      series.defaults.intent = options.intent as (typeof contentIntentValues)[number];
    } else {
      throw new ReportedError(`Invalid intent "${options.intent}". Valid values: ${contentIntentValues.join(', ')}`);
    }
  }

  if (options.length) {
    const parsed = parseTargetLength(options.length);
    if (parsed !== undefined) {
      series.defaults.targetLength = parsed;
    } else {
      throw new ReportedError(`Invalid length "${options.length}". Use small, medium, large, or a positive integer word count.`);
    }
  }

  if (options.type) {
    if ((contentTypeValues as readonly string[]).includes(options.type)) {
      series.defaults.contentTargets = [{
        contentType: options.type as (typeof contentTypeValues)[number],
        role: 'primary',
        count: 1,
      }];
    } else {
      throw new ReportedError(`Invalid type "${options.type}". Valid values: ${contentTypeValues.join(', ')}`);
    }
  }

  if (options.audience) {
    series.defaults.targetAudienceHint = options.audience;
  }

  if (options.country !== undefined) {
    series.defaults.countryCodes = parseAndValidateCountryCodes(options.country);
  }

  if (options.language !== undefined) {
    series.defaults.language = parseAndValidateLanguage(options.language);
  }

  if (options.keywords) {
    series.defaults.keywords = parseCommaSeparated(options.keywords);
  }

  if (options.tone) {
    series.editorialPolicy.tone = options.tone;
  }

  if (options.forbiddenTopics) {
    series.editorialPolicy.forbiddenTopics = parseCommaSeparated(options.forbiddenTopics);
  }

  if (options.disclosureRequirements) {
    series.editorialPolicy.disclosureRequirements = parseCommaSeparated(options.disclosureRequirements);
  }

  if (options.audienceRestrictions) {
    series.editorialPolicy.audienceRestrictions = parseCommaSeparated(options.audienceRestrictions);
  }

  if (options.editorialPolicy) {
    series.editorialPolicy.notes = options.editorialPolicy;
  }

  if (options.unsetAuthor) {
    delete series.defaults.defaultAuthor;
  } else if (options.author) {
    await assertAuthorExists(options.author);
    series.defaults.defaultAuthor = options.author;
  }

  if (options.experience !== undefined) {
    series.defaults.experienceNotes = options.experience;
  }

  await saveSeries(series);
  console.log(`Updated series "${series.slug}".`);
}

export async function runSeriesRemoveCommand(
  options: SeriesRemoveOptions,
  dependencies: { confirmDeletion?: (slug: string) => Promise<boolean>; log?: (message: string) => void } = {},
): Promise<void> {
  const log = dependencies.log ?? ((message: string) => console.log(message));
  const confirmDeletion = dependencies.confirmDeletion ?? promptForRemoveConfirmation;

  if (!options.force) {
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      throw new ReportedError('Remove requires confirmation in an interactive terminal. Re-run with --force to skip the prompt.');
    }

    const confirmed = await confirmDeletion(options.slug);
    if (!confirmed) {
      log('Removal cancelled.');
      return;
    }
  }

  await deleteSeries(options.slug);
  log(`Deleted series "${options.slug}".`);
}

function buildDefaultsFromFlags(options: SeriesAddOptions): SeriesDefaults {
  const defaults: SeriesDefaults = {};

  if (options.style && (writingStyleValues as readonly string[]).includes(options.style)) {
    defaults.style = options.style as (typeof writingStyleValues)[number];
  }

  if (options.intent && (contentIntentValues as readonly string[]).includes(options.intent)) {
    defaults.intent = options.intent as (typeof contentIntentValues)[number];
  }

  if (options.length) {
    defaults.targetLength = parseTargetLength(options.length);
  }

  if (options.type && (contentTypeValues as readonly string[]).includes(options.type)) {
    defaults.contentTargets = [{
      contentType: options.type as (typeof contentTypeValues)[number],
      role: 'primary',
      count: 1,
    }];
  }

  if (options.audience) {
    defaults.targetAudienceHint = options.audience;
  }

  if (options.country !== undefined) {
    defaults.countryCodes = parseAndValidateCountryCodes(options.country);
  }

  if (options.language !== undefined) {
    defaults.language = parseAndValidateLanguage(options.language);
  }

  if (options.keywords) {
    defaults.keywords = parseCommaSeparated(options.keywords);
  }

  if (options.author) {
    defaults.defaultAuthor = options.author;
  }

  if (options.experience) {
    defaults.experienceNotes = options.experience;
  }

  return defaults;
}

async function validateAuthorFlag(author?: string): Promise<void> {
  if (author) {
    await assertAuthorExists(author);
  }
}

function buildPolicyFromFlags(options: SeriesAddOptions): SeriesEditorialPolicy {
  return {
    tone: options.tone ?? '',
    forbiddenTopics: options.forbiddenTopics ? parseCommaSeparated(options.forbiddenTopics) : [],
    disclosureRequirements: options.disclosureRequirements ? parseCommaSeparated(options.disclosureRequirements) : [],
    audienceRestrictions: options.audienceRestrictions ? parseCommaSeparated(options.audienceRestrictions) : [],
    notes: options.editorialPolicy ?? '',
  };
}

function parseCommaSeparated(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
}

function parseAndValidateCountryCodes(value: string): string[] {
  const parsed = parseCommaSeparated(value);
  if (parsed.length === 0) {
    throw new ReportedError('Invalid country list. Provide comma-separated ISO country codes, e.g. US,GB,DE.');
  }

  try {
    return normalizeCountryCodes(parsed) ?? [];
  } catch (error) {
    throw new ReportedError(formatMarketValidationError(error, 'country codes'));
  }
}

function parseAndValidateLanguage(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new ReportedError('Invalid language code. Provide an ISO 639-1 code, e.g. en, de, es.');
  }

  try {
    return normalizeLanguage(normalized)!;
  } catch (error) {
    throw new ReportedError(formatMarketValidationError(error, 'language code'));
  }
}

function formatMarketValidationError(error: unknown, label: string): string {
  if (error instanceof Error && error.message) {
    return `Invalid ${label}: ${error.message}`;
  }
  return `Invalid ${label}.`;
}

function parseTargetLength(value: string): number | undefined {
  const normalized = value.trim().toLowerCase();
  if ((targetLengthValues as readonly string[]).includes(normalized)) {
    const aliasMap: Record<string, number> = { small: 500, medium: 900, large: 1400 };
    return aliasMap[normalized];
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function promptForName(): Promise<string> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      const name = (await readline.question('Series name: ')).trim();
      if (name.length > 0) {
        return name;
      }
      console.error('Name cannot be empty.');
    }
  } finally {
    readline.close();
  }
}

async function promptForSeriesInput(name: string): Promise<{ topic: string; publication?: string; defaults: SeriesDefaults; editorialPolicy: SeriesEditorialPolicy }> {
  const [{ default: React }, { render }] = await Promise.all([
    import('react'),
    import('ink'),
  ]);
  const { SeriesAddFlow } = await import('../flows/seriesAddFlow.js');

  let result: { topic: string; publication?: string; defaults: SeriesDefaults; editorialPolicy: SeriesEditorialPolicy } | null = null;

  const app = render(
    React.createElement(SeriesAddFlow, {
      name,
      onDone: (value: { topic: string; publication?: string; defaults: SeriesDefaults; editorialPolicy: SeriesEditorialPolicy } | null) => {
        result = value;
      },
    }),
  );

  await app.waitUntilExit();
  process.stdout.write('\n');

  if (!result) {
    throw new ReportedError('Series creation cancelled.');
  }

  return result;
}

async function promptForRemoveConfirmation(slug: string): Promise<boolean> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (await readline.question(`Delete series "${slug}"? (y/N) `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    readline.close();
  }
}
