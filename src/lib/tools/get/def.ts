// GET tool definition - fetches web page content using Playwright
// This tool allows the AI to retrieve and read web pages as part of its responses
import type { ToolType } from '@/lib/types';
import { createToolType, createOpenAIToolSchema } from '@/lib/tool-utils';

// Input parameters for the GET tool
export interface GetPageParams extends Record<string, unknown> {
  url: string; // The URL of the web page to fetch
}

// Return value from the GET tool
export interface GetPageReturn extends Record<string, unknown> {
  url: string; // The final URL (may differ from input due to redirects)
  html: string; // The extracted text content of the page
  error?: string; // Error message if the request failed
}

// Create the complete tool definition with OpenAI schema
export const getTool: ToolType<GetPageParams, GetPageReturn> = createToolType<
  GetPageParams,
  GetPageReturn
>(
  'get', // Tool name that the AI will use to call this function
  'Fetch the HTML content of a web page using Playwright. Input a URL and receive the full HTML.',
  createOpenAIToolSchema(
    'get',
    'Fetch the HTML content of a web page using Playwright. Input a URL and receive the full HTML.',
    {
      url: {
        type: 'string',
        description: 'The URL of the web page to fetch.',
      },
    },
    ['url'] // Required parameters
  )
);

// Export the handler function from the separate handler file
export { getHandler } from './handler';
