import sharedConfig from '@opennota/config/prettier/index.mjs';

/** @type {import("prettier").Config} */
export default {
  ...sharedConfig,
  plugins: ['prettier-plugin-tailwindcss'],
};
