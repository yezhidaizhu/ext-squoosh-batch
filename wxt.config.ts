import { defineConfig } from 'wxt';
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vite: () => {
    return {
      plugins: [tailwindcss({})],
    };
  },
  manifest: {
    name: 'Squoosh Batch',
    description:
      'Batch image upload and image queue browser extension for Squoosh.app.',
    permissions: ['storage'],
    action: {
      default_title: 'Squoosh Batch',
    },
    web_accessible_resources: [
      {
        resources: ['icon/*'],
        matches: ['https://squoosh.app/*'],
      },
    ],
  },
});
