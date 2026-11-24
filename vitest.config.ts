import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Tests run west of UTC, where a date-only string read as local time shows
// the day before: a date shown without timeZone: 'UTC' fails here, not
// only for people in the Americas.
process.env.TZ = 'America/Los_Angeles';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/**/*.d.ts'],
        reporter: ['text-summary', 'json-summary', 'lcov'],
      },
    },
  }),
);
