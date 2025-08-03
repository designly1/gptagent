import type { ChatCompletionTool } from 'openai/resources';

export interface ToolParameters {
  [key: string]: unknown;
}

export interface ToolReturnValue {
  [key: string]: unknown;
}

export interface ToolType<
  TParams extends ToolParameters = ToolParameters,
  TReturn extends ToolReturnValue = ToolReturnValue,
> {
  name: string;
  description: string;
  parameters: TParams;
  returnType: TReturn;
  openaiTool: ChatCompletionTool;
}

export type ToolHandler<
  TParams extends ToolParameters = ToolParameters,
  TReturn extends ToolReturnValue = ToolReturnValue,
> = (params: TParams) => Promise<TReturn> | TReturn;

export interface ToolRegistryEntry<
  TParams extends ToolParameters = ToolParameters,
  TReturn extends ToolReturnValue = ToolReturnValue,
> {
  tool: ToolType<TParams, TReturn>;
  handler: ToolHandler<TParams, TReturn>;
}

export type ToolRegistry = Map<string, ToolRegistryEntry<any, any>>;

export type ExtractToolParams<T> = T extends ToolType<infer P, any> ? P : never;

export type ExtractToolReturn<T> = T extends ToolType<any, infer R> ? R : never;

export type ExtractToolHandler<T> =
  T extends ToolType<infer P, infer R> ? ToolHandler<P, R> : never;

export interface ToolExecutionResult<
  TReturn extends ToolReturnValue = ToolReturnValue,
> {
  success: boolean;
  data?: TReturn;
  error?: string;
}

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export type ToolResultMessage = {
  role: 'tool';
  tool_call_id: string;
  content: string;
};

export interface ToolInfo {
  name: string;
  description: string;
  openaiTool: ChatCompletionTool;
}

export interface ToolBridgeInfo {
  registeredTools: string[];
  totalTools: number;
  openAITools: ChatCompletionTool[];
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty;
  required?: string[];
}
