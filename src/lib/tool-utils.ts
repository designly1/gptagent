import type { ChatCompletionTool } from 'openai/resources';
import type {
  ToolType,
  ToolParameters,
  ToolReturnValue,
  JSONSchemaProperty,
} from '@/lib/types';
import fs from 'fs';

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
    parameters: {} as TParams,
    returnType: {} as TReturn,
    openaiTool,
  };
}

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
        type: 'object',
        properties,
        required,
      },
    },
  };
}

export function printLog(...args: any[]) {
  if (process.env.DEBUG !== '1') return;
  const msg =
    `[${new Date().toISOString()}] ` +
    args
      .map(a => (typeof a === 'string' ? a : JSON.stringify(a, null, 2)))
      .join(' ');
  fs.appendFileSync('./debug.log', msg + '\n');
}
