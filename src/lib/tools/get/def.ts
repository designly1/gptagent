import type { ToolType } from '@/lib/types';
import { createToolType, createOpenAIToolSchema } from '@/lib/tool-utils';

export interface GetPageParams extends Record<string, unknown> {
  url: string;
}

export interface GetPageReturn extends Record<string, unknown> {
  url: string;
  html: string;
  error?: string;
}

export const getTool: ToolType<GetPageParams, GetPageReturn> = createToolType<
  GetPageParams,
  GetPageReturn
>(
  'get',
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
    ['url']
  )
);

export { getHandler } from './handler';
