import { createApp } from 'vue';
import QueueWindow from '@/components/QueueWindow.vue';
import '../styles/content.css';
import { getSettings, SETTINGS_KEY } from '@/utils/settings';

export default defineContentScript({
  matches: ['https://squoosh.app/*'],
  main() {
    let app: ReturnType<typeof createApp> | undefined;

    async function syncExtensionState() {
      const { enabled } = await getSettings();
      const host = document.querySelector('#squoosh-batch-root');

      if (!enabled) {
        app?.unmount();
        app = undefined;
        host?.remove();
        return;
      }

      if (host) return;

      const nextHost = document.createElement('div');
      nextHost.id = 'squoosh-batch-root';
      document.documentElement.append(nextHost);
      app = createApp(QueueWindow);
      app.mount(nextHost);
    }

    void syncExtensionState();
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[SETTINGS_KEY]) void syncExtensionState();
    });
  },
});
