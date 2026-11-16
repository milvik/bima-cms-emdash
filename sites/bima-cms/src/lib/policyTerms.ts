import { getEmDashCollection } from "emdash";
import { MARKETS, type LegalPage, type Locale } from "./legal";
import { REGION } from "./region";

const KEY = /^[a-z0-9-]{1,64}$/;

/**
 * Product terms and conditions, one entry per product (and locale), linked from the member
 * policy document. Looked up by `terms_key` - a stable, non-translatable key the URL carries -
 * rather than by slug, because a translated entry may have its own slug.
 */
async function latest(key: string, partner: string, locale: Locale) {
	const { entries, cacheHint } = await getEmDashCollection("policy_terms", {
		status: "published",
		locale,
		where: { terms_key: key, country_partner: partner },
		orderBy: { effective_from: "desc" },
		limit: 1,
	});
	return { entry: entries[0], cacheHint };
}

/** One document in the requested locale, or in English when it has no translation. */
async function lookup(key: string, partner: string, locale: Locale) {
	const first = await latest(key, partner, locale);
	if (first.entry) return { entry: first.entry, locale, fellBack: false, cacheHints: [first.cacheHint] };
	if (locale === "en") return { entry: undefined, locale, fellBack: false, cacheHints: [first.cacheHint] };
	const en = await latest(key, partner, "en");
	return { entry: en.entry, locale: "en" as Locale, fellBack: true, cacheHints: [first.cacheHint, en.cacheHint] };
}

/** The keys a bundle's entry lists in `includes`: valid, distinct, never itself. */
function includedKeys(includes: unknown, self: string): string[] {
	if (!Array.isArray(includes)) return [];
	const keys = includes.filter((k): k is string => typeof k === "string" && KEY.test(k) && k !== self);
	return [...new Set(keys)];
}

/**
 * The product's terms; a missing translation falls back to English, as the legal pages do.
 *
 * An entry that lists other terms_keys in `includes` (a bundle) also carries those documents as
 * sections, each looked up as its own page would be, so each falls back to English on its own.
 * Only one level: an included document's own `includes` is not followed.
 */
export async function findPolicyTermsPage(market: string, key: string, locale: Locale): Promise<LegalPage | null> {
	const partner = MARKETS[market];
	if (!partner || !REGION.locales.includes(locale) || !KEY.test(key)) return null;
	const page = await lookup(key, partner, locale);
	if (!page.entry) return null;
	const includes = includedKeys(page.entry.data?.includes, key);
	if (!includes.length) return page;

	const found = await Promise.all(includes.map((k) => lookup(k, partner, locale)));
	const sections: NonNullable<LegalPage["sections"]> = [];
	const cacheHints = [...page.cacheHints];
	found.forEach((doc, i) => {
		cacheHints.push(...doc.cacheHints);
		if (doc.entry) sections.push({ key: includes[i], entry: doc.entry, locale: doc.locale, fellBack: doc.fellBack });
		else console.warn(`[policy-terms] "${key}" includes "${includes[i]}", which has no published entry for ${partner}`);
	});
	return { ...page, cacheHints, sections };
}
