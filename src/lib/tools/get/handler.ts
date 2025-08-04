// GET tool handler - implements web page fetching using Playwright
// This file contains the actual implementation that executes when the AI calls the 'get' tool
import type { ToolHandler } from '@/lib/types';
import type { GetPageParams, GetPageReturn } from '@/lib/tools/get/def';
import { printLog } from '@/lib/tool-utils';

/**
 * Extracts readable content from HTML using Mozilla's Readability algorithm
 * This is used for very long pages to get just the main content and reduce token usage
 * @param html - Raw HTML content from the page
 * @returns Cleaned, readable text content
 */
async function extractReadable(html: string): Promise<string> {
  // Dynamically import heavy dependencies to improve startup time
  const [{ Readability }, { JSDOM }] = await Promise.all([
    import('@mozilla/readability'),
    import('jsdom'),
  ]);

  // Parse HTML and extract main content using Readability
  const dom = new JSDOM(html);
  const article = new Readability(dom.window.document).parse();
  return article?.textContent?.trim() ?? '';
}

/**
 * Main handler function for the GET tool
 * Uses Playwright to fetch web pages with optimizations for text extraction
 * @param params - Contains the URL to fetch
 * @returns Object with the URL, extracted text content, and any errors
 */
export const getHandler: ToolHandler<GetPageParams, GetPageReturn> = async ({
  url,
}) => {
  printLog(`🌐 Connecting to ${url}`);

  try {
    // Import Playwright dynamically to improve startup time
    const { chromium } = await import('playwright');

    // Launch browser in headless mode
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      // Use a realistic user agent to avoid blocking
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    });

    // Block unnecessary resources to speed up loading and reduce bandwidth
    await context.route('**/*', route => {
      const type = route.request().resourceType();
      return ['image', 'stylesheet', 'font', 'media'].includes(type)
        ? route.abort() // Block images, CSS, fonts, media
        : route.continue(); // Allow HTML, scripts, and other content
    });

    const page = await context.newPage();

    // Navigate to the URL with a reasonable timeout
    await page.goto(url, {
      waitUntil: 'domcontentloaded', // Don't wait for all resources, just DOM
      timeout: 20_000, // 20 second timeout
    });

    // Extract the visible text content from the page
    const textContent = await page.evaluate(() => {
      return document.body.innerText.trim();
    });

    // Get page metadata
    const title = await page.title();
    const canonical = await page.evaluate(() => {
      const link = document.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]'
      );
      return link?.href ?? location.href; // Use canonical URL or current URL
    });

    await browser.close();

    // For very long content, use Readability to extract just the main content
    // This helps reduce token usage for the AI
    const finalText =
      textContent.length > 45_000
        ? await extractReadable(await page.content())
        : textContent;

    printLog(
      '🌐 Extracted',
      `${(finalText.length / 1024).toFixed(1)} KB text →`,
      finalText.slice(0, 200).replace(/\s+/g, ' ') + '…'
    );

    return {
      url: canonical,
      html: finalText,
      meta: { title },
    };
  } catch (err) {
    // Handle any errors during page fetching
    const msg = err instanceof Error ? err.message : String(err);
    printLog('🌐 Error:', msg);
    return { url, html: '', error: msg };
  }
};
