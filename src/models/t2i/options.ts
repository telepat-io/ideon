import { getT2IModel } from './registry.js';

type T2IFieldDefinition = {
  type?: string;
  default?: unknown;
  enum?: string[];
  nullable?: boolean;
  minimum?: number;
  maximum?: number;
  allowAnyString?: boolean;
};

export function getT2IFieldDefault(modelId: string, fieldName: string): unknown {
  const field = getFieldDefinition(modelId, fieldName);
  return field?.default;
}

export function sanitizeT2IOverrides(modelId: string, overrides: Record<string, unknown>): Record<string, unknown> {
  const model = getT2IModel(modelId);

  return Object.fromEntries(
    Object.entries(overrides).flatMap(([fieldName, value]) => {
      if (!model.inputOptions.userConfigurable.includes(fieldName)) {
        return [];
      }

      const sanitized = coerceT2IFieldValue(modelId, fieldName, value);
      return sanitized === undefined ? [] : [[fieldName, sanitized] as const];
    }),
  );
}

export function coerceT2IFieldValue(modelId: string, fieldName: string, value: unknown): unknown {
  const field = getFieldDefinition(modelId, fieldName);
  if (!field) {
    return undefined;
  }

  if (value === null) {
    return field.nullable ? null : undefined;
  }

  if (value === undefined) {
    return undefined;
  }

  if (field.type === 'boolean') {
    return coerceBoolean(value);
  }

  if (field.type === 'integer') {
    return clampNumber(parseFiniteNumber(value, true), field.minimum, field.maximum, true, field.nullable);
  }

  if (field.type === 'number') {
    return clampNumber(parseFiniteNumber(value, false), field.minimum, field.maximum, false, field.nullable);
  }

  if (field.type === 'string' || typeof value === 'string') {
    const normalized = String(value).trim();
    if (!normalized) {
      return field.nullable ? null : undefined;
    }

    if (field.enum && field.enum.length > 0 && !field.allowAnyString && !field.enum.includes(normalized)) {
      return undefined;
    }

    return normalized;
  }

  return value;
}

function getFieldDefinition(modelId: string, fieldName: string): T2IFieldDefinition | undefined {
  const model = getT2IModel(modelId);
  return (model.inputOptions.fields as Record<string, unknown>)[fieldName] as T2IFieldDefinition | undefined;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.trim() === 'true') {
      return true;
    }

    if (value.trim() === 'false') {
      return false;
    }
  }

  return undefined;
}

function parseFiniteNumber(value: unknown, integer: boolean): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return integer ? Math.round(parsed) : parsed;
}

function clampNumber(
  value: number | undefined,
  minimum: number | undefined,
  maximum: number | undefined,
  integer: boolean,
  nullable: boolean | undefined,
): number | null | undefined {
  if (value === undefined) {
    return nullable ? null : undefined;
  }

  let next = value;
  if (minimum !== undefined) {
    next = Math.max(minimum, next);
  }

  if (maximum !== undefined) {
    next = Math.min(maximum, next);
  }

  return integer ? Math.round(next) : next;
}