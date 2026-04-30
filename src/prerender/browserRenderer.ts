import puppeteer from "@cloudflare/puppeteer";

export type BrowserRenderInput = {
	browserBinding?: Fetcher;
	url: string;
	timeoutMs: number;
};

/**
 * Esegue JavaScript server-side usando Browser Run.
 *
 * Uso Browser Run solo per crawler e cache miss: e' piu' costoso/lento di un
 * fetch normale, quindi non deve mai stare nel percorso degli utenti umani.
 */
export async function renderHtmlWithBrowser(
	input: BrowserRenderInput,
): Promise<string | undefined> {
	if (!input.browserBinding) return undefined;

	let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

	try {
		browser = await puppeteer.launch(input.browserBinding);
		const page = await browser.newPage();
		page.setDefaultNavigationTimeout(input.timeoutMs);
		page.setDefaultTimeout(input.timeoutMs);

		await page.setUserAgent(
			"Mozilla/5.0 (compatible; LLMProxyPrerender/1.0; +https://www.tuurbo.ai)",
		);
		await page.goto(input.url, {
			waitUntil: "networkidle2",
			timeout: input.timeoutMs,
		});

		return await page.content();
	} catch (error) {
		console.warn("Browser prerender failed", error);
		return undefined;
	} finally {
		await browser?.close().catch((error: unknown) => {
			console.warn("Browser close failed", error);
		});
	}
}
