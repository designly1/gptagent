// Utility functions for creating and managing tools
// This file provides helper functions to build tool definitions and OpenAI schemas
import type { ChatCompletionTool } from 'openai/resources';
import type {
  ToolType,
  ToolParameters,
  ToolReturnValue,
  JSONSchemaProperty,
} from '@/lib/types';
import fs from 'fs';

/**
 * Creates a properly typed tool definition
 * This function combines TypeScript typing with OpenAI function calling schema
 * @param name - Unique identifier for the tool
 * @param description - Human-readable description of what the tool does
 * @param openaiTool - OpenAI-compatible function schema
 * @returns A complete tool definition ready for registration
 */
export function createToolType<
  TParams extends ToolParameters = ToolParameters,
  TReturn extends ToolReturnValue = ToolReturnValue,
>(
  name: string,
  description: string,
  openaiTool: ChatCompletionTool
): ToolType<TParams, TReturn> {
  return {
    name,
    description,
    parameters: {} as TParams, // Runtime placeholder for TypeScript types
    returnType: {} as TReturn, // Runtime placeholder for TypeScript types
    openaiTool, // Actual schema used by OpenAI API
  };
}

/**
 * Creates an OpenAI-compatible function schema for tool calling
 * This converts our simple property definitions into the JSON Schema format
 * that OpenAI's function calling API expects
 * @param name - Tool name (must match the tool handler function name)
 * @param description - Description shown to the AI model
 * @param properties - Parameter definitions in simplified JSON Schema format
 * @param required - Array of required parameter names
 * @returns OpenAI ChatCompletionTool schema
 */
export function createOpenAIToolSchema(
  name: string,
  description: string,
  properties: Record<string, JSONSchemaProperty>,
  required: string[] = []
): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object', // All tool parameters are wrapped in an object
        properties, // The actual parameter definitions
        required, // Which parameters are mandatory
      },
    },
  };
}

/**
 * Debug logging function that only writes to file when DEBUG=1
 * Useful for tracing tool execution without cluttering console output
 * @param args - Any values to log (will be JSON stringified if not strings)
 */
export function printLog(...args: any[]) {
  if (process.env.DEBUG !== '1') return;

  // Format timestamp and convert all arguments to strings
  const msg =
    `[${new Date().toISOString()}] ` +
    args
      .map(a => (typeof a === 'string' ? a : JSON.stringify(a, null, 2)))
      .join(' ');

  // Append to debug.log file (creates file if it doesn't exist)
  fs.appendFileSync('./debug.log', msg + '\n');
}
