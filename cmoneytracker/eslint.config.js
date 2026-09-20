import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', '.test-out/**'] },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, Capacitor: 'readonly', html2canvas: 'readonly', jspdf: 'readonly', XLSX: 'readonly' },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Berkas di src/ adalah potongan yang digabung jadi satu IIFE oleh scripts/build.mjs,
      // jadi variabel milik berkas lain tampak "tidak dikenal" bagi ESLint.
      'no-undef': 'off',
      // vars:'local' — fungsi/variabel tingkat atas memang dipakai lintas berkas setelah digabung.
      'no-unused-vars': ['warn', { args: 'none', vars: 'local', caughtErrors: 'none' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      eqeqeq: ['warn', 'smart'],
      'no-var': 'warn',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node },
    rules: { ...js.configs.recommended.rules },
  },
];
