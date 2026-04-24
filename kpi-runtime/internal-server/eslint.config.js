import js from '@eslint/js';
import globals from 'globals';

const maxLinesRule = (max) => [
  'error',
  {
    max,
    skipBlankLines: true,
    skipComments: true,
  },
];

export default [
  {
    ignores: ['node_modules/**', 'var/**', '.codex-run/**'],
  },
  {
    files: ['src/**/*.js', 'test/**/*.js', 'playwright.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-control-regex': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-useless-escape': 'off',
    },
  },
  {
    files: ['src/routes/**/*.js'],
    rules: {
      complexity: ['error', 20],
      'max-lines': maxLinesRule(300),
    },
  },
  {
    files: ['src/services/**/*.js'],
    rules: {
      'max-lines': maxLinesRule(300),
    },
  },
  {
    files: ['src/lib/**/*.js'],
    rules: {
      complexity: ['error', 20],
      'max-lines': maxLinesRule(220),
    },
  },
  {
    files: ['src/scripts/**/*.js'],
    ignores: ['src/scripts/one-shot/**/*.js'],
    rules: {
      complexity: ['error', 25],
      'max-lines': maxLinesRule(350),
    },
  },
  {
    files: ['src/scripts/one-shot/**/*.js'],
    rules: {
      'max-lines': maxLinesRule(800),
    },
  },
  {
    files: ['e2e/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];
