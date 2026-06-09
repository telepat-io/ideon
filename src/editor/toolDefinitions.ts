import type { OpenRouterToolDefinition } from '../llm/openRouterClient.js';

const EDIT_PLAN_METADATA: OpenRouterToolDefinition = {
  type: 'function',
  function: {
    name: 'edit_plan_metadata',
    description: 'Update article plan metadata fields such as title, subtitle, description, slug, or primaryKeyword.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        description: { type: 'string' },
        slug: { type: 'string' },
        primaryKeyword: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
};

const EDIT_SECTION_HEADING: OpenRouterToolDefinition = {
  type: 'function',
  function: {
    name: 'edit_section_heading',
    description: 'Update a section plan heading and optional targetKeywords. Syncs generated section title.',
    parameters: {
      type: 'object',
      properties: {
        sectionIndex: { type: 'number', description: 'Zero-based section index' },
        title: { type: 'string' },
        targetKeywords: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 2,
        },
      },
      required: ['sectionIndex'],
      additionalProperties: false,
    },
  },
};

const EDIT_INTRO: OpenRouterToolDefinition = {
  type: 'function',
  function: {
    name: 'edit_intro',
    description: 'Replace the article introduction prose.',
    parameters: {
      type: 'object',
      properties: {
        body: { type: 'string' },
      },
      required: ['body'],
      additionalProperties: false,
    },
  },
};

const EDIT_SECTION_BODY: OpenRouterToolDefinition = {
  type: 'function',
  function: {
    name: 'edit_section_body',
    description: 'Replace a section body by zero-based index.',
    parameters: {
      type: 'object',
      properties: {
        sectionIndex: { type: 'number' },
        body: { type: 'string' },
      },
      required: ['sectionIndex', 'body'],
      additionalProperties: false,
    },
  },
};

const EDIT_OUTRO: OpenRouterToolDefinition = {
  type: 'function',
  function: {
    name: 'edit_outro',
    description: 'Replace the article conclusion prose.',
    parameters: {
      type: 'object',
      properties: {
        body: { type: 'string' },
      },
      required: ['body'],
      additionalProperties: false,
    },
  },
};

/** Surgical tools exposed to the seo-check editor agent. */
export const SEO_CHECK_TOOL_DEFINITIONS: OpenRouterToolDefinition[] = [
  EDIT_PLAN_METADATA,
  EDIT_SECTION_HEADING,
  EDIT_INTRO,
  EDIT_SECTION_BODY,
  EDIT_OUTRO,
];

/** @deprecated Use SEO_CHECK_TOOL_DEFINITIONS for seo-check; full surface reserved for future edit command. */
export const EDITOR_TOOL_DEFINITIONS = SEO_CHECK_TOOL_DEFINITIONS;
