import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Cue',
    description: 'A live technical interviewer for NeetCode.',
    permissions: ['storage'],
    host_permissions: ['https://neetcode.io/*'],
  },
});
