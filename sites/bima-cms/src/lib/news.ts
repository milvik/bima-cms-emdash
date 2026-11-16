import { getEmDashCollection } from "emdash";
import { MARKETS, type LegalPage, type Locale } from "./legal";
import { REGION } from "./region";

const KEY = /^[a-z0-9-]{1,64}$/;

/**
 * A news article, opened from a news card in the app. The card carries `news:<key>` and Edge
 * builds the link to this page from its own configured site, so the key is the whole contract.
 */
async function latest(key: string, partner: string, locale: Locale) {
	const { entries, cacheHint } = await getEmDashCollection("news_articles", {
		status: "published",
		locale,
		where: { news_key: key, country_partner: partner },
		orderBy: { news_date: "desc" },
		limit: 1,
	});
	return { entry: entries[0], cacheHint };
}

/** The article; a missing translation falls back to English, as the legal pages do. */
export async function findNewsPage(market: string, key: string, locale: Locale): Promise<LegalPage | null> {
	const partner = MARKETS[market];
	if (!partner || !REGION.locales.includes(locale) || !KEY.test(key)) return null;
	const first = await latest(key, partner, locale);
	if (first.entry) return { entry: first.entry, locale, fellBack: false, cacheHints: [first.cacheHint] };
	if (locale === "en") return null;
	const en = await latest(key, partner, "en");
	if (!en.entry) return null;
	return { entry: en.entry, locale: "en", fellBack: true, cacheHints: [first.cacheHint, en.cacheHint] };
}
