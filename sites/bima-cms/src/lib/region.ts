/**
 * The region this build serves, chosen at build time (see region-config.ts). __BIMA_REGION__ is
 * replaced by astro.config.mjs; there is no runtime default.
 */
import { REGIONS, type Locale, type Region } from "./region-config";

export type { Locale, Region };

declare const __BIMA_REGION__: string;

/** The region this build serves. Replaced at build time; there is no runtime default. */
export const REGION_ID: string = __BIMA_REGION__;
export const REGION: Region = REGIONS[REGION_ID]!;

/** The market a page without one (the hub, the header logo) links to: the first listed. */
export const HOME_MARKET: string | undefined = Object.keys(REGION.markets)[0];
