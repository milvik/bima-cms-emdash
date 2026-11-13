/**
 * One codebase, one deployment per region. Each region is its own Worker with its own D1, R2 and
 * KV (see wrangler.jsonc), so content never crosses regions; what differs in the code is listed
 * here and nowhere else.
 *
 * The region is fixed at build time from CLOUDFLARE_ENV (astro.config.mjs), the same variable that
 * already picks the Worker, so a build cannot serve one region's pages from another region's
 * Worker. astro.config.mjs injects the chosen id as __BIMA_REGION__.
 */

export type Locale = "en" | "ur";

export interface Region {
	/** Shown in the page title and the documents hub. */
	name: string;
	/**
	 * URL segment -> the `country_partner` value documents are stored under. These URLs are what
	 * the app's config points at: never rename one.
	 */
	markets: Record<string, string>;
	/** Content locales, English first. Each one is a locale in the EmDash admin too. */
	locales: Locale[];
	/** Footer line naming who operates BIMA there, per locale. */
	operated: Partial<Record<Locale, string>> & { en: string };
}

export const REGIONS: Record<string, Region> = {
	pk: {
		name: "BIMA Pakistan",
		markets: { pk: "PAKISTAN_SIMPAISA" },
		locales: ["en", "ur"],
		operated: {
			en: "BIMA in Pakistan is operated by Milvik AB and its local partners.",
			ur: "BIMA پاکستان، Milvik AB اور اس کے مقامی شراکت داروں کے زیر انتظام ہے۔",
		},
	},
	// With no market listed, the region serves the admin and the hub page only: every document URL is a 404.
	af: {
		name: "BIMA Africa",
		markets: {},
		locales: ["en"],
		operated: { en: "BIMA in Africa is operated by Milvik AB and its local partners." },
	},
};

/** CLOUDFLARE_ENV at build time -> region. Unset is production Pakistan, the top level of wrangler.jsonc. */
export const REGION_BY_ENV: Record<string, string> = {
	"": "pk",
	staging: "pk",
	"af-staging": "af",
};

export function regionForEnv(cloudflareEnv: string | undefined): string {
	const id = REGION_BY_ENV[cloudflareEnv ?? ""];
	if (!id) throw new Error(`No region for CLOUDFLARE_ENV="${cloudflareEnv}": add it to REGION_BY_ENV in src/lib/region.ts`);
	return id;
}
