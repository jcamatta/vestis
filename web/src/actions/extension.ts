import type { LensItem } from '../data/wardrobe';

/** The Vestis extension marks the app's page when it runs on it; undefined when it is missing or too old for Lens. */
export const extensionVersion = (): string | undefined => {
  const version = document.documentElement.dataset.vestisExtension;
  if (!version) return undefined;
  const [major = 0, minor = 0] = version.split('.').map(Number);
  return major > 0 || minor >= 3 ? version : undefined;
};

export type OpenLensInput = { extractionId: string; items: LensItem[] };

/** Asks the extension to open one Google Lens tab per cut-out; it sends what it reads to the server. */
export const openLens = (input: OpenLensInput): void => {
  window.postMessage({ type: 'vestis:lens', extractionId: input.extractionId, items: input.items }, window.location.origin);
};
