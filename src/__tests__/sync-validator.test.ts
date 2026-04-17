import { validateIntegrationContracts } from '../integrations/sync-validator.js';
import type { ToolContract } from '../integrations/mcp/tools.js';
import type { SkillDefinition } from '../integrations/skills/registry.js';

describe('integration contract sync validator', () => {
  it('passes with in-repo contracts', () => {
    expect(validateIntegrationContracts()).toEqual([]);
  });

  it('detects enum drift between tool contracts and schema-backed expectations', () => {
    const driftedTools: ToolContract[] = [
      {
        name: 'ideon_write',
        required: ['idea'],
        enums: {
          style: ['technical'],
          length: ['small', 'medium', 'large'],
        },
      },
      {
        name: 'ideon_config_set',
        required: ['key', 'value'],
        enums: {
          key: ['model'],
        },
      },
    ];

    const skills: SkillDefinition[] = [
      {
        name: 'ideon-write-primary',
        description: 'test',
        command: 'ideon write --no-interactive ...',
        inputContract: {
          required: ['idea'],
          enums: {
            style: ['technical'],
            length: ['small', 'medium', 'large'],
          },
        },
      },
      {
        name: 'ideon-config-set',
        description: 'test',
        command: 'ideon config set ...',
        inputContract: {
          required: ['key', 'value'],
          enums: {
            key: ['model'],
          },
        },
      },
    ];

    const drifts = validateIntegrationContracts({
      toolContracts: driftedTools,
      skillRegistry: skills,
    });

    expect(drifts.some((drift) => drift.id === 'write.enum.style.tool-vs-schema')).toBe(true);
    expect(drifts.some((drift) => drift.id === 'write.enum.style.skill-vs-schema')).toBe(true);
    expect(drifts.some((drift) => drift.id === 'config-set.enum.key.tool-vs-supported')).toBe(true);
    expect(drifts.some((drift) => drift.id === 'config-set.enum.key.skill-vs-supported')).toBe(true);
  });
});
