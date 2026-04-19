import { configSecretKeys, configSettingKeys } from '../config/manage.js';
import { contentIntentValues, targetLengthValues, writingStyleValues } from '../config/schema.js';
import { ideonToolContracts } from './mcp/tools.js';
import { ideonSkillRegistry } from './skills/registry.js';
import type { ToolContract } from './mcp/tools.js';
import type { SkillDefinition } from './skills/registry.js';

export interface ContractDrift {
  id: string;
  expected: string;
  actual: string;
}

interface ValidationSources {
  toolContracts: ToolContract[];
  skillRegistry: SkillDefinition[];
}

export function validateIntegrationContracts(sources: ValidationSources = {
  toolContracts: ideonToolContracts,
  skillRegistry: ideonSkillRegistry,
}): ContractDrift[] {
  const drifts: ContractDrift[] = [];
  const writeTool = sources.toolContracts.find((contract) => contract.name === 'ideon_write');
  const writeSkill = sources.skillRegistry.find((skill) => skill.name === 'ideon-write-primary');
  const configSetTool = sources.toolContracts.find((contract) => contract.name === 'ideon_config_set');
  const configSetSkill = sources.skillRegistry.find((skill) => skill.name === 'ideon-config-set');

  if (!writeTool) {
    drifts.push({
      id: 'missing-ideon-write-tool-contract',
      expected: 'ideon_write contract to exist',
      actual: 'missing',
    });
  }

  if (!writeSkill) {
    drifts.push({
      id: 'missing-ideon-write-skill-contract',
      expected: 'ideon-write-primary skill contract to exist',
      actual: 'missing',
    });
  }

  if (writeTool && writeSkill) {
    compareStringArrays(
      drifts,
      'write.required',
      [...writeTool.required].sort(),
      [...writeSkill.inputContract.required].sort(),
    );
    compareStringArrays(
      drifts,
      'write.enum.style.tool-vs-schema',
      [...(writeTool.enums.style ?? [])].sort(),
      [...writingStyleValues].sort(),
    );
    compareStringArrays(
      drifts,
      'write.enum.style.skill-vs-schema',
      [...(writeSkill.inputContract.enums.style ?? [])].sort(),
      [...writingStyleValues].sort(),
    );
    compareStringArrays(
      drifts,
      'write.enum.intent.tool-vs-schema',
      [...(writeTool.enums.intent ?? [])].sort(),
      [...contentIntentValues].sort(),
    );
    compareStringArrays(
      drifts,
      'write.enum.intent.skill-vs-schema',
      [...(writeSkill.inputContract.enums.intent ?? [])].sort(),
      [...contentIntentValues].sort(),
    );
    compareStringArrays(
      drifts,
      'write.enum.length.tool-vs-schema',
      [...(writeTool.enums.length ?? [])].sort(),
      [...targetLengthValues].sort(),
    );
    compareStringArrays(
      drifts,
      'write.enum.length.skill-vs-schema',
      [...(writeSkill.inputContract.enums.length ?? [])].sort(),
      [...targetLengthValues].sort(),
    );
  }

  if (!configSetTool) {
    drifts.push({
      id: 'missing-ideon-config-set-tool-contract',
      expected: 'ideon_config_set contract to exist',
      actual: 'missing',
    });
  }

  if (!configSetSkill) {
    drifts.push({
      id: 'missing-ideon-config-set-skill-contract',
      expected: 'ideon-config-set skill contract to exist',
      actual: 'missing',
    });
  }

  if (configSetTool && configSetSkill) {
    const expectedConfigKeys = [...configSettingKeys, ...configSecretKeys].sort();
    compareStringArrays(
      drifts,
      'config-set.enum.key.tool-vs-supported',
      [...(configSetTool.enums.key ?? [])].sort(),
      expectedConfigKeys,
    );
    compareStringArrays(
      drifts,
      'config-set.enum.key.skill-vs-supported',
      [...(configSetSkill.inputContract.enums.key ?? [])].sort(),
      expectedConfigKeys,
    );
  }

  return drifts;
}

function compareStringArrays(drifts: ContractDrift[], id: string, actual: string[], expected: string[]): void {
  if (actual.length === expected.length && actual.every((entry, index) => entry === expected[index])) {
    return;
  }

  drifts.push({
    id,
    expected: JSON.stringify(expected),
    actual: JSON.stringify(actual),
  });
}
