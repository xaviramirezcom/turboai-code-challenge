/**
 * ESLint — TypeScript + Next, plus FSD guardrails:
 * components (any `ui/` segment) may not call fetch() or import axios; data
 * access goes through a slice's api/ or model/ (frontend rules).
 */
module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Auth illustrations are small static brand assets in /public served as-is;
    // next/image's optimizer adds no value here, so a plain <img> is fine.
    '@next/next/no-img-element': 'off',
  },
  overrides: [
    {
      files: ['src/**/ui/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "CallExpression[callee.name='fetch']",
            message: "No fetch in components — use the slice's api/ or model/.",
          },
        ],
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'axios',
                message: "No axios in components — use the slice's api/.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ['**/*.test.{ts,tsx}', 'vitest.setup.ts', 'src/shared/testing/**'],
      env: { node: true },
      globals: {
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'coverage/',
    'next-env.d.ts',
    '*.config.*',
    '.eslintrc.cjs',
  ],
};
