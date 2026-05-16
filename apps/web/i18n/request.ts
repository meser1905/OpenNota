import { getRequestConfig } from 'next-intl/server';
import messages from '../messages/es.json';

/**
 * next-intl request configuration.
 *
 * The MVP ships a single locale (Spanish). The structure is ready for English
 * and Portuguese: add `messages/<locale>.json` and resolve the locale here.
 */
export default getRequestConfig(() => {
  return { locale: 'es', messages };
});
