// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig, // turns off style rules that Prettier handles
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'design-reference/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error', // PROMPT.md: no `any`
    },
  },
]);
