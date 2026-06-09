import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readIdeonPackageVersion,
  resolveIdeonPackageRoot,
  resolveIdeonSkillDir,
} from '../integrations/agent/packageRoot.js';

describe('packageRoot', () => {
  it('resolves ideon package root from module url', () => {
    const root = resolveIdeonPackageRoot(import.meta.url);
    expect(path.basename(root)).toBe('ideon');
    expect(readIdeonPackageVersion(import.meta.url)).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('resolves skill directories under package root', () => {
    const cliSkill = resolveIdeonSkillDir('ideon-cli', import.meta.url);
    expect(cliSkill.endsWith(`${path.sep}skill${path.sep}ideon-cli`)).toBe(true);
  });

  it('resolves from integrations module paths', () => {
    const modulePath = fileURLToPath(new URL('../integrations/agent/packageRoot.js', import.meta.url));
    const root = resolveIdeonPackageRoot(`file://${modulePath}`);
    expect(path.basename(root)).toBe('ideon');
  });
});
