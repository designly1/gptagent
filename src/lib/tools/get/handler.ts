import type { ToolHandler } from '@/lib/types';
import type { GetPageParams, GetPageReturn } from '@/lib/tools/get/def';
import { printLog } from '@/lib/tool-utils';

async function extractReadable(html: string): Promise<string> {
  const [{ Readability }, { JSDOM }] = await Promise.all([
    import('@mozilla/readability'),
    import('jsdom'),
  ]);
  const dom = new JSDOM(html);
  const article = new Readability(dom.window.document).parse();
  return article?.textContent?.trim() ?? '';
}

export const getHandler: ToolHandler<GetPageParams, GetPageReturn> = async ({
  url,
}) => {
  printLog(`🌐 Connecting to ${url}`);

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    });

    await context.route('**/*', route => {
      const type = route.request().resourceType();
      return ['image', 'stylesheet', 'font', 'media'].includes(type)
        ? route.abort()
        : route.continue();
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });

    const textContent = await page.evaluate(() => {
      return document.body.innerText.trim();
    });

    const title = await page.title();
    const canonical = await page.evaluate(() => {
      const link = document.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]'
      );
      return link?.href ?? location.href;
    });

    await browser.close();

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
    const msg = err instanceof Error ? err.message : String(err);
    printLog('🌐 Error:', msg);
    return { url, html: '', error: msg };
  }
};
