/**
 * Shared Prettier configuration for OpenNota.
 * @type {import("prettier").Config}
 */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  arrowParens: 'always',
  bracketSpacing: true,
};

export default config;
