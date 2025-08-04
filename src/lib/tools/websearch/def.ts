// Web search tool definition - performs searches using SearxNG
// This tool allows the AI to search the web for current information
import type { ToolType } from '@/lib/types';
import { createToolType, createOpenAIToolSchema } from '@/lib/tool-utils';

// Input parameters for web search
export interface WebSearchParams extends Record<string, unknown> {
  query: string; // The search query to perform
  numResults?: number; // Optional: number of results to return (defaults to 10)
}

// Raw response format from SearxNG API
// This interface matches the JSON structure returned by SearxNG
export interface SearxResponse {
  query: string; // The search query that was executed
  number_of_results: number; // Total number of results found
  results: SearxResult[]; // Array of individual search results
  answers: unknown[]; // Direct answers (e.g., math calculations)
  corrections: unknown[]; // Suggested spelling corrections
  infoboxes: SearxInfobox[]; // Rich information boxes (e.g., Wikipedia)
  suggestions: string[]; // Related search suggestions
  unresponsive_engines: string[]; // Search engines that failed to respond
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

// Create the complete web search tool definition
export const webSearchTool: ToolType<WebSearchParams, WebSearchResult> =
  createToolType<WebSearchParams, WebSearchResult>(
    'web_search', // Tool name for AI to call
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
      ['query'] // Only query is required, numResults is optional
    )
  );

// Export just the OpenAI schema for backwards compatibility
export const webSearch = webSearchTool.openaiTool;
