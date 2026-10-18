import tseslint from 'typescript-eslint';

const sinClassNameNiStyle = {
  selector: 'JSXAttribute[name.name=/^(className|style)$/]',
  message:
    'Prohibido className y style fuera de packages/ui: compón con componentes de packages/ui.',
};

export function crearConfig(raiz) {
  return tseslint.config(
    {
      ignores: ['**/dist/**', '**/.turbo/**', '**/node_modules/**', 'docs/**', '**/*.{js,cjs,mjs}'],
    },
    {
      files: ['**/*.{ts,tsx}'],
      extends: [tseslint.configs.strictTypeChecked],
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir: raiz },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/ban-ts-comment': [
          'error',
          { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true },
        ],
        '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
        'no-restricted-syntax': ['error', sinClassNameNiStyle],
      },
    },
    {
      files: ['packages/ui/**'],
      rules: { 'no-restricted-syntax': 'off' },
    },
    {
      files: ['apps/backend/src/modulos/*/aplicacion/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@nestjs/common',
                allowImportNames: ['Injectable', 'Inject'],
                message: 'La capa de aplicación solo puede usar @Injectable e @Inject de NestJS.',
              },
            ],
          },
        ],
      },
    },
  );
}
