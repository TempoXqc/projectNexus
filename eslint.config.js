// project-nexus/eslint.config.js
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  // Base JavaScript configuration
  js.configs.recommended,

  // Client-side (React/TypeScript) configuration
  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: './client/tsconfig.json',
      },
    },
    plugins: {
      react,
      '@typescript-eslint': typescript,
    },
    extends: [
      react.configs.recommended,
      typescript.configs.recommended,
    ],
    rules: {
      'react/prop-types': 'off', // Disable prop-types since you're using TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
    settings: {
      react: {
        version: '18.3', // Matches react@18.3.1
      },
    },
  },

  // Server-side (Node.js/TypeScript) configuration
  {
    files: ['server/**/*.{ts,js}'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: './server/tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    extends: [typescript.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];