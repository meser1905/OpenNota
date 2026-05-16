import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import sharedPreset from '@opennota/config/tailwind/index.cjs';

const config: Config = {
  presets: [sharedPreset],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  plugins: [animate],
};

export default config;
