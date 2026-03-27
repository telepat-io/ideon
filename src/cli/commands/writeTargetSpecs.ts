import type { ContentTargetInput } from '../../config/resolver.js';
import { contentTypeValues } from '../../config/schema.js';
import { ReportedError } from '../reportedError.js';

export function hasXPostWithoutMode(targets: ContentTargetInput[]): boolean {
  return targets.some((target) => target.contentType === 'x-post' && !target.xMode);
}

export function parseTargetSpecs(targetSpecs: string[] | undefined): ContentTargetInput[] | undefined {
  if (!targetSpecs || targetSpecs.length === 0) {
    return undefined;
  }

  const targets = targetSpecs.map(parseTargetSpec);
  const dedupedByType = new Map<string, ContentTargetInput>();

  for (const target of targets) {
    const previous = dedupedByType.get(target.contentType);
    if (previous) {
      previous.count += target.count;
      continue;
    }

    dedupedByType.set(target.contentType, { ...target });
  }

  return [...dedupedByType.values()];
}

export function parseTargetSpec(spec: string): ContentTargetInput {
  const trimmed = spec.trim();
  if (!trimmed) {
    throw new ReportedError('Target spec cannot be empty. Use --target <content-type=count>.');
  }

  const [rawType, rawCount] = trimmed.split('=');
  if (!rawType || !rawCount) {
    throw new ReportedError(`Invalid target "${spec}". Use format content-type=count, e.g. article=1 or x-post=10.`);
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