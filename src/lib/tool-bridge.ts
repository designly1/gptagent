// Tool bridge - the core orchestrator that manages tool execution and AI conversation flow
// This file coordinates between OpenAI API calls and tool execution
// It implements a loop that continues until the AI stops requesting tools
import { toolRegistry } from '@/lib/tool-registry';
import { checkWeatherTool } from '@/lib/tools/check-weather/def';
import { checkWeatherHandler } from '@/lib/tools/check-weather/handler';
import {
  forwardGeocodeTool,
  reverseGeocodeTool,
} from '@/lib/tools/geocode/def';
import {
  forwardGeocodeHandler,
  reverseGeocodeHandler,
} from '@/lib/tools/geocode/handler';
import { webSearchTool } from '@/lib/tools/websearch/def';
import { webSearchHandler } from '@/lib/tools/websearch/handler';
import { runAssistant } from '@/lib/openai';
import { getTool, getHandler } from './tools/get/def';

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ToolCall, ToolResultMessage, ToolBridgeInfo } from '@/lib/types';

/**
 * ToolBridge - Singleton class that orchestrates the conversation between AI and tools
 * This class manages the tool execution loop and handles the back-and-forth
 * between OpenAI API calls and tool function execution
 */
export class ToolBridge {
  private static instance: ToolBridge;
  private isInitialized = false;

  // Private constructor enforces singleton pattern
  private constructor() {}

  /**
   * Gets the singleton instance of ToolBridge
   * Ensures only one instance exists throughout the application lifecycle
   */
  static getInstance(): ToolBridge {
    if (!ToolBridge.instance) {
      ToolBridge.instance = new ToolBridge();
    }
    return ToolBridge.instance;
  }

  /**
   * Initializes the tool bridge by registering all available tools
   * This method is idempotent - calling it multiple times is safe
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Register all built-in tools with the registry
    toolRegistry.register(checkWeatherTool, checkWeatherHandler);
    toolRegistry.register(forwardGeocodeTool, forwardGeocodeHandler);
    toolRegistry.register(reverseGeocodeTool, reverseGeocodeHandler);
    toolRegistry.register(webSearchTool, webSearchHandler);
    toolRegistry.register(getTool, getHandler);

    console.log(
      '🔧 Assistant Bridge initialized with tools:',
      toolRegistry.getAllToolNames()
    );
    this.isInitialized = true;
  }

  /**
   * Executes a single tool call and formats the result for OpenAI
   * This method handles the conversion between OpenAI's function call format
   * and our internal tool execution system
   * @param toolCall - The tool call request from OpenAI
   * @returns Formatted tool result message to send back to OpenAI
   */
  async executeToolCall(toolCall: ToolCall): Promise<ToolResultMessage> {
    const { name, arguments: args } = toolCall.function;

    try {
      // Parse the JSON arguments from OpenAI
      const params = JSON.parse(args);

      // Execute the tool through the registry
      const result = await toolRegistry.execute(name, params);

      if (result.success && result.data) {
        // Return successful result as JSON string
        return {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result.data),
        };
      } else {
        // Return error information
        return {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: result.error }),
        };
      }
    } catch (error) {
      // Handle JSON parsing errors or other unexpected errors
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      };
    }
  }

  /**
   * Main conversation loop that handles tool execution
   * This method implements the core pattern of function calling:
   * 1. Send messages to OpenAI
   * 2. If AI requests tools, execute them and add results to conversation
   * 3. Repeat until AI provides a final response (no tool calls)
   * @param messages - Conversation history including user messages and tool results
   * @returns The assistant's final response message
   */
  async runAssistantWithTools(
    messages: ChatCompletionMessageParam[]
  ): Promise<ChatCompletionMessageParam> {
    this.initialize();
    let currentMessages = messages;

    // Continue the conversation loop until AI stops requesting tools
    while (true) {
      // Get response from OpenAI (may include tool calls)
      const assistantResponse = await runAssistant(currentMessages);
      if (!assistantResponse) {
        throw new Error('No assistant response');
      }

      // Check if the assistant wants to call any tools
      if (
        assistantResponse.tool_calls &&
        assistantResponse.tool_calls.length > 0
      ) {
        // Execute all requested tools
        const toolResults: ToolResultMessage[] = [];
        for (const toolCall of assistantResponse.tool_calls) {
          const result = await this.executeToolCall(toolCall);
          toolResults.push(result);
        }

        // Add assistant message and tool results to conversation history
        currentMessages = [
          ...currentMessages,
          assistantResponse, // Assistant's request for tools
          ...toolResults, // Results from executing those tools
        ];
      } else {
        // No tool calls - this is the final response
        return assistantResponse;
      }
    }
  }

  /**
   * Returns a list of all registered tool names
   * Useful for debugging and introspection
   */
  getRegisteredTools(): string[] {
    return toolRegistry.getAllToolNames();
  }

  /**
   * Returns comprehensive information about all registered tools
   * Includes tool names, count, and OpenAI schemas
   */
  getToolInfo(): ToolBridgeInfo {
    return {
      registeredTools: toolRegistry.getAllToolNames(),
      totalTools: toolRegistry.size(),
      openAITools: toolRegistry.getAllOpenAITools(),
    };
  }
}

// Export the singleton instance for use throughout the application
export const toolBridge = ToolBridge.getInstance();
