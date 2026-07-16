export const SETTINGS_KEY = 'squoosh-batch-settings';

export type ExtensionSettings = {
  enabled: boolean;
};

export const defaultSettings: ExtensionSettings = {
  enabled: true,
};

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const candidate = stored[SETTINGS_KEY];
  return {
    enabled: typeof candidate === 'object'
      && candidate !== null
      && 'enabled' in candidate
      && typeof candidate.enabled === 'boolean'
      ? candidate.enabled
      : defaultSettings.enabled,
  };
}

export async function saveSettings(settings: ExtensionSettings) {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function resetSettings() {
  await saveSettings(defaultSettings);
}
