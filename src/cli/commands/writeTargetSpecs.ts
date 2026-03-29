import type { ContentTargetInput } from '../../config/resolver.js';
import { contentTypeValues } from '../../config/schema.js';
import { ReportedError } from '../reportedError.js';

export function parseTargetSpec(spec: string): Omit<ContentTargetInput, 'role'> {
  const trimmed = spec.trim();
  if (!trimmed) {
    throw new ReportedError('Target spec cannot be empty. Use <content-type=count>.');
  }

  const [rawType, rawCount] = trimmed.split('=');
  if (!rawType || !rawCount) {
    throw new ReportedError(`Invalid target "${spec}". Use format content-type=count, e.g. article=1 or x-thread=3.`);
  }

  const contentType = rawType.trim();
  if (!(contentTypeValues as readonly string[]).includes(contentType)) {
    throw new ReportedError(
      `Unsupported content type "${contentType}". Supported values: ${(contentTypeValues as readonly string[]).join(', ')}.`,
    );
  }

  const count = Number.parseInt(rawCount.trim(), 10);
  if (!Number.isFinite(count) || count <= 0) {
    throw new ReportedError(`Invalid count in target "${spec}". Count must be a positive integer.`);
  }

  return {
    contentType,
    count,
  };
}

export function parsePrimaryAndSecondarySpecs(options: {
  primarySpec?: string;
  secondarySpecs?: string[];
}): ContentTargetInput[] | undefined {
  const { primarySpec, secondarySpecs } = options;

  if (!primarySpec && (!secondarySpecs || secondarySpecs.length === 0)) {
    return undefined;
  }

  if (!primarySpec) {
    throw new ReportedError('Missing required --primary <content-type=count>.');
  }

  const primary = parseTargetSpec(primarySpec);
  if (primary.count !== 1) {
    throw new ReportedError('Primary target count must be exactly 1. Use --primary <content-type=1>.');
  }
  const secondaryDedupedByType = new Map<string, ContentTargetInput>();

  for (const spec of secondarySpecs ?? []) {
    const parsed = parseTargetSpec(spec);
    if (parsed.contentType === primary.contentType) {
      throw new ReportedError(
        `Content type "${parsed.contentType}" cannot be both primary and secondary in the same run.`,
      );
    }

    const previous = secondaryDedupedByType.get(parsed.contentType);
    if (previous) {
      previous.count += parsed.count;
      continue;
    }

    secondaryDedupedByType.set(parsed.contentType, {
      ...parsed,
      role: 'secondary',
    });
  }

  return [
    {
      ...primary,
      role: 'primary',
    },
    ...secondaryDedupedByType.values(),
  ];
}