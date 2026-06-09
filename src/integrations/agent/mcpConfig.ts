export function stdioMcpServerEntry(): Record<string, unknown> {
  return {
    command: 'ideon',
    args: ['mcp', 'serve'],
  };
}

export function piMcpServerEntry(): Record<string, unknown> {
  return {
    command: 'ideon',
    args: ['mcp', 'serve'],
    lifecycle: 'lazy',
  };
}

export function vscodeMcpServerEntry(): Record<string, unknown> {
  return {
    type: 'stdio',
    command: 'ideon',
    args: ['mcp', 'serve'],
  };
}

export function openCodeMcpServerEntry(): Record<string, unknown> {
  return {
    type: 'local',
    command: ['ideon', 'mcp', 'serve'],
    enabled: true,
  };
}

export const CHATGPT_SETUP_STEPS = [
  'Open ChatGPT Desktop.',
  'Go to Settings > Skills and upload or install the exported skill folder.',
  'For MCP: enable Developer mode under Settings > Apps > Advanced settings.',
  'Create a remote MCP app pointing at your Ideon HTTP endpoint or follow ideon-mcp skill setup.',
];

export const CLAUDE_DESKTOP_SETUP_STEPS = [
  'Open Claude Desktop > Settings > Extensions.',
  'Click Advanced settings > Install Extension…',
  'Select the generated ideon.mcpb bundle path printed above.',
  'Complete any configuration prompts, then start a new conversation.',
];
