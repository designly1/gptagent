import type { ToolType } from '@/lib/types';
import { createToolType, createOpenAIToolSchema } from '@/lib/tool-utils';

export interface WebSearchParams extends Record<string, unknown> {
  query: string;
  numResults?: number;
}

export interface SearxResponse {
  query: string;

  number_of_results: number;

  results: SearxResult[];

  answers: unknown[];

  corrections: unknown[];

  infoboxes: SearxInfobox[];

  suggestions: string[];

  unresponsive_engines: string[];
}

export interface SearxResult {
  url: string;
  title: string;
  content: string;
  engine: string;
  template: string;
  score: number;

  publishedDate: string | null;
  category: string;
  thumbnail: string;
  img_src: string;
  parsed_url: [string, string, string, string, string, string];
  priority: string | null;
  engines: string[];
  positions: number[];

  iframe_src?: string;
}

export interface SearxInfobox {
  infobox: string;
  id: string;
  content: string;
  img_src: string;
  urls: { title: string; url: string }[];

  engine: string;
  template: string;
  url: string | null;
  parsed_url: string[] | null;
  title: string;
  thumbnail: string;
  priority: string | null;
  engines: string[];
  positions: number | number[] | '';
  score: number;
  category: string;
  attributes: unknown[];
}

export interface WebSearchResult extends Record<string, unknown> {
  query: string;
  total_results: number;
  results: Array<{
    title: string;
    url: string;
    content: string;
    engine: string;
    published_date?: string;
    thumbnail?: string;
  }>;
  infoboxes?: Array<{
    title: string;
    content: string;
    image?: string;
    urls?: Array<{ title: string; url: string }>;
  }>;
  suggestions?: string[];
  error?: string;
}

export const webSearchTool: ToolType<WebSearchParams, WebSearchResult> =
  createToolType<WebSearchParams, WebSearchResult>(
    'web_search',
    'Perform a web search using SearxNG and return a list of results',
    createOpenAIToolSchema(
      'web_search',
      'Perform a web search using SearxNG and return a list of results',
      {
        query: {
          type: 'string',
          description: 'The search query to perform',
        },
        numResults: {
          type: 'number',
          description: 'The number of results to return (default is 10)',
        },
      },
      ['query']
    )
  );

export const webSearch = webSearchTool.openaiTool;
