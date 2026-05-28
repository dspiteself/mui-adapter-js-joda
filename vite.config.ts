import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      rollupTypes: true,
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MuiAdapterJsJoda',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'cjs' ? 'index.cjs' : 'index.js'),
    },
    rollupOptions: {
      // Everything the consumer is expected to provide stays external.
      external: [
        /^@js-joda\//,
        /^@mui\//,
        'react',
        'react-dom',
      ],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    setupFiles: ['./test/setup.ts'],
    // The ported MUI X adapter suite assumes the system zone is UTC for its
    // `toEqualDateTime` roundtrips (LocalDateTime → JS Date uses the system
    // zone). Force UTC so results don't depend on the developer's machine.
    env: { TZ: 'UTC' },
  },
});
