// project-nexus/eslint.config.js
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,

  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: './client/tsconfig.json'
      }
    },
    plugins: {
      react,
      '@typescript-eslint': typescript
    },
    extends: [
      react.configs.recommended,
      typescript.configs.recommended
    ],
    rules: {
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    },
    settings: {
      react: {
        version: '18.3'
      }
    }
  },

  {
    files: ['server/**/*.{ts,js}'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: './server/tsconfig.server.json'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    extends: [typescript.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },

  {
    files: ['types/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: './server/tsconfig.server.json'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    extends: [typescript.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];