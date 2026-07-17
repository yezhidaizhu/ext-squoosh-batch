<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RotateCcw } from '@lucide/vue';
import { getSettings, RESET_LAYOUT_MESSAGE, resetSettings, saveSettings } from '@/utils/settings';

const enabled = ref(true);
const isReady = ref(false);
const isResetting = ref(false);
const brandIconUrl = browser.runtime.getURL('/icon/32.png');

onMounted(async () => {
  enabled.value = (await getSettings()).enabled;
  isReady.value = true;
});

async function updateEnabled(event: Event) {
  const target = event.target as HTMLInputElement;
  enabled.value = target.checked;
  await saveSettings({ enabled: enabled.value });
}

async function restoreDefaults() {
  isResetting.value = true;
  await resetSettings();
  const tabs = await browser.tabs.query({ url: 'https://squoosh.app/*' });
  await Promise.all(tabs.flatMap((tab) => tab.id
    ? [browser.tabs.sendMessage(tab.id, RESET_LAYOUT_MESSAGE).catch(() => undefined)]
    : []));
  enabled.value = true;
  isResetting.value = false;
}

async function openSquoosh() {
  const [existingTab] = await browser.tabs.query({ url: 'https://squoosh.app/*' });

  if (existingTab?.id) {
    await browser.tabs.update(existingTab.id, { active: true });
    if (existingTab.windowId !== undefined) await browser.windows.update(existingTab.windowId, { focused: true });
    return;
  }

  await browser.tabs.create({ url: 'https://squoosh.app/' });
}
</script>

<template>
  <main class="popup">
    <header class="brand">
      <span class="brand-icon" aria-hidden="true">
        <img class="brand-icon-img" :src="brandIconUrl" alt="" />
      </span>
      <span class="brand-copy">
        <strong>Squoosh Batch</strong>
        <small>Batch image uploads for Squoosh.</small>
      </span>
    </header>

    <section class="settings" aria-label="Queue controls">
      <label class="setting-row queue-toggle" :class="{ 'is-loading': !isReady }">
        <span class="setting-copy">
          <strong>Allow Batch</strong>
          <small>Show it on squoosh.app</small>
        </span>
        <span class="switch">
          <input :checked="enabled" :disabled="!isReady" type="checkbox" role="switch" :aria-checked="enabled" aria-label="Allow Batch" @change="updateEnabled" />
          <span class="switch-track" aria-hidden="true"><span class="switch-thumb" /></span>
        </span>
      </label>

      <div class="setting-row reset-row">
        <span class="setting-copy">
          <strong>Restore settings</strong>
          <small>Return to the initial setup</small>
        </span>
        <button class="reset-button" type="button" :disabled="isResetting" @click="restoreDefaults">
          <RotateCcw :size="14" :stroke-width="2" aria-hidden="true" />
          Reset
        </button>
      </div>
    </section>

    <button class="site-button" type="button" @click="openSquoosh">
      Open Squoosh
    </button>
  </main>
</template>
