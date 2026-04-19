import { configSettingKeys, configSecretKeys } from '../../config/manage.js';
import { contentIntentValues, targetLengthValues, writingStyleValues } from '../../config/schema.js';

export interface SkillInputContract {
  required: string[];
  enums: Record<string, string[]>;
}

export interface SkillDefinition {
  name: string;
  description: string;
  command: string;
  inputContract: SkillInputContract;
}

const configKeys = [...configSettingKeys, ...configSecretKeys];

export const ideonSkillRegistry: SkillDefinition[] = [
  {
    name: 'ideon-write-primary',
    description: 'Use this skill when generating a new Ideon output from a single idea in one shot.',
    command: 'ideon write --no-interactive ...',
    inputContract: {
      required: ['idea'],
      enums: {
        style: [...writingStyleValues],
        intent: [...contentIntentValues],
        length: [...targetLengthValues],
      },
    },
  },
  {
    name: 'ideon-config-set',
    description: 'Use this skill when a user needs to set Ideon runtime settings or secrets non-interactively.',
    command: 'ideon config set ...',
    inputContract: {
      required: ['key', 'value'],
      enums: {
        key: [...configKeys],
      },
    },
  },
];
