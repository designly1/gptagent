import type { ToolHandler } from '@/lib/types';
import type { WebSearchParams, WebSearchResult, SearxResponse } from './def';
import { printLog } from '@/lib/tool-utils';

export const webSearchHandler: ToolHandler<
  WebSearchParams,
  WebSearchResult
> = async params => {
  const { query, numResults = 5 } = params;

  printLog(`🔍 Performing web search: ${query}`);

  try {
    const url = `http://localhost:8080/search?q=${encodeURIComponent(query)}&format=json`;

    printLog(`🔍 Connecting to SearxNG API (${url})`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `SearxNG API error: ${response.status} ${response.statusText}`
      );
    }

    const data: SearxResponse = await response.json();

    printLog(`🔍 OUTPUT:`, data);

    const results = data.results.slice(0, numResults).map((result, idx) => ({
      title: result.title,
      url: result.url,
      content: result.content,
      engine: result.engine,
      published_date: result.publishedDate || undefined,
      thumbnail: result.thumbnail || undefined,
      number: idx + 1,
    }));

    const htmlList = [
      `<div style="color: #00bfae;">🔍 Top Results for "${query}":</div>`,
      '<ol style="color: #fff;">',
      ...results.map(
        r =>
          `<li style="margin-bottom: 8px;">
            <a href="${r.url}" style="color: #1e90ff; text-decoration: underline;">${r.title}</a>
            <div style="color: #888;">${r.content.slice(0, 160)}${r.content.length > 160 ? '…' : ''}</div>
          </li>`
      ),
      '</ol>',
      `<div style="color: #43a047;">Which result would you like to look up in detail? Reply with a number (1-${results.length}).</div>`,
    ].join('\n');

    const infoboxes = data.infoboxes?.map(infobox => ({
      title: infobox.infobox,
      content: infobox.content,
      image: infobox.img_src || undefined,
      urls: infobox.urls,
    }));

    const result: WebSearchResult = {
      query: data.query,
      total_results: data.number_of_results,
      results,
      infoboxes,
      suggestions: data.suggestions,
      html: htmlList,
    };

    printLog(`🔍 Web search result:`, result);

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    printLog(`🔍 Web search error:`, errorMessage);
    return {
      query,
      total_results: 0,
      results: [],
      error: errorMessage,
      html: `<div style='color: #ff1744;'>🔍 Error: ${errorMessage}</div>`,
    };
  }
};
