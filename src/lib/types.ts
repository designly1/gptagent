// Type definitions for the tool system
// This file defines all the TypeScript interfaces and types used throughout the application
import type { ChatCompletionTool } from 'openai/resources';

// Base interface for tool input parameters - any tool can accept arbitrary key-value pairs
export interface ToolParameters {
  [key: string]: unknown;
}

// Base interface for tool return values - any tool can return arbitrary data structures
export interface ToolReturnValue {
  [key: string]: unknown;
}

// Generic tool definition that combines metadata with OpenAI schema
export interface ToolType<
  TParams extends ToolParameters = ToolParameters,
  TReturn extends ToolReturnValue = ToolReturnValue,
> {
  name: string; // Unique identifier for the tool
  description: string; // Human-readable description of what the tool does
  parameters: TParams; // TypeScript type for input parameters (runtime placeholder)
  returnType: TReturn; // TypeScript type for return value (runtime placeholder)
  openaiTool: ChatCompletionTool; // OpenAI-compatible schema for function calling
}

// Function signature for tool handlers - can be sync or async
export type ToolHandler<
  TParams extends ToolParameters = ToolParameters,
  TReturn extends ToolReturnValue = ToolReturnValue,
> = (params: TParams) => Promise<TReturn> | TReturn;

// Registry entry that pairs a tool definition with its implementation
export interface ToolRegistryEntry<
  TParams extends ToolParameters = ToolParameters,
  TReturn extends ToolReturnValue = ToolReturnValue,
> {
  tool: ToolType<TParams, TReturn>; // Tool metadata and schema
  handler: ToolHandler<TParams, TReturn>; // Function that executes the tool
}

// The main registry storage - maps tool names to their entries
export type ToolRegistry = Map<string, ToolRegistryEntry<any, any>>;

// Utility types for extracting parameter and return types from tool definitions
export type ExtractToolParams<T> = T extends ToolType<infer P, any> ? P : never;
export type ExtractToolReturn<T> = T extends ToolType<any, infer R> ? R : never;
export type ExtractToolHandler<T> =
  T extends ToolType<infer P, infer R> ? ToolHandler<P, R> : never;

// Wrapper for tool execution results that includes success/error handling
export interface ToolExecutionResult<
  TReturn extends ToolReturnValue = ToolReturnValue,
> {
  success: boolean; // Whether the tool executed without errors
  data?: TReturn; // The actual result data if successful
  error?: string; // Error message if execution failed
}

// Structure for OpenAI function calls - matches OpenAI's API format
export interface ToolCall {
  id: string; // Unique identifier for this specific call
  function: {
    name: string; // Name of the tool to execute
    arguments: string; // JSON string containing the tool parameters
  };
}

// OpenAI message format for tool results - sent back to the model
export type ToolResultMessage = {
  role: 'tool'; // Message type identifier
  tool_call_id: string; // Links this result to the original tool call
  content: string; // JSON string containing the tool's output
};

// Simplified tool information for debugging and introspection
export interface ToolInfo {
  name: string;
  description: string;
  openaiTool: ChatCompletionTool;
}

// Summary information about all registered tools
export interface ToolBridgeInfo {
  registeredTools: string[]; // List of tool names
  totalTools: number; // Count of registered tools
  openAITools: ChatCompletionTool[]; // All OpenAI schemas for the tools
}

// JSON Schema definition for tool parameters - used to create OpenAI schemas
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string; // Human-readable description
  enum?: string[]; // Allowed values for string types
  properties?: Record<string, JSONSchemaProperty>; // For object types
  items?: JSONSchemaProperty; // For array types
  required?: string[]; // Required property names
}
