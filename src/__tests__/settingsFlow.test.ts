import { jest } from '@jest/globals';
import { defaultAppSettings, type AppSettings, type SecretSettings } from '../config/schema.js';
import { applyEdit, handleMenuSelect } from '../cli/flows/settingsFlowLogic.js';

describe('Ideon settings flow', () => {
  const defaultSecrets: SecretSettings = {
    openRouterApiKey: null,
    replicateApiToken: null,
  };

  it('opens the T2I submenu when selecting T2I settings', () => {
    const setEditing = jest.fn();
    const setShowModelSelect = jest.fn();
    const setMenuMode = jest.fn();
    const onDone = jest.fn();
    const exit = jest.fn();

    handleMenuSelect(
      't2i-settings',
      defaultAppSettings,
      defaultSecrets,
      setEditing,
      setShowModelSelect,
      setMenuMode,
      onDone,
      exit,
    );

    expect(setMenuMode).toHaveBeenCalledWith('t2i');
    expect(setEditing).not.toHaveBeenCalled();
    expect(setShowModelSelect).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it('returns to the main menu when selecting Back in the T2I submenu', () => {
    const setEditing = jest.fn();
    const setShowModelSelect = jest.fn();
    const setMenuMode = jest.fn();
    const onDone = jest.fn();
    const exit = jest.fn();

    handleMenuSelect(
      't2i-back',
      defaultAppSettings,
      defaultSecrets,
      setEditing,
      setShowModelSelect,
      setMenuMode,
      onDone,
      exit,
    );

    expect(setMenuMode).toHaveBeenCalledWith('main');
    expect(setEditing).not.toHaveBeenCalled();
    expect(setShowModelSelect).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it('starts editing T2I input overrides when selected', () => {
    const setEditing = jest.fn();
    const setShowModelSelect = jest.fn();
    const setMenuMode = jest.fn();
    const onDone = jest.fn();
    const exit = jest.fn();
    const settings: AppSettings = {
      ...defaultAppSettings,
      t2i: {
        modelId: 'flux',
        inputOverrides: { prompt: 'vivid' },
      },
    };

    handleMenuSelect(
      't2i-input-overrides',
      settings,
      defaultSecrets,
      setEditing,
      setShowModelSelect,
      setMenuMode,
      onDone,
      exit,
    );

    expect(setEditing).toHaveBeenCalledTimes(1);
    expect(setEditing).toHaveBeenCalledWith({
      key: 't2i-input-overrides',
      label: 'T2I input overrides (JSON)',
      value: JSON.stringify(settings.t2i.inputOverrides, null, 2),
    });
    expect(setMenuMode).not.toHaveBeenCalled();
    expect(setShowModelSelect).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it('starts editing T2I replicate model override when selected', () => {
    const setEditing = jest.fn();
    const setShowModelSelect = jest.fn();
    const setMenuMode = jest.fn();
    const onDone = jest.fn();
    const exit = jest.fn();
    const settings: AppSettings = {
      ...defaultAppSettings,
      t2i: {
        modelId: 'flux',
        replicateModelId: 'black-forest-labs/flux-2-pro',
        inputOverrides: {},
      },
    };

    handleMenuSelect(
      't2i-replicate-model-id',
      settings,
      defaultSecrets,
      setEditing,
      setShowModelSelect,
      setMenuMode,
      onDone,
      exit,
    );

    expect(setEditing).toHaveBeenCalledWith({
      key: 't2i-replicate-model-id',
      label: 'T2I Replicate model ID override (blank to clear)',
      value: 'black-forest-labs/flux-2-pro',
    });
    expect(setShowModelSelect).not.toHaveBeenCalled();
    expect(setMenuMode).not.toHaveBeenCalled();
  });

  it('clears input overrides when blank JSON is submitted', () => {
    const setSettings = jest.fn();
    const setSecrets = jest.fn();
    const settings: AppSettings = {
      ...defaultAppSettings,
      t2i: {
        modelId: 'flux',
        inputOverrides: { width: 512 },
      },
    };

    const result = applyEdit('t2i-input-overrides', '', settings, defaultSecrets, setSettings, setSecrets);

    expect(result).toBe(true);
    expect(setSettings).toHaveBeenCalledWith({
      ...settings,
      t2i: {
        ...settings.t2i,
        inputOverrides: {},
      },
    });
    expect(setSecrets).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON for T2I input overrides', () => {
    const setSettings = jest.fn();
    const setSecrets = jest.fn();

    const result = applyEdit('t2i-input-overrides', '[1,2,3]', defaultAppSettings, defaultSecrets, setSettings, setSecrets);

    expect(result).toBe(false);
    expect(setSettings).not.toHaveBeenCalled();
    expect(setSecrets).not.toHaveBeenCalled();
  });

  it('sets T2I replicate model override from editor input', () => {
    const setSettings = jest.fn();
    const setSecrets = jest.fn();

    const result = applyEdit(
      't2i-replicate-model-id',
      'black-forest-labs/flux-2-pro',
      defaultAppSettings,
      defaultSecrets,
      setSettings,
      setSecrets,
    );

    expect(result).toBe(true);
    expect(setSettings).toHaveBeenCalledWith({
      ...defaultAppSettings,
      t2i: {
        ...defaultAppSettings.t2i,
        replicateModelId: 'black-forest-labs/flux-2-pro',
      },
    });
    expect(setSecrets).not.toHaveBeenCalled();
  });

  it('clears T2I replicate model override when editor input is blank', () => {
    const setSettings = jest.fn();
    const setSecrets = jest.fn();
    const settings: AppSettings = {
      ...defaultAppSettings,
      t2i: {
        ...defaultAppSettings.t2i,
        replicateModelId: 'black-forest-labs/flux-2-pro',
      },
    };

    const result = applyEdit('t2i-replicate-model-id', '   ', settings, defaultSecrets, setSettings, setSecrets);

    expect(result).toBe(true);
    expect(setSettings).toHaveBeenCalledWith({
      ...settings,
      t2i: {
        ...settings.t2i,
        replicateModelId: undefined,
      },
    });
    expect(setSecrets).not.toHaveBeenCalled();
  });
});
