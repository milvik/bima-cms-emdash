import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { fileURLToPath } from "node:url";
import { graphEmail } from "./src/plugins/graph-email.ts";
import { REGIONS, regionForEnv } from "./src/lib/region-config.ts";

// CLOUDFLARE_ENV picks both the Worker (wrangler.jsonc) and the region this build serves.
const regionId = regionForEnv(process.env.CLOUDFLARE_ENV);
const { locales } = REGIONS[regionId];

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	i18n: {
		defaultLocale: "en",
		locales,
		fallback: Object.fromEntries(locales.filter((l) => l !== "en").map((l) => [l, "en"])),
	},
	vite: {
		define: { __BIMA_REGION__: JSON.stringify(regionId) },
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			// Magic links, invites and recovery from no-reply@milvik.se via Microsoft Graph.
			// Credentials are Worker vars/secret - see src/plugins/graph-email.ts.
			plugins: [
				graphEmail(
					// SMTP as the shared mailbox (SMTP_USER/SMTP_PASSWORD secrets). Switch to
					// { transport: "graph", from: "no-reply@milvik.se" } once an Entra app exists.
					{ transport: "smtp", fromName: "BIMA CMS" },
					fileURLToPath(new URL("./src/plugins/graph-email.ts", import.meta.url)),
				),
			],
		}),
	],
	devToolbar: { enabled: false },
});
