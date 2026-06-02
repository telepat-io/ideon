import { createInterface } from 'node:readline/promises';
import {
  contentIntentValues,
  contentTypeValues,
  writingStyleValues,
  resolveTargetLengthAlias,
  targetLengthValues,
} from '../../config/schema.js';
import {
  loadPublication,
  listPublications,
  savePublication,
  deletePublication,
  publicationExists,
} from '../../config/publicationStore.js';
import {
  deriveSlugFromName,
  type Publication,
  type PublicationDefaults,
  type EditorialPolicy,
} from '../../types/publication.js';
import { normalizeCountryCodes, normalizeLanguage } from '../../config/marketLocale.js';
import { ReportedError } from '../reportedError.js';

interface PublicationAddOptions {
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
}

interface PublicationListOptions {
  json: boolean;
  verbose: boolean;
}

interface PublicationEditOptions {
  slug: string;
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
}

interface PublicationRemoveOptions {
  slug: string;
  force: boolean;
}

export async function runPublicationAddCommand(
  options: PublicationAddOptions,
  dependencies: { log?: (message: string) => void; prompt?: typeof promptForPublicationInput } = {},
): Promise<void> {
  const log = dependencies.log ?? ((message: string) => console.log(message));

  let name = options.name;
  if (!name && process.stdout.isTTY && process.stdin.isTTY) {
    name = await promptForName();
  }

  if (!name) {
    throw new ReportedError('Publication name is required. Pass a name argument or use interactive mode.');
  }

  const slug = deriveSlugFromName(name);

  if (await publicationExists(slug)) {
    throw new ReportedError(`Publication "${slug}" already exists. Choose a different name.`);
  }

  const hasAnyFlag = options.style || options.intent || options.length || options.type
    || options.audience || options.country || options.language || options.tone || options.forbiddenTopics
    || options.disclosureRequirements || options.audienceRestrictions || options.editorialPolicy;

  let defaults: PublicationDefaults = {};
  let editorialPolicy: EditorialPolicy = {
    tone: '',
    forbiddenTopics: [],
    disclosureRequirements: [],
    audienceRestrictions: [],
    notes: '',
  };

  if (hasAnyFlag) {
    defaults = buildDefaultsFromFlags(options);
    editorialPolicy = buildPolicyFromFlags(options);
  } else if (process.stdout.isTTY && process.stdin.isTTY) {
    const prompted = await (dependencies.prompt ?? promptForPublicationInput)(name);
    defaults = prompted.defaults;
    editorialPolicy = prompted.editorialPolicy;
  }

  const publication: Publication = {
    name,
    slug,
    editorialPolicy,
    defaults,
  };

  await savePublication(publication);
  log(`Created publication "${name}" (${slug}).`);
}

export async function runPublicationListCommand(options: PublicationListOptions): Promise<void> {
  const publications = await listPublications();

  if (options.json) {
    console.log(JSON.stringify(publications, null, 2));
    return;
  }

  if (publications.length === 0) {
    console.log('No publications found. Create one with `ideon publication add`.');
    return;
  }

  if (options.verbose) {
    for (const pub of publications) {
      console.log(`\n  ${pub.slug}`);
      console.log(`    Name: ${pub.name}`);
      if (pub.defaults.style) console.log(`    Style: ${pub.defaults.style}`);
      if (pub.defaults.intent) console.log(`    Intent: ${pub.defaults.intent}`);
      if (pub.defaults.targetLength) console.log(`    Length: ${resolveTargetLengthAlias(pub.defaults.targetLength)}`);
      if (pub.defaults.countryCodes && pub.defaults.countryCodes.length > 0) console.log(`    Countries: ${pub.defaults.countryCodes.join(', ')}`);
      if (pub.defaults.language) console.log(`    Language: ${pub.defaults.language}`);
      if (pub.defaults.contentTargets) {
        const primary = pub.defaults.contentTargets.find((t) => t.role === 'primary');
        if (primary) console.log(`    Type: ${primary.contentType}`);
      }
      if (pub.editorialPolicy.tone) console.log(`    Tone: ${pub.editorialPolicy.tone}`);
      if (pub.editorialPolicy.notes) console.log(`    Policy: ${pub.editorialPolicy.notes.slice(0, 80)}${pub.editorialPolicy.notes.length > 80 ? '...' : ''}`);
    }
    return;
  }

  const slugWidth = Math.max(6, ...publications.map((p) => p.slug.length));
  const nameWidth = Math.max(6, ...publications.map((p) => p.name.length));
  const styleWidth = Math.max(6, ...publications.map((p) => (p.defaults.style ?? '-').length));
  const intentWidth = Math.max(6, ...publications.map((p) => (p.defaults.intent ?? '-').length));

  console.log(
    '  ' +
    'Slug'.padEnd(slugWidth) + '  ' +
    'Name'.padEnd(nameWidth) + '  ' +
    'Style'.padEnd(styleWidth) + '  ' +
    'Intent'.padEnd(intentWidth) + '  ' +
    'Length'
  );

  console.log('  ' + '-'.repeat(slugWidth + nameWidth + styleWidth + intentWidth + 20));

  for (const pub of publications) {
    const style = pub.defaults.style ?? '-';
    const intent = pub.defaults.intent ?? '-';
    const length = pub.defaults.targetLength ? resolveTargetLengthAlias(pub.defaults.targetLength) : '-';
    console.log(
      '  ' +
      pub.slug.padEnd(slugWidth) + '  ' +
      pub.name.padEnd(nameWidth) + '  ' +
      style.padEnd(styleWidth) + '  ' +
      intent.padEnd(intentWidth) + '  ' +
      length
    );
  }
}

export async function runPublicationEditCommand(options: PublicationEditOptions): Promise<void> {
  const publication = await loadPublication(options.slug);

  if (options.name) {
    publication.name = options.name;
  }

  if (options.style) {
    if ((writingStyleValues as readonly string[]).includes(options.style)) {
      publication.defaults.style = options.style as (typeof writingStyleValues)[number];
    } else {
      throw new ReportedError(`Invalid style "${options.style}". Valid values: ${writingStyleValues.join(', ')}`);
    }
  }

  if (options.intent) {
    if ((contentIntentValues as readonly string[]).includes(options.intent)) {
      publication.defaults.intent = options.intent as (typeof contentIntentValues)[number];
    } else {
      throw new ReportedError(`Invalid intent "${options.intent}". Valid values: ${contentIntentValues.join(', ')}`);
    }
  }

  if (options.length) {
    const parsed = parseTargetLength(options.length);
    if (parsed !== undefined) {
      publication.defaults.targetLength = parsed;
    } else {
      throw new ReportedError(`Invalid length "${options.length}". Use small, medium, large, or a positive integer word count.`);
    }
  }

  if (options.type) {
    if ((contentTypeValues as readonly string[]).includes(options.type)) {
      publication.defaults.contentTargets = [{
        contentType: options.type as (typeof contentTypeValues)[number],
        role: 'primary',
        count: 1,
      }];
    } else {
      throw new ReportedError(`Invalid type "${options.type}". Valid values: ${contentTypeValues.join(', ')}`);
    }
  }

  if (options.audience) {
    publication.defaults.targetAudienceHint = options.audience;
  }

  if (options.country !== undefined) {
    publication.defaults.countryCodes = parseAndValidateCountryCodes(options.country);
  }

  if (options.language !== undefined) {
    publication.defaults.language = parseAndValidateLanguage(options.language);
  }

  if (options.tone) {
    publication.editorialPolicy.tone = options.tone;
  }

  if (options.forbiddenTopics) {
    publication.editorialPolicy.forbiddenTopics = parseCommaSeparated(options.forbiddenTopics);
  }

  if (options.disclosureRequirements) {
    publication.editorialPolicy.disclosureRequirements = parseCommaSeparated(options.disclosureRequirements);
  }

  if (options.audienceRestrictions) {
    publication.editorialPolicy.audienceRestrictions = parseCommaSeparated(options.audienceRestrictions);
  }

  if (options.editorialPolicy) {
    publication.editorialPolicy.notes = options.editorialPolicy;
  }

  await savePublication(publication);
  console.log(`Updated publication "${publication.slug}".`);
}

export async function runPublicationRemoveCommand(
  options: PublicationRemoveOptions,
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

  await deletePublication(options.slug);
  log(`Deleted publication "${options.slug}".`);
}

function buildDefaultsFromFlags(options: PublicationAddOptions): PublicationDefaults {
  const defaults: PublicationDefaults = {};

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

  return defaults;
}

function buildPolicyFromFlags(options: PublicationAddOptions): EditorialPolicy {
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
      const name = (await readline.question('Publication name: ')).trim();
      if (name.length > 0) {
        return name;
      }
      console.error('Name cannot be empty.');
    }
  } finally {
    readline.close();
  }
}

async function promptForPublicationInput(name: string): Promise<{ defaults: PublicationDefaults; editorialPolicy: EditorialPolicy }> {
  const [{ default: React }, { render }] = await Promise.all([
    import('react'),
    import('ink'),
  ]);
  const { PublicationAddFlow } = await import('../flows/publicationAddFlow.js');

  let result: { defaults: PublicationDefaults; editorialPolicy: EditorialPolicy } | null = null;

  const app = render(
    React.createElement(PublicationAddFlow, {
      name,
      onDone: (value: { defaults: PublicationDefaults; editorialPolicy: EditorialPolicy } | null) => {
        result = value;
      },
    }),
  );

  await app.waitUntilExit();
  process.stdout.write('\n');

  if (!result) {
    throw new ReportedError('Publication creation cancelled.');
  }

  return result;
}

async function promptForRemoveConfirmation(slug: string): Promise<boolean> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (await readline.question(`Delete publication "${slug}"? (y/N) `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    readline.close();
  }
}
